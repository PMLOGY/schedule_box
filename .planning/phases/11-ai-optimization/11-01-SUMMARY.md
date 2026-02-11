---
phase: 11-ai-optimization
plan: 01
subsystem: api
tags: [python, fastapi, ml, collaborative-filtering, thompson-sampling, prophet, bayesian-optimization, numpy, scipy]

# Dependency graph
requires:
  - phase: 10-ai-predictions
    provides: FastAPI AI service with model loader, schemas, prediction router
provides:
  - UpsellRecommender class with cosine similarity collaborative filtering
  - PricingOptimizer class with Thompson Sampling MAB and 30% constraint
  - CapacityForecaster class with Prophet demand forecasting
  - ReminderTimingOptimizer class with Bayesian optimization
  - Optimization Pydantic request/response schemas
  - FastAPI optimization router with 4 POST endpoints
  - Extended model loader with optimization model loading
affects: [11-ai-optimization, 12-analytics-reporting]

# Tech tracking
tech-stack:
  added: [bayesian-optimization 3.2.0, prophet 1.1.6]
  patterns: [Thompson Sampling MAB for pricing, item-based CF with scipy sparse, lazy Prophet import, Bayesian optimization with kernel-smoothed objective]

key-files:
  created:
    - services/ai/app/models/upselling.py
    - services/ai/app/models/pricing.py
    - services/ai/app/models/capacity.py
    - services/ai/app/models/reminder_timing.py
    - services/ai/app/routers/optimization.py
  modified:
    - services/ai/app/models/__init__.py
    - services/ai/app/schemas/requests.py
    - services/ai/app/schemas/responses.py
    - services/ai/app/services/model_loader.py
    - services/ai/app/main.py
    - services/ai/requirements.txt

key-decisions:
  - 'Prophet over LSTM for capacity forecasting (practical for SMB data volumes)'
  - 'Lazy imports for Prophet and BayesianOptimization (graceful degradation)'
  - 'Per-context Thompson Sampling with service:day:hour_block:util_bucket key'
  - '30% price constraint applied post-selection with confidence reduction'

patterns-established:
  - 'Optimization model pattern: fallback-first with graceful degradation'
  - 'MAB state persistence via JSON (not joblib) for human-readable state'
  - 'Lazy library imports in model classes for import error resilience'

# Metrics
duration: 5min
completed: 2026-02-11
---

# Phase 11 Plan 01: AI Optimization Models Summary

**Four ML optimization models (upselling CF, pricing MAB, capacity Prophet, reminder Bayesian) with FastAPI endpoints and graceful cold-start fallbacks**

## Performance

- **Duration:** 5 min 12 sec
- **Started:** 2026-02-11T22:11:07Z
- **Completed:** 2026-02-11T22:16:19Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Created 4 optimization model classes following Phase 10's fallback-first pattern
- PricingOptimizer enforces 30% daily price change constraint via base_price clamping
- Extended FastAPI service with /api/v1/optimization/ router (4 POST endpoints)
- Model loader loads all 4 optimization models at startup with per-model error handling
- Existing Phase 10 prediction routes untouched and fully functional

## Task Commits

Each task was committed atomically:

1. **Task 1: Create four optimization model classes and update requirements** - `0747dea` (feat)
2. **Task 2: Add optimization schemas, router, and extend model loader** - `3a7e4ac` (feat)

## Files Created/Modified

- `services/ai/app/models/upselling.py` - Item-based collaborative filtering recommender
- `services/ai/app/models/pricing.py` - Thompson Sampling MAB with 30% constraint
- `services/ai/app/models/capacity.py` - Prophet-based demand forecaster
- `services/ai/app/models/reminder_timing.py` - Bayesian optimization for reminder timing
- `services/ai/app/models/__init__.py` - Exports for all 4 new model classes
- `services/ai/app/schemas/requests.py` - 4 new Pydantic request models
- `services/ai/app/schemas/responses.py` - 8 new Pydantic response models
- `services/ai/app/routers/optimization.py` - FastAPI router with 4 POST endpoints
- `services/ai/app/services/model_loader.py` - Extended with 4 optimization model loaders
- `services/ai/app/main.py` - Registered optimization router
- `services/ai/requirements.txt` - Added bayesian-optimization and prophet

## Decisions Made

- **Prophet over LSTM for capacity:** SMB data volumes (hundreds to low thousands of bookings) make Prophet more practical. LSTM documented as future upgrade path for enterprise tier.
- **Lazy imports for heavy dependencies:** Prophet and BayesianOptimization imported inside methods to prevent startup crashes if not installed.
- **Context key design for pricing MAB:** Uses `{service_id}:{day}:{hour//4}:{util_bucket}` for 6 time blocks per day and 3 utilization levels, balancing granularity with learning speed.
- **30% constraint applied post-selection:** Clamping after MAB selection (not constraining arm space) preserves exploration while enforcing business rules. Confidence reduced by 0.7x when constrained.
- **Removed unused json import from model_loader:** Kept clean -- JSON loading delegated to model class methods.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Bayesian optimization closure variable capture**

- **Found during:** Task 1 (ReminderTimingOptimizer)
- **Issue:** Research code had objective function closure capturing loop variable `records` directly, which would use the last iteration's value for all clusters.
- **Fix:** Used `_make_objective(recs)` factory function to properly capture each cluster's records in the closure scope.
- **Files modified:** services/ai/app/models/reminder_timing.py
- **Verification:** Each cluster gets its own objective function with correct records
- **Committed in:** 0747dea (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added exclude_ids parameter to popularity fallback**

- **Found during:** Task 1 (UpsellRecommender)
- **Issue:** When padding collaborative filtering results with popularity fallback, already-recommended services could appear as duplicates.
- **Fix:** Added `exclude_ids` parameter to `_popularity_fallback()` to filter out services already in the CF results.
- **Files modified:** services/ai/app/models/upselling.py
- **Verification:** Recommendations list contains no duplicate service IDs
- **Committed in:** 0747dea (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes ensure correctness. No scope creep.

## Issues Encountered

- Commitlint body-max-line-length (100 chars) rejected first Task 2 commit message. Shortened body lines and recommitted successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 optimization endpoints ready for circuit breaker client integration (11-02)
- Models start in degraded/fallback mode (no trained model files)
- Training scripts for model files planned for future plans
- Existing Phase 10 prediction endpoints fully preserved

## Self-Check: PASSED

- All 6 created/modified files verified on disk
- Both commit hashes (0747dea, 3a7e4ac) verified in git log

---

_Phase: 11-ai-optimization_
_Completed: 2026-02-11_
