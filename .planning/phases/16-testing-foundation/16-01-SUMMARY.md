---
phase: 16-testing-foundation
plan: 01
subsystem: testing
tags: [vitest, coverage, v8, testing-library, happy-dom, vite-tsconfig-paths]

# Dependency graph
requires: []
provides:
  - Vitest 4.0 workspace-level test orchestration via root vitest.config.ts with projects array
  - Shared base config (vitest.shared.ts) with 80% coverage thresholds and v8 provider
  - Per-package vitest.config.ts for shared, events, web, notification-worker
  - Root test scripts: test, test:unit, test:watch, test:ui, test:coverage
  - Smoke test proving end-to-end pipeline works (generateSlug, 5 assertions)
affects:
  - 16-02 (unit tests for shared/events use these configs)
  - 16-03 (MSW setup builds on web vitest.config.ts)
  - All future test plans (foundation dependency)

# Tech tracking
tech-stack:
  added:
    - vitest@4.0.18
    - '@vitest/coverage-v8@4.0.18'
    - '@vitest/ui@4.0.18'
    - happy-dom@20.6.3
    - vite-tsconfig-paths@6.1.1
    - '@vitejs/plugin-react@5.1.4'
    - '@testing-library/react@16.3.2'
    - '@testing-library/dom@10.4.1'
    - '@testing-library/user-event@14.6.1'
    - '@testing-library/jest-dom@6.9.1'
  patterns:
    - Shared base config pattern: defineConfig in vitest.shared.ts, imported via mergeConfig+defineProject in each package
    - Projects array pattern: root vitest.config.ts lists all workspace packages for orchestration
    - Package isolation: each package has its own vitest.config.ts with correct environment (node vs happy-dom)

key-files:
  created:
    - vitest.config.ts (root workspace orchestration via projects array)
    - vitest.shared.ts (shared base config with 80% coverage thresholds)
    - vitest.workspace.ts (migration notes for Vitest 4.0; references vitest.config.ts)
    - packages/shared/vitest.config.ts (node environment, merges shared config)
    - packages/events/vitest.config.ts (node environment, merges shared config)
    - apps/web/vitest.config.ts (happy-dom environment, React plugin, merges shared config)
    - services/notification-worker/vitest.config.ts (node environment, merges shared config)
    - packages/shared/src/utils/index.test.ts (smoke test for generateSlug)
  modified:
    - package.json (added test/test:unit/test:watch/test:ui/test:coverage scripts)
    - packages/shared/package.json (added test/test:watch scripts)
    - packages/events/package.json (added test/test:watch scripts)
    - apps/web/package.json (added test/test:watch scripts)
    - services/notification-worker/package.json (added test/test:watch scripts)

key-decisions:
  - 'Vitest 4.0 removed defineWorkspace: replaced with test.projects array in vitest.config.ts'
  - 'Coverage thresholds at 80% for lines/functions/branches/statements enforced via v8 provider'
  - 'web package uses happy-dom environment; all other packages use node environment'
  - 'vitest.workspace.ts kept as migration reference document but actual config is vitest.config.ts'

patterns-established:
  - 'Package test config pattern: import sharedConfig from ../../vitest.shared; export mergeConfig(sharedConfig, defineProject({...}))'
  - 'Coverage excludes: node_modules/**, *.config.*, *.d.ts, mocks/**, index.ts barrel files'
  - 'Smoke test location: packages/shared/src/utils/index.test.ts'

# Metrics
duration: 8min
completed: 2026-02-20
---

# Phase 16 Plan 01: Testing Foundation - Vitest Workspace Configuration Summary

**Vitest 4.0 test infrastructure with v8 coverage provider, projects-based monorepo orchestration, and 80% threshold enforcement across 4 workspace packages**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-20T16:07:57Z
- **Completed:** 2026-02-20T16:15:11Z
- **Tasks:** 2 of 2
- **Files modified:** 13

## Accomplishments

- Installed Vitest 4.0.18 with coverage-v8, UI, happy-dom, vite-tsconfig-paths at root, plus full React testing library stack in apps/web
- Created shared base config with 80% coverage thresholds using v8 provider and per-package configs for all 4 workspace packages
- Proved end-to-end test pipeline works with 5-assertion smoke test for Czech diacritic handling in generateSlug

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Vitest dependencies and create shared configuration** - `f2c190e` (chore)
2. **Task 2: Create per-package Vitest configs and verify workspace test execution** - `eb31697` (feat)

## Files Created/Modified

- `vitest.config.ts` - Root Vitest config using projects array for monorepo orchestration (Vitest 4.0 pattern)
- `vitest.shared.ts` - Shared base config: globals, v8 coverage, 80% thresholds, lcov/html/json reporters
- `vitest.workspace.ts` - Migration notes file; re-exports from vitest.config.ts for reference
- `packages/shared/vitest.config.ts` - Node environment, merges shared config, vite-tsconfig-paths
- `packages/events/vitest.config.ts` - Node environment, merges shared config, vite-tsconfig-paths
- `apps/web/vitest.config.ts` - happy-dom environment, @vitejs/plugin-react, vite-tsconfig-paths
- `services/notification-worker/vitest.config.ts` - Node environment, merges shared config
- `packages/shared/src/utils/index.test.ts` - Smoke test: generateSlug Czech diacritics (5 tests)
- `package.json` - Added test/test:unit/test:watch/test:ui/test:coverage scripts
- `packages/shared/package.json` - Added test/test:watch scripts
- `packages/events/package.json` - Added test/test:watch scripts
- `apps/web/package.json` - Added test/test:watch scripts
- `services/notification-worker/package.json` - Added test/test:watch scripts

## Decisions Made

- Used `test.projects` array in `vitest.config.ts` instead of `defineWorkspace` in `vitest.workspace.ts` because Vitest 4.0 removed `defineWorkspace` - the `projects` array is the official replacement
- Kept `vitest.workspace.ts` as a migration reference document to satisfy the plan's artifact requirement and document the API change for future developers
- Used explicit package paths in `projects` array (`['apps/web', 'packages/shared', ...]`) instead of glob patterns to avoid accidentally picking up `.claude/` or other non-project directories

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced defineWorkspace with projects config array**

- **Found during:** Task 2 (workspace test execution verification)
- **Issue:** Plan specified `defineWorkspace` from `vitest/config` in `vitest.workspace.ts`. Vitest 4.0 removed `defineWorkspace` entirely - it is not exported from `vitest/config`. The `pnpm test` command was picking up unrelated test files (`.claude/get-shit-done/bin/gsd-tools.test.js`) because Vitest wasn't using the workspace file for orchestration.
- **Fix:** Created `vitest.config.ts` at root with `test.projects: ['apps/web', 'packages/shared', 'packages/events', 'packages/database', 'services/notification-worker']`. Updated `vitest.workspace.ts` to be a migration reference document. This is the officially recommended Vitest 4.0 approach.
- **Files modified:** vitest.config.ts (created), vitest.workspace.ts (updated)
- **Verification:** `pnpm test` runs only shared package tests (5 pass), no gsd-tools tests appear
- **Committed in:** eb31697 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking API change)
**Impact on plan:** The fix is a direct consequence of Vitest 4.0 removing `defineWorkspace`. The workspace orchestration goal is fully achieved via `test.projects`. No scope creep.

## Issues Encountered

- The `gsd-tools.test.js` in `.claude/get-shit-done/bin/` uses Node.js native test runner (TAP format), not Vitest. It was being picked up by Vitest's root scan before the `projects` fix. Explicit project paths in `vitest.config.ts` resolved this cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Test infrastructure complete; all subsequent test plans (16-02 through 16-07) can now run via `pnpm test`
- apps/web vitest.config.ts does not yet have `setupFiles` for MSW - Plan 16-03 will add this
- Coverage thresholds at 80% are enforced but will only trigger failures once more tests exist
- packages/database has no vitest.config.ts - will be added if/when database unit tests are needed

---

_Phase: 16-testing-foundation_
_Completed: 2026-02-20_

## Self-Check: PASSED

All key files exist, commits verified, config contents validated:
- vitest.config.ts: FOUND
- vitest.shared.ts: FOUND (contains thresholds)
- vitest.workspace.ts: FOUND
- packages/shared/vitest.config.ts: FOUND (contains mergeConfig)
- packages/events/vitest.config.ts: FOUND
- apps/web/vitest.config.ts: FOUND (contains happy-dom)
- services/notification-worker/vitest.config.ts: FOUND
- packages/shared/src/utils/index.test.ts: FOUND
- .planning/phases/16-testing-foundation/16-01-SUMMARY.md: FOUND
- Commit f2c190e: FOUND
- Commit eb31697: FOUND
