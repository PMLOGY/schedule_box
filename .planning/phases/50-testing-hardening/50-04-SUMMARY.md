---
phase: 50-testing-hardening
plan: "04"
subsystem: testing
tags: [unit-tests, e2e, integration, booking, playwright, testcontainers]
dependency_graph:
  requires: [50-01, 50-02]
  provides: [booking-service unit tests, admin-impersonation E2E, marketplace E2E, SKIP_DOCKER guard]
  affects: [apps/web/lib/booking, apps/web/e2e, tests/integration]
tech_stack:
  added: []
  patterns:
    - vi.mock fluent chain helpers for complex Drizzle query mocking
    - describe.skipIf(process.env.SKIP_DOCKER) for Docker-optional integration tests
    - Playwright admin-setup project with dedicated storageState
key_files:
  created:
    - apps/web/lib/booking/booking-service.test.ts
    - apps/web/e2e/admin.setup.ts
    - apps/web/e2e/tests/admin-impersonation.spec.ts
    - apps/web/e2e/tests/marketplace.spec.ts
  modified:
    - apps/web/e2e/playwright.config.ts
    - tests/integration/globalSetup.ts
    - tests/integration/booking/double-booking.test.ts
    - tests/integration/booking/status-transitions.test.ts
    - tests/integration/auth/switch-location.test.ts
    - tests/integration/rls/tenant-isolation.test.ts
decisions:
  - "Mock db.select() chains inline per test rather than shared helpers (per Phase 50 decision pattern)"
  - "describe.skipIf(process.env.SKIP_DOCKER) chosen over inject() guard — process.env available at module eval time, inject() is not"
  - "Optional chaining on superClient?.end() in afterAll prevents crash when SKIP_DOCKER skips beforeAll setup"
  - "admin-chromium Playwright project has dedicated testMatch /admin-.*\\.spec\\.ts/ to avoid running admin E2E with regular user auth"
metrics:
  duration: "10min"
  completed: "2026-03-18T21:35:00Z"
  tasks: 2
  files: 11
---

# Phase 50 Plan 04: Test Coverage Gaps (Booking Service + E2E + Testcontainers) Summary

**One-liner:** Booking-service unit tests with SLOT_TAKEN double-booking prevention, admin impersonation + marketplace E2E specs, and Docker-optional integration test skip guard.

## What Was Built

### Task 1: Booking service unit tests (TDD)

Created `apps/web/lib/booking/booking-service.test.ts` with **17 test cases** covering:

- `createBooking` — happy path, SLOT_TAKEN (409) conflict path, NotFoundError (service not found), ValidationError (inactive service), auto-assign employee path
- `listBookings` — pagination + meta, status filter, date range filter, employee_id filter
- `getBooking` — found with relations, not found (returns null), null employee
- `updateBooking` — fields-only update, NotFoundError, transaction path for start_time change
- `deleteBooking` — soft-delete success, NotFoundError

Mock strategy: `vi.mock('@schedulebox/database')` with fluent chain helper `makeSelectChain(rows)` that returns an awaitable query builder chain. `dbTx.transaction` mocked to invoke the callback with a fake `tx` object, enabling full transaction branch testing.

All 17 tests pass.

### Task 2: E2E specs + Testcontainers guard

**admin.setup.ts** — Playwright auth setup authenticating as `admin@schedulebox.cz / password123`, saving storageState to `playwright/.auth/admin.json`.

**playwright.config.ts** — Added `admin-setup` project (testMatch: `/admin\.setup\.ts/`) and `admin-chromium` project (testMatch: `/admin-.*\.spec\.ts/`, depends on `admin-setup`, uses `playwright/.auth/admin.json`).

**admin-impersonation.spec.ts** — E2E test for admin impersonation flow: navigate to `/admin/companies`, click Impersonate, verify banner appears (by `data-testid="impersonation-banner"` or text), navigate to dashboard (banner persists), click End Impersonation, verify banner disappears.

**marketplace.spec.ts** — E2E tests for marketplace discovery: search input renders, search filters results, firm detail page shows Book Now button, Book Now redirects to booking wizard. Graceful `test.skip()` when marketplace is empty (no seeding required for spec to be valid).

**globalSetup.ts** — Added SKIP_DOCKER guard at top of `setup()`: provides empty strings for all four injected URLs and returns early. Docker-dependent integration tests use `describe.skipIf(process.env.SKIP_DOCKER === 'true')` on each describe block and `beforeAll/afterAll` guards with optional chaining on client `.end()`.

Result: `SKIP_DOCKER=true npx vitest run --config vitest.integration.config.ts` → 1 passed, 35 skipped, **0 failures**.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two unused vars prevented commit (ESLint)**

- **Found during:** Task 1 commit (pre-commit hook)
- **Issue:** `AppError` type import and `MOCK_BOOKING_WITH_RELATIONS` constant were unused
- **Fix:** Removed both; the type was imported for annotation but never used; the constant was leftover from drafting
- **Files modified:** `apps/web/lib/booking/booking-service.test.ts`
- **Commit:** Incorporated into Task 1 commit before final push

**2. [Rule 1 - Bug] Commit message subject-case violation**

- **Found during:** Task 2 commit (commit-msg hook, commitlint)
- **Issue:** Commit message used sentence-case ("Add E2E admin impersonation..."), commitlint requires lowercase subject
- **Fix:** Changed to lowercase ("add E2E admin impersonation...")

**3. [Rule 2 - Critical functionality] SKIP_DOCKER guard needed on describe blocks AND afterAll**

- **Found during:** Task 2 verification (first SKIP_DOCKER run crashed with `TypeError: Cannot read properties of undefined (reading 'begin')`)
- **Issue:** `beforeAll` returning early left `superClient`/`appClient` undefined; test bodies still ran; `afterAll` called `.end()` on undefined
- **Fix:** Added `describe.skipIf(process.env.SKIP_DOCKER === 'true')` to each describe block (replaces the early-return-only approach); added `?.` optional chaining on all `superClient.end()` / `appClient.end()` calls; added `SKIP_DOCKER` guard to `beforeEach` in files with top-level beforeEach hooks
- **Files modified:** All 4 integration test files

## Self-Check: PASSED

Files exist:
- `apps/web/lib/booking/booking-service.test.ts` — FOUND
- `apps/web/e2e/admin.setup.ts` — FOUND
- `apps/web/e2e/tests/admin-impersonation.spec.ts` — FOUND
- `apps/web/e2e/tests/marketplace.spec.ts` — FOUND
- `apps/web/e2e/playwright.config.ts` (updated) — FOUND
- `tests/integration/globalSetup.ts` (updated with SKIP_DOCKER) — FOUND

Commits:
- `43bd0ae` — test(web): add booking-service unit tests with double-booking prevention
- `d1c5c94` — feat(web): add E2E admin impersonation, marketplace specs, Testcontainers skip guard
