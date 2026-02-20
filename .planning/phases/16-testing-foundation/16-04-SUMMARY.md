---
phase: 16-testing-foundation
plan: 04
subsystem: testing
tags: [vitest, coverage, v8, ci, github-actions, pnpm]

# Dependency graph
requires:
  - phase: 16-testing-foundation
    provides: Plan 01 (Vitest 4.0 workspace), Plan 02 (shared unit tests + coverage.include pattern), Plan 03 (MSW 2.0 + CI test pipeline)
provides:
  - CI coverage gate that actually enforces 80% threshold per package
  - packages/events/vitest.config.ts with coverage.include scoped to booking.ts and payment.ts
  - test:coverage script in packages/shared, packages/events, apps/web
  - pnpm -r --if-present test:coverage pattern for per-package threshold enforcement
affects:
  - 17-integration-tests (coverage enforcement infrastructure is now locked in)
  - all future phases (CI blocks on coverage drops)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - coverage.include explicit file list per package to prevent untested infrastructure siblings from dragging threshold below 80%
    - pnpm -r --if-present test:coverage runs each package individually so per-package exit codes propagate
    - Vitest 4.0 workspace mode does not enforce per-package thresholds at root — use per-package scripts instead

key-files:
  created: []
  modified:
    - packages/events/vitest.config.ts
    - packages/shared/package.json
    - packages/events/package.json
    - apps/web/package.json
    - .github/workflows/ci.yml

key-decisions:
  - 'pnpm -r --if-present test:coverage chosen over root workspace coverage threshold: per-package exit codes propagate, matches existing per-package vitest.config.ts pattern, no changes to vitest.shared.ts needed'
  - 'events coverage.include scoped to src/events/booking.ts and src/events/payment.ts only: publisher.ts contains RabbitMQ infrastructure (publishEvent, getChannel, closeConnection) that require a live broker — integration test scope (Phase 17)'
  - 'Do not add test:coverage to packages/database (no tests) or services/notification-worker (separate CI job)'

patterns-established:
  - 'Per-package coverage.include: every package with unit tests explicitly lists only the files that are fully testable without external infrastructure'
  - 'CI coverage gate: pnpm -r --if-present test:coverage ensures all package thresholds are enforced independently and failures block the build'

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 16 Plan 04: CI Coverage Gate Summary

**Vitest workspace coverage threshold propagation fixed: per-package test:coverage scripts + pnpm -r enforcement now correctly block CI builds when any package drops below 80%**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T17:13:45Z
- **Completed:** 2026-02-20T17:16:14Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Added `coverage.include: ['src/events/booking.ts', 'src/events/payment.ts']` to packages/events/vitest.config.ts, excluding publisher.ts (RabbitMQ infrastructure) from unit test coverage measurement — booking.ts and payment.ts now show 100% on all 4 metrics
- Added `"test:coverage": "vitest run --coverage"` script to packages/shared/package.json, packages/events/package.json, and apps/web/package.json so pnpm -r can invoke per-package coverage runs
- Updated .github/workflows/ci.yml from `pnpm test:coverage` (root workspace, exits 0 regardless of thresholds) to `pnpm -r --if-present test:coverage` (per-package, propagates non-zero exit codes) — CI now correctly fails builds when any package is below 80%

## Task Commits

Each task was committed atomically:

1. **Task 1: Add coverage.include to packages/events/vitest.config.ts** - `96efc6b` (feat)
2. **Task 2: Add test:coverage scripts to packages and fix CI coverage command** - `9dcb596` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `packages/events/vitest.config.ts` - Added coverage.include scoped to src/events/booking.ts and src/events/payment.ts; excludes publisher.ts (RabbitMQ infrastructure)
- `packages/shared/package.json` - Added "test:coverage": "vitest run --coverage" to scripts
- `packages/events/package.json` - Added "test:coverage": "vitest run --coverage" to scripts
- `apps/web/package.json` - Added "test:coverage": "vitest run --coverage" to scripts
- `.github/workflows/ci.yml` - Changed "Run unit tests with coverage" step from `pnpm test:coverage` to `pnpm -r --if-present test:coverage`

## Decisions Made

- **Per-package runner over workspace thresholds:** `pnpm -r --if-present test:coverage` chosen over adding `coverage.thresholds` to root vitest.config.ts. Per-package execution is explicit, composable, and matches the existing per-package vitest.config.ts pattern — each package owns its coverage config and exit code.
- **events coverage.include scoped to pure function files only:** publisher.ts contains six RabbitMQ-dependent functions (publishEvent, getChannel, createChannelFromConnection, closeConnection) that require a live broker. These are integration test scope (Phase 17). createCloudEvent and validateCloudEvent from publisher.ts are indirectly validated via domain event creator tests.
- **Commit scope fix:** commitlint enforces scope-enum [database, backend, frontend, devops, docs, shared, events, ui, web, deps] — used `events` and `devops` scopes respectively to satisfy hook.

## Deviations from Plan

None - plan executed exactly as written. Both tasks completed without requiring deviation rules.

## Issues Encountered

- commitlint scope-enum rejected `16-04` as commit scope (planned scope format). Used allowed scopes `events` and `devops` instead. No functional impact.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 16 is now fully complete. All 4 must-haves are verified:
1. `pnpm test:unit` — 243 tests across 6 files, exit 0
2. CI coverage gate — `pnpm -r --if-present test:coverage` enforces 80% per-package, blocks CI on threshold violations
3. 80%+ shared utils/schemas coverage — 100% on 5 files (utils/index.ts, schemas/booking.ts, payment.ts, notification.ts, events/booking.ts, events/payment.ts)
4. MSW mocking — 7 handlers, 9 tests, interception + reset pattern verified

Phase 17 (Integration Tests) can begin. Testcontainers on Railway compatibility is a known uncertainty — fallback to Railway test DB if Docker-in-Docker fails (documented in STATE.md blockers).

---

## Self-Check: PASSED

- packages/events/vitest.config.ts: FOUND
- packages/shared/package.json: FOUND
- packages/events/package.json: FOUND
- apps/web/package.json: FOUND
- .github/workflows/ci.yml: FOUND
- .planning/phases/16-testing-foundation/16-04-SUMMARY.md: FOUND
- Commit 96efc6b (Task 1): FOUND
- Commit 9dcb596 (Task 2): FOUND

_Phase: 16-testing-foundation_
_Completed: 2026-02-20_
