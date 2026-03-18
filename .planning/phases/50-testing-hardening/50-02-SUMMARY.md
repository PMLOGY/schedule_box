---
phase: 50-testing-hardening
plan: "02"
subsystem: payments-saga, booking-state-machine
tags: [testing, unit-tests, payment-saga, booking-transitions, booking-expiration, coverage]
dependency_graph:
  requires: []
  provides: [payment-saga-tests, booking-transitions-tests, booking-expiration-tests]
  affects: [CI-coverage-gate]
tech_stack:
  added: []
  patterns:
    - vitest vi.mock() for @schedulebox/database and @schedulebox/events
    - dbTx.transaction mockImplementation pattern (call-through with mock tx)
    - Incremental mockImplementation callCount pattern for multi-step query chains
key_files:
  created:
    - apps/web/app/api/v1/payments/saga/booking-payment-handlers.test.ts
    - apps/web/lib/booking/booking-transitions.test.ts
    - apps/web/lib/booking/booking-expiration.test.ts
  modified: []
decisions:
  - "Mock db.select() chains inline per test rather than with shared helpers — avoids state bleed between tests"
  - "Use callCount pattern inside dbTx.transaction for multi-call selects in rescheduleBooking"
  - "AppError not imported from @schedulebox/shared — tests use .rejects.toMatchObject({ code }) instead"
  - "booking-transitions branch coverage capped at ~76% — remaining branches in fireStatusChangeEmail private helper and deep reschedule edge cases; combined target 80%+ met"
metrics:
  duration: 8min
  completed: "2026-03-18"
  tasks: 2
  files_created: 3
  tests_total: 55
  coverage_payment_handlers: "100% branch"
  coverage_expiration: "100% branch"
  coverage_transitions: "76.25% branch"
  coverage_combined: "81.73% branch (all 3 target files)"
---

# Phase 50 Plan 02: Payment SAGA & Booking State Machine Tests Summary

Unit tests for the payment SAGA handlers (3 functions), booking status transitions (5 functions), and booking expiration logic. Combined branch coverage exceeds the 81.73% target across all 3 files.

## What Was Built

**Task 1 — Payment SAGA Handler Tests** (`booking-payment-handlers.test.ts`)

18 test cases across the 3 handlers:

| Handler | Cases | Key Scenarios |
|---|---|---|
| handlePaymentCompleted | 6 | happy path, idempotent (confirmed), idempotent (cancelled), not found, unexpected status, event failure |
| handlePaymentFailed | 6 | happy path, idempotent (cancelled), idempotent (confirmed), not found, unexpected status, rethrow |
| handlePaymentExpired | 6 | happy path, idempotent (cancelled), idempotent (confirmed), not found, unexpected status, rethrow |

Coverage on `booking-payment-handlers.ts`: **100% branch** (all 4 branches in each of 3 handlers covered).

Critical invariant verified: `vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx))` — callback is always invoked so tests never pass vacuously.

**Task 2 — Booking Transitions Tests** (`booking-transitions.test.ts`)

33 test cases across the 5 transition functions:

| Function | Cases | Key Scenarios |
|---|---|---|
| confirmBooking | 4 | happy path (pending→confirmed), not found, cancelled source, completed source |
| cancelBooking | 5 | admin happy path, employee happy path, customer CANCELLATION_POLICY, not found, invalid source |
| completeBooking | 5 | happy path (confirmed→completed), not found, invalid pending source, invalid cancelled, loyalty points failure |
| markNoShow | 4 | happy path (confirmed→no_show), not found, invalid pending, invalid cancelled |
| rescheduleBooking | 15 | happy path, pending booking, employee change, not found, cancelled/completed/no_show invalid, employee not found/inactive/unassigned, null employee, service not found, event failure, slot conflict |

**Task 2 — Expiration Tests** (`booking-expiration.test.ts`)

4 test cases for `expirePendingBookings()`:
- Returns count of expired bookings and publishes one event per booking
- Returns 0 and no events when no pending bookings exist
- Sets correct DB fields (status=cancelled, cancelledBy=system, correct reason)
- Continues processing remaining bookings if one publishEvent throws

## Coverage Summary

| File | Statements | Branch | Functions | Lines |
|---|---|---|---|---|
| booking-payment-handlers.ts | 94.2% | **100%** | 100% | 94.2% |
| booking-transitions.ts | 86.23% | 76.25% | 80% | 86.23% |
| booking-expiration.ts | 100% | **100%** | 100% | 100% |
| **Combined** | **88.37%** | **81.73%** | 88.23% | 88.37% |

All targets met: payment handlers >=85% branch (achieved 100%), combined >=80% branch (achieved 81.73%).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Unused code] Removed unused `makeSelectChain` from payment handler tests**

- Found during: Task 1 commit (ESLint pre-commit hook)
- Fix: Removed helper that was never called; the inline `makeMockTx` function was used instead
- Files modified: `booking-payment-handlers.test.ts`

**2. [Rule 2 - Unused imports] Removed unused `AppError` import and `makeDbSelectChain` helper from transitions tests**

- Found during: Task 2 commit (ESLint pre-commit hook)
- Fix: Replaced `AppError` usage with `.rejects.toMatchObject({ code })` pattern; removed unused `makeDbSelectChain`
- Files modified: `booking-transitions.test.ts`

**3. [Rule 1 - Bug] Fixed double-call in cancelBooking CANCELLATION_POLICY test**

- Found during: Task 2 first run
- Issue: Test called `cancelBooking` twice but mock setup only covered one call; second got `getBooking` from wrong mock state, returned NotFoundError
- Fix: Used `.mockResolvedValue()` (permanent) instead of `.mockResolvedValueOnce()`, single assertion
- Files modified: `booking-transitions.test.ts`

## Self-Check: PASSED

- FOUND: apps/web/app/api/v1/payments/saga/booking-payment-handlers.test.ts
- FOUND: apps/web/lib/booking/booking-transitions.test.ts
- FOUND: apps/web/lib/booking/booking-expiration.test.ts
- FOUND commit c7ebc6e: test(web): payment SAGA handler tests with 100% branch coverage
- FOUND commit 16aa683: test(web): booking transitions and expiration tests
