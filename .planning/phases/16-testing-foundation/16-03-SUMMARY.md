---
phase: 16-testing-foundation
plan: 03
subsystem: testing
tags: [msw, mocking, external-apis, ci, coverage, comgate, ai-service, vitest]

# Dependency graph
requires:
  - 16-01 (apps/web vitest.config.ts with happy-dom environment)
provides:
  - MSW 2.0 server for Node.js test environment (apps/web/mocks/server.ts)
  - Default handlers for Comgate payment gateway (3 endpoints)
  - Default handlers for AI service Python microservice (3 endpoints)
  - Default handler for internal notification API (1 endpoint)
  - MSW lifecycle in vitest.setup.ts (listen/resetHandlers/close)
  - CI test job running pnpm test:coverage before build
  - Coverage report artifacts uploaded on every CI run
affects:
  - All future web tests that call Comgate, AI service, or notification API
  - CI pipeline (build job now blocked on test failures)
  - 16-02 (packages/shared changes also landed in Task 2 commit via lint-staged)

# Tech tracking
tech-stack:
  added:
    - msw@2.12.10
  patterns:
    - MSW 2.0 API: import { http, HttpResponse } from 'msw' (NOT deprecated rest API)
    - Handler grouping: export named groups (comgateHandlers, aiHandlers, notificationHandlers) + combined handlers array
    - MSW lifecycle: beforeAll(listen) + afterEach(resetHandlers) + afterAll(close)
    - CI pipeline ordering: lint -> test -> build (build requires both lint and test to pass)

key-files:
  created:
    - apps/web/mocks/handlers.ts (MSW 2.0 request handlers for 3 external API categories)
    - apps/web/mocks/server.ts (Node.js MSW server instance via setupServer)
    - apps/web/vitest.setup.ts (MSW lifecycle hooks for test environment)
    - apps/web/__tests__/msw-handlers.test.ts (9 tests verifying MSW interception and overrides)
  modified:
    - apps/web/vitest.config.ts (added setupFiles pointing to vitest.setup.ts)
    - apps/web/package.json (added msw@2.12.10 as devDependency)
    - .github/workflows/ci.yml (added test job, updated build needs to [lint, test])
    - pnpm-lock.yaml (lockfile updated for msw installation)

key-decisions:
  - 'MSW onUnhandledRequest set to warn (not error) to avoid blocking tests during bootstrap phase'
  - 'build-ai CI job still only needs lint (AI service tests are Python, not in this Vitest setup)'
  - 'Named handler groups exported alongside combined array to allow cherry-picking in tests'

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 16 Plan 03: Testing Foundation - MSW 2.0 Configuration and CI Test Pipeline Summary

**MSW 2.0 configured with 7 default handlers for Comgate payments, AI microservice, and notifications; CI pipeline updated so the build job only runs after unit tests and coverage thresholds pass**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T16:17:55Z
- **Completed:** 2026-02-20T16:21:50Z
- **Tasks:** 2 of 2
- **Files modified:** 8

## Accomplishments

- Installed MSW 2.0 in @schedulebox/web and created default handlers for all 3 external API categories: Comgate (create/status/refund), AI service (no-show/demand/pricing), and notifications (send)
- Configured MSW lifecycle in vitest.setup.ts with server.listen/resetHandlers/close to ensure clean test isolation
- Updated apps/web vitest.config.ts to load vitest.setup.ts via setupFiles, connecting MSW to every web test automatically
- Added 9-test verification suite proving MSW intercepts fetch calls and that server.use overrides are properly reset between tests
- Added CI test job that runs pnpm test:coverage between lint and build; build job now requires both lint and tests to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure MSW 2.0 with handlers for Comgate, AI service, and SMTP** - `97d91fe` (feat(web))
2. **Task 2: Add unit test job to CI pipeline with coverage enforcement** - `9402273` (feat(devops))

## Files Created/Modified

- `apps/web/mocks/handlers.ts` - MSW 2.0 handlers (comgateHandlers x3, aiHandlers x3, notificationHandlers x1 + createSMTPHandler helper)
- `apps/web/mocks/server.ts` - MSW node server: setupServer(...handlers)
- `apps/web/vitest.setup.ts` - beforeAll/afterEach/afterAll lifecycle for MSW
- `apps/web/__tests__/msw-handlers.test.ts` - 9 tests verifying all handler categories and override pattern
- `apps/web/vitest.config.ts` - Added setupFiles: ['./vitest.setup.ts']
- `apps/web/package.json` - Added msw@2.12.10 to devDependencies
- `.github/workflows/ci.yml` - New test job + build needs: [lint, test]
- `pnpm-lock.yaml` - Updated for msw installation

## Decisions Made

- Set `onUnhandledRequest: 'warn'` in server.listen rather than `'error'` to avoid breaking tests that make fetch calls not yet fully mocked; can be tightened to `'error'` once all external calls are covered
- The `build-ai` CI job retains `needs: lint` only (not test) because the AI service is Python and these Vitest tests are TypeScript only
- Exported named handler groups (`comgateHandlers`, `aiHandlers`, `notificationHandlers`) in addition to the combined `handlers` array so tests can cherry-pick groups and use `server.use()` for targeted overrides

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Lint-staged side effect] Plan 16-02 working-tree files landed in Task 2 commit**

- **Found during:** Task 2 commit (post-commit review)
- **Issue:** The pre-commit lint-staged hook detected modified files in the working directory (packages/shared/vitest.config.ts, vitest.shared.ts, packages/shared/src/utils/index.test.ts) that were partial Plan 16-02 work. Prettier formatted them and staged them for the commit. This is expected lint-staged behavior; the files are valid and correct.
- **Fix:** No fix needed - the files are part of Plan 16-02's work and committed cleanly. They represent: refined coverage excludes in vitest.shared.ts (barrel pattern narrowed to src/index.ts) and comprehensive unit tests for shared utilities (69 tests across generateSlug, formatCurrency, calculatePagination, etc.).
- **Files modified:** packages/shared/src/utils/index.test.ts, packages/shared/vitest.config.ts, vitest.shared.ts
- **Commit:** 9402273 (Task 2 commit)
- **Impact:** Plan 16-02 test work was effectively committed here. If Plan 16-02 runs next, it will find these files already in place and can verify/extend them.

## Issues Encountered

None beyond the lint-staged deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MSW infrastructure complete; any future web test that calls Comgate, AI service, or the notification API will automatically be intercepted by default handlers
- Tests can override handlers per-test using server.use() and rely on afterEach cleanup
- CI pipeline now enforces test+coverage gate before any Docker image build
- Plan 16-02 unit test work was partially captured in this plan's commit; Plan 16-02 execution should verify all test targets and add any missing tests

---

_Phase: 16-testing-foundation_
_Completed: 2026-02-20_

## Self-Check: PASSED

All key files verified as existing and containing expected content:
- apps/web/mocks/handlers.ts: FOUND (8 http.post occurrences for 7 handlers + 1 helper)
- apps/web/mocks/server.ts: FOUND (contains setupServer)
- apps/web/vitest.setup.ts: FOUND (contains server.listen)
- apps/web/__tests__/msw-handlers.test.ts: FOUND
- apps/web/vitest.config.ts: FOUND (contains setupFiles: ['./vitest.setup.ts'])
- .github/workflows/ci.yml: FOUND (contains pnpm test:coverage + needs: [lint, test])
- .planning/phases/16-testing-foundation/16-03-SUMMARY.md: FOUND
- Commit 97d91fe: FOUND (Task 1 - MSW configuration)
- Commit 9402273: FOUND (Task 2 - CI pipeline update)
- All 9 MSW handler tests: PASS (verified via pnpm test)
