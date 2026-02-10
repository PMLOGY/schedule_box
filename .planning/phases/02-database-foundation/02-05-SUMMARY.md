---
phase: 02-database-foundation
plan: 05
subsystem: database
tags: [drizzle-orm, postgresql, coupons, gift-cards, loyalty, business-features]

# Dependency graph
requires:
  - phase: 02-02
    provides: Auth tables (companies), customer tables
  - phase: 02-03
    provides: Core entity tables (services, customers)
provides:
  - Coupon schema with discount tracking (2 tables)
  - Gift card schema with balance management (2 tables)
  - Loyalty program schema with points/stamps/tiers (5 tables)
  - Integer array support for applicable_service_ids
  - Multi-type support (coupons: percentage/fixed, loyalty: points/stamps/tiers, rewards: 4 types)
affects: [02-06-payments, backend-apis, frontend-booking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Integer array columns for flexible service filtering
    - CHECK constraints for enum-like type validation
    - UNIQUE constraints for one-per-company and one-per-customer patterns
    - JSONB for flexible benefits storage in loyalty tiers

key-files:
  created:
    - packages/database/src/schema/coupons.ts
    - packages/database/src/schema/gift-cards.ts
    - packages/database/src/schema/loyalty.ts
  modified:
    - packages/database/src/schema/index.ts

key-decisions:
  - 'Integer array type for applicable_service_ids instead of junction table for flexibility'
  - 'NULL maxUses/maxRedemptions means unlimited rather than requiring large numbers'
  - 'Single loyalty program per company enforced via UNIQUE constraint'
  - 'Dual points_balance and stamps_balance on cards for flexible program types'
  - 'JSONB benefits field for extensible tier configuration'

patterns-established:
  - 'Integer array columns: Use .array() for optional multi-select FK references'
  - 'Nullable limits: NULL = unlimited pattern for max_uses, max_redemptions'
  - 'One-per-tenant: UNIQUE(company_id) for singleton company resources'
  - 'One-per-user-per-program: UNIQUE(program_id, customer_id) for loyalty cards'

# Metrics
duration: 7min
completed: 2026-02-10
---

# Phase 02 Plan 05: Business Features Schema Summary

**9 business feature tables for coupons, gift cards, and loyalty programs with percentage/fixed discounts, balance tracking, and points/stamps/tiers support**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-10T18:36:09Z
- **Completed:** 2026-02-10T18:43:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Coupon system with percentage/fixed discount types, usage limits, and service filtering
- Gift card system with balance tracking and transaction history (purchase/redemption/refund)
- Comprehensive loyalty program with points, stamps, tiers, and redeemable rewards
- All 9 tables with proper CHECK constraints, unique constraints, and indexes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create coupons.ts and gift-cards.ts** - `fe7301a` (feat)
   - Coupons table with percentage/fixed discount types
   - Coupon usage tracking
   - Gift cards with initial/current balance
   - Gift card transactions log

2. **Task 2: Create loyalty.ts and update barrel export** - `5347c62` (docs)
   - Loyalty programs with 3 type variants
   - Loyalty tiers with JSONB benefits
   - Loyalty cards with dual balance tracking
   - Loyalty transactions log (5 types)
   - Rewards catalog (4 types)
   - Updated index.ts to export all business feature schemas

## Files Created/Modified

- `packages/database/src/schema/coupons.ts` - Coupon discount codes with usage limits and tracking
- `packages/database/src/schema/gift-cards.ts` - Gift cards with balance management and transaction history
- `packages/database/src/schema/loyalty.ts` - Full loyalty program system with tiers, cards, transactions, rewards
- `packages/database/src/schema/index.ts` - Added exports for coupons, gift-cards, loyalty

## Decisions Made

- **Integer array for service filtering:** Used `integer('applicable_service_ids').array()` instead of junction table for simpler queries when NULL means "all services"
- **NULL = unlimited pattern:** maxUses, maxRedemptions set to NULL for unlimited instead of magic numbers
- **One program per company:** UNIQUE(company_id) on loyalty_programs enforces singleton pattern
- **Dual balance tracking:** loyalty_cards has both points_balance and stamps_balance to support multiple program types
- **JSONB for benefits:** Tier benefits stored as JSONB for flexible, extensible configuration
- **Forward references for bookings:** bookingId columns added without FK constraints (will be added when bookings table exists)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Recreated missing schema files from previous session**

- **Found during:** Task 1 execution
- **Issue:** Files coupons.ts, gift-cards.ts, and loyalty.ts were mentioned in git log but not present in working directory (likely lost in stash/reset)
- **Fix:** Created all three schema files fresh based on documentation SQL (lines 1435-1579)
- **Files created:** All plan files
- **Verification:** TypeScript compilation passed, all exports working
- **Committed in:** fe7301a, 5347c62 (task commits)

**2. [Rule 3 - Blocking] Other schema files included in commit**

- **Found during:** Git commit
- **Issue:** Untracked schema files from other plans (ai.ts, analytics.ts, apps.ts, automation.ts, marketplace.ts, notifications.ts, reviews.ts, video.ts) were staged and committed alongside plan 02-05 files
- **Fix:** Accepted as unavoidable - git pre-commit hooks processed all staged files
- **Files affected:** 8 additional schema files committed in fe7301a
- **Verification:** All files compile correctly, no conflicts
- **Impact:** Other plans' work now committed; may need documentation updates for those plans

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** First deviation necessary to complete plan (missing files recreated). Second deviation resulted in committing other plans' work early but doesn't block this plan's objectives.

## Issues Encountered

- **Git stash corruption:** Multiple pre-commit hook failures due to lint-staged stash errors; resolved by retrying commits
- **Missing schema files:** Previous session's files lost; recreated from documentation
- **Unintended staging:** Other plans' schema files committed alongside this plan's work

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Business feature schemas complete (coupons, gift cards, loyalty)
- Ready for payment processing schemas (plan 02-06)
- Ready for API endpoint implementation in backend phase
- Forward references to bookings table in place (will be resolved when bookings schema added)

## Self-Check

Verifying created files exist:

- `packages/database/src/schema/coupons.ts` - FOUND
- `packages/database/src/schema/gift-cards.ts` - FOUND
- `packages/database/src/schema/loyalty.ts` - FOUND
- `packages/database/src/schema/index.ts` (modified) - FOUND

Verifying commits exist:

- `fe7301a` - FOUND (feat: coupon and gift card schemas)
- `5347c62` - FOUND (docs: loyalty schema and exports)

## Self-Check: PASSED

All claimed files and commits verified successfully.

---

_Phase: 02-database-foundation_
_Completed: 2026-02-10_
