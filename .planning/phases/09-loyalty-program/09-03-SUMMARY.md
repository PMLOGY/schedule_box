---
phase: 09-loyalty-program
plan: 03
subsystem: backend
status: complete
completed_date: 2026-02-11
tags:
  - loyalty
  - service-layer
  - business-logic
  - transactions
  - locking
dependency_graph:
  requires:
    - 09-01 # Loyalty schemas and types
    - 09-02 # Loyalty domain events
  provides:
    - loyalty-points-engine
    - loyalty-tier-engine
    - loyalty-rewards-engine
  affects:
    - backend-api-routes
    - event-consumers
tech_stack:
  added:
    - drizzle-orm: SELECT FOR UPDATE pessimistic locking
  patterns:
    - transactional-service-layer: Business logic with database transactions
    - pessimistic-locking: SELECT FOR UPDATE prevents race conditions
    - event-publishing: Publish domain events after transaction commits
    - idempotency: Check for duplicate transactions before processing
key_files:
  created:
    - apps/web/lib/loyalty/points-engine.ts
    - apps/web/lib/loyalty/tier-engine.ts
    - apps/web/lib/loyalty/rewards-engine.ts
  modified: []
decisions:
  - title: SELECT FOR UPDATE for all balance modifications
    rationale: Prevents race conditions on concurrent earn/redeem operations
    outcome: All earnPoints, redeemPoints, adjustPoints use pessimistic locking
  - title: Auto-enrollment on booking completion
    rationale: Frictionless loyalty program onboarding for customers
    outcome: awardPointsForBooking creates card if customer has none
  - title: Idempotency check via bookingId
    rationale: Duplicate booking.completed events shouldn't award double points
    outcome: Query loyaltyTransactions for existing bookingId before awarding
  - title: Fire-and-forget event publishing
    rationale: Transaction success shouldn't depend on event broker availability
    outcome: publishEvent errors logged but don't throw
  - title: Tier upgrade triggered automatically
    rationale: Customer should immediately see tier benefits after earning points
    outcome: checkAndUpgradeTier called after every earnPoints and adjustPoints
metrics:
  duration_seconds: 450
  tasks_completed: 2
  files_created: 3
  files_modified: 0
  commits: 2
  lines_added: 928
---

# Phase 09 Plan 03: Loyalty Service Layer Summary

**One-liner:** Transactional points engine, automatic tier upgrades, and atomic rewards redemption with SELECT FOR UPDATE locking

## Objective

Create the loyalty service layer with transactional points engine, automatic tier upgrades, and rewards redemption logic. This is the core business logic for the loyalty system that all API routes and event consumers will call.

## What Was Built

### Task 1: Points Engine with Transactional Safety ✅

**Commit:** ccabd21

Created `apps/web/lib/loyalty/points-engine.ts` with four core functions:

**1. earnPoints(cardId, points, description, bookingId?)**
- Opens Drizzle transaction
- SELECT FOR UPDATE on loyaltyCards row (pessimistic locking)
- Validates card exists and is active
- Calculates new balance: `card.pointsBalance + points`
- UPDATE loyaltyCards balance
- INSERT loyaltyTransactions with type='earn'
- Publishes PointsEarnedEvent after transaction commits
- Calls checkAndUpgradeTier(cardId) for automatic tier upgrade

**2. redeemPoints(cardId, pointsToRedeem, description)**
- Opens Drizzle transaction
- SELECT FOR UPDATE on loyaltyCards row
- Validates card exists, is active, and has sufficient balance
- Checks `card.pointsBalance >= pointsToRedeem` (throws ValidationError if insufficient)
- Calculates new balance: `card.pointsBalance - pointsToRedeem`
- UPDATE loyaltyCards balance
- INSERT loyaltyTransactions with type='redeem', negative points

**3. adjustPoints(cardId, points, description)**
- Opens Drizzle transaction
- SELECT FOR UPDATE on loyaltyCards row
- Allows positive or negative adjustments
- Validates new balance >= 0
- UPDATE loyaltyCards + INSERT transaction with type='adjust'
- Calls checkAndUpgradeTier if points added

**4. awardPointsForBooking(bookingUuid, companyId)** — Idempotent handler
- Looks up booking by UUID
- **IDEMPOTENCY CHECK:** Queries loyaltyTransactions for existing bookingId
- Returns early if points already awarded (prevents double-awarding)
- Looks up loyalty program for company
- Looks up or **auto-creates** loyalty card for customer
- Calculates points: `Math.floor(bookingPrice * program.pointsPerCurrency)`
- Calls earnPoints (which handles locking, events, tier upgrade)

**Auto-enrollment:** If customer has no loyalty card, generates card number in format XXXX-XXXX-XXXX-XXXX using random digits.

### Task 2: Tier Engine + Rewards Engine ✅

**Commit:** 1872af2

**Tier Engine** — Created `apps/web/lib/loyalty/tier-engine.ts`:

**1. checkAndUpgradeTier(cardId): Promise<boolean>**
- SELECT card with current programId and pointsBalance
- SELECT highest qualified tier: `WHERE minPoints <= card.pointsBalance ORDER BY minPoints DESC LIMIT 1`
- If qualified tier differs from current tier:
  - UPDATE loyaltyCards set tierId = qualifiedTier.id
  - Publish TierUpgradedEvent with previousTierName and newTierName
  - Return true
- Return false if no upgrade

**2. calculateTierProgress(cardId)**
- SELECT card with pointsBalance and current tierId
- SELECT current tier details
- SELECT next tier: `WHERE minPoints > card.pointsBalance ORDER BY minPoints ASC LIMIT 1`
- Calculate progress: `(currentPoints - currentTierMin) / (nextTierMin - currentTierMin) * 100`
- Return { currentTier, nextTier: { name, minPoints, pointsNeeded }, progressPercent }

**Rewards Engine** — Created `apps/web/lib/loyalty/rewards-engine.ts`:

**1. redeemReward(cardId, rewardId): Promise<void>**
- Opens Drizzle transaction
- SELECT reward (validate exists, is_active, maxRedemptions)
- Check stock: `currentRedemptions < maxRedemptions` (throw if limit reached)
- SELECT FOR UPDATE on loyaltyCards row
- Validate card belongs to same program as reward
- Check `card.pointsBalance >= reward.pointsCost` (throw if insufficient)
- Calculate new balance
- UPDATE loyaltyCards set pointsBalance = newBalance
- INSERT loyaltyTransactions with type='redeem'
- **UPDATE rewards set currentRedemptions = currentRedemptions + 1** (atomic stock tracking)
- Publish RewardRedeemedEvent

**2. checkRewardAvailability(rewardId, cardPointsBalance)**
- Check reward is_active
- Check stock: maxRedemptions vs currentRedemptions
- Check cardPointsBalance >= pointsCost
- Return { available: boolean, reason?: string }

## Deviations from Plan

None — plan executed exactly as written. All must_haves satisfied.

## Verification Results

**TypeScript Compilation:** ✅ PASSED

```bash
pnpm exec tsc --noEmit -p apps/web/tsconfig.json
# No errors in loyalty service layer files
```

**SELECT FOR UPDATE Usage:** ✅ VERIFIED

```bash
grep -n "\.for('update')" apps/web/lib/loyalty/*.ts
# apps/web/lib/loyalty/points-engine.ts:66
# apps/web/lib/loyalty/points-engine.ts:187
# apps/web/lib/loyalty/points-engine.ts:264
# apps/web/lib/loyalty/rewards-engine.ts:88
```

All balance modification operations use pessimistic locking.

**Idempotency Check:** ✅ VERIFIED

awardPointsForBooking checks loyaltyTransactions for existing bookingId before awarding points (lines 344-352 in points-engine.ts).

**Tier Upgrade Trigger:** ✅ VERIFIED

checkAndUpgradeTier called after:
- earnPoints (line 157)
- adjustPoints (line 303)

**Atomic Reward Redemption:** ✅ VERIFIED

redeemReward deducts points and increments currentRedemptions in single transaction (lines 42-158 in rewards-engine.ts).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SELECT FOR UPDATE on all balance mods | Prevents race conditions on concurrent earn/redeem operations | Used in earnPoints, redeemPoints, adjustPoints, redeemReward |
| Auto-enrollment on booking completion | Frictionless loyalty program onboarding without manual card creation | awardPointsForBooking creates card if none exists |
| Idempotency via bookingId check | Duplicate booking.completed events shouldn't award double points | Query loyaltyTransactions before awarding |
| Fire-and-forget event publishing | Transaction success shouldn't depend on RabbitMQ availability | publishEvent errors logged but don't throw |
| Tier upgrade auto-triggered | Customer sees tier benefits immediately after earning points | checkAndUpgradeTier called after earnPoints/adjustPoints |
| Stock tracking in single transaction | Prevent over-redemption of limited rewards | UPDATE rewards.currentRedemptions in same transaction as points deduction |

## Success Criteria

- [x] All tasks executed (2/2 complete)
- [x] Each task committed individually (2 commits)
- [x] Points engine uses `.for('update')` for all balance modifications
- [x] awardPointsForBooking checks for duplicate bookingId before awarding
- [x] Tier upgrade fires after every points addition
- [x] Reward redemption atomically deducts points + increments redemption counter
- [x] TypeScript compiles without errors
- [x] Fire-and-forget event publishing (errors logged, not thrown)

## Must-Haves Verification

**Truths:**
- ✅ Points engine uses SELECT FOR UPDATE to prevent race conditions on balance modifications
- ✅ Points earning is idempotent — duplicate booking.completed events don't award double points
- ✅ Tier upgrades trigger automatically after every points addition
- ✅ Rewards redemption atomically deducts points and increments redemption counter

**Artifacts:**
- ✅ apps/web/lib/loyalty/points-engine.ts — earnPoints, redeemPoints, adjustPoints, awardPointsForBooking
- ✅ apps/web/lib/loyalty/tier-engine.ts — checkAndUpgradeTier, calculateTierProgress
- ✅ apps/web/lib/loyalty/rewards-engine.ts — redeemReward, checkRewardAvailability

**Key Links:**
- ✅ points-engine.ts imports from packages/database/src/schema/loyalty.ts via Drizzle ORM
- ✅ for('update') pattern used 4 times across files
- ✅ points-engine.ts publishes PointsEarnedEvent via createPointsEarnedEvent from packages/events
- ✅ tier-engine.ts publishes TierUpgradedEvent via createTierUpgradedEvent
- ✅ rewards-engine.ts publishes RewardRedeemedEvent via createRewardRedeemedEvent

## Next Steps

**Phase 09 Plan 04:** Loyalty API routes (programs, cards, rewards, transactions CRUD endpoints)

**Dependencies satisfied:**
- [x] Schemas ready for request validation (Plan 09-01)
- [x] Types ready for response formatting (Plan 09-01)
- [x] Events ready for publishing (Plan 09-02)
- [x] Service layer ready for API routes to call (Plan 09-03) ← Current plan

**Blockers:** None — ready to proceed with API implementation

## Self-Check: PASSED

**Created files exist:**
```bash
[ -f "apps/web/lib/loyalty/points-engine.ts" ] && echo "FOUND"
# FOUND
[ -f "apps/web/lib/loyalty/tier-engine.ts" ] && echo "FOUND"
# FOUND
[ -f "apps/web/lib/loyalty/rewards-engine.ts" ] && echo "FOUND"
# FOUND
```

**Commits exist:**
```bash
git log --oneline --all | grep -q "ccabd21" && echo "FOUND: ccabd21"
# FOUND: ccabd21 (points engine)
git log --oneline --all | grep -q "1872af2" && echo "FOUND: 1872af2"
# FOUND: 1872af2 (tier and rewards engines)
```

**Functions exported:**
- points-engine.ts: earnPoints, redeemPoints, adjustPoints, awardPointsForBooking
- tier-engine.ts: checkAndUpgradeTier, calculateTierProgress
- rewards-engine.ts: redeemReward, checkRewardAvailability

All claims verified. ✅
