---
phase: 09-loyalty-program
plan: 05
subsystem: backend
status: complete
completed_date: 2026-02-11
tags:
  - api
  - routes
  - loyalty
  - points
  - rewards
  - rabbitmq
  - consumer
  - events
dependency_graph:
  requires:
    - phase: 09-03
      provides: Points engine (earnPoints, awardPointsForBooking), rewards engine (redeemReward)
    - phase: 09-04
      provides: Loyalty CRUD API routes (cards, rewards endpoints)
    - phase: 05-02
      provides: RabbitMQ event infrastructure (consumer helpers)
  provides:
    - POST /api/v1/loyalty/cards/:id/add-points for manual points addition
    - POST /api/v1/loyalty/rewards/:id/redeem for reward redemption
    - RabbitMQ consumer for automatic booking-based points awarding
  affects:
    - frontend-loyalty
    - admin-dashboard
    - loyalty-worker
tech_stack:
  added: []
  patterns:
    - event-consumer: RabbitMQ booking.completed consumer with idempotent handler
    - points-operation-api: Route delegates to engine with pre-validation and post-fetch
    - reward-redemption-api: Multi-entity validation (reward + card + program) before engine call
key_files:
  created:
    - apps/web/app/api/v1/loyalty/cards/[id]/add-points/route.ts
    - apps/web/app/api/v1/loyalty/rewards/[id]/redeem/route.ts
    - apps/web/lib/loyalty/booking-completed-consumer.ts
  existing:
    - apps/web/lib/loyalty/points-engine.ts
    - apps/web/lib/loyalty/rewards-engine.ts
    - packages/events/src/consumer.ts
decisions:
  - title: Tier progress calculated in add-points response
    rationale: Returns updated card with tier progress inline, avoiding extra API call from frontend
    outcome: Same calculateTierProgress pattern as card detail endpoint
  - title: Pre-validation before engine call in redeem endpoint
    rationale: Provides specific HTTP error codes (404/400/409) before delegating to engine
    outcome: 404 for not found, 400 for insufficient points/inactive, 409 for redemption limit
  - title: Consumer handler ignores second amqplib message parameter
    rationale: TypeScript allows fewer-parameter callbacks; handler only needs CloudEvent data
    outcome: Clean handler signature without unused amqp.Message parameter
patterns_established:
  - 'Event consumer pattern: handleX exported separately for testing, startXConsumer for lifecycle'
  - 'Idempotent consumer: awardPointsForBooking returns silently on duplicate, message still ACKed'
metrics:
  duration_seconds: ~180
  tasks_completed: 2
  files_created: 3
  commits: 1
  lines_added: 380
---

# Phase 09 Plan 05: Points Operation Endpoints and Booking-Completed Consumer Summary

**Manual points addition and reward redemption API endpoints plus RabbitMQ consumer for automatic booking-based points awarding with idempotency**

## Performance

- **Duration:** ~3 min
- **Completed:** 2026-02-11
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- POST endpoint for manual points addition with updated card + tier progress response
- POST endpoint for reward redemption with multi-entity validation (reward, card, program)
- RabbitMQ consumer for booking.completed events with idempotent points awarding
- Graceful shutdown handler (SIGTERM/SIGINT) on consumer for clean connection teardown

## Task Commits

1. **Tasks 1 + 2: Add-Points/Redeem Endpoints + Booking Consumer** - `964c361` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `apps/web/app/api/v1/loyalty/cards/[id]/add-points/route.ts` - POST endpoint for manual points addition to loyalty card
- `apps/web/app/api/v1/loyalty/rewards/[id]/redeem/route.ts` - POST endpoint for reward redemption using card points
- `apps/web/lib/loyalty/booking-completed-consumer.ts` - RabbitMQ consumer for booking.completed events

## Decisions Made

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tier progress in add-points response | Avoids extra API call from frontend after adding points | Same pattern as card detail endpoint |
| Pre-validation before engine call | Better HTTP error codes (404/400/409) than engine's generic ValidationError | Specific error responses for each failure mode |
| Consumer handler single parameter | TypeScript allows fewer-parameter callbacks | Clean handler without unused amqp.Message |
| SIGTERM + SIGINT handlers | Both signals needed for graceful shutdown in Docker and local dev | process.exit(0) after connection cleanup |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification Results

**TypeScript Compilation:** PASSED
- No errors from new files (pre-existing errors in unrelated apple-pass/button files only)

**Endpoint Coverage:**

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| /api/v1/loyalty/cards/:id/add-points | POST | Created | Manual points addition |
| /api/v1/loyalty/rewards/:id/redeem | POST | Created | Reward redemption |

**Consumer Coverage:**

| Queue | Routing Key | Handler | Status |
|-------|-------------|---------|--------|
| loyalty.booking-completed | booking.completed | handleBookingCompleted | Created |

**Key Validations:**

- add-points: Card UUID param validation, body validation (addPointsSchema), ownership via program -> companyId
- redeem: Reward numeric ID param, body validation (redeemRewardSchema), ownership check, same-program check, balance check
- consumer: Idempotency via awardPointsForBooking's existing transaction check, re-throw on error for NACK+requeue

## Next Steps

**Phase 09 Plan 06:** Apple/Google Wallet pass generation (if applicable)

**Dependencies satisfied:**
- [x] Manual points addition API ready
- [x] Reward redemption API ready
- [x] Automatic booking-based points awarding ready via consumer
- [x] Idempotency protection on duplicate events

**Full loyalty API surface now complete:**
- Programs CRUD (Plan 04)
- Tiers CRUD (Plan 04)
- Rewards CRUD (Plan 04)
- Cards CRUD with tier progress (Plan 04)
- Transactions list (Plan 04)
- Add points (Plan 05)
- Redeem reward (Plan 05)
- Booking-completed auto-points consumer (Plan 05)

**Blockers:** None

## Self-Check: PASSED

**Created files exist:**
- FOUND: apps/web/app/api/v1/loyalty/cards/[id]/add-points/route.ts
- FOUND: apps/web/app/api/v1/loyalty/rewards/[id]/redeem/route.ts
- FOUND: apps/web/lib/loyalty/booking-completed-consumer.ts

**Commits exist:**
- FOUND: 964c361

All claims verified.
