---
phase: 18-e2e-testing
plan: 01
subsystem: testing
tags: [playwright, e2e, page-object-model, browser-testing, webkit, chromium, firefox]

# Dependency graph
requires:
  - phase: 16-testing-foundation
    provides: Vitest + MSW infrastructure for unit tests; MSW handlers inform mock-api.ts patterns
provides:
  - Playwright 1.58.2 installed with Chromium, Firefox, WebKit browsers
  - playwright.config.ts with 3 browser projects + setup project + webServer
  - auth.setup.ts with storageState authentication for test owner
  - 4 Page Object Models (LoginPage, RegisterPage, BookingWizardPage, DashboardPage)
  - Mock API helpers (7 functions for services, employees, availability, Comgate, AI)
  - Auth fixture with authenticatedPage and unauthenticatedPage extensions
  - test-data.ts with seed user constants and mock data helpers
affects: [18-02-PLAN, 18-03-PLAN, ci-pipeline]

# Tech tracking
tech-stack:
  added: ['@playwright/test ^1.58.2']
  patterns: ['Page Object Model for UI flows', 'storageState auth setup', 'page.route() network mocking', 'i18n-safe regex locators']

key-files:
  created:
    - apps/web/e2e/playwright.config.ts
    - apps/web/e2e/auth.setup.ts
    - apps/web/e2e/helpers/test-data.ts
    - apps/web/e2e/helpers/mock-api.ts
    - apps/web/e2e/page-objects/login.page.ts
    - apps/web/e2e/page-objects/register.page.ts
    - apps/web/e2e/page-objects/booking-wizard.page.ts
    - apps/web/e2e/page-objects/dashboard.page.ts
    - apps/web/e2e/fixtures/auth.fixture.ts
  modified:
    - apps/web/package.json
    - package.json
    - .gitignore
    - pnpm-lock.yaml

key-decisions:
  - 'Playwright 1.58.2 over Cypress: native WebKit support for 40% CZ iOS users'
  - 'page.route() over MSW for E2E: simpler at browser network level, no service worker needed'
  - 'i18n-safe regex patterns in POMs: match Czech, Slovak, English button/label text'
  - 'storageState auth setup: authenticate once, reuse across all browser projects'

patterns-established:
  - 'Page Object Model: encapsulate page locators and actions in classes'
  - 'Auth fixture pattern: authenticatedPage/unauthenticatedPage for test isolation'
  - 'Mock API helper pattern: reusable page.route() interceptors as named export functions'
  - 'i18n locator pattern: use regex matching multiple locales in getByRole/getByText'

# Metrics
duration: 8min
completed: 2026-02-20
---

# Phase 18 Plan 01: Playwright E2E Infrastructure Summary

**Playwright 1.58.2 with 3-browser config, Page Object Models for auth/booking/dashboard, and page.route() mock helpers for Comgate and AI service**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-20T18:12:54Z
- **Completed:** 2026-02-20T18:20:59Z
- **Tasks:** 2/2
- **Files modified:** 13

## Accomplishments

- Playwright 1.58.2 installed with Chromium, Firefox, and WebKit browser binaries
- Playwright config with setup project (auth), 3 browser projects, webServer pointing to Next.js
- 4 Page Object Models covering login, registration, 4-step booking wizard, and dashboard
- 7 mock API helpers for services, employees, availability, Comgate payment, and AI service
- Auth fixture providing authenticatedPage and unauthenticatedPage for test isolation

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Playwright and create configuration** - `1d71927` (feat)
   - Note: Committed by parallel agent together with phase 19 docs due to concurrent execution
2. **Task 2: Create page object models and mock API helpers** - `c156aa7` (feat)

## Files Created/Modified

- `apps/web/e2e/playwright.config.ts` - Playwright configuration with 3 browser projects + setup + webServer
- `apps/web/e2e/auth.setup.ts` - Global auth setup saving storageState for test owner
- `apps/web/e2e/helpers/test-data.ts` - Test user constants (TEST_OWNER, ADMIN_USER) and mock data
- `apps/web/e2e/helpers/mock-api.ts` - Reusable page.route() interceptors for 7 API endpoints
- `apps/web/e2e/page-objects/login.page.ts` - LoginPage POM with goto, login, getErrorMessage
- `apps/web/e2e/page-objects/register.page.ts` - RegisterPage POM with 5-field registration
- `apps/web/e2e/page-objects/booking-wizard.page.ts` - BookingWizardPage POM for 4-step flow
- `apps/web/e2e/page-objects/dashboard.page.ts` - DashboardPage POM for post-auth verification
- `apps/web/e2e/fixtures/auth.fixture.ts` - Custom fixture extending base test with auth variants
- `apps/web/package.json` - Added test:e2e and test:e2e:ui scripts, @playwright/test devDep
- `package.json` - Added root-level test:e2e script
- `.gitignore` - Added Playwright auth/results/report directories
- `pnpm-lock.yaml` - Updated with @playwright/test dependency

## Decisions Made

- **Playwright 1.58.2** chosen over Cypress for native WebKit/Safari support (40% CZ iOS users)
- **page.route() network mocking** over MSW for E2E tests (simpler, no service worker setup)
- **i18n-safe regex patterns** in all POMs to match Czech (Prihlasit), Slovak, and English (Sign in) text
- **storageState auth pattern**: login once in setup project, reuse across chromium/firefox/webkit
- **Input type selectors** for email/password fields over getByLabel to be locale-independent
- **Separate auth fixture** with authenticatedPage/unauthenticatedPage for explicit test isolation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `expect` import from booking-wizard.page.ts**

- **Found during:** Task 2 (Page Object Models)
- **Issue:** ESLint `@typescript-eslint/no-unused-vars` flagged unused `expect` import
- **Fix:** Removed `expect` from the import statement
- **Files modified:** apps/web/e2e/page-objects/booking-wizard.page.ts
- **Verification:** ESLint passes on commit
- **Committed in:** c156aa7 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial lint fix. No scope creep.

## Issues Encountered

- **Concurrent agent commit collision (Task 1):** A parallel agent (working on phase 19 planning) committed our Task 1 files together with its own changes in commit `1d71927`. This happened because our staged files were picked up by the other agent's `git add` operation. The files are correctly committed in the repo; the commit message on `1d71927` doesn't fully describe the e2e files but the content is correct.
- **lint-staged stash cleanup failure:** The pre-commit hook's lint-staged backup mechanism failed with "lint-staged automatic backup is missing" during Task 1's commit attempt. The actual linting/formatting passed. Resolved by confirming files were already committed.
- **commitlint scope-enum:** The `18-01` scope is not in the allowed list. Used `web` scope instead for Task 2 commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- E2E infrastructure ready for Plans 02 and 03 to write actual test specs
- Plan 02 (auth + booking tests) can import LoginPage, RegisterPage, BookingWizardPage POMs
- Plan 03 (payment + AI fallback tests) can use mockComgatePaymentCreate, mockAIServiceDown helpers
- Auth fixture provides clean test isolation for both authenticated and unauthenticated flows
- No actual test specs exist yet - those are delivered by Plans 02 and 03

## Self-Check: PASSED

- All 10 files verified present on disk
- Commit 1d71927 (Task 1) verified in git log
- Commit c156aa7 (Task 2) verified in git log

---

_Phase: 18-e2e-testing_
_Completed: 2026-02-20_
