---
phase: 16-testing-foundation
verified: 2026-02-20T17:35:00Z
status: gaps_found
score: 3/4 must-haves verified
re_verification: false
gaps:
  - truth: CI pipeline fails on push if unit tests fail OR coverage drops below 80%
    status: partial
    reason: CI correctly blocks on test failures but pnpm test:coverage exits code 0 at 51% overall. Vitest workspace mode does NOT enforce per-package coverage thresholds at root. The 80% coverage gate does not function in CI.
    artifacts:
      - path: .github/workflows/ci.yml
        issue: Uses pnpm test:coverage which exits 0 despite threshold violations. Verified: exit code 0 with 51.51% statements / 49.18% lines.
      - path: vitest.shared.ts
        issue: Thresholds defined (80% all metrics) but vitest workspace silently ignores them when running via root pnpm test:coverage
      - path: packages/events/vitest.config.ts
        issue: No coverage.include restriction; publisher.ts (15-26% coverage) included in measurement; per-package threshold failure hidden in workspace run
    missing:
      - Root vitest.config.ts needs coverage thresholds at workspace level OR CI must run pnpm -r test:coverage so per-package failures propagate
      - Add coverage.include to packages/events/vitest.config.ts scoping to tested event files (same fix as packages/shared)
      - Fix CI coverage gate so it actually fails builds when coverage drops below 80%
human_verification: []
---

# Phase 16: Testing Foundation Verification Report

**Phase Goal:** Developer can run automated tests locally and in CI to catch bugs before production
**Verified:** 2026-02-20T17:35:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Developer can run pnpm test:unit and see test results | VERIFIED | 243 tests across 6 files pass. Exit code 0. All 5 workspace packages. |
| 2 | CI pipeline fails on push if unit tests fail or coverage drops below 80% | PARTIAL | Test failure gate: VERIFIED. Coverage gate: FAILED. Root pnpm test:coverage exits 0 at 51% overall. |
| 3 | Shared utilities and validation schemas have 80%+ unit test coverage | VERIFIED | packages/shared shows 100% on all 4 measured files: utils/index.ts, schemas/booking.ts, payment.ts, notification.ts. |
| 4 | External APIs (Comgate, AI service, SMTP) are mockable via MSW in tests | VERIFIED | 7 MSW handlers. 9 tests prove interception, override, and reset pattern working. |

**Score:** 3/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| vitest.config.ts | Workspace test orchestration | VERIFIED | test.projects array with 5 packages. Vitest 4.0 pattern. |
| vitest.shared.ts | Shared base config with thresholds | VERIFIED | 80% thresholds, v8 provider, lcov/html/json/text reporters. |
| packages/shared/vitest.config.ts | Shared package config | VERIFIED | Merges sharedConfig. Explicit coverage.include for 4 source files. |
| packages/events/vitest.config.ts | Events package config | STUB | Exists and merges config but no coverage.include scoping. publisher.ts at 15% coverage is included. |
| apps/web/vitest.config.ts | Web config with happy-dom | VERIFIED | happy-dom, plugin-react, setupFiles pointing to vitest.setup.ts. |
| services/notification-worker/vitest.config.ts | Worker config | VERIFIED | Exists, merges shared config, node environment. |
| packages/shared/src/utils/index.test.ts | 69+ utility tests | VERIFIED | 69 tests. All 9 exported functions. Czech/Slovak diacritics, boundaries, null/Infinity. |
| packages/shared/src/schemas/booking.test.ts | 42+ booking tests | VERIFIED | 42 tests. All 7 schemas and enums. Valid/invalid inputs, defaults, boundaries. |
| packages/shared/src/schemas/payment.test.ts | 40+ payment tests | VERIFIED | 42 tests. All 7 schemas and enums. |
| packages/shared/src/schemas/notification.test.ts | 30+ notification tests | VERIFIED | 40 tests. All 6 schemas and enums. |
| packages/events/src/events/events.test.ts | Events definition tests | VERIFIED | 41 tests: createCloudEvent, validateCloudEvent, 11 domain event creators (6 booking + 5 payment). |
| apps/web/mocks/handlers.ts | MSW handlers (30+ lines) | VERIFIED | 100 lines. comgateHandlers x3, aiHandlers x3, notificationHandlers x1, createSMTPHandler helper. |
| apps/web/mocks/server.ts | MSW Node server | VERIFIED | setupServer from msw/node, spreads all handlers. |
| apps/web/vitest.setup.ts | MSW lifecycle | VERIFIED | beforeAll(listen) / afterEach(resetHandlers) / afterAll(close). |
| .github/workflows/ci.yml | CI test job | PARTIAL | Test job exists, build depends on it. But pnpm test:coverage exits 0 at 51% - coverage gate broken. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| packages/shared/vitest.config.ts | vitest.shared.ts | import sharedConfig + mergeConfig | WIRED | Confirmed in file. |
| vitest.config.ts | all workspace packages | test.projects array | WIRED | 5 packages listed explicitly. |
| package.json | vitest | test/test:unit/test:coverage scripts | WIRED | All 5 scripts present and correct. |
| apps/web/vitest.setup.ts | apps/web/mocks/server.ts | import server from ./mocks/server | WIRED | Confirmed. |
| apps/web/mocks/server.ts | apps/web/mocks/handlers.ts | import handlers from ./handlers | WIRED | setupServer(...handlers) confirmed. |
| apps/web/vitest.config.ts | apps/web/vitest.setup.ts | setupFiles config | WIRED | setupFiles: ./vitest.setup.ts confirmed. |
| .github/workflows/ci.yml | pnpm test:coverage | CI step | PARTIAL | Step exists. Exits 0 at 51% - threshold enforcement absent at workspace level. |
| .github/workflows/ci.yml | build job | needs: [lint, test] | WIRED | Build requires test job to pass. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| TEST-01: Unit test runner for monorepo | SATISFIED | None |
| TEST-02: CI test gate (failures AND coverage) | PARTIAL | Coverage gate exits 0 at 51% overall coverage |
| TEST-03: 80%+ coverage on shared utils/schemas | SATISFIED | None - 100% on all 4 measured files |
| TEST-04: MSW for external API mocking | SATISFIED | None |

### Anti-Patterns Found

| File | Issue | Severity | Impact |
|------|-------|----------|--------|
| packages/events/vitest.config.ts | No coverage.include scoping. publisher.ts (15% coverage) pulled into measurement | Blocker | Per-package run fails 4 threshold checks; root workspace hides these; CI does not enforce 80% gate |
| apps/web/mocks/handlers.ts | Lines 85-89 in createSMTPHandler error branch uncovered | Warning | Minor - helper function error path untested, not blocking any goal |

### Critical Gap: Coverage Threshold Enforcement Broken in CI

The CI runs pnpm test:coverage at repo root, using Vitest workspace mode.

Measured behavior (all verified by direct execution):
- Root pnpm test:coverage exit code: 0
- Reported overall coverage: 51.51% statements, 49.18% lines
- events/publisher.ts: 20.68% statements, 15.88% lines
- pnpm --filter @schedulebox/events test -- --coverage: exit code 1
  (4 ERROR messages: lines/functions/statements/branches below 80%)

Root cause: Vitest 4.0 workspace mode aggregates files into a combined report.
Per-package coverage.thresholds from vitest.shared.ts only apply when running packages
individually. Root vitest.config.ts has no coverage config so no thresholds apply
and the command exits 0 regardless of actual coverage percentage.

Consequence: The 80% coverage gate in ROADMAP success criterion 2 does not block builds.

Fix options for next plan:
1. Add coverage.thresholds to root vitest.config.ts (workspace-level enforcement)
2. Add coverage.include to packages/events/vitest.config.ts (same fix as packages/shared)
3. Change CI to: pnpm -r --if-present test:coverage (per-package, propagates exit codes)

### Human Verification Required

None. All success criteria are verifiable programmatically.

### Gaps Summary

One gap blocks full goal achievement: the CI coverage gate does not enforce the 80% threshold.
pnpm test:coverage exits 0 in workspace mode regardless of actual coverage. This is the same
class of bug fixed for packages/shared during Plan 02 (explicit coverage.include) but not
applied to packages/events, and workspace-level threshold config was never added to root vitest.config.ts.

Three of four success criteria are fully met:
- Test runner: 243 tests pass across 6 test files in all workspace packages
- Shared utils/schemas: 100% coverage on all 4 explicitly measured files
- MSW mocking: fully functional with verified interception and reset between tests

---

_Verified: 2026-02-20T17:35:00Z_
_Verifier: Claude (gsd-verifier)_
