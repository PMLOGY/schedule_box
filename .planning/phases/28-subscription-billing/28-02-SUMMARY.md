---
phase: 28-subscription-billing
plan: 02
subsystem: api, payments
tags: [billing, subscription, comgate, recurring, webhook, idempotency, state-machine, proration]

# Dependency graph
requires:
  - phase: 28-subscription-billing
    provides: Subscription schema (3 tables), Comgate recurring client, PLAN_CONFIG, state machine
provides:
  - Subscription service layer with 8 functions for full lifecycle management
  - 7 billing API route handlers under /api/v1/billing/
  - Idempotent webhook handler for Comgate subscription payments
  - Upgrade proration via chargeRecurringPayment (server-side) for existing subscribers
  - Payment status polling endpoint for frontend activation detection
affects: [28-03, 28-04, 28-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [billing-service-layer, subscription-webhook-idempotency, proration-charge-server-side, payment-polling]

key-files:
  created:
    - apps/web/app/api/v1/billing/service.ts
    - apps/web/app/api/v1/billing/plans/route.ts
    - apps/web/app/api/v1/billing/subscribe/route.ts
    - apps/web/app/api/v1/billing/subscription/route.ts
    - apps/web/app/api/v1/billing/upgrade/route.ts
    - apps/web/app/api/v1/billing/downgrade/route.ts
    - apps/web/app/api/v1/billing/status/route.ts
    - apps/web/app/api/v1/billing/webhook/route.ts
  modified: []

key-decisions:
  - 'Upgrade proration uses chargeRecurringPayment for existing subscribers (server-side charge, no redirect) and falls back to initComgatePayment only for subscribers without recurring token'
  - 'Downgrade is scheduled at period end via cancelAtPeriodEnd flag and metadata, not applied immediately'
  - 'Webhook uses subscription_events table for idempotency (separate from processed_webhooks used by booking payments)'
  - 'All protected billing routes require SETTINGS_MANAGE permission (owner role)'
  - 'Plans endpoint is public (no auth) so visitors can see pricing before signing up'

patterns-established:
  - 'Billing service layer pattern: all state transitions through transitionSubscriptionStatus'
  - 'Webhook idempotency via subscription_events.comgateTransactionId uniqueness check'
  - 'Dual proration handling: server-side charge (chargeRecurringPayment) vs redirect (initComgatePayment)'
  - 'Payment status polling pattern: frontend polls GET /billing/status after Comgate redirect return'

# Metrics
duration: 7min
completed: 2026-02-24
---

# Phase 28 Plan 02: Billing API Endpoints Summary

**7 billing API routes + service layer with state machine enforcement, idempotent webhook processing, and dual proration handling (server-side chargeRecurringPayment for existing subscribers, Comgate redirect for new)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-24T19:08:52Z
- **Completed:** 2026-02-24T19:16:00Z
- **Tasks:** 2
- **Files created:** 8

## Accomplishments

- Created subscription service layer with 8 exported functions covering full subscription lifecycle (create, activate, upgrade, downgrade, webhook processing, status query, idempotency check, state transitions)
- Built 7 API route handlers: GET plans (public), POST subscribe, GET subscription, POST upgrade, POST downgrade, GET status (polling), POST webhook
- Implemented dual proration charging: chargeRecurringPayment for existing subscribers (server-side, no redirect needed) vs initComgatePayment for new subscribers without recurring token
- Webhook handler follows exact same pattern as existing Comgate booking webhook (secret verification, defense-in-depth API cross-check, idempotency)
- All state transitions enforced via VALID_SUBSCRIPTION_TRANSITIONS from shared package

## Task Commits

Each task was committed atomically:

1. **Task 1: Create subscription service layer with state machine** - `3a0f39b` (feat)
2. **Task 2: Create billing API route handlers** - `13a00a3` (feat)

## Files Created/Modified

- `apps/web/app/api/v1/billing/service.ts` - Subscription service layer with 8 functions: createSubscription, transitionSubscriptionStatus, activateSubscription, upgradeSubscription, downgradeSubscription, processSubscriptionWebhook, getSubscriptionForCompany, checkSubscriptionEventIdempotency
- `apps/web/app/api/v1/billing/plans/route.ts` - GET endpoint returning all plan tiers with pricing from PLAN_CONFIG (public, no auth)
- `apps/web/app/api/v1/billing/subscribe/route.ts` - POST endpoint creating trialing subscription and returning Comgate redirect URL with initRecurring=true
- `apps/web/app/api/v1/billing/subscription/route.ts` - GET endpoint returning current subscription with computed fields and plan features
- `apps/web/app/api/v1/billing/upgrade/route.ts` - POST endpoint handling immediate plan upgrade with proration (server-side or redirect)
- `apps/web/app/api/v1/billing/downgrade/route.ts` - POST endpoint scheduling plan downgrade at period end
- `apps/web/app/api/v1/billing/status/route.ts` - GET polling endpoint for frontend to detect payment activation
- `apps/web/app/api/v1/billing/webhook/route.ts` - POST Comgate webhook handler with idempotency via subscription_events

## Decisions Made

- Upgrade proration uses chargeRecurringPayment (server-to-server) when subscription has comgateInitTransactionId (existing recurring token), and falls back to initComgatePayment with initRecurring=true only when no token exists (e.g., upgrading during trial)
- Downgrade is not applied immediately -- the plan is scheduled to change at period end via cancelAtPeriodEnd flag with pending plan stored in subscription_events metadata
- Webhook idempotency uses subscription_events table (checking comgateTransactionId), separate from the processed_webhooks table used by booking payment webhooks
- All protected billing routes use SETTINGS_MANAGE permission (which owner role has)
- Plans endpoint (GET /api/v1/billing/plans) is public with no auth so pricing is visible to visitors
- Status polling endpoint designed for 1-2 second intervals after Comgate payment redirect return

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- ESLint pre-commit hook caught unused `sql` import in service.ts and unused `and` import in status/route.ts -- fixed inline before successful commit
- Drizzle Database type incompatibility with PgTransaction for transitionSubscriptionStatus tx parameter -- resolved using `any` type with eslint-disable comment, consistent with existing codebase pattern (`tx as any` used in payments/route.ts)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All billing API endpoints ready for Plan 03 (BullMQ renewal scheduler) to call chargeRecurringPayment and transitionSubscriptionStatus
- Webhook handler ready to process renewal payment results from Comgate
- Service layer ready for Plan 04 (billing portal UI) to integrate with via API calls
- Status polling endpoint ready for frontend to detect subscription activation after payment

## Self-Check: PASSED

- All 8 billing files exist (1 service + 7 routes)
- SUMMARY.md exists at correct path
- Commit 3a0f39b (Task 1) found in git log
- Commit 13a00a3 (Task 2) found in git log

---

_Phase: 28-subscription-billing_
_Completed: 2026-02-24_
