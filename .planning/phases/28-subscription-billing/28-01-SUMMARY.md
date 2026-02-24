---
phase: 28-subscription-billing
plan: 01
subsystem: database, payments
tags: [drizzle, comgate, recurring, subscription, billing, postgresql-sequence, state-machine]

# Dependency graph
requires:
  - phase: 20-sms-delivery
    provides: Comgate payment client and webhook infrastructure
provides:
  - subscriptions, subscription_invoices, subscription_events Drizzle tables
  - Comgate chargeRecurringPayment function and initRecurring flag
  - PLAN_CONFIG with pricing for all 4 tiers
  - Subscription state machine (VALID_SUBSCRIPTION_TRANSITIONS)
  - VAT rate helper, proration calculator, plan price helper
  - Custom SQL migration for plan name canonicalization + invoice sequence
affects: [28-02, 28-03, 28-04, 28-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [subscription-state-machine, comgate-recurring-two-phase, postgresql-sequence-invoicing, seller-snapshot-for-czech-law]

key-files:
  created:
    - packages/database/src/schema/subscriptions.ts
    - packages/shared/src/types/billing.ts
    - packages/database/src/sql/28-01-subscription-plan-migration.sql
  modified:
    - packages/database/src/schema/auth.ts
    - packages/database/src/schema/index.ts
    - packages/database/src/schema/relations.ts
    - packages/database/src/seeds/development.ts
    - packages/shared/src/types/index.ts
    - apps/web/app/api/v1/payments/comgate/client.ts

key-decisions:
  - 'Plan pricing from docs: Free 0, Essential 490, Growth 1490, AI-Powered 2990 CZK/month'
  - 'Annual = 10 months (2 months free): 4900/14900/29900 CZK'
  - 'Free plan maxEmployees=1 (from docs: 1 employee), Essential=3, Growth=10, AI-Powered=unlimited'
  - 'Separate subscription_invoices table (existing invoices table has NOT NULL bookingId FK)'
  - 'PostgreSQL SEQUENCE for globally unique invoice numbering (prevents race condition)'
  - 'sellerSnapshot JSONB column for Czech law compliance (frozen seller details at invoice time)'

patterns-established:
  - 'Subscription state machine: trialing/active/past_due/cancelled/expired with explicit transitions'
  - 'Comgate recurring two-phase: initRecurring=true on first payment, /v1.0/recurring for subsequent'
  - 'Plan config as single source of truth in shared package'
  - 'VAT rate derived from company country (CZ:21%, SK:20%)'

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 28 Plan 01: Subscription Schema & Billing Foundation Summary

**Subscription schema (3 tables), Comgate recurring client, plan pricing config, and state machine transitions as billing data foundation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-24T19:00:29Z
- **Completed:** 2026-02-24T19:06:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Created subscriptions, subscription_invoices, subscription_events tables with CHECK constraints, indexes, and FK relations
- Updated companies.subscription_plan CHECK constraint from old names (starter/professional/enterprise) to new names (essential/growth/ai_powered) with $type annotation
- Extended Comgate client with initRecurring parameter and chargeRecurringPayment server-to-server function
- Defined PLAN_CONFIG single source of truth with documented pricing from product spec (0/490/1490/2990 CZK/month)
- Added subscription state machine, VAT rate helper, proration calculator, and billing cycle helpers in shared package

## Task Commits

Each task was committed atomically:

1. **Task 1: Create subscription schema and update companies CHECK constraint** - `67bd776` (feat)
2. **Task 2: Extend Comgate client with recurring payment support and create billing types** - `7f9aae6` (feat)

## Files Created/Modified

- `packages/database/src/schema/subscriptions.ts` - 3 new tables: subscriptions, subscription_invoices, subscription_events
- `packages/database/src/schema/auth.ts` - Updated CHECK constraint and $type for subscription_plan column
- `packages/database/src/schema/index.ts` - Added subscriptions barrel re-export
- `packages/database/src/schema/relations.ts` - Added subscription relations (company, invoices, events)
- `packages/database/src/seeds/development.ts` - Updated seed plan names to new values
- `packages/database/src/sql/28-01-subscription-plan-migration.sql` - Custom SQL for plan name migration + invoice sequence
- `apps/web/app/api/v1/payments/comgate/client.ts` - Added initRecurring flag and chargeRecurringPayment function
- `packages/shared/src/types/billing.ts` - Plan config, types, state machine, VAT/proration helpers
- `packages/shared/src/types/index.ts` - Exported billing types from barrel file

## Decisions Made

- Plan pricing taken from product documentation line 164-169: Free=0, Essential=490, Growth=1490, AI-Powered=2990 CZK/month
- Annual pricing calculated as 10x monthly (2 months free discount)
- Free plan limited to 1 employee (docs say "1 zaměstnanec"), Essential to 3, Growth to 10, AI-Powered unlimited
- Created separate subscription_invoices table rather than reusing existing invoices table (which has NOT NULL FK to payments.bookingId)
- Used PostgreSQL SEQUENCE for globally unique subscription invoice numbering (prevents race condition under concurrent renewals)
- Added sellerSnapshot JSONB column for Czech law compliance (invoice must reflect seller details at time of issue)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed seed file using old plan names**

- **Found during:** Task 1 (type-check verification)
- **Issue:** development.ts seed used 'professional' and 'starter' which are invalid after $type annotation update
- **Fix:** Changed 'professional' to 'growth' and 'starter' to 'essential' in seed data
- **Files modified:** packages/database/src/seeds/development.ts
- **Verification:** pnpm --filter @schedulebox/database type-check passes
- **Committed in:** 67bd776 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential fix -- seed file would fail type-check without it. No scope creep.

## Issues Encountered

None - both tasks completed without unexpected issues.

## User Setup Required

None - no external service configuration required. (Note: Comgate recurring must be activated on merchant 498621 before testing, but this is documented in STATE.md blockers and is not a setup step for this plan.)

## Next Phase Readiness

- Schema foundation ready for Plan 02 (API routes and subscription service)
- Comgate recurring client ready for webhook handler integration
- PLAN_CONFIG available for all billing endpoints to reference
- State machine transitions ready for subscription lifecycle management
- Custom SQL migration must be applied before any subscription data is inserted

## Self-Check: PASSED

- All 9 files verified present on disk
- Commit 67bd776 (Task 1) verified in git log
- Commit 7f9aae6 (Task 2) verified in git log
- pnpm --filter @schedulebox/database type-check: PASS
- pnpm --filter @schedulebox/shared type-check: PASS

---

_Phase: 28-subscription-billing_
_Completed: 2026-02-24_
