---
phase: 23-ai-service-training-pipeline
verified: 2026-02-24T13:21:02Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 23: AI Service Training Pipeline -- Verification Report

**Phase Goal:** AI service returns real trained predictions instead of heuristic fallbacks, with model versioning, state persistence, and production-grade deployment on Railway
**Verified:** 2026-02-24T13:21:02Z
**Status:** PASSED
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Training scripts fetch real feature data from internal API routes | VERIFIED | All 3 scripts send x-ai-service-key header to /api/internal/features/training/*; fall back to synthetic on API failure |
| 2 | No-show predictor is a real XGBoost model (not heuristic-only) | VERIFIED | train_no_show.py trains XGBClassifier and saves .joblib; model_loader.py loads it; fallback only when file missing |
| 3 | Pricing optimizer state persists across container restarts via Redis | VERIFIED | pricing_redis.py uses PRICING_STATE_KEY; model_loader.py calls load_pricing_state(); optimization.py calls save_pricing_state() via asyncio.create_task after every pricing call |
| 4 | AI service deploys on Railway with health check gating on Prophet warmup | VERIFIED | railway.toml with healthcheckPath=/health and healthcheckTimeout=45; main.py calls await warmup_prophet() in startup; health.py returns 503 until is_prophet_warmed_up() is true |
| 5 | Model version mismatch raises RuntimeError at startup | VERIFIED | model_loader.py calls _validate_model_versions() before loading no-show and CLV; InconsistentVersionWarning promoted to error at module level |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| apps/web/lib/middleware/ai-service-auth.ts | VERIFIED | Exists; exports validateAiServiceKey; returns null on pass, 401 on fail; dev-mode bypass when AI_SERVICE_API_KEY env unset |
| apps/web/app/api/internal/features/training/no-show/route.ts | VERIFIED | Exists; calls validateAiServiceKey; real SQL with LATERAL subqueries and payments JOIN; returns NextResponse.json(result) |
| apps/web/app/api/internal/features/training/clv/route.ts | VERIFIED | Exists; calls validateAiServiceKey; real SQL with customer aggregates and future_clv proxy target |
| apps/web/app/api/internal/features/training/capacity/route.ts | VERIFIED | Exists; calls validateAiServiceKey; real SQL returning ds/y hourly booking counts for Prophet |
| apps/web/app/api/internal/features/training/upselling/route.ts | VERIFIED | Exists; calls validateAiServiceKey; self-join co-booking matrix SQL; LIMIT 10000 |
| apps/web/app/api/internal/features/training/reminder-timing/route.ts | VERIFIED | Exists; calls validateAiServiceKey; notifications JOIN bookings SQL |
| apps/web/app/api/internal/features/training/pricing/route.ts | VERIFIED | Exists; calls validateAiServiceKey; booking/price data with LATERAL utilization estimate |
| services/ai/scripts/train_no_show.py | VERIFIED | Contains write_meta_sidecar; no use_label_encoder in XGBClassifier constructor; sends x-ai-service-key header; reads SCHEDULEBOX_API_URL from env |
| services/ai/scripts/train_clv.py | VERIFIED | Contains write_meta_sidecar; sends x-ai-service-key header; saves clv_v1.0.0.joblib |
| services/ai/scripts/train_capacity.py | VERIFIED | Uses model_to_json from prophet.serialize; no top-level import joblib; write_meta_sidecar with prophet_version; sends x-ai-service-key header; saves capacity_v1.0.0.json |
| services/ai/app/services/pricing_redis.py | VERIFIED | Exports load_pricing_state, save_pricing_state, PRICING_STATE_KEY; async Redis GET/SET with graceful error handling |
| services/ai/app/services/model_loader.py | VERIFIED | Contains _validate_model_versions, warmup_prophet, is_prophet_warmed_up; loads capacity via model_from_json; loads pricing via load_pricing_state; InconsistentVersionWarning promoted to error |
| services/ai/railway.toml | VERIFIED | healthcheckPath = "/health", healthcheckTimeout = 45, restartPolicyType = "ON_FAILURE", restartPolicyMaxRetries = 3 |
| services/ai/app/main.py | VERIFIED | startup_event calls await load_models() then await warmup_prophet() |
| services/ai/app/routers/health.py | VERIFIED | Imports is_prophet_warmed_up; returns 503 when not (models_loaded and prophet_ready); response includes prophet_warmed_up field |
| services/ai/app/routers/predictions.py | VERIFIED | _thread_pool = ThreadPoolExecutor(max_workers=4); predict_no_show and predict_clv use loop.run_in_executor |
| services/ai/app/routers/optimization.py | VERIFIED | _thread_pool = ThreadPoolExecutor(max_workers=4); all 4 optimization endpoints use run_in_executor; get_dynamic_pricing calls asyncio.create_task(save_pricing_state(...)) |
| .github/workflows/train-models.yml | VERIFIED | workflow_dispatch plus schedule cron; trains no-show, CLV, capacity; passes AI_SERVICE_API_KEY and SCHEDULEBOX_API_URL from secrets; git commit-back step with [skip ci]; model file verification step |
| services/ai/Dockerfile | VERIFIED | COPY ./scripts ./scripts present in runtime stage alongside ./app and ./models |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| All 6 training routes | ai-service-auth.ts | validateAiServiceKey import | WIRED | All 6 route files import and call validateAiServiceKey at handler top |
| All 6 training routes | @schedulebox/database | db.execute(sql template) | WIRED | All 6 routes use db.execute with real multi-table SQL queries |
| train_no_show.py | /api/internal/features/training/no-show | httpx GET with x-ai-service-key header | WIRED | Lines 87-92 in train_no_show.py |
| train_clv.py | /api/internal/features/training/clv | httpx GET with x-ai-service-key header | WIRED | Lines 83-88 in train_clv.py |
| train_capacity.py | /api/internal/features/training/capacity | httpx GET with x-ai-service-key header | WIRED | Lines 153-158 in train_capacity.py |
| train_capacity.py | prophet.serialize | model_to_json for serialization | WIRED | Lines 206-211 in train_capacity.py |
| model_loader.py | pricing_redis.py | import load_pricing_state | WIRED | Line 166 imports; line 168 awaits load_pricing_state() |
| model_loader.py | prophet.serialize | model_from_json for deserialization | WIRED | Lines 183-187 in model_loader.py |
| model_loader.py | .meta.json sidecars | _validate_model_versions reads and compares versions | WIRED | Called at lines 106 (no_show) and 124 (clv) before joblib.load |
| main.py | model_loader.py | startup_event calls load_models then warmup_prophet | WIRED | Lines 52-53 in main.py |
| optimization.py | pricing_redis.py | save_pricing_state after get_optimal_price | WIRED | Lines 130-132 in optimization.py; asyncio.create_task fire-and-forget |
| predictions.py | ThreadPoolExecutor | run_in_executor wrapping predict calls | WIRED | Lines 98 and 158 in predictions.py |
| train-models.yml | scripts/train_no_show.py | python -m scripts.train_no_show | WIRED | Step "Train no-show model" in workflow |
| train-models.yml | services/ai/models/ | git add and commit and push | WIRED | "Commit trained models to repository" step in workflow |

---

### Requirements Coverage (ROADMAP Success Criteria)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Training scripts fetch real feature data and produce trained model files | SATISFIED | All 3 scripts hit /api/internal/features/training/* with auth header; save .joblib/.json + .meta.json sidecars |
| No-show predictor returns confidence > 0.5 and fallback: false | SATISFIED (structural) | XGBoost model is trained and loaded; NoShowPredictor.predict() called via run_in_executor; actual confidence value depends on runtime data quality |
| Pricing optimizer state persists across Railway container restarts (Redis-backed) | SATISFIED | pricing_redis.py stores state in ai:pricing:mab_state; loaded on startup, saved after every pricing call |
| AI service starts on Railway with all models loaded, Prophet warmed up, health check passing | SATISFIED | railway.toml configures 45s health timeout; main.py runs warmup before ready; health.py returns 503 until both conditions met |
| Model version mismatch raises RuntimeError at startup | SATISFIED | _validate_model_versions() compares .meta.json sklearn/xgboost versions to running environment; InconsistentVersionWarning converted to RuntimeError |

---

### Anti-Patterns Found

None detected.

- No TODO, FIXME, or PLACEHOLDER comments in training routes or AI service files
- No empty handler implementations in critical paths
- No stub training scripts -- all contain real ML training code (XGBoost cross-validation, RandomForest fit, Prophet serialization)
- use_label_encoder is absent from XGBClassifier constructor (grep returns no matches in train_no_show.py)
- import joblib is absent from train_capacity.py top-level (only a docstring comment about NOT using it)
- All 6 training routes return NextResponse.json(result) from live DB queries, not static data

---

### Human Verification Required

#### 1. No-show prediction confidence > 0.5 with real data

**Test:** With seeded data in the database, call POST /api/v1/predictions/no-show with a booking that has cached features.
**Expected:** Response has fallback: false, confidence > 0.5, and model_version is not "fallback".
**Why human:** Requires trained model file no_show_v1.0.0.joblib on disk. Whether the trained model achieves confidence > 0.5 depends on data quality and model convergence -- not verifiable from static code.

#### 2. Railway health check passes within 45 seconds on actual deploy

**Test:** Deploy AI service to Railway; observe health check logs during cold start.
**Expected:** Service reports status: healthy with prophet_warmed_up: true within 45 seconds.
**Why human:** Prophet Stan JIT warmup timing is environment-dependent. The 45s window adequacy requires an actual Railway container run.

#### 3. Redis pricing state survives container restart

**Test:** Call pricing endpoint several times; restart the Railway AI service container; call pricing endpoint again.
**Expected:** Thompson Sampling converges (confidence increases) across restarts rather than resetting to cold-start uniform distribution.
**Why human:** Requires live Redis instance and actual container lifecycle -- structural wiring is verified but live persistence behavior needs runtime observation.

#### 4. Weekly retraining workflow produces real production model files

**Test:** Manually trigger train-models.yml via workflow_dispatch with SCHEDULEBOX_INTERNAL_URL and AI_SERVICE_API_KEY secrets configured.
**Expected:** Workflow succeeds; trained model files are committed back to the repository with fresh training timestamps.
**Why human:** Requires GitHub secrets configured in repository settings and live Railway API endpoint reachable.

---

## Gaps Summary

None. All structural must-haves are present, substantive, and correctly wired.

Plan 01 (7 artifacts): auth middleware and 6 training API routes -- all exist, all have real multi-table SQL, all call validateAiServiceKey, all return live DB data.

Plan 02 (3 artifacts): no-show, CLV, capacity training scripts -- write_meta_sidecar present in all three; use_label_encoder absent from XGBoost; Prophet uses model_to_json not joblib; x-ai-service-key header sent by all.

Plan 03 (2 artifacts): pricing_redis.py with load/save functions present and wired into model_loader.py; model_loader.py with version validation, Prophet JSON loading, and Redis pricing state -- all correctly wired.

Plan 04 (6 modified files): railway.toml with correct config; main.py with warmup called; health.py with 503 gating on prophet_warmed_up; predictions.py and optimization.py with ThreadPoolExecutor; optimization.py with Redis persistence via asyncio.create_task.

Plan 05 (2 artifacts): train-models.yml with schedule, dispatch, all 3 training steps, model verification, and git commit-back; Dockerfile with COPY ./scripts.

All 5 commits verified in git history: 509072c (Plan 01), 81c63f8 (Plan 02), 0b78c23 (Plan 03), e29ac4f (Plan 04), 0688fea (Plan 05).

The phase goal is structurally achieved. Human verification items are runtime and deployment concerns that cannot be verified statically.

---

_Verified: 2026-02-24T13:21:02Z_
_Verifier: Claude (gsd-verifier)_
