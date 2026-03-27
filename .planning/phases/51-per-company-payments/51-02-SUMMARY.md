---
phase: 51-per-company-payments
plan: 02
subsystem: payments
tags: [comgate, react-query, settings-ui, per-company-credentials, webhook]

# Dependency graph
requires:
  - phase: 51-per-company-payments/01
    provides: payment_providers table, credential resolver, Comgate client overrides
provides:
  - Settings > Payments UI page with Comgate credential form
  - React Query hooks for payment provider CRUD
  - Booking payment flow using per-company Comgate credentials
  - Webhook verification using per-company secret
  - Sidebar navigation entry for Payments settings
affects: [52-e2e-verification]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-company-payment-routing, webhook-secret-per-merchant]

key-files:
  created:
    - apps/web/app/[locale]/(dashboard)/settings/payments/page.tsx
    - apps/web/hooks/use-payment-provider-query.ts
  modified:
    - apps/web/app/api/v1/payments/comgate/create/route.ts
    - apps/web/app/api/v1/webhooks/comgate/route.ts
    - apps/web/app/api/v1/billing/subscribe/route.ts
    - apps/web/lib/navigation.ts
    - apps/web/messages/cs.json
    - apps/web/messages/en.json

key-decisions:
  - 'Webhook secret verification moved after payment lookup to resolve per-company secret before verifying'
  - 'Subscription billing route annotated with PAY-04 comment to prevent accidental per-company credential injection'

patterns-established:
  - 'Per-company payment routing: resolveComgateCredentials(companyId) called in booking payment and webhook flows'
  - 'Unknown webhook transactions fall back to platform secret verification'

requirements-completed: [PAY-01, PAY-02]

# Metrics
duration: 15min
completed: 2026-03-27
---

# Phase 51 Plan 02: Settings Payments UI and Per-Company Payment Routing Summary

**Settings > Payments page with Comgate credential form, booking payments routed through per-company merchant credentials, and webhook verification using per-company secrets**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-27T15:00:00Z
- **Completed:** 2026-03-27T15:15:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Built Settings > Payments page with Comgate merchant ID/secret form, test mode toggle, and Active/Inactive status badge (PAY-01)
- Created React Query hooks (usePaymentProvider, useSavePaymentProvider) following existing billing hook patterns
- Wired booking payment creation to resolve and use per-company Comgate credentials with platform fallback (PAY-02)
- Restructured webhook handler to verify secret per-company after payment lookup, with platform fallback for unknown transactions
- Added Czech and English translations for all payment settings strings
- Added Payments entry to sidebar navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Build Settings > Payments page and query hooks** - `0484b67` (feat)
2. **Task 2: Wire per-company credentials into booking payment and webhook flows** - `2ec8747` (feat)
3. **Task 3: Verify per-company payment configuration flow** - checkpoint approved by user

## Files Created/Modified

- `apps/web/app/[locale]/(dashboard)/settings/payments/page.tsx` - Settings page with Comgate credential form, status badge, save functionality
- `apps/web/hooks/use-payment-provider-query.ts` - React Query hooks for GET/PUT payment provider settings
- `apps/web/app/api/v1/payments/comgate/create/route.ts` - Booking payment initiation using per-company credentials via resolveComgateCredentials
- `apps/web/app/api/v1/webhooks/comgate/route.ts` - Webhook verification restructured to use per-company secret after payment lookup
- `apps/web/app/api/v1/billing/subscribe/route.ts` - Added PAY-04 annotation comment (platform credentials only)
- `apps/web/lib/navigation.ts` - Added Payments settings sidebar navigation entry
- `apps/web/messages/cs.json` - Czech translations for settings.payments namespace
- `apps/web/messages/en.json` - English translations for settings.payments namespace

## Decisions Made

- Webhook secret verification moved after payment lookup so per-company secret can be resolved from companyId
- Unknown webhook transactions (no matching payment record) fall back to platform secret verification
- Subscription billing route explicitly annotated to prevent accidental per-company credential injection (PAY-04)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Per-company payment configuration complete end-to-end (PAY-01, PAY-02)
- Ready for Phase 52 E2E verification to test full payment flow
- Subscription billing remains on platform credentials (PAY-04 verified)

---

_Phase: 51-per-company-payments_
_Completed: 2026-03-27_

## Self-Check: PASSED

- All 4 key files verified present on disk
- Both task commits (0484b67, 2ec8747) verified in git log
- TypeScript compilation: zero errors
