---
phase: 28-subscription-billing
plan: 04
subsystem: ui
tags: [react-query, next-intl, billing-ui, subscription-management, tailwindcss]

# Dependency graph
requires:
  - phase: 28-02
    provides: Billing API routes (plans, subscribe, upgrade, downgrade, status, subscription)
provides:
  - Billing portal UI page at /settings/billing
  - React Query hooks for all billing API endpoints (7 hooks)
  - Czech and English billing translations
affects: [28-05-invoices, 29-customer-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Payment return polling with useBillingStatus (refetchInterval: 2000ms, 15s timeout)'
    - 'Server-side charge vs redirect pattern for upgrades (result.charged check)'
    - 'Plan comparison grid with responsive layout (1/2/4 columns)'

key-files:
  created:
    - apps/web/app/[locale]/(dashboard)/settings/billing/page.tsx
  modified:
    - apps/web/hooks/use-billing-query.ts
    - apps/web/messages/cs.json
    - apps/web/messages/en.json

key-decisions:
  - 'useBillingInvoices gracefully handles 404 (returns empty array) since invoices API is in Plan 05'
  - 'Cancel subscription implemented as downgrade to free plan via existing downgrade API'
  - 'Growth plan marked as "Most Popular" with Crown badge for visual emphasis'
  - 'Payment polling overlay uses Alert component with 15s timeout fallback message'

patterns-established:
  - 'Billing hooks pattern: 4 query hooks + 3 mutation hooks with apiClient'
  - 'Upgrade mutation checks result.charged for server-side vs redirect flow'
  - 'Translation namespace billing.* added to cs.json/en.json root level'

# Metrics
duration: 6min
completed: 2026-02-24
---

# Phase 28 Plan 04: Billing Portal UI Summary

**Billing portal page with plan comparison grid, subscription management, and React Query hooks for all billing API endpoints**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-24T19:19:53Z
- **Completed:** 2026-02-24T19:25:59Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify marked pending-review)
- **Files modified:** 4

## Accomplishments

- React Query hooks for all 7 billing API operations (4 queries + 3 mutations)
- Full billing portal page at /settings/billing with 3 sections: current plan, plan comparison, invoices
- Plan comparison grid showing all 4 tiers (Free, Essential, Growth, AI-Powered) with features and pricing
- Upgrade flow correctly handles both server-side charge (immediate toast) and Comgate redirect
- Payment return polling with ?payment=pending URL parameter and 15s timeout
- Czech and English billing translations added to i18n system

## Task Commits

Each task was committed atomically:

1. **Task 1: Create billing React Query hooks and i18n translations** - `d0221f7` (feat) [pre-existing from prior run]
2. **Task 2: Build billing portal page** - `2aeb9f7` (feat)
3. **Task 3: Verify billing portal UI** - checkpoint:human-verify (implemented, pending review)

## Files Created/Modified

- `apps/web/app/[locale]/(dashboard)/settings/billing/page.tsx` - Billing portal page (708 lines): current plan card, plan comparison grid, invoice table, payment polling
- `apps/web/hooks/use-billing-query.ts` - React Query hooks: useBillingPlans, useCurrentSubscription, useBillingInvoices, useBillingStatus, useSubscribe, useUpgrade, useDowngrade
- `apps/web/messages/cs.json` - Czech translations: billing namespace with 70+ translation keys
- `apps/web/messages/en.json` - English translations: billing namespace with matching keys

## Decisions Made

- **Cancel = downgrade to free:** Cancel subscription is implemented as a downgrade to the free plan via the existing downgrade API, which sets cancelAtPeriodEnd=true
- **Graceful 404 for invoices:** useBillingInvoices returns empty array on 404 since the invoices API endpoint is being built in Plan 05
- **Growth as "Most Popular":** Growth plan gets a Crown badge and visual emphasis as the recommended tier
- **Payment timeout:** 15-second timeout for payment polling with fallback message asking user to refresh

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Commit scope correction**

- **Found during:** Task 2 (commit)
- **Issue:** commitlint requires scope from allowed list; "28-04" not in allowed scopes
- **Fix:** Used "web" scope which is in the allowed scope list
- **Files modified:** None (commit message only)
- **Verification:** Commit succeeded with "feat(web)" scope

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Trivial scope naming fix, no impact on functionality.

## Issues Encountered

- Task 1 (hooks + translations) was already committed by a prior agent run (commit d0221f7) as part of an invoice service commit. Verified contents match plan requirements exactly; no re-work needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Billing portal UI complete and ready for manual verification
- Invoice history section will populate once Plan 05 (invoices API) is complete
- Cannot test actual Comgate payment flow without recurring activation on merchant 498621

## Self-Check: PASSED

- [x] `apps/web/app/[locale]/(dashboard)/settings/billing/page.tsx` - FOUND
- [x] `apps/web/hooks/use-billing-query.ts` - FOUND
- [x] `apps/web/messages/cs.json` - FOUND (billing namespace present)
- [x] `apps/web/messages/en.json` - FOUND (billing namespace present)
- [x] Commit `d0221f7` (Task 1) - FOUND
- [x] Commit `2aeb9f7` (Task 2) - FOUND

---

_Phase: 28-subscription-billing, Plan: 04_
_Completed: 2026-02-24_
