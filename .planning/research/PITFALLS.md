# Pitfalls Research

**Domain:** Adding Python ML microservice, UI polish, B2B landing page, and workflow improvements to existing ScheduleBox SaaS (62k LOC, v1.1 production-hardened)
**Researched:** 2026-02-21
**Confidence:** MEDIUM-HIGH (see per-pitfall confidence notes)

---

## Critical Pitfalls

Mistakes that cause rewrites, production incidents, or launch blockers.

---

### Pitfall 1: joblib Model Version Mismatch Between Training and Serving Environments

**What goes wrong:**
The AI service (`services/ai/`) loads 7 models via `joblib.load()` at startup. If the Python environment used to train models has a different scikit-learn or XGBoost version than the Docker runtime, `joblib.load()` either fails silently (returns a broken model that gives wrong predictions) or raises a cryptic `AttributeError` / `ValueError` on first prediction call — not at load time.

**Why it happens:**
Models are trained locally with `pip install -r requirements.txt`, then serialized with `joblib.dump()`. The Docker image pins `scikit-learn==1.5.2` and `xgboost==3.2.0` in `requirements.txt`. But if a developer trains on a newer package version (e.g., via `pip install --upgrade xgboost`), the saved `.joblib` file silently embeds that version's internal format. The model loads but predicts garbage, or fails the first time a new feature field is referenced.

**Consequences:**
- No-show predictions return 0.0 for every booking (heuristic fallback triggers, no alert)
- CLV predictions are systematically wrong; SMS gating (AI score > 0.7) never triggers
- Silent degradation: service reports `healthy` because health_score (pure RFM, no model) always loads

**How to avoid:**
1. Pin Python AND library versions in both training scripts and `requirements.txt` — they must match exactly.
2. Save a metadata sidecar file alongside every model:
   ```python
   # services/ai/scripts/train_no_show.py
   import json, joblib, sklearn, xgboost
   metadata = {
       "model_name": "no_show",
       "version": "1.0.0",
       "trained_at": datetime.utcnow().isoformat(),
       "sklearn_version": sklearn.__version__,
       "xgboost_version": xgboost.__version__,
       "python_version": platform.python_version(),
       "features": list(X_train.columns),
   }
   joblib.dump(model, "models/no_show_v1.0.0.joblib")
   with open("models/no_show_v1.0.0.meta.json", "w") as f:
       json.dump(metadata, f, indent=2)
   ```
3. In `model_loader.py`, validate the sidecar at startup:
   ```python
   # Check version compatibility before trusting loaded model
   meta_path = no_show_path.replace(".joblib", ".meta.json")
   if os.path.exists(meta_path):
       with open(meta_path) as f:
           meta = json.load(f)
       if meta["sklearn_version"] != sklearn.__version__:
           logger.error(f"Model sklearn version {meta['sklearn_version']} != runtime {sklearn.__version__}")
           raise RuntimeError("Model version mismatch — retrain required")
   ```
4. Use Docker to train models (same image as serving), not local Python.

**Warning signs:**
- All prediction endpoints return identical scores across all bookings
- Logs show `UserWarning: Trying to unpickle estimator` during model load
- `is_models_loaded()` returns True but `/api/v1/predictions/no-show` returns default 0.3

**Phase to address:** AI Service phase (v1.2 Phase 1 — the first phase that actually trains real models)

---

### Pitfall 2: Railway Restarts Kill Trained Model State (Pricing MAB State Loss)

**What goes wrong:**
The `PricingOptimizer` model uses a Multi-Armed Bandit that learns from booking outcomes over time — its state is stored in `models/pricing_state.json`. On Railway, when the AI service container restarts (deploys, OOM, health check failure), the `models/` directory is ephemeral. The trained MAB state is lost. The optimizer silently reverts to cold-start, offering random pricing until it re-converges (weeks of data).

**Why it happens:**
Railway containers have no persistent filesystem by default. The `models/` directory in the Docker image is static (baked at build time). The MAB state that accumulates from production bookings is written to the in-container filesystem, which disappears on restart. The `model_loader.py` gracefully logs "cold-start MAB" and continues — so no alert fires.

**Consequences:**
- Pricing optimizer loses learned signal; becomes random for 2-4 weeks
- SMB owners who configured dynamic pricing see unexpected price variations
- A/B test results corrupted (MAB forgets which prices worked)
- Silent: no errors, no health check failure, just quietly stupid pricing

**How to avoid:**
1. Persist MAB state to Redis (already in the stack) after every update:
   ```python
   # services/ai/app/models/pricing.py
   async def record_outcome(self, arm_id: str, reward: float):
       self.state[arm_id]["reward"] += reward
       self.state[arm_id]["pulls"] += 1
       # Persist to Redis after every update — survives restarts
       await redis_client.set(
           "pricing_mab_state",
           json.dumps(self.state),
           ex=86400 * 30  # 30-day TTL as safety net
       )
   ```
2. On startup, load from Redis first, fall back to `pricing_state.json`:
   ```python
   state_json = await redis_client.get("pricing_mab_state")
   if state_json:
       state = json.loads(state_json)
   else:
       # Fall back to baked-in initial state
       state = load_from_json(pricing_path)
   ```
3. For joblib models (no-show, CLV, capacity), use Railway Volumes (persistent storage) or store trained `.joblib` files in Cloudflare R2 (already in the stack) and download at startup.

**Warning signs:**
- Pricing optimizer logs "cold-start MAB" after a service restart
- Pricing variance increases sharply after each deployment
- Redis `pricing_mab_state` key is empty/missing after restart

**Phase to address:** AI Service phase — model persistence must be designed before training begins, not after

---

### Pitfall 3: uvicorn Single Worker Causes ML Request Queuing Under Load

**What goes wrong:**
The Dockerfile uses `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]` — a single uvicorn worker. ML inference (XGBoost no-show predictions, Prophet capacity forecasting) blocks the event loop because scikit-learn/XGBoost are CPU-bound, not async. Under concurrent load (e.g., 10 bookings at once trigger no-show predictions), requests queue behind each other. The Next.js API times out waiting for the AI service.

**Why it happens:**
FastAPI's `async def` handlers do not help with CPU-bound ML computation — they only help with I/O-bound work. A single worker processes one prediction at a time. The Next.js backend calls the AI service synchronously and already has a circuit breaker, but if AI service is slow (not down), the circuit stays closed and requests pile up.

**Consequences:**
- 10 concurrent bookings cause 9 to wait sequentially
- AI service response time degrades from 200ms to 2000ms under load
- Next.js API route times out (default 30s), booking confirmation delayed
- Railway scales memory, not concurrency — adding more RAM does not fix this

**How to avoid:**
1. Run CPU-bound inference in a thread pool executor, not the async event loop:
   ```python
   # services/ai/app/routers/predictions.py
   import asyncio
   from concurrent.futures import ThreadPoolExecutor

   _executor = ThreadPoolExecutor(max_workers=4)

   @router.post("/predictions/no-show")
   async def predict_no_show(request: PredictionRequest):
       model = get_no_show_model()
       # Run blocking ML inference in thread pool — doesn't block event loop
       result = await asyncio.get_event_loop().run_in_executor(
           _executor,
           model.predict,  # CPU-bound, blocking function
           request.features
       )
       return result
   ```
2. For production load, use `gunicorn -k uvicorn.workers.UvicornWorker -w 2` (2 workers). With the current model sizes (no-show ~10MB, CLV ~5MB), 2 workers = ~2x model memory. With Railway Pro (up to 32GB), this is acceptable.
3. Do NOT use `--preload` with gunicorn when models use joblib — PyTorch/joblib models can fail to share correctly across forked processes (copy-on-write breaks for some numpy internal state).

**Warning signs:**
- AI service P95 latency > 500ms under normal load
- Railway metrics show CPU at 100% but only 1 vCPU used
- Booking confirmation takes >3s when multiple bookings happen simultaneously

**Phase to address:** AI Service phase — concurrency model must be correct before load testing

---

### Pitfall 4: AI Service JWT Auth Mismatch — NextAuth.js Salt vs Python Verification

**What goes wrong:**
The Next.js app uses NextAuth.js for auth, which adds a salt to JWT secrets by default (NEXTAUTH_SECRET). The AI service config has `AI_SERVICE_API_KEY: str = ""` — it uses its own API key for service-to-service auth. If the implementation adds JWT verification to the Python service but uses the raw NEXTAUTH_SECRET without accounting for the NextAuth salt, all token verifications fail in production (200 in dev because `AI_SERVICE_API_KEY = ""` skips auth).

**Why it happens:**
NextAuth.js does not use plain HMAC-SHA256 JWTs — it uses JWE (JSON Web Encryption) with salt. Decoding these tokens in Python requires the `python-jose` library AND the same salt derivation. Developers assume a shared `JWT_SECRET` env var is enough, copy the secret to Python, decode fails with `JWTError`, add `try/except`, swallow the error, and ship unauthenticated AI endpoints to production.

**Consequences:**
- Python AI service accessible without authentication in production
- Any service that knows the internal Railway hostname can call AI endpoints directly
- Tenant isolation broken: Company A could request no-show predictions for Company B's bookings

**How to avoid:**
1. Use service-to-service API key (already designed in `config.py`) — never share user JWTs with the AI service:
   ```python
   # services/ai/app/routers/predictions.py — enforce in production
   from fastapi import Header, HTTPException
   from ..config import settings

   async def verify_api_key(x_api_key: str = Header(...)):
       if settings.ENVIRONMENT != "development" and x_api_key != settings.AI_SERVICE_API_KEY:
           raise HTTPException(status_code=401, detail="Invalid API key")

   @router.post("/predictions/no-show", dependencies=[Depends(verify_api_key)])
   async def predict_no_show(...):
   ```
2. Generate a strong API key (32+ bytes) and set in Railway environment variables for both Next.js (caller) and AI service (verifier).
3. In Next.js, forward the API key — never a user JWT:
   ```typescript
   // apps/web/app/api/v1/bookings/route.ts
   const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/predictions/no-show`, {
     headers: { 'x-api-key': process.env.AI_SERVICE_API_KEY }
   });
   ```
4. Verify auth is active by testing: a request without the API key must return 401 in staging.

**Warning signs:**
- AI service logs show requests from unknown IPs with no API key
- `AI_SERVICE_API_KEY` is empty string in production Railway env vars
- No 401 responses in AI service access logs

**Phase to address:** AI Service phase — auth must be correct before any real models are deployed

---

### Pitfall 5: UI Polish Breaks Existing Booking Widget Embedded on Customer Sites

**What goes wrong:**
ScheduleBox has an embeddable booking widget (`/embed` route, likely under `/apps/web/app/embed/`). When UI polish changes global CSS variables (Tailwind config, shadcn CSS tokens in `globals.css`), the widget's embedded iframe picks up those changes. SMB owners who have the widget embedded on their own WordPress/Wix sites see unexpected style changes without warning, breaking their brand consistency. Worse, if a global class name changes, the widget CSS breaks entirely.

**Why it happens:**
Developers focus on the main app UI and treat globals.css as safe to change. CSS custom properties (`--background`, `--foreground`, `--primary`) are defined globally. The embed route shares the same globals. No visual regression testing targets the embed URL specifically.

**Consequences:**
- Booking widget on customer sites displays wrong colors or broken layout
- SMB owners see their business look unprofessional during demos
- Hard to reproduce: issue only visible on external sites, not in dev environment
- Trust erosion: "Why did my booking widget change?"

**How to avoid:**
1. Scope embed-specific CSS to the embed route — do not inherit from global tokens:
   ```css
   /* apps/web/app/embed/embed.css — isolated from global changes */
   :root {
     --embed-primary: #2563eb;
     --embed-background: #ffffff;
   }
   /* Never reference var(--primary) in embed components */
   ```
2. Before any UI polish phase, take Playwright screenshots of the embed widget and add them to visual regression baseline:
   ```typescript
   // tests/e2e/embed-widget.spec.ts
   test('embed widget unchanged after UI polish', async ({ page }) => {
     await page.goto('/embed?companySlug=test-company');
     await expect(page).toHaveScreenshot('embed-widget.png', { maxDiffPixels: 0 });
   });
   ```
3. Create a `EMBED_STABLE` list of CSS classes and Tailwind utilities that must not change. CI fails if these are modified without an explicit embed review step.

**Warning signs:**
- PR modifies `globals.css` or `tailwind.config.ts` without mentioning embed widget in description
- Visual regression test for `/embed` not in the E2E suite (it wasn't in Phase 18 test scope)
- SMB owners file support tickets about widget appearance after a deploy

**Phase to address:** UI Polish phase (must precede any globals.css changes with embed baseline established first)

---

### Pitfall 6: shadcn/ui Component Updates Break Custom Overrides

**What goes wrong:**
shadcn/ui components in `apps/web/components/ui/` are owned source files — they are NOT npm packages that auto-update. When the UI polish phase runs `npx shadcn@latest add button` to get a new component or updates an existing one via `npx shadcn diff`, the CLI overwrites local customizations (custom variants, accessibility improvements, Czech locale-specific modifications).

**Why it happens:**
The shadcn "copy-paste ownership" model means updates are manual. Developers running `npx shadcn@latest add` for a new component inadvertently use the global `components.json` config, which may overwrite existing UI files. The toast component is deprecated in favor of sonner (shadcn changelog 2025); updating pulls in sonner but existing toast usage across 31 pages is broken.

**Consequences:**
- Custom button variants (`variant="czech-primary"`) disappear from the component after a CLI update
- 121 API routes have error responses that use `toast()` — migrating to sonner requires touching every page
- CSS class renames (Radix UI migration: `@radix-ui/react-*` → `radix-ui`) break 66 components simultaneously

**How to avoid:**
1. Before any UI polish, snapshot all modified shadcn components:
   ```bash
   # Run diff for every component in ui/ before touching anything
   npx shadcn diff button > .planning/shadcn-diffs/button-before.txt
   npx shadcn diff card > .planning/shadcn-diffs/card-before.txt
   # ... for each component
   ```
2. Never run `npx shadcn add [existing-component]` during polish — it overwrites. Only add NEW components.
3. Create a `CUSTOMIZATIONS.md` in `apps/web/components/ui/` documenting every custom change per component so they can be re-applied after any update.
4. Toast-to-sonner migration: scope it as its own phase with full regression test run. Do not mix it with visual polish.

**Warning signs:**
- `npx shadcn diff` shows unstaged changes after the polish PR merges (means overwrite happened)
- Console errors about missing `@radix-ui/react-toast` after a dependency update
- Custom variants producing TypeScript errors (`Property 'czech-primary' does not exist`)

**Phase to address:** UI Polish phase (run shadcn diff audit before starting, document all customizations)

---

### Pitfall 7: Landing Page Missing Czech-Specific Legal Requirements Kills Demo Credibility

**What goes wrong:**
A B2B SaaS landing page for the Czech market ships with English legalese, cookie banner that pre-checks analytics consent, and no GDPR-compliant privacy policy in Czech. During a sales demo to a Czech SMB owner, they click the cookie banner, see a pre-checked box, and immediately distrust the product. The sales team cannot close a deal with a product that visibly violates GDPR in front of the prospect.

**Why it happens:**
Developers copy cookie consent patterns from English-language SaaS templates. The Czech Electronic Communications Act (2022 amendment) shifted from opt-out to strict opt-in for non-essential cookies. Pre-checked boxes are explicitly illegal under Czech law (since 2022). Most cookie libraries default to opt-out patterns.

**Consequences:**
- Demo fails because prospect points out GDPR violation
- UOOU (Czech data protection authority) fine risk (up to €20M or 4% global revenue)
- Brand damage: SMB owners tell each other in industry groups ("their own product violates GDPR")
- Cookie analytics data is legally tainted — cannot use it for conversion optimization

**How to avoid:**
1. Use an opt-in-only cookie consent implementation — no pre-checked boxes, ever:
   ```typescript
   // apps/web/app/[locale]/page.tsx (landing page)
   // Use a consent library that defaults to rejected state
   // Recommended: Cookieless first-party analytics (Plausible, Fathom) — avoids consent entirely
   ```
2. Landing page legal checklist before first demo:
   - [ ] Cookie banner: analytics/marketing unchecked by default
   - [ ] Privacy policy in Czech (`/cs/privacy`) linked in footer
   - [ ] Terms of Service in Czech (`/cs/terms`) linked in footer
   - [ ] Contact: Czech company address, IČO (company registration number), DPH (VAT ID) visible
   - [ ] GDPR-compliant contact form: explicit consent checkbox for data processing
3. Prefer Plausible Analytics (no cookies, GDPR-exempt) over Google Analytics for the landing page — eliminates the consent problem entirely.
4. The landing page footer must include: name, registered address, IČO, GDPR contact. Czech B2B buyers check this to verify legitimacy before demo calls.

**Warning signs:**
- Cookie banner has pre-ticked checkboxes
- Privacy policy page is missing or in English only
- Company IČO/address not visible in footer
- Google Analytics (GA4) running without consent management

**Phase to address:** Landing Page phase (legal compliance must be done before first external demo, not post-launch)

---

### Pitfall 8: "Improving" Booking Workflow Breaks Existing Customer Sessions Mid-Flow

**What goes wrong:**
Workflow improvements to the booking flow (multi-step form, slot selection UX, calendar component) change the URL structure, query parameter names, or React state shape. Customers who have the booking page open in a browser tab (or on a slow mobile connection) complete a booking after a deploy and hit a 404, broken API contract, or stale state that submits to a renamed field — resulting in a lost booking.

**Why it happens:**
The booking flow is a multi-step process that stores intermediate state in URL params or React state (`/booking/[step]`, query params like `?serviceId=123`). Renaming steps or query params breaks in-flight sessions. Developers test the happy path from a fresh browser; they never test "user is halfway through and the app deploys."

**Consequences:**
- Customer fills out 3-step booking form, submit fails with 422 (field renamed)
- Customer rage-quits, books with competitor
- No-show rate artificially spikes (bookings counted as started but not completed)
- The business owner blames the software during demos ("sometimes bookings just fail")

**How to avoid:**
1. Treat booking flow changes as a backward-compatible API: old query params must redirect to new ones for at least 2 deploy cycles:
   ```typescript
   // apps/web/app/[locale]/[company_slug]/booking/page.tsx
   // If old param name exists, redirect to new param name
   const legacyServiceId = searchParams.get('service_id'); // old name
   const serviceId = searchParams.get('serviceId') ?? legacyServiceId; // new name
   ```
2. Session-safe deploys: store multi-step booking state in `sessionStorage` (already survives page refresh), not URL params. URL params change across deploys; sessionStorage keys can be versioned.
3. Add an E2E test that starts the booking flow, navigates to step 2, then does a hard refresh, then completes — must succeed without errors.
4. Never rename a booking API field without adding an alias in the Zod schema for one release cycle.

**Warning signs:**
- PR renames a query parameter without adding a redirect for the old name
- Booking abandonment rate increases after a workflow improvement deploy
- Zod validation errors spike in production API logs after a workflow change

**Phase to address:** Workflow Improvements phase (define backward compatibility policy before touching booking flow)

---

## Moderate Pitfalls

Cause friction or rework, but recoverable without data loss.

---

### Pitfall 9: ML Models Baked Into Docker Image Cause 10-Minute Deploy Times

**What goes wrong:**
The current Dockerfile copies `./models` into the image (`COPY ./models ./models`). When trained models are committed to the repository or built into the Docker image (even as large binary files excluded from git), a model update triggers a full Docker rebuild and re-deploy. A 100MB set of model files causes Railway to rebuild the entire image layer. Deploy time goes from 2 minutes to 10+ minutes.

**Why it happens:**
It is convenient to bundle models with code. But models and code have very different update frequencies — code updates multiple times per day, models retrain weekly. Coupling them forces code deploys to wait for model files.

**Consequences:**
- Emergency code fixes (auth bugs, booking errors) take 10+ minutes to deploy because models are in the layer
- Developers start committing placeholder model stubs to avoid long builds (breaks actual predictions)
- Railway build minutes quota exhausted faster (cost increase)

**How to avoid:**
1. Load models from Cloudflare R2 at startup (already in the stack), not from the Docker image:
   ```python
   # services/ai/app/services/model_loader.py
   import boto3  # boto3 works with Cloudflare R2 (S3-compatible)

   async def download_model_from_r2(model_name: str, version: str) -> str:
       s3 = boto3.client('s3',
           endpoint_url=settings.R2_ENDPOINT,
           aws_access_key_id=settings.R2_ACCESS_KEY,
           aws_secret_access_key=settings.R2_SECRET_KEY,
       )
       local_path = f"/tmp/models/{model_name}_{version}.joblib"
       if not os.path.exists(local_path):
           s3.download_file(settings.R2_BUCKET, f"models/{model_name}_{version}.joblib", local_path)
       return local_path
   ```
2. Keep a `models/metadata.json` (small, text file) in the image that specifies which model version to download. Update metadata to trigger model rollout without code deploy.
3. Cache downloaded models in `/tmp/` between requests (restarts clear the cache, triggering a fresh download from R2 on next startup — acceptable).

**Warning signs:**
- Docker image exceeds 1GB
- Railway deploy logs show "COPY ./models" layer taking >60 seconds
- Model files appearing in git commits (`*.joblib` files not in `.gitignore`)

**Phase to address:** AI Service phase (design the model storage strategy before the first model is trained)

---

### Pitfall 10: Prophet (Capacity Forecaster) Memory Usage Spikes on First Prediction

**What goes wrong:**
Prophet (used for capacity forecasting) imports `pystan` or `cmdstanpy` on first use, which initializes a full Bayesian sampling engine. The first request to the capacity forecasting endpoint can spike memory by 300-500MB for 2-3 seconds. On Railway's usage-based billing, this triggers an OOM restart if the service is running near its memory limit.

**Why it happens:**
Prophet's Stan backend performs JIT compilation on first inference call. This is well-known in the MLOps community but not documented in the Prophet README. The Docker health check passes (health endpoint doesn't call Prophet), but the first real capacity prediction request causes an OOM.

**Consequences:**
- First capacity forecast request fails with 502 (OOM restart)
- Railway restarts the container, next request triggers OOM again (death loop)
- Capacity forecasting feature appears broken in production; heuristic fallback permanently active

**How to avoid:**
1. Warm up Prophet at startup with a synthetic prediction (costs ~2 seconds at boot, prevents OOM on first request):
   ```python
   # services/ai/app/services/model_loader.py — add after capacity model loads
   async def warmup_prophet():
       """Run a synthetic capacity prediction to initialize Stan backend."""
       model = get_capacity_model()
       if model and model.model:
           try:
               import pandas as pd
               dummy_future = model.model.make_future_dataframe(periods=7)
               model.model.predict(dummy_future)
               logger.info("Prophet Stan backend warmed up")
           except Exception as e:
               logger.warning(f"Prophet warmup failed: {e}")
   ```
2. Set Railway memory limit to 1.5GB for the AI service (not the default). Prophet needs headroom.
3. Monitor Railway memory metrics; alert if >80% usage at idle (before any Prophet requests).

**Warning signs:**
- Railway metrics show memory spike to >1GB on first capacity forecast request
- Container restart immediately after first prediction in production logs
- `SIGKILL` in Railway logs (OOM signal)

**Phase to address:** AI Service phase (must be tested under realistic memory constraints before production)

---

### Pitfall 11: Landing Page Social Proof Uses Placeholder Data During Live Demo

**What goes wrong:**
The landing page ships with "Join 500+ Czech businesses using ScheduleBox" and testimonials from "Jana K., Praha" — all placeholder. A potential Czech SMB customer Googles "ScheduleBox recenze" or asks "Can I talk to a reference customer?" The sales team has no real customers to reference during the v1.2 launch window.

**Why it happens:**
Landing page templates include social proof slots. Developers fill them with realistic-sounding placeholder data. No one coordinates with the sales/business team to replace placeholders with real customer quotes before launch. The placeholders ship to production.

**Consequences:**
- Prospect googles the fake testimonial name, finds nothing, loses trust
- "500+ businesses" claim is false advertising (Živnostenský zákon / Trade Licensing Act)
- Demo fails when prospect asks for a reference call
- Czech market is small (10M people) — word gets around fast

**How to avoid:**
1. Before the landing page phase begins, gather at least 3 real testimonials from beta users or pilot customers. If none exist, do not include a testimonials section — omission is better than fake.
2. Use honest, verifiable numbers: "In beta since 2026" is better than "500+ businesses."
3. Social proof checklist gating the landing page launch:
   - [ ] All testimonials are from real, named individuals who have given written consent
   - [ ] Statistics ("X bookings managed") are calculated from real production data
   - [ ] Case study companies can be contacted by prospects (have approved the reference)
   - [ ] "Join X businesses" number is updated from the database on each deploy

**Warning signs:**
- Testimonial section uses first-name-last-initial format ("Jana K.") — classic placeholder pattern
- Statistics are round numbers ("500+ businesses") without a data source
- PR adding the landing page includes placeholder content without a "REPLACE BEFORE LAUNCH" ticket

**Phase to address:** Landing Page phase (social proof strategy must be determined before coding the section)

---

### Pitfall 12: Workflow "Improvements" That Add Steps Instead of Removing Them

**What goes wrong:**
The workflow improvement phase adds a confirmation dialog to the booking cancellation flow "to prevent accidental cancellations." Business owners who cancel many bookings daily now need 2 clicks instead of 1. The improvement that was meant to reduce friction adds friction for power users. The improvement that adds a "smart rebooking suggestion" after cancellation adds an extra screen that 90% of users dismiss. Users adapt by ignoring the feature, but it increases the perceived complexity of the app.

**Why it happens:**
Workflow improvements are designed by developers (who use the app infrequently) based on assumptions about what "feels safer." Real Czech SMB owners (hairdressers, physiotherapists) use the app dozens of times per day. What feels like a helpful confirmation is actually a speed bump to a power user.

**Consequences:**
- "Improvements" increase time-to-complete-action for the most common workflows
- SMB owners ask to "turn off the new popups" in support tickets
- Over-engineered features slow down the app for the 20% of workflows that account for 80% of usage

**How to avoid:**
1. The rule for workflow improvements: measure first. Before any change, instrument the current flow with analytics and measure the actual time-to-complete for the target action.
2. Only add a step if there is evidence of a real problem (e.g., accidental cancellation support tickets). Do not add steps preemptively.
3. For every proposed workflow change, answer: "What does the hairdresser using this 30 times a day think?" If in doubt, ask a real pilot customer.
4. Preference for progressive disclosure over confirmation dialogs: show advanced options on demand, not by default.

**Warning signs:**
- PR description says "to prevent accidental X" without citing how many actual accidental X incidents occurred
- New workflow has more steps than the old one
- Feature adds a screen that has a "Skip" or "Maybe later" button (users will always skip)

**Phase to address:** Workflow Improvements phase (define "improvement" as "fewer steps for common paths, not safer paths for rare mistakes")

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Train models locally, commit `.joblib` to git | Fast iteration | Binary files bloat repo; version mismatch risk; 10-min deploys | Never — use R2 storage from the start |
| Skip `AI_SERVICE_API_KEY` in dev (empty string in config) | No auth setup needed | Pattern carries to production if env var not set in Railway | Dev only — production must enforce |
| Hardcode Czech city/address examples in landing page ("Praha, Brno") | Feels local | Excludes Slovak market (Bratislava, Košice) — product targets CZ/SK | Never if Slovak launch is planned |
| Use Google Analytics without consent management | Rich analytics data | Illegal under Czech Electronic Communications Act (2022) | Never |
| Reuse booking workflow components as-is in landing page demo video | Fast to film | Demo video becomes outdated after every UI polish | Acceptable for early demos, plan a re-record |
| Prophet capacity model with no warmup | Simpler startup code | OOM on first production request | Never |
| Run uvicorn single-worker in production | Simpler deployment | CPU-bound ML blocks all concurrent requests | Dev/staging only |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| Next.js → Python AI service | Use user JWT token for auth | Use dedicated `AI_SERVICE_API_KEY` (symmetric, not derived from NEXTAUTH_SECRET) |
| Python → Redis (feature store) | Open new Redis connection per request | Use connection pool; single `redis.Redis` instance at module level |
| joblib → Railway deploy | Rebuild Docker image when model updates | Store models in Cloudflare R2; download at startup; separate model version from code version |
| shadcn/ui CLI → existing components | Run `npx shadcn add [existing]` during polish | Only add new components; use `npx shadcn diff` to compare without overwriting |
| Czech landing page → GDPR | Use Google Analytics without consent flow | Use Plausible (no consent needed) or implement strict opt-in cookie consent |
| Booking workflow → in-flight sessions | Rename URL params without redirect | Add old-name aliases in Zod schema and URL redirect for one deploy cycle |
| Prophet → production memory | Load model without warmup | Run a synthetic prediction during `startup_event()` to initialize Stan backend |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| CPU-bound ML in async event loop | AI service P95 > 500ms; single CPU at 100% | Use `run_in_executor(ThreadPoolExecutor)` for inference | Under any concurrent load (>2 simultaneous prediction requests) |
| joblib model loaded per-request | Memory spikes; GC pressure | Load once at startup into module-level `_models` dict (already implemented correctly in `model_loader.py`) | From first request |
| Prophet Stan JIT on first request | 502 on first capacity forecast; OOM restart | Warmup during startup_event | First request after cold start |
| Tailwind CSS purge too aggressive | Dynamically generated class names stripped | Use safelist in `tailwind.config.ts` for any classes generated via string interpolation | Production only (purge is dev-disabled) |
| Landing page hero image unoptimized | CLS (Cumulative Layout Shift) > 0.25; Core Web Vitals fail | Use Next.js `<Image>` with `width`, `height`, `priority` for LCP hero | On every page load; especially mobile |
| Multiple Redis connections in Python service | Connection pool exhaustion; `ConnectionError` under load | Single `redis.Redis(connection_pool=ConnectionPool(...))` at module level | At >50 concurrent AI service requests |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| `AI_SERVICE_API_KEY` empty string in production | Any caller can make predictions for any company (tenant isolation bypassed) | Validate at startup: raise if production and API key empty |
| `joblib.load()` from user-supplied path or unvalidated source | Arbitrary code execution (joblib uses pickle internally) | Only load from hardcoded model directory; never accept model file paths from API requests |
| Landing page contact form stores email without consent checkbox | GDPR Article 6 violation; UOOU fine | Explicit opt-in checkbox: "I consent to ScheduleBox processing my email for the purpose of responding to this inquiry" |
| Czech IČO and DPH not displayed on landing page | Breach of Czech Trade Licensing Act; unenforceable contracts | Display IČO, DIČ, registered address in footer |
| AI service `/docs` (Swagger UI) enabled in production | Exposes all ML model input schemas; aids automated attacks | `docs_url=None` in production (already implemented in `main.py` — verify env var is set correctly) |
| Embed widget `CORS: *` in production | Any site can embed your booking widget | Restrict allowed origins in embed route to customer's registered domains only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| AI prediction scores shown raw ("no-show risk: 0.847") | SMB owners don't know what 0.847 means | Show actionable labels: "High risk — consider SMS reminder" |
| ML features requiring 6+ months of data shown immediately | New customers see "Insufficient data" for every AI feature | Show onboarding state: "AI features activate after 10 bookings" with progress indicator |
| Booking workflow "improvements" add confirmation dialogs | Power users slower; 30-booking-per-day hairdressers frustrated | Make confirmations opt-in (advanced setting), not default |
| Landing page CTA "Start Free Trial" with no pricing visible | Czech SMB buyers distrust hidden pricing; they leave | Show pricing on landing page; Czech B2B buyers research cost before demo calls |
| Landing page in English only | Czech SMB owners without strong English skip to competitor | Primary landing page must be Czech; English as alternate, not default |
| AI predictions wrong during cold start (no training data) | Business owners lose trust in AI features before they work | Clear "learning mode" indicator; show heuristic confidence band until trained model available |

---

## "Looks Done But Isn't" Checklist

- [ ] **AI service authentication:** `AI_SERVICE_API_KEY` is non-empty in production Railway env vars — verify with `railway run --environment production env | grep AI_SERVICE_API_KEY`
- [ ] **Model files:** All 7 model `.joblib` files exist in the model directory or R2 storage — verify via `GET /health` which should report each model status individually
- [ ] **Prophet warmup:** Capacity forecaster does NOT 502 on first request — test in staging with `curl -X POST /api/v1/optimization/capacity` immediately after cold deploy
- [ ] **Cookie consent:** Landing page cookie banner has no pre-checked boxes — verify with a fresh incognito browser session
- [ ] **Czech legal footer:** IČO, DIČ, registered address visible in landing page footer — checklist item before first external demo
- [ ] **Embed widget isolation:** Embed widget CSS unchanged after globals.css edits — compare Playwright screenshot to baseline
- [ ] **Booking backward compatibility:** Old query param names still work after any booking workflow change — test with a saved bookmark using old URL
- [ ] **Social proof:** All testimonials and statistics are real and verifiable — no placeholders in production
- [ ] **Swagger UI disabled:** `GET https://ai.schedulebox.cz/docs` returns 404 in production — verify after first production deploy
- [ ] **Model version metadata:** Each `.joblib` file has a matching `.meta.json` with library versions — verify via `ls models/*.meta.json`

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Model version mismatch in production | MEDIUM | Retrain model in same Docker environment; redeploy AI service; takes 30-60 minutes |
| MAB pricing state lost on restart | LOW | State rebuilds from Redis if persisted there; if not persisted, 2-4 weeks to reconverge — accept as-is |
| Prophet OOM death loop | HIGH | Set Railway memory limit to 1.5GB immediately; add warmup; redeploy — requires code change |
| Cookie consent GDPR violation found | MEDIUM | Disable non-essential tracking immediately; fix consent banner; consider legal counsel for UOOU notification |
| Embed widget broken on customer sites | HIGH | Hotfix rollback CSS to previous version; notify affected customers; takes 2-4 hours for trust recovery |
| Workflow change breaks in-flight bookings | MEDIUM | Deploy old query param aliases immediately; manually process lost bookings from logs; 2-6 hours |
| Fake testimonials discovered | HIGH | Remove immediately; issue public clarification; rebuilding Czech B2B trust takes months |
| AI service unauthenticated in production | CRITICAL | Deploy with `AI_SERVICE_API_KEY` set immediately; audit access logs for unauthorized calls; treat as security incident |

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Research Flag |
|---|---|---|---|
| **AI Service — Model Training** | joblib version mismatch between training env and Docker | Use Docker for training; save `.meta.json` with library versions | NO |
| **AI Service — Deployment** | Prophet OOM on first request | Add startup warmup; set Railway memory limit ≥1.5GB | NO |
| **AI Service — Auth** | `AI_SERVICE_API_KEY` empty in production | Startup validation: raise if production and key is empty | NO |
| **AI Service — Concurrency** | Single uvicorn worker blocks under concurrent load | `run_in_executor(ThreadPoolExecutor)` for CPU-bound inference | NO |
| **AI Service — Model Storage** | Models baked in Docker cause 10-min deploys | Store in Cloudflare R2; download at startup | YES — research R2 download latency vs startup time |
| **UI Polish — shadcn** | `npx shadcn add` overwrites customizations | Run `npx shadcn diff` first; never add existing components | NO |
| **UI Polish — Embed Widget** | globals.css changes break embedded widget on customer sites | Playwright visual regression on `/embed` before polish starts | NO |
| **Landing Page — Legal** | Cookie consent violates Czech law; no Czech legal footer | Strict opt-in cookie consent; Czech IČO/address in footer | NO |
| **Landing Page — Social Proof** | Fake testimonials visible during live demos | Gate landing page launch on having real testimonials | NO |
| **Workflow Improvements** | Adding steps instead of removing them | Measure current completion time; only change if data shows real problem | NO |
| **Workflow Improvements — Booking** | Renamed params break in-flight bookings | Old param aliases required for one deploy cycle | NO |
| **MAB Pricing State** | Railway restart loses learned pricing state | Persist to Redis after every MAB update | YES — research Redis key expiry strategy for MAB state |

---

## Sources

- [FastAPI + Multiple Workers RAM Issue](https://github.com/fastapi/fastapi/discussions/7069) — HIGH confidence (official repo discussion, primary source)
- [Mastering Gunicorn and Uvicorn for FastAPI](https://medium.com/@iklobato/mastering-gunicorn-and-uvicorn-the-right-way-to-deploy-fastapi-applications-aaa06849841e) — MEDIUM confidence
- [Railway FastAPI Deployment Guide](https://docs.railway.com/guides/fastapi) — HIGH confidence (official Railway docs)
- [Memory Leak FastAPI on Railway](https://help.railway.com/questions/memory-leak-in-fast-api-only-on-railway-f80c567b) — MEDIUM confidence (community, Railway Help Station)
- [scikit-learn Model Persistence](https://scikit-learn.org/1.5/modules/model_persistence.html) — HIGH confidence (official scikit-learn docs)
- [XGBoost pickle version incompatibility](https://github.com/dmlc/xgboost/issues/6264) — HIGH confidence (official XGBoost issue tracker)
- [Python Pickle Security Vulnerabilities — Acunetix](https://www.acunetix.com/vulnerabilities/web/python-pickle-serialization/) — HIGH confidence
- [joblib Security Risk](https://github.com/joblib/joblib/issues/1582) — MEDIUM confidence (official repo issue)
- [NextAuth.js JWT and Shared Microservice Auth](https://github.com/nextauthjs/next-auth/discussions/7001) — MEDIUM confidence
- [Czech Cookie Consent Requirements — CookieYes](https://www.cookieyes.com/blog/cookie-consent-czech-republic/) — HIGH confidence
- [Czech Electronic Communications Act 2022 — Secureprivacy](https://secureprivacy.ai/blog/czech-cookie-law) — HIGH confidence
- [Czech GDPR — TermsFeed](https://www.termsfeed.com/blog/czech-republic-gdpr/) — MEDIUM confidence
- [shadcn/ui Changelog 2025](https://ui.shadcn.com/docs/changelog) — HIGH confidence (official docs)
- [Updating shadcn/ui Components — Vercel Academy](https://vercel.com/academy/shadcn-ui/updating-and-maintaining-components) — HIGH confidence
- [B2B Landing Page Conversion Rates 2026 — First Page Sage](https://firstpagesage.com/seo-blog/b2b-landing-page-conversion-rates/) — MEDIUM confidence
- [9 B2B Landing Page Lessons — Instapage](https://instapage.com/blog/b2b-landing-page-best-practices) — MEDIUM confidence
- [ML Model Versioning Best Practices — LakeFS](https://lakefs.io/blog/model-versioning/) — MEDIUM confidence
- [Model Drift and Retraining — SmartDev](https://smartdev.com/ai-model-drift-retraining-a-guide-for-ml-system-maintenance/) — MEDIUM confidence
- [Circuit Breaker Pattern in FastAPI — Medium](https://blog.stackademic.com/system-design-1-implementing-the-circuit-breaker-pattern-in-fastapi-e96e8864f342) — MEDIUM confidence
- [opossum Node.js Circuit Breaker](https://github.com/nodeshift/opossum) — HIGH confidence (official repo)

---

_Pitfalls research for: ScheduleBox v1.2 Product Readiness (AI service, UI polish, landing page, workflow improvements)_
_Researched: 2026-02-21_
