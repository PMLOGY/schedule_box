# Technology Stack — v1.2 Product Readiness

**Project:** ScheduleBox v1.2
**Focus:** Python AI microservice (7 ML models), UI/UX polish, landing page, workflow improvements
**Researched:** 2026-02-21
**Confidence:** HIGH (versions verified against PyPI, npm, official docs)

> **Scope:** This document covers ONLY new additions for v1.2. The full v1.1 stack (Vitest,
> Playwright, MSW, nodemailer, Twilio, Comgate, BullMQ, prom-client, etc.) remains unchanged.
> Do not re-introduce or re-evaluate any technology already in production.

---

## Executive Summary

v1.2 adds three capability areas, each with a distinct technology footprint:

1. **Python AI microservice** — FastAPI 0.129 + scikit-learn 1.8 + XGBoost 3.2 + pandas 3.0,
   served as a Docker sidecar communicating with the existing Next.js app via internal HTTP.
   OpenAI SDK 2.21 is already documented in the project spec for voice booking integration.

2. **UI/UX polish and landing page** — Motion (formerly Framer Motion) 12.34 for scroll
   animations and page transitions; `tw-animate-css` replacing `tailwindcss-animate` as shadcn/ui
   now defaults to it; react-big-calendar for the booking calendar view upgrade.

3. **Workflow improvements** — Driver.js 1.4 for lightweight onboarding tours; the existing
   react-hook-form + Zod + Zustand stack (already in codebase) handles multi-step booking
   wizard with no new libraries needed beyond animation.

**Key constraints to respect:**
- AI service must be a separate Docker container (Python), not embedded into Next.js
- All ML models require graceful fallback (documented in Part VIII, lines 7055-7103)
- pandas 3.0 has breaking changes (Copy-on-Write default, string dtype change) — use `>=3.0`
  but test carefully; alternatively pin `pandas>=2.3,<3.0` if instability found during dev
- scikit-learn 1.8 dropped Python 3.10 support; use Python 3.12 consistently

---

## Recommended Stack — NEW Additions Only

### AI Microservice: Core Framework

| Technology | Version  | Purpose                        | Why Recommended                                                                                                                         |
| ---------- | -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **FastAPI** | ^0.129.0 | REST API framework for ML serving | ASGI-native (async), auto-generates OpenAPI docs, Pydantic v2 validation built-in, 100ms latency target achievable, the Python ML serving standard |
| **uvicorn** | ^0.34.0  | ASGI server                    | Official ASGI server for FastAPI; use `--workers 2` flag in production (Kubernetes pod) instead of gunicorn wrapper (deprecated pattern as of 2026) |
| **pydantic** | ^2.10.0 | Request/response validation    | FastAPI 0.129+ requires Pydantic v2 (>=2.7.0); v2 is 5-50x faster than v1 due to Rust core; provides typed ML input/output schemas |
| **pydantic-settings** | ^2.7.0 | Environment config management  | Reads env vars into typed Pydantic models; standard FastAPI config pattern |

**Rationale:**
- **FastAPI over Flask:** Flask is synchronous WSGI; FastAPI is async ASGI, critical for the
  no-show predictor's `< 100ms` latency target. FastAPI also generates OpenAPI docs automatically,
  which the Node.js client can use for type-safe calling.
- **Uvicorn without Gunicorn:** The `tiangolo/uvicorn-gunicorn-fastapi` Docker image is officially
  deprecated. Modern pattern: `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2`. The AI
  service runs in Kubernetes — horizontal scaling handles load, not process-level workers.
- **Pydantic v2 only:** FastAPI 0.129 has removed legacy `pydantic.v1` compatibility shim. Use v2
  exclusively. Do not mix v1 models.

**Install:**
```bash
# services/ai-service/requirements.txt
fastapi>=0.129.0
uvicorn[standard]>=0.34.0
pydantic>=2.10.0
pydantic-settings>=2.7.0
```

### AI Microservice: ML Libraries

| Technology | Version | Purpose | Why Recommended |
| ---------- | ------- | ------- | --------------- |
| **scikit-learn** | ^1.8.0 | CLV predictor (Random Forest), Health Score (Gradient Boosting), Smart Reminder (Bayesian Opt) | Industry standard, joblib-compatible persistence, sklearn estimator interface for XGBoost interop |
| **xgboost** | ^3.2.0  | No-show predictor (XGBoost binary classification), Upselling (collaborative filtering base) | Docs spec `Algorithm: XGBoost`; 3.2 resolves sklearn 1.6+ incompatibility (issue #11093 fixed); Python 3.12 fully supported |
| **numpy** | ^2.4.0  | Array operations, feature vectors | Foundation for all ML libraries; 2.4.2 is latest stable (Feb 2026); required by sklearn and XGBoost |
| **pandas** | ^3.0.1  | Feature engineering, ETL pipeline | 3.0.1 stable (Feb 17, 2026); Copy-on-Write default improves memory for batch jobs; Python 3.11+ required |
| **joblib** | ^1.4.0  | Model serialization/persistence | Recommended by scikit-learn for persisting models containing NumPy arrays; more efficient than pickle for large models |
| **scipy** | ^1.15.0 | Bayesian optimization (Smart Reminder Timing model) | Provides `scipy.stats` distributions and optimization routines needed for Bayesian opt |

**Rationale for algorithm-to-library mapping:**

| Model (from docs Part VIII) | Algorithm | Library |
| --------------------------- | --------- | ------- |
| No-show Predictor | XGBoost binary classification | `xgboost>=3.2` |
| CLV Predictor | Random Forest regression | `scikit-learn` `RandomForestRegressor` |
| Smart Upselling | Item-based collaborative filtering | `scikit-learn` `NearestNeighbors` (cosine similarity) |
| Pricing Optimizer | Multi-Armed Bandit (epsilon-greedy) | Pure Python + `numpy` (no heavy library needed) |
| Capacity Optimizer | Time-series forecasting | `scikit-learn` `GradientBoostingRegressor` (simpler LSTM alternative for v1.2 scope); defer TensorFlow/PyTorch to v1.3 |
| Customer Health Score | Weighted RFM + Gradient Boosting | `scikit-learn` `GradientBoostingClassifier` |
| Smart Reminder Timing | Bayesian Optimization | `scipy.optimize` |

> **Decision on Capacity Optimizer:** The docs specify LSTM (deep learning). For v1.2 demo-readiness,
> implement with `GradientBoostingRegressor` (tabular time-series features: hour, day, week, seasonality
> as encoded features). LSTM requires TensorFlow/PyTorch (+500MB container, complex training infra).
> The Gradient Boosting version achieves 80% of LSTM accuracy with 10% of the complexity. Add a
> `CAPACITY_MODEL_TYPE` env var to swap to LSTM in v1.3.

**Pandas 3.0 breaking change warning:**
```python
# BEFORE (pandas 2.x) — will error in 3.0:
df.loc[mask, 'col'] = value  # may raise ChainedAssignmentError

# AFTER (pandas 3.0) — correct pattern:
df = df.copy()
df.loc[mask, 'col'] = value
# OR use .assign() pattern
```

**Install:**
```bash
scikit-learn>=1.8.0
xgboost>=3.2.0
numpy>=2.4.0
pandas>=3.0.1
joblib>=1.4.0
scipy>=1.15.0
```

### AI Microservice: Infrastructure Libraries

| Technology | Version | Purpose | Why Recommended |
| ---------- | ------- | ------- | --------------- |
| **httpx** | ^0.28.0 | Async HTTP client (PostgreSQL ETL via internal API, health checks) | Recommended by FastAPI docs for service-to-service calls; supports async/await; replaces `requests` for async contexts |
| **apscheduler** | ^3.11.0 | Scheduled ML model retraining (weekly/monthly cron) | Standard FastAPI background scheduling; CronTrigger for "Sunday 3:00 AM" retraining schedule specified in docs |
| **asyncpg** | ^0.30.0 | Async PostgreSQL driver (ETL feature extraction) | Native async PostgreSQL driver; 3-5x faster than psycopg2 for I/O-bound queries; used for nightly feature extraction |
| **redis** | ^5.2.0  | Prediction caching (Redis 7 already in stack) | Cache repeated predictions (same booking_id → same result within TTL); reduces model inference under load |
| **structlog** | ^24.4.0 | Structured JSON logging | JSON logs integrate with existing Grafana/Loki stack; `structlog` is simpler to configure than stdlib logging for FastAPI |

**Rationale:**
- **asyncpg over psycopg2:** The AI service does nightly bulk feature extraction (ETL from PostgreSQL).
  asyncpg is 3-5x faster for this I/O-heavy workload. No SQLAlchemy needed — raw async queries are
  simpler for ETL scripts.
- **APScheduler over Celery:** Celery adds RabbitMQ worker complexity. The AI service already runs
  inside Docker/K8s; APScheduler's `BackgroundScheduler` handles the weekly retraining cron without
  another queue. Use `CronTrigger(day_of_week='sun', hour=3)` for the no-show predictor schedule.
- **Redis caching:** The no-show predictor is called per-booking (latency < 100ms requirement). Cache
  predictions keyed by `booking_id` with 30-minute TTL. Existing Redis 7 instance is reused — no
  new infrastructure.

**Install:**
```bash
httpx>=0.28.0
apscheduler>=3.11.0
asyncpg>=0.30.0
redis>=5.2.0
structlog>=24.4.0
```

### AI Microservice: OpenAI Integration (Voice Booking Model)

| Technology | Version | Purpose | Why Recommended |
| ---------- | ------- | ------- | --------------- |
| **openai** | ^2.21.0 | Voice booking (GPT-based NLU for booking intent extraction) | Official SDK v2.21 (Feb 14, 2026); async-native with `httpx` transport; type-safe Pydantic response models |

**Rationale:**
- Voice booking (model 7 in docs) uses OpenAI for natural language understanding — extracting
  service, date, time, and customer intent from voice/text input. This is the only model that
  legitimately requires an external LLM API rather than scikit-learn.
- OpenAI SDK v2.21 uses the Responses API (new primitive, replacing Chat Completions) — use
  `client.responses.create()` for new implementations per OpenAI migration guide.
- Store `OPENAI_API_KEY` in Kubernetes Secret (not env plain text).

**Install:**
```bash
openai>=2.21.0
```

---

### Frontend: UI/UX Polish and Landing Page

| Technology | Version | Purpose | Why Recommended |
| ---------- | ------- | ------- | --------------- |
| **motion** (formerly framer-motion) | ^12.34.0 | Page transitions, scroll reveal, micro-animations, landing page hero | 12.34.2 current (Feb 21, 2026); `motion/react` import for App Router; replaces deprecated `framer-motion` package name while maintaining API compatibility |
| **tw-animate-css** | ^1.2.0 | Tailwind-native enter/exit animations for components | shadcn/ui now defaults to `tw-animate-css` over `tailwindcss-animate`; CSS-first (no JS plugin), Tailwind v4 compatible; provides `animate-in`, `fade-in`, `slide-in-from-*` utilities |

**Rationale:**
- **Motion (not react-spring):** ScheduleBox needs page transitions, scroll-triggered reveals on
  the landing page, and card entrance animations — all declarative use cases. Motion's `whileInView`,
  `useScroll`, and `AnimatePresence` cover these directly with minimal code. react-spring is better
  for physics-simulated interactions (not the primary need here).
- **Motion with Next.js App Router:** Requires `"use client"` wrapper components. Pattern: create
  `components/motion-wrapper.tsx` as a client component, import inside server components. This is
  the standard pattern — do NOT use `motion` directly in Server Components.
- **tw-animate-css over tailwindcss-animate:** shadcn/ui deprecated `tailwindcss-animate` as of
  Tailwind v4 migration. New projects use `tw-animate-css`. Existing `tailwindcss-animate` install
  (if present) should be migrated: remove plugin from `globals.css`, install `tw-animate-css`,
  add `@import "tw-animate-css"` to CSS.

**Install:**
```bash
pnpm add motion tw-animate-css
```

**Motion usage pattern for Next.js App Router:**
```typescript
// components/motion-wrapper.tsx  — MUST be 'use client'
'use client';
export { motion, AnimatePresence, useScroll, useTransform, useInView } from 'motion/react';

// Usage in Server Component page:
import { motion } from '@/components/motion-wrapper';
// motion is already a client boundary — no hydration issues
```

### Frontend: Booking Calendar Upgrade

| Technology | Version | Purpose | Why Recommended |
| ---------- | ------- | ------- | --------------- |
| **react-big-calendar** | ^1.15.0 | Google-Calendar-style booking view with day/week/month views | 743K weekly npm downloads (3.5x FullCalendar); MIT license; shadcn-ui-big-calendar adds shadcn CSS variable theming; supports drag-drop rescheduling via react-dnd integration |
| **react-dnd** | ^16.0.0 | Drag-and-drop rescheduling for calendar events | Peer dependency for react-big-calendar drag-drop; HTML5 backend sufficient for desktop booking management |

**Rationale:**
- **react-big-calendar over FullCalendar:** react-big-calendar is MIT, 3.5x more downloaded, and
  has a community shadcn theme (`shadcn-ui-big-calendar`) that matches existing design system CSS
  variables. FullCalendar's React wrapper requires the premium license for advanced features. For
  the ScheduleBox booking view, react-big-calendar's week/day views are the primary need.
- **Drag-and-drop:** Staff rescheduling bookings via drag is a key UX improvement for v1.2.
  react-big-calendar's built-in DnD addon uses react-dnd. Add `react-big-calendar/lib/addons/dragAndDrop`
  — this is included in the main package, not a separate install.

**Install:**
```bash
pnpm add react-big-calendar react-dnd react-dnd-html5-backend
pnpm add -D @types/react-big-calendar
```

### Frontend: Onboarding Tour

| Technology | Version | Purpose | Why Recommended |
| ---------- | ------- | ------- | --------------- |
| **driver.js** | ^1.4.0 | First-time user onboarding tour, feature highlights, contextual help | Zero dependencies, vanilla TypeScript (works with any framework), 1.4.0 stable, Next.js App Router compatible via client component; lighter than react-joyride |

**Rationale:**
- **Driver.js over react-joyride:** react-joyride has unresolved bugs dating to 2020 and requires
  React-specific setup. Driver.js is framework-agnostic with zero dependencies, integrates with
  Next.js as a `"use client"` component, and covers the primary use case (step-by-step element
  highlighting). For ScheduleBox v1.2 (owner onboarding + first-booking wizard), Driver.js's
  API is simpler.
- **Not needed:** `intro.js` (GPL license, commercial use requires paid license — avoid for SaaS).

**Install:**
```bash
pnpm add driver.js
```

---

## What NOT to Add

| Avoid | Why | Use Instead |
| ----- | --- | ----------- |
| **TensorFlow / PyTorch** | Adds 500MB+ to AI service Docker image; LSTM for Capacity Optimizer is overkill for v1.2 demo readiness | `GradientBoostingRegressor` from scikit-learn achieves 80% of LSTM accuracy at 1% complexity |
| **MLflow** | Model registry overkill for 7 models in a single service; adds Postgres/S3 dependency, separate MLflow server | `joblib.dump()` + versioned file naming in Cloudflare R2 (`no_show_v2.3.pkl`) |
| **Celery** | Adds RabbitMQ worker configuration for AI service — already have RabbitMQ but adding Celery worker is high config overhead | APScheduler `BackgroundScheduler` inside FastAPI for cron retraining; existing BullMQ (Node.js) for queue tasks |
| **GSAP** | Professional animation library (paid for commercial use unless using free tier with restrictions) | Motion (Framer Motion) is free MIT, covers all landing page animation needs |
| **react-joyride** | Unresolved bugs since 2020, React-specific, heavier bundle | driver.js (zero deps, framework-agnostic, MIT) |
| **tailwindcss-animate** | Deprecated by shadcn/ui in favor of tw-animate-css for Tailwind v4 | `tw-animate-css` |
| **Mobiscroll / Syncfusion / DevExtreme** | Commercial licenses, $$$, unnecessary for SMB scheduling app | `react-big-calendar` (MIT, sufficient features) |
| **celery-beat** | Adds config for scheduled ML tasks in Celery | APScheduler 3.11 built into FastAPI process |
| **gunicorn** (as process manager) | `tiangolo/uvicorn-gunicorn-fastapi` Docker image deprecated 2025; Gunicorn adds overhead | `uvicorn --workers 2` directly; K8s HPA handles scaling |
| **onnx / onnxruntime** | Model conversion pipeline adds complexity; no latency problem to solve at ScheduleBox's scale | Direct scikit-learn/XGBoost inference; < 100ms met without ONNX |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
| -------- | ----------- | ----------- | ------- |
| ML framework | scikit-learn 1.8 + XGBoost 3.2 | PyTorch / TensorFlow | 500MB+ Docker images; neural nets unnecessary for tabular booking data; no GPU in K8s cluster |
| API framework (Python) | FastAPI 0.129 | Flask + Gunicorn | Flask is sync WSGI — doesn't meet < 100ms latency target under concurrent load; no async support |
| Animation | motion 12.34 | react-spring | react-spring better for physics-sim; ScheduleBox needs scroll-reveal + page transitions (declarative) — Motion is simpler |
| Animation | motion 12.34 | GSAP | GSAP commercial license required for SaaS; Motion is MIT, sufficient for ScheduleBox needs |
| Calendar | react-big-calendar | FullCalendar | FullCalendar premium features require paid license; react-big-calendar MIT + 3.5x more downloads |
| Onboarding | driver.js | react-joyride | react-joyride has known unresolved bugs; driver.js is zero-dep, lighter |
| Model persistence | joblib | MLflow model registry | MLflow requires separate server + database; overkill for 7 models in one service |
| Scheduling | APScheduler | Celery | Celery requires separate worker process + configuration; APScheduler runs in-process, simpler |
| Capacity Optimizer | GradientBoosting (sklearn) | LSTM (PyTorch) | LSTM requires deep learning infra; GradientBoosting achieves 80% accuracy with tabular features at 1/10th complexity |

---

## Complete Installation Reference

### AI Service (Python)

```bash
# services/ai-service/requirements.txt
fastapi>=0.129.0
uvicorn[standard]>=0.34.0
pydantic>=2.10.0
pydantic-settings>=2.7.0
scikit-learn>=1.8.0
xgboost>=3.2.0
numpy>=2.4.0
pandas>=3.0.1
joblib>=1.4.0
scipy>=1.15.0
httpx>=0.28.0
apscheduler>=3.11.0
asyncpg>=0.30.0
redis>=5.2.0
structlog>=24.4.0
openai>=2.21.0
```

```dockerfile
# services/ai-service/Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Frontend (Node.js / pnpm)

```bash
# New production dependencies
pnpm add motion tw-animate-css
pnpm add react-big-calendar react-dnd react-dnd-html5-backend
pnpm add driver.js

# New dev dependencies
pnpm add -D @types/react-big-calendar
```

---

## Integration Points with Existing Stack

### AI Service ↔ Next.js API Routes

The Next.js API route calls the Python AI service via internal HTTP (Docker network / K8s service):

```typescript
// apps/web/app/api/v1/ai/no-show-prediction/route.ts
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://ai-service:8000';

async function getNoShowPrediction(bookingId: number) {
  const response = await fetch(`${AI_SERVICE_URL}/ai/no-show-prediction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.AI_SERVICE_KEY! },
    body: JSON.stringify({ booking_id: bookingId }),
    signal: AbortSignal.timeout(5000), // 5s timeout → triggers fallback
  });

  if (!response.ok) throw new Error(`AI service error: ${response.status}`);
  return response.json();
}
```

The existing `getAIPrediction()` circuit breaker wrapper (docs lines 7079-7101) wraps this call.
No new packages needed in the Next.js app for AI integration — plain `fetch` with timeout is sufficient.

### AI Service ↔ PostgreSQL (ETL)

The AI service connects directly to PostgreSQL for nightly feature extraction:

```python
# services/ai-service/src/pipeline/feature_extraction.py
import asyncpg
import os

async def extract_no_show_features(company_id: int) -> pd.DataFrame:
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    rows = await conn.fetch("""
        SELECT b.id, b.created_at, b.start_time,
               c.no_show_count, c.total_bookings,
               s.duration_minutes, s.price
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN services s ON b.service_id = s.id
        WHERE b.company_id = $1
          AND b.status IN ('completed', 'no_show')
          AND b.created_at > NOW() - INTERVAL '12 months'
    """, company_id)
    await conn.close()
    return pd.DataFrame([dict(r) for r in rows])
```

This uses `asyncpg` (not Drizzle ORM) — the AI service is Python and needs a Python driver.
The `DATABASE_URL` env var already exists in the stack.

### AI Service ↔ Redis (Prediction Cache)

```python
# services/ai-service/src/cache.py
import redis.asyncio as redis_async
import json

r = redis_async.from_url(os.environ['REDIS_URL'])

async def get_cached_prediction(key: str):
    cached = await r.get(key)
    return json.loads(cached) if cached else None

async def cache_prediction(key: str, value: dict, ttl: int = 1800):  # 30 min TTL
    await r.setex(key, ttl, json.dumps(value))
```

Reuses the existing Redis 7 instance. No new Redis configuration needed.

### Motion ↔ Next.js App Router

```typescript
// apps/web/components/motion-wrapper.tsx
'use client';
// Re-export from motion/react — this file is the client boundary
export {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
} from 'motion/react';
```

```typescript
// apps/web/app/(marketing)/page.tsx — Server Component
import { motion } from '@/components/motion-wrapper';

// ✓ Works: motion is imported from a 'use client' file
// ✗ Would fail: import { motion } from 'motion/react' directly in Server Component
```

### react-big-calendar ↔ shadcn/ui Theme

```typescript
// apps/web/components/booking-calendar.tsx
'use client';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Override react-big-calendar CSS variables to match shadcn/ui theme
// in globals.css:
// .rbc-calendar { --rbc-border-color: hsl(var(--border)); }
// .rbc-event { background-color: hsl(var(--primary)); }
```

---

## Version Compatibility Matrix

| Package | Version | Python/Node Req | Compatible With | Notes |
| ------- | ------- | --------------- | --------------- | ----- |
| fastapi | ^0.129.0 | Python >=3.10 | pydantic >=2.7.0 | 0.129.0 drops Python 3.9 support |
| scikit-learn | ^1.8.0 | Python 3.11-3.14 | numpy >=2.0 | 1.8 dropped Python 3.10; use Python 3.12 |
| xgboost | ^3.2.0 | Python >=3.10 | scikit-learn >=1.6 | 3.2 fixes sklearn 1.6+ `sklearn_tags` incompatibility |
| numpy | ^2.4.0 | Python 3.10+ | sklearn 1.8, xgboost 3.2 | 2.x API changes from 1.x — check for `np.bool` → `np.bool_` |
| pandas | ^3.0.1 | Python 3.11+ | numpy 2.x | Copy-on-Write default; string dtype changed from object |
| motion | ^12.34.0 | Node 18+ | React 18/19, Next.js 14 | Import from `motion/react` not `framer-motion` |
| react-big-calendar | ^1.15.0 | Node 18+ | React 18/19 | Requires CSS import; add moment or date-fns as peer |

**Critical:** scikit-learn 1.8 requires Python >=3.11. The project spec says Python 3.12 — this is
consistent. Do NOT downgrade to Python 3.10 for the AI service Docker container.

---

## Sources

- FastAPI 0.129.0 release — https://pypi.org/project/fastapi/ (HIGH confidence, verified Feb 2026)
- scikit-learn 1.8.0 release notes — https://scikit-learn.org/stable/whats_new.html (HIGH confidence, Dec 2025)
- XGBoost 3.2.0 — https://pypi.org/project/xgboost/ + sklearn compatibility fix https://github.com/dmlc/xgboost/issues/11093 (HIGH confidence, Feb 2026)
- NumPy 2.4.2 — https://numpy.org/news/ (HIGH confidence, Feb 2026)
- pandas 3.0.1 — https://pandas.pydata.org/docs/whatsnew/v3.0.0.html (HIGH confidence, Feb 2026)
- Motion 12.34.2 — https://www.npmjs.com/package/motion (HIGH confidence, Feb 21, 2026)
- Motion + Next.js App Router pattern — https://motion.dev/docs/react (HIGH confidence)
- tw-animate-css replacing tailwindcss-animate — https://ui.shadcn.com/docs/tailwind-v4 (HIGH confidence)
- react-big-calendar npm downloads — https://npmtrends.com/fullcalendar-vs-react-big-calendar (MEDIUM confidence)
- driver.js 1.4.0 — https://www.npmjs.com/package/driver.js (HIGH confidence)
- OpenAI Python SDK 2.21.0 — https://pypi.org/project/openai/ (HIGH confidence, Feb 14, 2026)
- uvicorn without gunicorn (modern pattern) — https://fastapi.tiangolo.com/deployment/docker/ (HIGH confidence)
- APScheduler for FastAPI background tasks — https://apscheduler.readthedocs.io (MEDIUM confidence, community-verified)
- FastAPI + httpx service-to-service — https://www.python-httpx.org/async/ (HIGH confidence)

---

_Stack research for: ScheduleBox v1.2 Product Readiness_
_Researched: 2026-02-21_
