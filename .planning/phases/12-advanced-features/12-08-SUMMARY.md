---
phase: 12-advanced-features
plan: 08
subsystem: backend
tags: [rabbitmq, events, marketplace, reviews, consumer]

# Dependency graph
requires:
  - phase: 12-02
    provides: Marketplace listings database schema and CRUD API
  - phase: 12-03
    provides: Review system API and review.created events
  - phase: 07-01
    provides: RabbitMQ consumer infrastructure and CloudEvent patterns
provides:
  - Event-driven rating sync consumer for marketplace listings
  - Automatic marketplace rating recalculation on review creation
  - Decoupled integration between review and marketplace systems
affects: [marketplace-search, reviews, notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Event-driven rating sync (async, decoupled from review creation)
    - Aggregate calculation with SQL AVG and COUNT functions
    - Graceful degradation when marketplace listing doesn't exist

key-files:
  created:
    - services/notification-worker/src/consumers/review-rating-sync.ts
  modified:
    - services/notification-worker/src/consumers/index.ts

key-decisions:
  - 'NACK without requeue on error to prevent infinite retry loops on bad data'
  - 'Skip update gracefully when company has no marketplace listing (not all companies list publicly)'
  - 'Only include published, non-deleted reviews in aggregate calculation'

patterns-established:
  - 'Rating sync is asynchronous and non-blocking for review creation'
  - 'Marketplace listing rating is source of truth for display, not calculated on-demand'

# Metrics
duration: 89s
completed: 2026-02-12
---

# Phase 12 Plan 08: Review Rating Sync Summary

**Event-driven marketplace rating sync using RabbitMQ consumer that recalculates averageRating and reviewCount on every review.created event**

## Performance

- **Duration:** 1min 29s
- **Started:** 2026-02-12T14:21:32Z
- **Completed:** 2026-02-12T14:23:01Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- RabbitMQ consumer listens to review.created events and updates marketplace listing ratings
- Aggregate rating calculation includes only published, non-deleted reviews
- Graceful handling when company has no marketplace listing (skip, not crash)
- Integrated into notification-worker lifecycle with proper queue binding

## Task Commits

Each task was committed atomically:

1. **Task 1: Review rating sync consumer and worker integration** - `f887402` (feat)

## Files Created/Modified

- `services/notification-worker/src/consumers/review-rating-sync.ts` - RabbitMQ consumer that syncs review ratings to marketplace listings
- `services/notification-worker/src/consumers/index.ts` - Added review rating sync consumer to orchestrator

## Decisions Made

1. **NACK without requeue on error**: Prevents infinite retry loops on malformed events or constraint violations. Log error but don't requeue.
2. **Skip gracefully when no listing**: Not all companies create public marketplace listings. Log info and return early instead of erroring.
3. **Published-only calculation**: Only include `isPublished=true` and `deletedAt IS NULL` reviews in aggregate to prevent moderated/deleted reviews from affecting rating.
4. **Round to 2 decimal places**: Marketplace display uses 2-decimal precision for average rating (e.g., 4.35).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed existing Phase 7 consumer patterns successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Review-to-marketplace rating sync is fully wired and operational
- Marketplace listings will reflect accurate review data in real-time
- Ready for marketplace search implementation (Plan 12-02 or 12-05)

## Self-Check: PASSED

All files exist:
- FOUND: services/notification-worker/src/consumers/review-rating-sync.ts
- FOUND: services/notification-worker/src/consumers/index.ts

All commits exist:
- FOUND: f887402

---

_Phase: 12-advanced-features_
_Completed: 2026-02-12_
