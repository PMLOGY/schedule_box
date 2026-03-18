---
phase: 50-testing-hardening
plan: 01
subsystem: testing
tags: [vitest, unit-tests, coverage, availability-engine, buffer-time, mocking, drizzle]

# Dependency graph
requires:
  - phase: 50-testing-hardening
    provides: Phase research and test strategy for availability engine and buffer-time
provides:
  - 31 unit tests across two files covering the core scheduling algorithm
  - 94.59% branch coverage on availability-engine.ts (target >=90%)
  - 100% branch coverage on buffer-time.ts
  - vi.mock pattern for @schedulebox/database with db.query.* and db.select() chains
affects: [50-02, 50-03, 50-04, 50-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - vi.mock('@schedulebox/database') for Drizzle relational query API (db.query.*.findFirst)
    - makeSelectChain() helper for Drizzle db.select().from().innerJoin().where() mocking
    - mockReturnValueOnce() sequence for multiple sequential db.select() calls per test
    - eslint-disable @typescript-eslint/no-explicit-any at file top for test mock casts

key-files:
  created:
    - apps/web/lib/booking/buffer-time.test.ts
    - apps/web/lib/booking/availability-engine.test.ts
  modified: []

key-decisions:
  - 'db.query.* (relational API) mocked as vi.fn() on the query namespace object; db.select() chain mocked separately with makeSelectChain() returning mockResolvedValue on .where()'
  - 'drizzle-orm mocked entirely (eq/and/gte/lte/sql) since args are passed to mock fns that ignore them; this avoids Drizzle internals requiring real DB schema'
  - 'date-fns and buffer-time.ts NOT mocked — both are pure math, real execution increases confidence and simplifies test setup'
  - 'ESLint @typescript-eslint/no-explicit-any disabled per-file in test files — Drizzle mock chains require any casts, unavoidable in unit tests'

patterns-established:
  - 'DB mock pattern: vi.mock at module top, import after mock, vi.clearAllMocks() in beforeEach'
  - 'Select chain mock: makeSelectChain(rows) returns {from, innerJoin, leftJoin, where} all vi.fn().mockReturnThis() except where: vi.fn().mockResolvedValue(rows)'
  - 'Sequential select calls: mockReturnValueOnce() on db.select for each call in execution order'

requirements-completed: [TEST-01]

# Metrics
duration: 15min
completed: 2026-03-18
---

# Phase 50 Plan 01: Availability Engine & Buffer-Time Unit Tests Summary

**Vitest unit tests for the core scheduling algorithm: 31 tests, 94.59% branch coverage on availability-engine.ts and 100% on buffer-time.ts via vi.mock(@schedulebox/database) with Drizzle query chain mocks**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-18T22:13:00Z
- **Completed:** 2026-03-18T22:18:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- 15 buffer-time.ts tests covering calculateBookingTimeBlock (4 cases) and isSlotConflicting (11 cases) with 100% branch coverage
- 16 availability-engine.ts tests covering all major branches: service-not-found (3 paths), no-employees, employeeId filter, day-off override, invalid override, modified hours override, no working hours, company-level fallback, slot generation, booking conflict, buffer expansion, multi-day range
- Established the `vi.mock('@schedulebox/database')` pattern with both `db.query.*` (relational API) and `db.select()` (query builder chain) mocking styles for future test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Buffer-time utility tests** - `a6e2743` (test)
2. **Task 2: Availability engine tests** - `893dd34` (test)

## Files Created/Modified

- `apps/web/lib/booking/buffer-time.test.ts` — 15 unit tests for calculateBookingTimeBlock and isSlotConflicting; pure math, no mocking needed
- `apps/web/lib/booking/availability-engine.test.ts` — 16 unit tests for calculateAvailability; all DB calls mocked, exercises every major branch

## Decisions Made

- Mocked `drizzle-orm` entirely (eq/and/gte/lte/sql return undefined) — Drizzle operator args are passed to mock functions that ignore them, so real operator behavior is irrelevant for unit tests
- Used `makeSelectChain()` helper returning `mockResolvedValue` on `.where()` (the final method in both query chains used by the engine), rather than mocking all possible chain endpoints
- Kept date-fns and buffer-time.ts unmocked — both are pure functions, real execution increases confidence and validates slot time arithmetic
- Added `/* eslint-disable @typescript-eslint/no-explicit-any */` at file top rather than sprinkling `as unknown` everywhere — test mock casts are idiomatic and the disable is scoped to the test file only

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed ESLint @typescript-eslint/no-explicit-any errors blocking commit**

- **Found during:** Task 2 (availability engine tests)
- **Issue:** 22 `as any` casts in mock chain setup caused pre-commit ESLint hook to fail
- **Fix:** Added `/* eslint-disable @typescript-eslint/no-explicit-any */` at file top — this is standard practice for test files with Drizzle mock chains
- **Files modified:** apps/web/lib/booking/availability-engine.test.ts
- **Verification:** Pre-commit hook passed, commit succeeded
- **Committed in:** 893dd34 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed incorrect slot count assertion in company-level fallback test**

- **Found during:** Task 2 (first test run, 2 failures)
- **Issue:** Test asserted `result.length === 2` for 10:00-12:00 range with 60-min service; actual count is 5 (10:00, 10:15, 10:30, 10:45, 11:00 at 15-min intervals)
- **Fix:** Updated assertion to `result.length === 5` matching the real 15-min interval behavior
- **Files modified:** apps/web/lib/booking/availability-engine.test.ts
- **Verification:** Test passes with corrected assertion
- **Committed in:** 893dd34 (Task 2 commit)

**3. [Rule 1 - Bug] Replaced unreachable "Unknown employee name" test with observable behavior test**

- **Found during:** Task 2 (first test run, 2 failures)
- **Issue:** The `Unknown` fallback in `getWorkingPeriods` sets `period.employeeName` but slot output reads `employee.employeeName` from `serviceEmployees.find()` — the fallback branch is not observable through slot output
- **Fix:** Replaced with a test verifying `employeeUuid` and `employeeName` are correctly propagated from the `serviceEmployees` join result — this is the actual code path that sets slot output
- **Files modified:** apps/web/lib/booking/availability-engine.test.ts
- **Verification:** Test passes, tests meaningful behavior
- **Committed in:** 893dd34 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All auto-fixes corrected test accuracy and unblocked CI. No scope creep.

## Issues Encountered

None beyond the three auto-fixed deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Buffer-time and availability-engine have test coverage; ready for Plan 02 (payment SAGA tests)
- Mock patterns documented in this summary and patterns-established frontmatter — use for all remaining booking/payment test files
- Line 141 and 304 of availability-engine.ts remain uncovered (the `if (!employee) continue` guard in slot generation and the `employee?.name || 'Unknown'` fallback in period construction) — these are defensive guards hard to trigger with valid mock setup; 94.59% exceeds the 90% target

---

_Phase: 50-testing-hardening_
_Completed: 2026-03-18_
