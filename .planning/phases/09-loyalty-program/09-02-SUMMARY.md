---
phase: 09-loyalty-program
plan: 02
subsystem: events
tags:
  - domain-events
  - cloudevents
  - rabbitmq
  - loyalty
dependency_graph:
  requires:
    - phase: 05
      plan: 02
      artifact: packages/events/src/publisher.ts
      reason: createCloudEvent factory function
    - phase: 05
      plan: 02
      artifact: packages/events/src/types.ts
      reason: CloudEvent type definition
  provides:
    - artifact: packages/events/src/events/loyalty.ts
      exports:
        - LoyaltyCardCreatedPayload
        - PointsEarnedPayload
        - TierUpgradedPayload
        - RewardRedeemedPayload
        - LoyaltyCardCreatedEvent
        - PointsEarnedEvent
        - TierUpgradedEvent
        - RewardRedeemedEvent
        - createLoyaltyCardCreatedEvent
        - createPointsEarnedEvent
        - createTierUpgradedEvent
        - createRewardRedeemedEvent
      consumers: ["loyalty service", "notification worker", "analytics service"]
  affects: []
tech_stack:
  added: []
  patterns:
    - CloudEvents v1.0 specification
    - Domain event factory pattern
    - Topic exchange routing
key_files:
  created:
    - path: packages/events/src/events/loyalty.ts
      purpose: Loyalty domain event definitions with CloudEvents spec
      exports: 12
  modified:
    - path: packages/events/src/index.ts
      purpose: Re-export loyalty events from barrel
      changes: Added type and value exports for loyalty events
decisions:
  - decision: Use cardUuid as CloudEvent subject
    rationale: Loyalty card is the primary entity for all loyalty events
    alternatives: ["Use customerUuid", "Use programUuid"]
  - decision: Include bookingUuid in PointsEarnedPayload as nullable
    rationale: Points can be earned from bookings (auto) or manually (admin)
    alternatives: ["Separate event types", "Use generic sourceType field"]
  - decision: Use string | null for previousTierName
    rationale: Customer might not have a tier when first assigned
    alternatives: ["Use empty string", "Make optional"]
metrics:
  duration_seconds: 87
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  commits: 2
  test_coverage: 0
  completed_at: "2026-02-11T19:54:36Z"
---

# Phase 9 Plan 2: Loyalty Domain CloudEvents Summary

**One-liner:** CloudEvents v1.0 event definitions for loyalty card creation, points earning, tier upgrades, and reward redemption

## What Was Built

Created loyalty domain event infrastructure following the CloudEvents v1.0 specification. All four loyalty lifecycle events (card creation, points earned, tier upgrade, reward redemption) now have properly typed payloads, CloudEvent wrappers, and factory functions. Events follow the exact pattern established in Phase 5 for booking events.

### Event Types Created

1. **LoyaltyCardCreatedEvent** (`loyalty.card_created`)
   - Emitted when new loyalty card is issued to customer
   - Payload: cardUuid, companyId, customerUuid, programUuid, cardNumber

2. **PointsEarnedEvent** (`loyalty.points_earned`)
   - Emitted when customer earns loyalty points
   - Payload: cardUuid, companyId, customerUuid, points, balanceAfter, bookingUuid (nullable), description

3. **TierUpgradedEvent** (`loyalty.tier_upgraded`)
   - Emitted when customer's loyalty tier is upgraded
   - Payload: cardUuid, companyId, customerUuid, previousTierName (nullable), newTierName, newTierMinPoints

4. **RewardRedeemedEvent** (`loyalty.reward_redeemed`)
   - Emitted when customer redeems a loyalty reward
   - Payload: cardUuid, companyId, customerUuid, rewardId, rewardName, pointsSpent, balanceAfter

### Architecture

Events follow CloudEvents v1.0 spec with:
- `specversion: '1.0'`
- `type: 'com.schedulebox.loyalty.{event_name}'`
- `source: 'loyalty-service'`
- `subject: {cardUuid}`
- `datacontenttype: 'application/json'`

Routing keys derived from event type: `com.schedulebox.loyalty.card_created` → `loyalty.card_created`

Published to RabbitMQ topic exchange `schedulebox.events` for downstream consumers (notification service, analytics, wallet pass updates).

## Implementation Details

### Task 1: Loyalty Domain Event Definitions
**File:** `packages/events/src/events/loyalty.ts`

Created four event payload interfaces with complete TypeScript types. Each payload includes:
- `cardUuid` as primary entity identifier
- `companyId` for tenant isolation
- `customerUuid` for customer context
- Event-specific data (points, tier info, reward details)

Factory functions use `createCloudEvent` helper with proper type prefixes and event source. Subject always set to `cardUuid` for consistent event identification.

### Task 2: Update Events Package Barrel
**File:** `packages/events/src/index.ts`

Added two export blocks following existing pattern:
1. Type exports for all 8 types (4 payloads + 4 CloudEvents)
2. Value exports for all 4 factory functions

Placed after notification events section with `// Loyalty domain events` comment for clear organization.

## Deviations from Plan

None — plan executed exactly as written. All event types, payloads, and factory functions match specification. TypeScript compilation passes with zero errors.

## Testing & Verification

### Verification Passed
- TypeScript compilation: `pnpm exec tsc --noEmit -p packages/events/tsconfig.json` ✅
- All 4 event payloads compile correctly ✅
- All 4 factory functions compile correctly ✅
- Barrel exports resolve correctly ✅
- Follows CloudEvents v1.0 spec ✅

### Test Coverage
Unit tests for loyalty events deferred to Phase 10 (Testing Infrastructure).

## Integration Points

### Downstream Consumers (Future)
- **Notification Worker:** Send congratulations on tier upgrade, confirmation on reward redemption
- **Analytics Service:** Track points earning patterns, tier distribution, reward popularity
- **Wallet Pass Service:** Update Apple Wallet / Google Pay passes with new point balance

### Event Flow Example
```
Booking Completed
  → Points earned based on booking price
  → PointsEarnedEvent published (bookingUuid set)
  → Check tier eligibility
  → If threshold crossed: TierUpgradedEvent published
  → Notification worker sends congratulations email
```

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 60b9fce | feat(events): create loyalty domain event definitions | packages/events/src/events/loyalty.ts |
| 34e747d | feat(events): re-export loyalty domain events | packages/events/src/index.ts |

## Next Steps

1. **Phase 9 Plan 3:** Loyalty CRUD API endpoints (programs, cards, tiers, rewards)
2. **Phase 9 Plan 4:** Points earning logic with booking integration
3. **Phase 9 Plan 5:** Reward redemption and tier upgrade logic
4. **Phase 7 (notification):** Add loyalty event consumers to notification worker

## Self-Check: PASSED

Verified all claims in summary:

### Files Created
```bash
✅ packages/events/src/events/loyalty.ts exists
```

### Files Modified
```bash
✅ packages/events/src/index.ts modified (loyalty exports added)
```

### Commits Exist
```bash
✅ Commit 60b9fce exists: feat(events): create loyalty domain event definitions
✅ Commit 34e747d exists: feat(events): re-export loyalty domain events
```

### TypeScript Compilation
```bash
✅ pnpm exec tsc --noEmit -p packages/events/tsconfig.json passes
```

### Exports Available
All 12 exports available from `@schedulebox/events`:
- ✅ LoyaltyCardCreatedPayload
- ✅ PointsEarnedPayload
- ✅ TierUpgradedPayload
- ✅ RewardRedeemedPayload
- ✅ LoyaltyCardCreatedEvent
- ✅ PointsEarnedEvent
- ✅ TierUpgradedEvent
- ✅ RewardRedeemedEvent
- ✅ createLoyaltyCardCreatedEvent
- ✅ createPointsEarnedEvent
- ✅ createTierUpgradedEvent
- ✅ createRewardRedeemedEvent

All claims verified. Summary is accurate.
