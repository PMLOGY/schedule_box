---
phase: 23-ai-service-training-pipeline
plan: 02
subsystem: api
tags: [python, xgboost, scikit-learn, prophet, joblib, training-scripts, ml-pipeline]

# Dependency graph
requires:
  - phase: 23-ai-service-training-pipeline
    provides: Internal training feature extraction API routes (plan 01)
provides:
  - XGBoost no-show classifier training script with .meta.json version sidecar
  - Random Forest CLV regressor training script with .meta.json version sidecar
  - Prophet capacity forecaster training script with JSON serialization (not joblib)
  - All training scripts send X-AI-Service-Key header and read SCHEDULEBOX_API_URL from env
affects: [23-03-ai-service-training-pipeline, 23-04-ai-service-training-pipeline, 23-05-ai-service-training-pipeline]

# Tech tracking
tech-stack:
  added: [prophet.serialize.model_to_json]
  patterns:
    - write_meta_sidecar pattern for all training scripts (library version + metrics in .meta.json)
    - Prophet JSON serialization instead of joblib for cross-container compatibility
    - SCHEDULEBOX_API_URL env var with synthetic data fallback for CI compatibility

key-files:
  created: []
  modified:
    - services/ai/scripts/train_no_show.py
    - services/ai/scripts/train_clv.py
    - services/ai/scripts/train_capacity.py

key-decisions:
  - 'Prophet serialized with model_to_json (prophet.serialize), not joblib — Stan backend breaks across containers with pickle/joblib'
  - 'use_label_encoder=False removed from XGBClassifier — parameter removed in XGBoost 3.x, disabled by default now'
  - '.meta.json sidecar pattern: each model file gets a sibling .meta.json with library versions and metrics for startup validation'
  - 'Capacity script does not import joblib at all — explicit removal to prevent accidental reintroduction'

patterns-established:
  - 'write_meta_sidecar(): shared pattern across all training scripts, writes library versions + metrics alongside model file'
  - 'Synthetic data fallback: all training scripts fall back gracefully when SCHEDULEBOX_API_URL is unset or API is unavailable'
  - 'API authentication: all training scripts check AI_SERVICE_API_KEY env var and pass as x-ai-service-key header'

# Metrics
duration: 15min
completed: 2026-02-21
---

# Phase 23 Plan 02: Fixed Training Scripts Summary

**XGBoost no-show, Random Forest CLV, and Prophet capacity training scripts fixed for production — deprecated XGBoost param removed, Prophet switched from joblib to model_to_json serialization, .meta.json version sidecars added to all three**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-21T19:45:00Z
- **Completed:** 2026-02-21T20:00:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Removed `use_label_encoder=False` from XGBClassifier — this parameter was removed in XGBoost 3.x and would cause TypeError at training time
- Changed capacity model serialization from `joblib.dump` to `prophet.serialize.model_to_json` — Prophet's Stan backend does not serialize correctly with pickle/joblib across containers
- Added `write_meta_sidecar()` to all three training scripts — writes .meta.json alongside each model file with library versions (sklearn, xgboost, prophet) and training metrics for startup validation
- Added `x-ai-service-key` header to all httpx API requests and `SCHEDULEBOX_API_URL` env var support for CI/production use

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix train_no_show.py** - `81c63f8` (fix)
2. **Task 2: Fix train_clv.py and train_capacity.py** - `81c63f8` (fix)

Note: Both tasks were committed together in a single fix commit.

**Plan metadata:** `(this SUMMARY.md commit)`

## Files Created/Modified

- `services/ai/scripts/train_no_show.py` - Removed deprecated use_label_encoder param; added write_meta_sidecar() outputting no_show_v1.0.0.meta.json with sklearn+xgboost versions; added x-ai-service-key header and SCHEDULEBOX_API_URL env var
- `services/ai/scripts/train_clv.py` - Added write_meta_sidecar() outputting clv_v1.0.0.meta.json with sklearn version and MAE/RMSE/R2 metrics; added x-ai-service-key header and SCHEDULEBOX_API_URL env var
- `services/ai/scripts/train_capacity.py` - Changed serialization from joblib.dump to prophet.serialize.model_to_json outputting capacity_v1.0.0.json; removed joblib import; added write_meta_sidecar() with prophet version; added x-ai-service-key header

## Decisions Made

- Prophet serialized with `model_to_json` from `prophet.serialize` rather than joblib. Prophet wraps a Stan model whose C extension cannot be safely pickled across different OS/container environments. JSON serialization is the official Prophet-supported persistence mechanism.
- `use_label_encoder=False` was simply deleted (not replaced) — XGBoost 3.x removed the parameter entirely and label encoding is now disabled by default with no config needed.
- The `.meta.json` sidecar uses `model_path.replace(".json", ".meta.json")` for capacity (producing `capacity_v1.0.0.meta.json`) rather than appending `.meta.json`, ensuring clean filenames.
- `train_capacity.py` does not import `joblib` at all — explicit absence prevents accidental reintroduction during future edits.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all changes were straightforward bug fixes and feature additions with no blocking issues.

## User Setup Required

None - no external service configuration required. Scripts use `AI_SERVICE_API_KEY` and `SCHEDULEBOX_API_URL` env vars which are already defined in the Railway deployment config (plan 04).

## Next Phase Readiness

- Training scripts are CI-ready: they run in synthetic data mode when API is unavailable (no API key needed for testing)
- Model output files follow the naming convention expected by startup validation (plan 03): `no_show_v1.0.0.joblib`, `clv_v1.0.0.joblib`, `capacity_v1.0.0.json` + `*.meta.json` sidecars
- Prophet JSON serialization aligns with `model_from_json` loading in the AI service startup validation (plan 03)

---

_Phase: 23-ai-service-training-pipeline_
_Completed: 2026-02-21_
