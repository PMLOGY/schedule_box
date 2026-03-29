---
phase: 53-deployment-go-live
plan: 02
subsystem: testing
tags: [playwright, e2e, ci, github-actions]

requires:
  - phase: 53-01
    provides: Demo seed data and Coolify env hardening
provides:
  - E2E suite as hard CI gate (failures block merges)
  - Marketplace tests with full API mocking (no conditional skips)
affects: [53-deployment-go-live]

tech-stack:
  added: []
  patterns: [API mocking for marketplace E2E tests]

key-files:
  created: []
  modified:
    - .github/workflows/ci.yml
    - apps/web/e2e/tests/marketplace.spec.ts

key-decisions:
  - 'Marketplace tests mock API responses instead of depending on seed data -- consistent with booking.spec.ts pattern'
  - 'Artifact upload steps keep continue-on-error: true for debugging; only job-level flag removed'

patterns-established:
  - 'E2E marketplace mocking: setupMarketplaceMocks() provides predictable listing data via page.route()'

requirements-completed: [VER-07]

duration: 4min
completed: 2026-03-29
---

# Phase 53 Plan 02: E2E Hard Gate in CI Summary

**Playwright E2E suite made a blocking CI gate with zero skipped tests by removing continue-on-error and replacing conditional test.skip() with API mocks**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T11:29:55Z
- **Completed:** 2026-03-29T11:34:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Removed `continue-on-error: true` from E2E job in CI -- failures now block the pipeline
- Replaced 3 conditional `test.skip()` calls in marketplace.spec.ts with full API mocking
- Replaced `page.waitForTimeout(500)` with `page.waitForLoadState('networkidle')`
- Pushed to main to trigger CI pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove continue-on-error and fix test issues** - `0011c61` (fix)
2. **Task 2: Push and verify CI** - No code changes (push-only task, verified push succeeded)

## Files Created/Modified

- `.github/workflows/ci.yml` - Removed job-level continue-on-error from E2E job
- `apps/web/e2e/tests/marketplace.spec.ts` - Replaced conditional skips with API mocks, removed waitForTimeout

## Decisions Made

- Marketplace tests now mock the `/api/v1/marketplace/listings` API with 2 predictable test listings, consistent with the approach used in booking.spec.ts and payment.spec.ts
- Artifact upload steps retain `continue-on-error: true` (3 total: 1 coverage upload, 2 playwright report/results) since these are debugging aids that should not fail the job

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ESLint consistent-type-imports error**

- **Found during:** Task 1 (commit pre-commit hook)
- **Issue:** `import()` type annotation in marketplace.spec.ts function parameter violated @typescript-eslint/consistent-type-imports rule
- **Fix:** Used proper `type Page` import from '@playwright/test' at top of file
- **Files modified:** apps/web/e2e/tests/marketplace.spec.ts
- **Verification:** Lint passed on commit
- **Committed in:** 0011c61 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial lint fix. No scope creep.

## Issues Encountered

- `gh` CLI not installed on local machine -- CI run verification must be done manually via GitHub Actions web UI at https://github.com/PMLOGY/schedule_box/actions

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- E2E suite is now a blocking gate in CI
- CI run triggered by push to main -- user should verify green status at GitHub Actions
- Ready for 53-03 (production deployment)

---

_Phase: 53-deployment-go-live_
_Completed: 2026-03-29_
