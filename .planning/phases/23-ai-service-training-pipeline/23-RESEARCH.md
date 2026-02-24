# Phase 23: AI Service — Training Pipeline and Model Deployment - Research

**Researched:** 2026-02-21
**Domain:** Python ML training pipeline, FastAPI async ML serving, Railway deployment, GitHub Actions CI
**Confidence:** HIGH

---

## Summary

Phase 23 activates the AI service from "heuristic fallback mode" to real trained predictions. The codebase already contains the full FastAPI service, all model classes (`NoShowPredictor`, `CLVPredictor`, `PricingOptimizer`, etc.), and training scripts — but the models directory contains only placeholder stubs (`metadata.json` with `"status": "placeholder"` and no `.joblib` files). The five plans cover: internal training API routes in Next.js, running actual training to produce `.joblib` files, Redis persistence for the pricing MAB state, Railway deployment configuration, and a weekly retraining CI workflow.

The central challenge is not building new infrastructure — it's connecting what exists. Training scripts already call `http://localhost:3000/api/internal/features/training/no-show` but those routes don't exist yet in Next.js. Model loading code already handles the `.joblib` files and `metadata.json` sidecars. The `PricingOptimizer` already has `save_state`/`load_state` to/from JSON but saves to the filesystem (container ephemeral storage); it must be redirected to Redis. The Dockerfile already bakes in the `./models` directory — the CI training workflow must produce actual files that land in that directory before the Docker build.

A critical serialization decision drives the version validation requirement (AI-05): sklearn `RandomForestRegressor` saved via `joblib` raises `InconsistentVersionWarning` on version mismatch — this can be promoted to `RuntimeError` at startup with `warnings.simplefilter("error", InconsistentVersionWarning)`. For XGBoost, the native `booster.save_model()` JSON format is stable across versions, but the existing scripts use `joblib.dump(XGBClassifier)` — a `.meta.json` sidecar approach recording library versions solves the validation problem without changing serialization format, since the sklearn wrapper is what gets pickled. Prophet must use `model_to_json`/`model_from_json` (not joblib/pickle) per official Prophet docs.

**Primary recommendation:** Add the 6 internal Next.js API routes with `AI_SERVICE_API_KEY` header auth, run training scripts in CI to produce real `.joblib` files baked into the Docker image, migrate `PricingOptimizer` state persistence from filesystem JSON to Redis, write `railway.toml` with `[deploy] startCommand` and `healthcheckPath`, and add a `.meta.json` version sidecar per model with startup validation.

---

## Standard Stack

### Core (already in `services/ai/requirements.txt`)

| Library | Version | Purpose | Why Standard |
| ------- | ------- | ------- | ------------ |
| fastapi | 0.115.12 | Async web framework for AI service | Already in use; industry standard for ML serving |
| uvicorn[standard] | 0.32.1 | ASGI server | Already in use with asyncio event loop |
| xgboost | 3.2.0 | No-show binary classifier | Already in use; UBJSON native format since 2.1.0 |
| scikit-learn | 1.5.2 | Random Forest CLV + GradientBoosting capacity | Already in use; version in joblib pickle is checked |
| prophet | 1.1.6 | Time series capacity forecasting | Already in use; requires JSON serialization not joblib |
| redis | 5.2.1 | Async Redis client for feature store + MAB state | Already in use for feature caching |
| joblib | 1.4.2 | Model serialization for sklearn/XGBoost wrappers | Already in use |
| httpx | 0.28.1 | HTTP client for calling Next.js training API routes | Already in use in training scripts |
| pydantic-settings | 2.7.2 | Config from env vars (including `AI_SERVICE_API_KEY`) | Already in use in `app/config.py` |

### Supporting (Next.js side, already in project)

| Library | Version | Purpose | When to Use |
| ------- | ------- | ------- | ----------- |
| drizzle-orm | existing | Query bookings/customers for feature extraction | All 6 internal training routes |
| Next.js `NextRequest` | 14.x | Route handler for `app/api/internal/` routes | Internal training feature endpoints |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| ---------- | --------- | -------- |
| joblib for XGBoost | `booster.save_model()` JSON | Native format is cross-version stable, but wrapping XGBClassifier in sklearn means joblib is required; use `.meta.json` sidecar for version pinning instead |
| joblib for Prophet | `prophet.serialize.model_to_json` | Official Prophet docs explicitly warn against pickle/joblib due to Stan backend; must use JSON serialization |
| Redis for MAB state | Filesystem JSON | Filesystem is ephemeral on Railway; Redis survives restarts |
| `ThreadPoolExecutor` | `ProcessPoolExecutor` | ThreadPoolExecutor does NOT bypass Python GIL for CPU-bound XGBoost/sklearn inference; but ML inference via numpy is often GIL-releasing (XGBoost releases GIL); the requirement says ThreadPoolExecutor — use it as specified, keep thread pool small (2-4 workers) |

**Installation** (no new packages needed — all already in `requirements.txt`):
```bash
# Prophet JSON serialization — already installed
python -c "from prophet.serialize import model_to_json, model_from_json"
```

---

## Architecture Patterns

### Recommended Project Structure

The existing structure is correct. New files for this phase:

```
apps/web/app/api/internal/           # NEW — internal training API
├── features/
│   └── training/
│       ├── no-show/route.ts         # Feature extraction for no-show model
│       ├── clv/route.ts             # Feature extraction for CLV model
│       ├── capacity/route.ts        # Hourly booking aggregates for Prophet
│       ├── upselling/route.ts       # Service co-booking matrix
│       ├── reminder-timing/route.ts # Notification response data
│       └── pricing/route.ts         # Booking/price outcome data
└── lib/middleware/
    └── ai-service-auth.ts           # API key header validation middleware

services/ai/
├── models/
│   ├── no_show_v1.0.0.joblib        # Produced by train_no_show.py in CI
│   ├── no_show_v1.0.0.meta.json     # NEW — version sidecar
│   ├── clv_v1.0.0.joblib            # Produced by train_clv.py in CI
│   ├── clv_v1.0.0.meta.json         # NEW — version sidecar
│   ├── capacity_v1.0.0.joblib       # Produced by train_capacity.py in CI
│   ├── capacity_v1.0.0.meta.json    # NEW — version sidecar
│   └── metadata.json                # Updated by training scripts
├── app/
│   └── services/
│       └── model_loader.py          # MODIFIED — add version validation
│       └── pricing_redis.py         # NEW — Redis-backed MAB persistence
├── scripts/
│   └── warmup_prophet.py            # NEW — warmup script for startup
└── railway.toml                     # NEW — Railway deployment config
.github/workflows/
└── train-models.yml                 # NEW — weekly retraining workflow
```

### Pattern 1: Internal API Key Auth for Training Routes

**What:** Next.js route handler that validates `X-AI-Service-Key` header against env var before returning training features. Does NOT use JWT auth — these are machine-to-machine routes called only from training scripts.

**When to use:** All 6 `/api/internal/features/training/*` routes.

```typescript
// apps/web/lib/middleware/ai-service-auth.ts
// Source: Pattern from existing createRouteHandler + Next.js docs
import { NextRequest, NextResponse } from 'next/server';

export function validateAiServiceKey(req: NextRequest): NextResponse | null {
  const apiKey = req.headers.get('x-ai-service-key');
  const expectedKey = process.env.AI_SERVICE_API_KEY;

  if (!expectedKey) {
    // Dev mode: skip auth if key not configured
    return null;
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'INVALID_API_KEY' },
      { status: 401 },
    );
  }

  return null; // Auth passed
}
```

```typescript
// apps/web/app/api/internal/features/training/no-show/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAiServiceKey } from '@/lib/middleware/ai-service-auth';
import { db } from '@schedulebox/database';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authError = validateAiServiceKey(req);
  if (authError) return authError;

  // Query: bookings with status 'completed' or 'no_show' + customer history
  // Returns array of feature rows matching NoShowPredictor.FEATURE_COLUMNS
  const rows = await db.execute(sql`
    SELECT
      EXTRACT(EPOCH FROM (b.start_time - b.created_at)) / 3600 AS booking_lead_time_hours,
      COALESCE(cust_stats.no_show_rate, 0.15) AS customer_no_show_rate,
      COALESCE(cust_stats.total_bookings, 1) AS customer_total_bookings,
      EXTRACT(DOW FROM b.start_time) AS day_of_week,
      EXTRACT(HOUR FROM b.start_time) AS hour_of_day,
      CASE WHEN EXTRACT(DOW FROM b.start_time) IN (0, 6) THEN 1 ELSE 0 END AS is_weekend,
      s.duration_minutes AS service_duration_minutes,
      s.price AS service_price,
      CASE WHEN cust_stats.total_bookings = 1 THEN 1 ELSE 0 END AS is_first_visit,
      CASE WHEN b.payment_status = 'paid' THEN 1 ELSE 0 END AS has_payment,
      COALESCE(days_since.days, 999) AS days_since_last_visit,
      CASE WHEN b.status = 'no_show' THEN 1 ELSE 0 END AS no_show
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS total_bookings,
        COUNT(*) FILTER (WHERE status = 'no_show')::float / NULLIF(COUNT(*), 0) AS no_show_rate
      FROM bookings
      WHERE customer_id = b.customer_id AND id != b.id
    ) cust_stats ON true
    LEFT JOIN LATERAL (
      SELECT EXTRACT(DAY FROM b.start_time - MAX(prev.start_time)) AS days
      FROM bookings prev
      WHERE prev.customer_id = b.customer_id AND prev.id != b.id
    ) days_since ON true
    WHERE b.status IN ('completed', 'no_show')
    LIMIT 5000
  `);

  return NextResponse.json(rows);
}
```

### Pattern 2: .meta.json Version Sidecar + Startup Validation

**What:** Each model file gets a companion `.meta.json` file recording the exact library versions used at training time. At startup, `model_loader.py` compares recorded versions against the running environment and raises `RuntimeError` on mismatch.

**When to use:** All sklearn and XGBoost model files.

```python
# services/ai/app/services/model_loader.py — version validation additions
import json
import os
import sklearn
import xgboost

def _validate_model_versions(meta_path: str, model_name: str) -> None:
    """
    Validate trained model library versions against the running environment.
    Raises RuntimeError on version mismatch (AI-05 requirement).
    """
    if not os.path.exists(meta_path):
        logger.warning(f"No version sidecar found at {meta_path} — skipping validation")
        return

    with open(meta_path) as f:
        meta = json.load(f)

    trained_sklearn = meta.get("sklearn_version")
    trained_xgboost = meta.get("xgboost_version")
    running_sklearn = sklearn.__version__
    running_xgboost = xgboost.__version__

    if trained_sklearn and trained_sklearn != running_sklearn:
        raise RuntimeError(
            f"Model version mismatch for {model_name}: "
            f"trained with sklearn={trained_sklearn}, "
            f"running sklearn={running_sklearn}. "
            f"Retrain or pin dependency versions."
        )
    if trained_xgboost and trained_xgboost != running_xgboost:
        raise RuntimeError(
            f"Model version mismatch for {model_name}: "
            f"trained with xgboost={trained_xgboost}, "
            f"running xgboost={running_xgboost}. "
            f"Retrain or pin dependency versions."
        )
```

```python
# Training script addition — write .meta.json sidecar
import sklearn
import xgboost as xgb

def write_meta_sidecar(model_path: str, model_name: str, metrics: dict) -> None:
    """Write version sidecar alongside the model file."""
    meta = {
        "model_name": model_name,
        "model_version": "v1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
        "xgboost_version": xgb.__version__,
        "features": FEATURE_COLUMNS,
        "metrics": metrics,
    }
    meta_path = model_path.replace(".joblib", ".meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    logger.info(f"Version sidecar written to {meta_path}")
```

### Pattern 3: Redis-Backed Pricing Optimizer State

**What:** Replace `PricingOptimizer.save_state(path)` / `load_state(path)` filesystem calls with Redis `GET`/`SET`. The MAB state (Thompson Sampling alpha/beta parameters per context key) is a JSON blob that survives container restarts when stored in Redis.

**When to use:** AI-04 requirement — pricing optimizer state must survive Railway container restarts.

```python
# services/ai/app/services/pricing_redis.py — NEW
import json
import logging
import redis.asyncio as aioredis
from ..config import settings

logger = logging.getLogger(__name__)
PRICING_STATE_KEY = "ai:pricing:mab_state"


async def load_pricing_state(redis_client: aioredis.Redis) -> dict:
    """Load MAB state from Redis. Returns empty dict on miss."""
    try:
        raw = await redis_client.get(PRICING_STATE_KEY)
        if raw:
            state = json.loads(raw)
            logger.info(f"Loaded pricing MAB state from Redis ({len(state)} contexts)")
            return state
    except Exception as e:
        logger.warning(f"Failed to load pricing state from Redis: {e}")
    return {}


async def save_pricing_state(redis_client: aioredis.Redis, state: dict) -> None:
    """Persist MAB state to Redis (no TTL — permanent)."""
    try:
        await redis_client.set(PRICING_STATE_KEY, json.dumps(state))
        logger.debug(f"Saved pricing MAB state to Redis ({len(state)} contexts)")
    except Exception as e:
        logger.warning(f"Failed to save pricing state to Redis: {e}")
```

### Pattern 4: Prophet JSON Serialization (NOT joblib)

**What:** Prophet's official docs explicitly prohibit pickle/joblib for the model object because of the Stan backend. Use `prophet.serialize.model_to_json` / `model_from_json` instead. The existing `train_capacity.py` uses `joblib.dump(forecaster.model, ...)` — this must be changed.

**When to use:** Capacity forecaster save/load in both `train_capacity.py` and `model_loader.py`.

```python
# Correct Prophet serialization — Source: facebook.github.io/prophet/docs/additional_topics.html
from prophet.serialize import model_to_json, model_from_json

# Save (in train_capacity.py)
model_path = os.path.join(output_dir, "capacity_v1.0.0.json")  # JSON, not joblib
with open(model_path, "w") as f:
    json.dump(model_to_json(forecaster.model), f)

# Load (in model_loader.py)
capacity_path = os.path.join(model_dir, "capacity_v1.0.0.json")
if os.path.exists(capacity_path):
    with open(capacity_path, "r") as f:
        prophet_model = model_from_json(json.load(f))
    _models["capacity"] = CapacityForecaster(model=prophet_model)
```

### Pattern 5: FastAPI ThreadPoolExecutor for ML Inference

**What:** Wrap synchronous sklearn/XGBoost predict calls in `asyncio.get_event_loop().run_in_executor()` with a bounded `ThreadPoolExecutor`. This prevents blocking the FastAPI async event loop during CPU-bound inference. Note: XGBoost releases the GIL during C++ inference, so ThreadPoolExecutor provides real concurrency for XGBoost; sklearn is more mixed.

**When to use:** All `predict_*` endpoint handlers that call synchronous model methods.

```python
# services/ai/app/routers/predictions.py — modified pattern
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Module-level thread pool (initialized once at startup)
_thread_pool = ThreadPoolExecutor(max_workers=4)


async def predict_no_show(request: NoShowPredictionRequest) -> NoShowPredictionResponse:
    # ... feature fetching (async) ...
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        _thread_pool,
        no_show_model.predict,
        features,
    )
    # ... return response ...
```

### Pattern 6: Railway Deployment (railway.toml)

**What:** Declare deployment configuration as code so Railway uses the Dockerfile build and configures the health check, start command, and restart policy.

```toml
# services/ai/railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port 8000"
healthcheckPath = "/health"
healthcheckTimeout = 45
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

**Note on memory limits:** Railway memory limits are set in the Railway dashboard (Project Settings > Resources), not in `railway.toml`. The toml controls build/deploy behavior only. Set 1.5GB in the Railway dashboard for the AI service.

### Pattern 7: Prophet Startup Warmup

**What:** Prophet's first prediction after loading is slow due to Stan's JIT compilation. Run one warmup prediction at startup before the health check passes.

```python
# services/ai/app/services/model_loader.py — add to load_models()
async def _warmup_prophet(capacity_model) -> None:
    """Run a throwaway prediction to warm up Prophet's Stan backend."""
    if capacity_model and capacity_model.model:
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, capacity_model.forecast, 1)
            logger.info("Prophet warmup prediction complete")
        except Exception as e:
            logger.warning(f"Prophet warmup failed (non-fatal): {e}")
```

### Pattern 8: Weekly Retraining CI Workflow

**What:** GitHub Actions workflow triggered weekly (Sunday 3:00 AM UTC) plus `workflow_dispatch`. Runs all training scripts against synthetic data (or real API if configured), then rebuilds and pushes the AI Docker image with fresh model files baked in.

```yaml
# .github/workflows/train-models.yml
name: Weekly Model Retraining

on:
  schedule:
    - cron: '0 3 * * 0'  # Sunday 3:00 AM UTC
  workflow_dispatch:       # Manual trigger option (AI-06 requirement)

jobs:
  train-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install AI service dependencies
        run: pip install -r services/ai/requirements.txt
      - name: Train no-show model
        run: python -m scripts.train_no_show
        working-directory: services/ai
      - name: Train CLV model
        run: python -m scripts.train_clv
        working-directory: services/ai
      - name: Train capacity model
        run: python -m scripts.train_capacity
        working-directory: services/ai
      - name: Build and push AI Docker image
        uses: docker/build-push-action@v6
        with:
          context: ./services/ai
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/schedulebox-ai:latest
```

### Anti-Patterns to Avoid

- **Storing model files in Railway ephemeral storage and loading at runtime:** The Dockerfile already copies `./models` — training must produce files BEFORE Docker build, not at container start.
- **Using `joblib.dump()` for Prophet models:** Prophet's Stan backend does not serialize well via pickle/joblib. Use `model_to_json`.
- **Silent version mismatch handling:** The requirement is `RuntimeError` at startup, not a warning that gets swallowed. Do not `except RuntimeError: pass`.
- **Blocking the event loop with synchronous predict():** Wrap all synchronous ML calls in `run_in_executor`.
- **Storing pricing MAB state in `/app/models/pricing_state.json`:** That path is inside the baked Docker image (read-only copy). Redis is the correct persistence layer.
- **Using Next.js `middleware.ts` for internal API auth:** The existing `middleware.ts` is i18n-only and excludes `/api/*`. Internal auth should be inline in each route handler using `validateAiServiceKey`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| ------- | ----------- | ----------- | --- |
| Prophet serialization | Custom pickle/joblib wrapper | `prophet.serialize.model_to_json` / `model_from_json` | Official Prophet API; pickle is explicitly unsupported due to Stan backend |
| Async ML inference | Custom thread management | `asyncio.get_event_loop().run_in_executor(_thread_pool, ...)` | Standard asyncio pattern; ThreadPoolExecutor already in stdlib |
| Redis JSON persistence | Custom Redis protocol | `redis.asyncio` `GET`/`SET` with `json.dumps`/`json.loads` | Already in project dependencies; `feature_store.py` shows the pattern |
| API key validation | JWT auth for internal routes | Simple string comparison in `validateAiServiceKey` | Machine-to-machine; JWT overhead unnecessary for internal-only routes |
| Model version tracking | Database registry | `.meta.json` sidecar file + `sklearn.__version__` comparison | Simple, co-located with model file, no additional infrastructure |

**Key insight:** Every piece of infrastructure needed for this phase already exists in the codebase — the work is connecting and activating it, not building new systems.

---

## Common Pitfalls

### Pitfall 1: Prophet Serialized with joblib Will Fail at Load Time

**What goes wrong:** `train_capacity.py` currently uses `joblib.dump(forecaster.model, ...)` to serialize the Prophet model. When loaded in a different container (different Stan installation), the model may fail with cryptic errors or produce wrong predictions.

**Why it happens:** Prophet uses CmdStanPy as its backend; the C++ Stan binary path is baked into the pickled object and won't match the new container's filesystem.

**How to avoid:** Change both `train_capacity.py` and `model_loader.py` to use `model_to_json`/`model_from_json`. Change the filename from `.joblib` to `.json`. Update `metadata.json` path references.

**Warning signs:** At container startup, `model_loader.py` logs `"capacity model loaded"` but the `model.model` object throws on `.predict()`. Health check passes (health_score works) but capacity endpoint always returns `[]`.

### Pitfall 2: Pricing State Written to Ephemeral Filesystem

**What goes wrong:** `PricingOptimizer` accumulates Thompson Sampling rewards in `self.state` dict during normal operation. If `save_state()` writes to a file path inside the container, that state is lost on every Railway restart.

**Why it happens:** Railway containers do not have persistent volumes for the AI service (this is correct; stateless containers are the goal). Only Redis is persistent.

**How to avoid:** After `update_reward()` is called in the optimization endpoint, immediately persist to Redis using `save_pricing_state()`. Load from Redis (not filesystem) in `model_loader.py` during startup.

**Warning signs:** After a Railway restart, pricing confidence scores reset to 0.0 (cold-start). Contextual learning from previous days is lost. The `state` dict is always `{}` at startup.

### Pitfall 3: Version Mismatch Between Training Container and Serving Container

**What goes wrong:** Training runs in the CI `ubuntu-latest` environment with Python 3.12 + pip-installed packages at pinned versions. If the serving `Dockerfile` installs the same `requirements.txt`, versions SHOULD match — but if `requirements.txt` is updated without retraining, models become stale.

**Why it happens:** `xgboost==3.2.0` in requirements.txt, but CI pip-installs it directly. If the Dockerfile is rebuilt without running training again, the versions still match (both use `requirements.txt`). The real risk is if training is done locally by a developer with a different version.

**How to avoid:** Training scripts should write `.meta.json` sidecars with `sklearn.__version__` and `xgboost.__version__`. `model_loader.py` validates these at startup and raises `RuntimeError` on mismatch. The weekly CI workflow trains in the same Python environment as the Dockerfile build.

**Warning signs:** Service crashes at startup with `RuntimeError: Model version mismatch`. This is intentional behavior per AI-05.

### Pitfall 4: 30-Second Health Check Deadline vs. Prophet Warmup

**What goes wrong:** Railway's health check must pass within the configured `healthcheckTimeout`. Prophet's first prediction (JIT compilation of Stan model) can take 5-15 seconds on first call. If the warmup is not complete before `/health` returns 200, Railway will route live traffic before the service is ready.

**Why it happens:** The current `startup_event()` calls `load_models()` which loads the Prophet joblib file quickly (the file I/O is fast), but the first `model.predict()` call is slow. Health check is at `/health` which only checks `is_models_loaded()` — it doesn't verify that Prophet has actually run a prediction.

**How to avoid:** Add a `_prophet_warmed_up: bool = False` flag in `model_loader.py`. Run a warmup prediction inside `load_models()` and set the flag to `True` only after warmup completes. Make `/health` return `503` until `_prophet_warmed_up` is `True`. Set `healthcheckTimeout = 45` in `railway.toml` (not 30s).

**Warning signs:** First requests to `/api/v1/optimization/capacity` return slow responses (10+ seconds) while subsequent requests are fast. The first response may timeout.

### Pitfall 5: Training Scripts Expect API Routes That Don't Exist Yet

**What goes wrong:** `train_no_show.py` and `train_clv.py` call `/api/internal/features/training/no-show` and `/api/internal/features/training/clv`. If the CI workflow runs training before those routes are deployed, the scripts fall back to synthetic data. This is by design — but the CI workflow ordering must be correct (Next.js deployed first, then training, then AI image built).

**Why it happens:** The training scripts have graceful fallback to synthetic data, so CI won't fail — but the models will be trained on synthetic data even when real data is available.

**How to avoid:** In `train-models.yml`, add a step to call a health check on the deployed Next.js app before running training scripts. Pass `SCHEDULEBOX_API_URL` as an env var so training scripts can reach the live API.

**Warning signs:** Training logs show `"API unavailable (...), generating synthetic training data"` even in production CI runs.

### Pitfall 6: XGBoost `use_label_encoder=False` Deprecated Parameter

**What goes wrong:** `train_no_show.py` passes `use_label_encoder=False` to `XGBClassifier`. This parameter was deprecated in XGBoost 1.6 and removed in later versions. With xgboost==3.2.0, this will raise a `TypeError` at training time.

**Why it happens:** The training script was written for an older XGBoost API.

**How to avoid:** Remove `use_label_encoder=False` from the `XGBClassifier` constructor. It is no longer needed (label encoding is disabled by default).

**Warning signs:** CI training step fails with `TypeError: __init__() got an unexpected keyword argument 'use_label_encoder'`.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Internal Training Route — API Key Validation Pattern

```typescript
// apps/web/app/api/internal/features/training/no-show/route.ts
// Pattern: inline auth (not Next.js middleware.ts which excludes /api/*)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@schedulebox/database';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  // AI_SERVICE_API_KEY check
  const apiKey = req.headers.get('x-ai-service-key');
  const expected = process.env.AI_SERVICE_API_KEY;
  if (expected && apiKey !== expected) {
    return NextResponse.json({ error: 'Unauthorized', code: 'INVALID_API_KEY' }, { status: 401 });
  }

  const rows = await db.execute(sql`
    SELECT ... FROM bookings b JOIN services s ON s.id = b.service_id
    WHERE b.status IN ('completed', 'no_show')
    LIMIT 5000
  `);

  return NextResponse.json(rows);
}
```

### sklearn InconsistentVersionWarning → RuntimeError

```python
# services/ai/app/services/model_loader.py — version validation
# Source: scikit-learn.org/1.4/model_persistence.html
import warnings
from sklearn.exceptions import InconsistentVersionWarning

warnings.simplefilter("error", InconsistentVersionWarning)

try:
    raw_model = joblib.load(model_path)
except InconsistentVersionWarning as e:
    raise RuntimeError(
        f"sklearn version mismatch for {model_name}: {e.original_sklearn_version} "
        f"vs running {sklearn.__version__}"
    ) from e
```

### Prophet JSON Serialization

```python
# Source: facebook.github.io/prophet/docs/additional_topics.html
from prophet.serialize import model_to_json, model_from_json
import json

# Save in training script
with open("capacity_v1.0.0.json", "w") as f:
    json.dump(model_to_json(prophet_model), f)

# Load in model_loader.py
with open("capacity_v1.0.0.json", "r") as f:
    prophet_model = model_from_json(json.load(f))
```

### Railway Config as Code

```toml
# services/ai/railway.toml
# Source: docs.railway.com/reference/config-as-code
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port 8000"
healthcheckPath = "/health"
healthcheckTimeout = 45
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### GitHub Actions Weekly Retraining with Manual Dispatch

```yaml
# .github/workflows/train-models.yml
# Source: docs.github.com/actions/using-workflows/events-that-trigger-workflows
name: Weekly Model Retraining

on:
  schedule:
    - cron: '0 3 * * 0'  # Sunday 03:00 UTC
  workflow_dispatch:       # AI-06: manual dispatch option

jobs:
  retrain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install -r services/ai/requirements.txt
        working-directory: services/ai
      - name: Train no-show model
        run: python -m scripts.train_no_show
        working-directory: services/ai
        env:
          SCHEDULEBOX_API_URL: ${{ secrets.SCHEDULEBOX_INTERNAL_URL }}
      - name: Train CLV model
        run: python -m scripts.train_clv
        working-directory: services/ai
        env:
          SCHEDULEBOX_API_URL: ${{ secrets.SCHEDULEBOX_INTERNAL_URL }}
      - name: Train capacity model
        run: python -m scripts.train_capacity
        working-directory: services/ai
        env:
          SCHEDULEBOX_API_URL: ${{ secrets.SCHEDULEBOX_INTERNAL_URL }}
```

### Redis Pricing State — Async Persistence

```python
# Source: existing feature_store.py pattern in services/ai/app/services/
import redis.asyncio as aioredis
import json

PRICING_STATE_KEY = "ai:pricing:mab_state"

async def persist_pricing_state(redis_url: str, state: dict) -> None:
    client = aioredis.from_url(redis_url, decode_responses=True)
    await client.set(PRICING_STATE_KEY, json.dumps(state))
    await client.aclose()
```

### ThreadPoolExecutor for ML Inference

```python
# Source: asyncio docs + FastAPI concurrency docs
import asyncio
from concurrent.futures import ThreadPoolExecutor

_thread_pool = ThreadPoolExecutor(max_workers=4)

async def predict_no_show_endpoint(request: NoShowPredictionRequest):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        _thread_pool,
        no_show_model.predict,
        features,
    )
    return result
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| ------------ | ---------------- | ------------ | ------- |
| `fbprophet` PyPI package | `prophet` PyPI package | v1.0 (2021) | Package is already `prophet==1.1.6` in requirements.txt — correct |
| XGBoost joblib/pickle | XGBoost `.json` / `.ubj` native format | XGBoost 2.1.0 (2024) | UBJSON is now default; but the sklearn `XGBClassifier` wrapper still requires joblib; use `.meta.json` sidecar for version tracking |
| XGBoost `use_label_encoder=False` | Removed parameter | XGBoost 1.6+ | Must remove from `XGBClassifier()` call in `train_no_show.py` |
| Filesystem MAB state | Redis-backed state | This phase | Railway containers are ephemeral — Redis is the only durable option |
| Heuristic fallback (confidence=0.4) | Trained XGBoost (confidence=0.82) | This phase | Success criterion: `confidence > 0.5` and `fallback: false` |
| Prophet joblib | Prophet JSON via `model_to_json` | This phase | Bug fix — existing `train_capacity.py` uses joblib incorrectly |

**Deprecated/outdated in this codebase:**

- `use_label_encoder=False` in `train_no_show.py`: Remove it — XGBoost 3.x will reject this parameter.
- `joblib.dump(forecaster.model)` for Prophet in `train_capacity.py`: Replace with `model_to_json`.
- Filesystem `pricing_state.json`: Replace with Redis persistence via `pricing_redis.py`.

---

## Open Questions

1. **XGBoost version validation — native `.save_model()` vs joblib sidecar approach**
   - What we know: XGBoost official docs recommend `.save_model()` (JSON format) for cross-version stability. But `XGBClassifier` as a sklearn estimator requires joblib to serialize the full sklearn wrapper.
   - What's unclear: Should we store BOTH a `booster.save_model()` JSON AND the sklearn wrapper joblib? Or just use the joblib + `.meta.json` sidecar for version pinning?
   - Recommendation: Use joblib for `XGBClassifier` (as currently implemented) + add `.meta.json` sidecar with `xgboost.__version__`. The startup validation in `model_loader.py` checks the sidecar before loading the joblib. This satisfies AI-05 without requiring architectural changes to training scripts.

2. **Training CI workflow: train against real API or synthetic data?**
   - What we know: Training scripts fall back to synthetic data if the API URL is unavailable. Synthetic data produces functional but not production-quality models.
   - What's unclear: Whether the weekly retraining should hit the live production Next.js API (real data) or use synthetic data always (simpler, reproducible).
   - Recommendation: Pass `SCHEDULEBOX_INTERNAL_URL` as a GitHub Actions secret (the internal Railway URL of the Next.js app). Training scripts already handle the fallback gracefully if the secret is absent.

3. **Capacity model: GradientBoostingRegressor vs Prophet**
   - What we know: The prior decision in the phase context says "Capacity optimizer uses GradientBoostingRegressor (not LSTM)." But the existing `CapacityForecaster` uses Prophet, and `train_capacity.py` trains Prophet. The metadata.json also records Prophet.
   - What's unclear: Does the "GradientBoostingRegressor" decision replace Prophet for capacity? Or does it refer to a different model (the capacity "optimizer" vs capacity "forecaster")?
   - Recommendation: Treat `CapacityForecaster` (Prophet) and "Capacity optimizer using GradientBoostingRegressor" as separate concerns: Prophet for time series demand forecasting (already built), GBR for capacity slot optimization (a future feature). Do not replace Prophet with GBR in this phase.

4. **Prophet startup warmup time budget**
   - What we know: Prophet's first prediction can take 5-15 seconds due to Stan JIT. Railway healthcheck timeout is set to 45s in our railway.toml draft.
   - What's unclear: Whether 45 seconds is enough for Prophet warmup + model loading + health check. Actual timing must be measured.
   - Recommendation: Run Prophet warmup as part of `startup_event()`. Set `healthcheckTimeout = 45`. If testing shows this is insufficient, increase to 60s or run `prophet.fit()` during the Docker build to pre-compile Stan.

---

## Sources

### Primary (HIGH confidence)

- Official Facebook Prophet docs (`facebook.github.io/prophet/docs/additional_topics.html`) — model serialization, warm-start, JSON format
- XGBoost official docs (`xgboost.readthedocs.io/en/stable/tutorials/saving_model.html`) — save_model/load_model, UBJSON format, joblib incompatibility warning
- scikit-learn 1.4 docs (`scikit-learn.org/1.4/model_persistence.html`) — `InconsistentVersionWarning`, `original_sklearn_version` attribute, warnings → error promotion pattern
- Railway Config as Code docs (`docs.railway.com/reference/config-as-code`) — complete TOML schema with `builder`, `startCommand`, `healthcheckPath`, `healthcheckTimeout`, `restartPolicyType`
- Existing codebase files (read directly):
  - `services/ai/requirements.txt` — exact library versions
  - `services/ai/app/services/model_loader.py` — current model loading patterns
  - `services/ai/app/models/pricing.py` — MAB state structure
  - `services/ai/scripts/train_no_show.py` — `use_label_encoder=False` bug
  - `services/ai/scripts/train_capacity.py` — Prophet/joblib incorrect usage
  - `services/ai/app/services/feature_store.py` — async Redis pattern to follow
  - `services/ai/app/config.py` — `AI_SERVICE_API_KEY` already in settings
  - `apps/web/lib/middleware/route-handler.ts` — existing auth middleware pattern

### Secondary (MEDIUM confidence)

- Railway FastAPI deployment guide (`docs.railway.com/guides/fastapi`) — Dockerfile builder, health check setup
- GitHub Actions docs (`docs.github.com/actions/using-workflows/events-that-trigger-workflows`) — cron schedule syntax, `workflow_dispatch` combination

### Tertiary (LOW confidence)

- FastAPI ThreadPoolExecutor community discussion (`github.com/fastapi/fastapi/discussions/5969`) — ThreadPoolExecutor vs ProcessPoolExecutor for ML; XGBoost GIL behavior. The requirement specifies ThreadPoolExecutor (not ProcessPoolExecutor), so follow the requirement regardless of the theoretical GIL argument.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already in requirements.txt, versions verified by reading the file directly
- Architecture: HIGH — patterns derived from existing codebase + official docs; no guesswork
- Pitfalls: HIGH for Prophet/joblib (official docs), HIGH for use_label_encoder (XGBoost changelog), MEDIUM for Prophet warmup timing (no exact benchmark available)
- Railway config: HIGH — TOML schema verified from official docs
- Version validation approach: MEDIUM — `InconsistentVersionWarning` is verified from sklearn docs; the custom `.meta.json` sidecar approach is a pattern, not an official sklearn recommendation

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable libraries; Prophet and XGBoost APIs are stable)
