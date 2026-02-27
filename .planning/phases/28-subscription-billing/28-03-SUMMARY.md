---
phase: 28-subscription-billing
plan: 03
subsystem: backend
tags: [bullmq, comgate, recurring-billing, dunning, invoice, handlebars, email]

# Dependency graph
requires:
  - phase: 28-01
    provides: subscription schema tables, Comgate recurring client, billing types/PLAN_CONFIG
  - phase: 28-05
    provides: invoice service with SEQUENCE numbering, VAT rate, sellerSnapshot pattern
provides:
  - BullMQ billing scheduler (startBillingScheduler) for daily renewal scanning
  - Comgate recurring charge processing with invoice creation
  - Dunning workflow (past_due -> 7d warning -> 14d expiry -> free downgrade)
  - Pending downgrade handling (cancelAtPeriodEnd) at period boundary
  - 4 Czech email templates (dunning, activation, invoice)
affects: [28-subscription-billing, notification-worker, billing-portal]

# Tech tracking
tech-stack:
  added: ['@schedulebox/shared (added to notification-worker)']
  patterns: [upsertJobScheduler (BullMQ 5.16+), inlined Comgate client in worker, direct DB invoice creation]

key-files:
  created:
    - services/notification-worker/src/schedulers/billing-scheduler.ts
    - services/notification-worker/src/templates/email/dunning-payment-failed.hbs
    - services/notification-worker/src/templates/email/dunning-final-warning.hbs
    - services/notification-worker/src/templates/email/subscription-activated.hbs
    - services/notification-worker/src/templates/email/subscription-invoice.hbs
  modified:
    - services/notification-worker/src/schedulers/index.ts
    - services/notification-worker/src/index.ts
    - services/notification-worker/package.json

key-decisions:
  - 'Inlined Comgate chargeRecurringPayment in worker instead of cross-package import to avoid coupling'
  - 'Direct DB invoice creation with SEQUENCE/VAT/sellerSnapshot instead of internal HTTP API call'
  - 'Used upsertJobScheduler (BullMQ 5.16+) instead of deprecated Queue.add with repeat'

patterns-established:
  - 'Billing scheduler pattern: daily cron via upsertJobScheduler with concurrency 1'
  - 'Invoice creation in worker: same SEQUENCE + VAT + sellerSnapshot pattern as invoice-service.ts'
  - 'Dunning workflow: past_due -> 7d warning (idempotent) -> 14d expiry -> free downgrade'

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 28 Plan 03: Billing Scheduler Summary

**BullMQ daily billing scheduler with Comgate recurring charges, SEQUENCE-based invoice creation, invoice PDF email dispatch, and 14-day dunning workflow with auto-expiry**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-24T19:28:43Z
- **Completed:** 2026-02-24T19:35:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Daily BullMQ job at 06:00 UTC scans active subscriptions due for renewal and charges via Comgate recurring
- Creates SEQUENCE-based invoices with country-specific VAT rate and frozen sellerSnapshot (Czech law compliance)
- Sends invoice PDF email to company owner after each successful renewal cycle
- Dunning workflow: failed payment -> past_due with email -> 7-day warning -> 14-day auto-expiry to Free plan
- Handles pending downgrades (cancelAtPeriodEnd) at period boundary without charging
- 4 Czech Handlebars email templates for payment failure, final warning, activation, and invoice

## Task Commits

Each task was committed atomically:

1. **Task 1: Create billing scheduler with renewal scanning, invoice creation, and dunning** - `9f74e61` (feat)
2. **Task 2: Create dunning, activation, and invoice email templates** - `66ab0af` (feat)

## Files Created/Modified

- `services/notification-worker/src/schedulers/billing-scheduler.ts` - BullMQ billing scheduler: renewal scanning, Comgate recurring charges, SEQUENCE invoice creation, dunning workflow
- `services/notification-worker/src/schedulers/index.ts` - Updated scheduler orchestrator to include billing scheduler
- `services/notification-worker/src/index.ts` - Updated shutdown handler for billing scheduler resources
- `services/notification-worker/package.json` - Added @schedulebox/shared dependency
- `services/notification-worker/src/templates/email/dunning-payment-failed.hbs` - Czech dunning email for failed payment with retry date
- `services/notification-worker/src/templates/email/dunning-final-warning.hbs` - Czech final warning before expiration with feature loss details
- `services/notification-worker/src/templates/email/subscription-activated.hbs` - Czech activation confirmation with plan details
- `services/notification-worker/src/templates/email/subscription-invoice.hbs` - Czech invoice email with amount summary and PDF download link

## Decisions Made

- **Inlined Comgate recurring client** in billing-scheduler.ts instead of importing from web app's client.ts. The web app's client uses `fetchWithTimeout` and `getComgateCredentials` which are local to the web app. Inlining avoids cross-package coupling between the web app and the worker.
- **Direct DB invoice creation** with SEQUENCE numbering, `getVatRate()`, and `sellerSnapshot` instead of internal HTTP API call to the web app. This avoids cross-service HTTP calls and works correctly in local dev where the web app may not be running.
- **Used `upsertJobScheduler`** (BullMQ 5.16+) instead of deprecated `Queue.add(..., { repeat })` as recommended by phase research.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @schedulebox/shared dependency to notification-worker**

- **Found during:** Task 1 (billing scheduler creation)
- **Issue:** notification-worker did not have @schedulebox/shared in its package.json dependencies, causing type-check failure for PLAN_CONFIG, getVatRate imports
- **Fix:** Added `"@schedulebox/shared": "workspace:*"` to notification-worker package.json and ran pnpm install
- **Files modified:** services/notification-worker/package.json, pnpm-lock.yaml
- **Verification:** `pnpm --filter notification-worker type-check` passes
- **Committed in:** 9f74e61 (Task 1 commit)

**2. [Rule 1 - Bug] Removed unused PLATFORM_SELLER constant**

- **Found during:** Task 1 (pre-commit lint)
- **Issue:** ESLint caught unused variable PLATFORM_SELLER (platform seller details are used by invoice-service.ts, not the billing scheduler which stores buyer snapshot)
- **Fix:** Removed the unused constant
- **Files modified:** services/notification-worker/src/schedulers/billing-scheduler.ts
- **Verification:** ESLint passes, pre-commit hook succeeds
- **Committed in:** 9f74e61 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for build and lint. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required. The billing scheduler uses existing COMGATE_MERCHANT_ID, COMGATE_SECRET, and COMGATE_API_URL environment variables that were configured in Phase 20 (SMS/Comgate integration).

## Next Phase Readiness

- Phase 28 is now complete (all 5 plans executed)
- Billing scheduler integrates with all prior Plan 01/02/04/05 work
- Ready to proceed to Phase 29 (next v1.3 phase)

---

_Phase: 28-subscription-billing_
_Completed: 2026-02-24_
