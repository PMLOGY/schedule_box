---
phase: 23-ai-service-training-pipeline
plan: "05"
subsystem: infra
tags: [github-actions, docker, ci-cd, ml-training, retraining, scikit-learn, xgboost]

# Dependency graph
requires:
  - phase: 23-ai-service-training-pipeline
    provides: "internal training API routes (23-01), training scripts (23-02), model files structure"
provides:
  - Weekly model retraining GitHub Actions workflow (.github/workflows/train-models.yml)
  - Dockerfile updated to include training scripts directory for in-container retraining
  - Git commit-back mechanism so trained models persist in repo for Docker builds
affects:
  - deploy-production.yml (picks up retrained models via COPY ./models)
  - ci.yml (picks up retrained models via COPY ./models)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scheduled CI workflow with manual dispatch for ML model retraining"
    - "Commit-back pattern: CI trains model files and commits them to repo for Docker build pickup"
    - "[skip ci] in automated commit message prevents infinite CI loop"

key-files:
  created:
    - .github/workflows/train-models.yml
  modified:
    - services/ai/Dockerfile

key-decisions:
  - 'Commit trained models back to repository so next Docker build (ci.yml/deploy-production.yml) picks them up via COPY ./models — no external model registry needed for v1.2'
  - 'Use [skip ci] in automated commit message to prevent infinite CI loop'
  - 'Upload artifacts as backup (30-day retention) in addition to git commit'
  - 'Graceful degradation: if GitHub secrets are not set, training scripts fall back to synthetic data'

patterns-established:
  - 'Scheduled retraining: cron Sunday 03:00 UTC + workflow_dispatch for ad-hoc runs'
  - 'Verify-before-commit: check all model files exist before git add to fail-fast on training errors'
  - 'Dockerfile includes scripts/ for potential in-container training support'

# Metrics
duration: 1min
completed: '2026-02-21'
---

# Phase 23 Plan 05: Weekly Model Retraining CI Summary

**GitHub Actions weekly retraining workflow (Sunday 03:00 UTC + manual dispatch) that trains no-show, CLV, and capacity models, verifies output files, and commits them back to the repository so subsequent Docker builds include fresh models**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-21T19:04:16Z
- **Completed:** 2026-02-21T19:04:54Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `.github/workflows/train-models.yml` with scheduled (Sunday 03:00 UTC) and manual `workflow_dispatch` triggers, Python 3.12 setup with pip caching, all 3 training script invocations with API credentials from secrets, model file verification step, artifact upload backup, and git commit-back step with `[skip ci]`
- Updated `services/ai/Dockerfile` to `COPY ./scripts ./scripts` alongside `./app` and `./models`, enabling in-container training if needed
- Models committed back to repository via `git add services/ai/models/*.joblib services/ai/models/*.json` with staged-diff guard to avoid empty commits

## Task Commits

Each task was committed atomically:

1. **Task 1: Create weekly model retraining GitHub Actions workflow** - `0688fea` (feat)
2. **Task 2: Update Dockerfile to include training scripts directory** - `0688fea` (feat)

Both tasks were committed together in a single feat commit as they were implemented simultaneously.

**Plan metadata:** This SUMMARY.md completes the documentation.

## Files Created/Modified

- `.github/workflows/train-models.yml` - Weekly retraining CI workflow with schedule, manual dispatch, 3 training steps, model verification, artifact upload, and git commit-back
- `services/ai/Dockerfile` - Added `COPY ./scripts ./scripts` line to runtime stage

## Decisions Made

- Commit trained models back to repository (not push to R2/model registry) — Docker builds use `COPY ./models ./models` which picks up whatever is in the directory at build time; no external model registry needed for v1.2
- Use `[skip ci]` in automated commit message — prevents the commit triggering a new CI run, avoiding infinite loop
- Keep artifact upload as a backup alongside git commit — provides 30-day debugging window if model commit is reverted
- Graceful degradation when GitHub secrets not set — training scripts fall back to synthetic data rather than failing entirely

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both tasks implemented cleanly with no blockers.

## User Setup Required

**External services require manual configuration.**

GitHub repository secrets must be added for the workflow to fetch real production data:

| Secret | Source |
|--------|--------|
| `SCHEDULEBOX_INTERNAL_URL` | Railway dashboard -> AI web service -> Settings -> Generated Domain URL |
| `AI_SERVICE_API_KEY` | Same key as set in Railway AI service env vars |

Location: **GitHub -> Repository Settings -> Secrets and variables -> Actions**

Without these secrets, training scripts fall back to synthetic data (graceful degradation). The workflow will still run and produce model files.

## Next Phase Readiness

- Phase 23 AI Service Training Pipeline is fully complete (5/5 plans)
- All 6 internal training API routes, training scripts, Redis persistence, Railway config, Prophet warmup, and retraining workflow are in place
- Phase 24 (AI UI) can begin — prediction endpoints are ready to consume
- Models will be retrained weekly with production data once Railway + GitHub secrets are configured

---

_Phase: 23-ai-service-training-pipeline_
_Completed: 2026-02-21_
