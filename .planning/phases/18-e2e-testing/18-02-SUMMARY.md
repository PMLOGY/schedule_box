---
phase: 18-e2e-testing
plan: 02
subsystem: testing
tags: [playwright, e2e, auth, booking, page-object-model, browser-testing]

# Dependency graph
requires:
  - phase: 18-e2e-testing
    plan: 01
    provides: Playwright config, Page Object Models (LoginPage, RegisterPage, BookingWizardPage, DashboardPage), mock-api helpers, auth fixture, test-data constants
provides:
  - auth.spec.ts with 4 test cases (registration, login, invalid credentials, email validation)
  - booking.spec.ts with 2 test cases (full 4-step wizard, field validation)
  - E2E coverage of the two most critical user journeys
affects: [18-03-PLAN, ci-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: ['Unauthenticated test context via test.use({ storageState })', 'Full API mock setup via page.route() for multi-step wizard', 'react-day-picker calendar interaction via button text matching']

key-files:
  created:
    - apps/web/e2e/tests/auth.spec.ts
    - apps/web/e2e/tests/booking.spec.ts
  modified: []

key-decisions:
  - 'Availability mock uses AvailabilitySlot format (startTime/endTime/employeeId) matching Step2DateTimeSelect component expectations, not the simpler mockAvailabilityAPI helper format'
  - 'Booking wizard mock includes customer creation endpoint (POST /api/v1/customers) because Step4Confirmation creates a new customer before booking when no existing customer is selected'
  - 'AI upselling endpoint mocked with empty recommendations to prevent UpsellingSuggestions widget from blocking service selection'
  - 'Calendar day selection uses button text filter with regex anchor (^N$) to match exact day number in react-day-picker'

patterns-established:
  - 'Unauthenticated context pattern: test.use({ storageState: { cookies: [], origins: [] } }) for auth tests'
  - 'Full mock setup helper: centralized setupBookingMocks() function encapsulates all API mocks for multi-step flows'
  - 'Calendar interaction pattern: button filter with exact day match for react-day-picker date selection'

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 18 Plan 02: Auth and Booking E2E Test Specs Summary

**Auth registration/login and 4-step booking wizard E2E tests with page.route() API mocking and Page Object Models**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T18:24:33Z
- **Completed:** 2026-02-20T18:28:46Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- 4 auth E2E tests covering registration success, login success, invalid credentials error, and email format validation
- 2 booking E2E tests covering full 4-step wizard flow with mocked APIs and field validation (Next button visibility)
- All tests use Page Object Models from Plan 01 infrastructure (LoginPage, RegisterPage, BookingWizardPage, DashboardPage)
- Comprehensive API mocking: services, employees, availability, customers, bookings, AI upselling endpoints

## Task Commits

Each task was committed atomically:

1. **Task 1: Create auth E2E tests (registration and login)** - `42bf0e5` (feat)
2. **Task 2: Create booking creation E2E test** - `cd22a67` (feat)

## Files Created/Modified

- `apps/web/e2e/tests/auth.spec.ts` - 4 auth tests: registration success, login with seeded credentials, invalid credentials error, email format Zod validation
- `apps/web/e2e/tests/booking.spec.ts` - 2 booking tests: full 4-step wizard with mock APIs, field validation for service selection requirement

## Decisions Made

- **Availability mock format:** Used the full AvailabilitySlot interface (startTime/endTime/employeeId/employeeName/isAvailable) instead of the simpler mockAvailabilityAPI helper, because Step2DateTimeSelect expects the component-level format with AvailabilityGrid slots
- **Customer creation mock:** Added POST /api/v1/customers mock since Step4Confirmation creates a new customer before creating the booking when no existing customer is selected from search
- **AI upselling mock:** Mocked with empty recommendations to prevent the UpsellingSuggestions widget from interfering with test flow
- **Calendar day interaction:** Used button text filter with regex anchors (`^N$`) for exact day number matching in react-day-picker, avoiding false matches with date strings containing the day number

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ESLint consistent-type-imports violation**

- **Found during:** Task 2 (booking.spec.ts)
- **Issue:** `import('@playwright/test').Page` type annotation in setupBookingMocks function violated `@typescript-eslint/consistent-type-imports` rule
- **Fix:** Changed to `import { type Page } from '@playwright/test'` as a named type import
- **Files modified:** apps/web/e2e/tests/booking.spec.ts
- **Verification:** ESLint passes on commit
- **Committed in:** cd22a67 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added AI upselling and customer API mocks**

- **Found during:** Task 2 (booking.spec.ts)
- **Issue:** Plan mentioned mocking services/employees/availability/bookings but Step1ServiceSelect also loads UpsellingSuggestions (AI endpoint) and Step3CustomerInfo queries /api/v1/customers for search, and Step4 creates customers before bookings
- **Fix:** Added page.route() mocks for AI upselling (empty recommendations), customer search (empty results), and customer creation (mock response with id:99)
- **Files modified:** apps/web/e2e/tests/booking.spec.ts
- **Verification:** All mocked endpoints handle the wizard's actual API call patterns
- **Committed in:** cd22a67 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for test correctness. No scope creep.

## Issues Encountered

- **Parallel agent stash conflict:** A concurrent agent had staged files (ai-fallback.spec.ts, payment.spec.ts) in the index. lint-staged stash backup conflicted on Task 2's first commit attempt. Resolved by recovering the stash, accepting the parallel agent's files, and re-staging only booking.spec.ts.
- **commitlint body-max-line-length:** First commit message body had lines exceeding 100 characters. Shortened bullet points to pass the rule.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth and booking E2E test specs ready for CI execution
- Plan 03 (payment + AI fallback tests) can proceed using mockComgatePaymentCreate, mockAIServiceDown helpers from Plan 01
- All 6 test cases cover the two most critical user journeys (auth entry + booking value)
- Tests configured for all 3 browsers via Playwright projects (chromium, firefox, webkit)

## Self-Check: PASSED

- All 3 files verified present on disk (auth.spec.ts, booking.spec.ts, 18-02-SUMMARY.md)
- Commit 42bf0e5 (Task 1) verified in git log
- Commit cd22a67 (Task 2) verified in git log

---

_Phase: 18-e2e-testing_
_Completed: 2026-02-20_
