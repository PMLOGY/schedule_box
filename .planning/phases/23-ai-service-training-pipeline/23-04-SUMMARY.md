---
phase: 23-ai-service-training-pipeline
plan: "04"
subsystem: infra
tags: [railway, fastapi, prophet, threadpoolexecutor, redis, mab, python]

# Dependency graph
requires:
  - phase: 23-ai-service-training-pipeline
    provides: model_loader.py with load_models, pricing_redis.py with save_pricing_state (plans 23-02, 23-03)
provides:
  - Railway deployment configuration (railway.toml) with Dockerfile builder, 45s health check, ON_FAILURE restart policy
  - Prophet Stan JIT warmup at startup gating health check (503 until ready)
  - ThreadPoolExecutor (4 workers) wrapping all CPU-bound ML inference calls in predictions and optimization routers
  - Fire-and-forget Redis persistence of pricing MAB state after every get_dynamic_pricing() call
affects: [23-05, devops, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ThreadPoolExecutor module-level pool for offloading synchronous sklearn/XGBoost/Prophet predict calls from FastAPI async event loop"
    - "asyncio.create_task() fire-and-forget for non-blocking Redis state persistence"
    - "Health check gating pattern: 503 until all startup conditions met (models loaded + prophet warmed up)"
    - "Railway healthcheckTimeout=45s to accommodate Prophet Stan JIT cold-start warmup (~15-20s)"

key-files:
  created:
    - services/ai/railway.toml
  modified:
    - services/ai/app/main.py
    - services/ai/app/routers/health.py
    - services/ai/app/routers/predictions.py
    - services/ai/app/routers/optimization.py
    - services/ai/app/services/model_loader.py

key-decisions:
  - 'healthcheckTimeout=45s (not 30s from AI-07) to accommodate Prophet Stan JIT warmup on cold start'
  - 'Prophet warmup failure is non-fatal: _prophet_warmed_up=True even on exception to prevent permanent 503'
  - 'Pricing state persistence uses asyncio.create_task() (fire-and-forget) so Redis write never blocks response'
  - 'Lambda wrapper in run_in_executor for functions with keyword arguments (get_optimal_price, recommend, suggest_schedule_changes)'
  - 'health_score endpoints do NOT use ThreadPoolExecutor — pure Python RFM calculation, no heavy numpy/sklearn'

patterns-established:
  - 'Pattern 1 (Railway health gate): Health endpoint returns 503 until all async startup tasks complete; Railway respects healthcheckTimeout before marking service unhealthy'
  - 'Pattern 2 (ThreadPool ML inference): Module-level _thread_pool = ThreadPoolExecutor(max_workers=4) in each router; loop.run_in_executor(_thread_pool, fn, args) for every synchronous predict call'
  - 'Pattern 3 (Warmup flag): Module-level bool flag (_prophet_warmed_up) set to True after warmup; always set True even on failure so health check is never permanently blocked'

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 23 Plan 04: Railway Config, Prophet Warmup, and ThreadPoolExecutor Summary

**Railway deployment config with 45s health check gating on Prophet Stan JIT warmup, ThreadPoolExecutor wrapping all ML inference, and fire-and-forget Redis persistence for pricing MAB state**

## Performance

- **Duration:** ~5 min (implementation already committed, SUMMARY creation only)
- **Started:** 2026-02-21T19:00:00Z
- **Completed:** 2026-02-21T20:04:16Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `railway.toml` configuring Dockerfile builder, 45s health check timeout, and ON_FAILURE restart policy (3 retries)
- Added `warmup_prophet()` and `is_prophet_warmed_up()` to model_loader with startup integration in main.py — health check returns 503 until warmup completes
- Wrapped all CPU-bound ML predict calls in `ThreadPoolExecutor(max_workers=4)` across predictions.py and optimization.py (7 `run_in_executor` call sites)
- Added fire-and-forget `asyncio.create_task(save_pricing_state(...))` after every `get_dynamic_pricing()` call to persist MAB state to Redis without blocking the response

## Task Commits

Both tasks committed together in a single atomic commit:

1. **Task 1: Create railway.toml and add Prophet warmup to startup + health check gating** - `e29ac4f` (feat)
2. **Task 2: Add ThreadPoolExecutor to prediction/optimization endpoints + Redis pricing state persistence** - `e29ac4f` (feat)

**Plan metadata:** This SUMMARY commit (docs)

_Note: Tasks 1 and 2 were executed together in a single commit by the prior execution agent._

## Files Created/Modified

- `services/ai/railway.toml` - Railway deployment config: Dockerfile builder, `/health` path, 45s timeout, ON_FAILURE restart
- `services/ai/app/main.py` - Startup event now calls `await warmup_prophet()` after `await load_models()`
- `services/ai/app/routers/health.py` - Health check gates on `is_prophet_warmed_up()` + `is_models_loaded()`; returns 503 until both true; `prophet_warmed_up` field in response JSON
- `services/ai/app/routers/predictions.py` - Added `_thread_pool = ThreadPoolExecutor(max_workers=4)`; `predict_no_show` and `predict_clv` use `run_in_executor`
- `services/ai/app/routers/optimization.py` - Added `_thread_pool`; all 4 optimization endpoints (`get_dynamic_pricing`, `get_capacity_forecast`, `get_upselling_recommendations`, `get_reminder_timing`) use `run_in_executor`; pricing adds `asyncio.create_task(save_pricing_state(...))`
- `services/ai/app/services/model_loader.py` - Added `_prophet_warmed_up: bool = False` flag, `warmup_prophet()` async function, `is_prophet_warmed_up()` accessor

## Decisions Made

- **healthcheckTimeout=45s** (not 30s from AI-07): Prophet Stan JIT warmup takes ~15-20s on cold start; 45s accommodates worst-case warmup + model loading. Deliberate deviation documented in plan frontmatter must_haves.
- **Prophet warmup failure is non-fatal**: If `capacity_model.forecast(1)` throws during warmup, `_prophet_warmed_up` is set to `True` anyway (with a warning log). This prevents a permanently broken 503 state if the model file is corrupted or Stan fails unexpectedly.
- **Lambda wrapper in run_in_executor**: `get_optimal_price`, `recommend`, and `suggest_schedule_changes` use keyword args. Since `run_in_executor` only passes positional args, lambda wrappers capture kwargs at call site.
- **health_score excludes ThreadPoolExecutor**: `predict_health_score` and `predict_health_score_batch` use direct calls — RFM is pure Python arithmetic (no numpy/sklearn), so there is no blocking concern.
- **fire-and-forget asyncio.create_task for Redis**: Pricing state persistence must not add latency to the pricing response. `create_task` schedules the coroutine on the running event loop without awaiting.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Railway memory limits (1.5GB) are set in the Railway dashboard, not in railway.toml.

## Next Phase Readiness

- Railway deployment config is complete; Plan 23-05 (weekly retraining workflow) can proceed independently
- AI service is production-ready: health-gated startup, non-blocking ML inference, persistent pricing state
- ThreadPoolExecutor pattern established for all future ML routers

---

_Phase: 23-ai-service-training-pipeline_
_Completed: 2026-02-21_

## Self-Check: PASSED

All claimed files verified present on disk. Commit e29ac4f verified in git history. No discrepancies found.
