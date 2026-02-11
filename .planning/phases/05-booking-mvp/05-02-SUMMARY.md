---
phase: 05-booking-mvp
plan: 02
subsystem: events
tags:
  - rabbitmq
  - cloudevents
  - event-driven
  - infrastructure
dependency_graph:
  requires: []
  provides:
    - RabbitMQ event publisher
    - CloudEvents v1.0 types
    - Booking domain events
  affects:
    - packages/events
tech_stack:
  added:
    - amqplib@0.10.9
    - '@types/amqplib@0.10.8'
  patterns:
    - CloudEvents v1.0 specification
    - Singleton connection pattern
    - Fire-and-forget event publishing
    - Topic exchange with routing keys
key_files:
  created:
    - packages/events/src/types.ts
    - packages/events/src/publisher.ts
    - packages/events/src/events/booking.ts
  modified:
    - packages/events/src/index.ts
    - packages/events/package.json
    - pnpm-lock.yaml
decisions:
  - title: Use callback-based amqplib API
    rationale: Better TypeScript type support compared to promise-based API
    outcome: Used amqplib/callback_api.js for stable typing
  - title: Fire-and-forget publishing for MVP
    rationale: Reliable delivery with retry logic deferred to Phase 7
    outcome: Publisher logs errors but doesn't throw on RabbitMQ failure
  - title: Topic exchange with routing key derivation
    rationale: Flexible event routing for future consumer services
    outcome: com.schedulebox.booking.created → booking.created routing key
metrics:
  duration_seconds: 273
  tasks_completed: 2
  files_created: 3
  files_modified: 3
  commits: 2
  completed_at: '2026-02-11T13:37:34Z'
---

# Phase 05 Plan 02: RabbitMQ Event Infrastructure Summary

**One-liner:** CloudEvents v1.0 event publisher with six booking lifecycle domain events for event-driven architecture.

## What Was Built

Implemented the complete RabbitMQ event infrastructure needed for booking API routes to publish domain events. This includes:

1. **CloudEvent Types** (`types.ts`)
   - CloudEvent v1.0 specification interface
   - EventMetadata for tenant isolation (companyId, userId, correlationId)
   - DomainEvent type combining CloudEvent with metadata

2. **RabbitMQ Publisher** (`publisher.ts`)
   - Singleton connection pattern with lazy initialization
   - Callback-based amqplib API for stable TypeScript types
   - Topic exchange (schedulebox.events) with durable messages
   - Routing key derivation (com.schedulebox.booking.created → booking.created)
   - Fire-and-forget semantics (logs errors, doesn't throw)
   - createCloudEvent helper with auto-generated UUID and timestamp
   - Graceful shutdown with closeConnection()

3. **Booking Domain Events** (`events/booking.ts`)
   - **BookingCreatedEvent**: New booking created (status: pending)
   - **BookingConfirmedEvent**: Booking confirmed
   - **BookingCancelledEvent**: Booking cancelled (with actor and reason)
   - **BookingCompletedEvent**: Service successfully completed
   - **BookingNoShowEvent**: Customer no-show
   - **BookingRescheduledEvent**: Time or employee changed
   - Typed payload interfaces for each event
   - Factory functions for creating CloudEvents
   - All event types follow CloudEvents spec format

4. **Barrel Exports** (`index.ts`)
   - Re-exports all types, publisher functions, and event definitions
   - Clean import path: `import { publishEvent, createBookingCreatedEvent } from '@schedulebox/events'`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] Fixed TypeScript type errors with amqplib**

- **Found during:** Task 1 implementation
- **Issue:** Initial implementation used promise-based amqplib API which had incomplete TypeScript types (Channel, Connection not properly typed)
- **Fix:** Switched to callback-based API (`amqplib/callback_api.js`) which has better type definitions and wrapped in Promises for async/await usage
- **Files modified:** `packages/events/src/publisher.ts`
- **Commit:** d15e1d0 (included in Task 1 commit)

**2. [Rule 1 - Bug] Fixed non-null assertion ESLint error**

- **Found during:** Task 1 commit (pre-commit hook)
- **Issue:** ESLint rule `@typescript-eslint/no-non-null-assertion` prevented use of `channel!` assertion
- **Fix:** Added explicit null check with error rejection instead of non-null assertion
- **Files modified:** `packages/events/src/publisher.ts`
- **Commit:** d15e1d0 (included in Task 1 commit)

**3. [Rule 2 - Critical] Fixed CloudEvent import in booking events**

- **Found during:** Task 2 TypeScript compilation
- **Issue:** CloudEvent type was not exported from publisher.ts, only from types.ts
- **Fix:** Changed import to use `../types.js` for CloudEvent type
- **Files modified:** `packages/events/src/events/booking.ts`
- **Commit:** e875219 (included in Task 2 commit)

## Tasks Completed

| Task | Name                                      | Commit  | Files                                                             |
| ---- | ----------------------------------------- | ------- | ----------------------------------------------------------------- |
| 1    | CloudEvent Types and RabbitMQ Publisher   | d15e1d0 | types.ts, publisher.ts, package.json, pnpm-lock.yaml              |
| 2    | Booking Domain Event Definitions          | e875219 | events/booking.ts, index.ts                                       |

## Verification Results

- ✅ TypeScript compilation passes with zero errors
- ✅ All event type strings follow CloudEvents spec format (`com.schedulebox.booking.*`)
- ✅ Publisher gracefully handles missing RabbitMQ connection (fire-and-forget)
- ✅ ESLint and Prettier checks pass
- ✅ All exports accessible via barrel index

## Self-Check: PASSED

**Created files exist:**
```
FOUND: D:\Project\ScheduleBox\packages\events\src\types.ts
FOUND: D:\Project\ScheduleBox\packages\events\src\publisher.ts
FOUND: D:\Project\ScheduleBox\packages\events\src\events\booking.ts
```

**Modified files exist:**
```
FOUND: D:\Project\ScheduleBox\packages\events\src\index.ts
FOUND: D:\Project\ScheduleBox\packages\events\package.json
```

**Commits exist:**
```
FOUND: d15e1d0 (feat(events): add CloudEvent types and RabbitMQ publisher)
FOUND: e875219 (feat(events): add booking domain event definitions)
```

## Technical Details

### Event Type Strings

All booking events follow the CloudEvents naming convention:
- `com.schedulebox.booking.created`
- `com.schedulebox.booking.confirmed`
- `com.schedulebox.booking.cancelled`
- `com.schedulebox.booking.completed`
- `com.schedulebox.booking.no_show`
- `com.schedulebox.booking.rescheduled`

### Routing Keys

Routing keys are derived by removing the `com.schedulebox` prefix:
- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `booking.completed`
- `booking.no_show`
- `booking.rescheduled`

### Fire-and-Forget Semantics

For MVP simplicity, the publisher uses fire-and-forget semantics:
- RabbitMQ connection errors are logged but not thrown
- Messages are marked persistent for broker restart survival
- Producer flow control is logged with warnings
- Phase 7 will add reliable delivery with retry logic

### Usage Example

```typescript
import { publishEvent, createBookingCreatedEvent } from '@schedulebox/events';

const event = createBookingCreatedEvent({
  bookingUuid: 'uuid-here',
  companyId: 1,
  customerUuid: 'customer-uuid',
  serviceUuid: 'service-uuid',
  employeeUuid: 'employee-uuid',
  startTime: '2026-02-15T10:00:00Z',
  endTime: '2026-02-15T11:00:00Z',
  status: 'pending',
  source: 'web',
  price: '1500.00',
  currency: 'CZK',
});

await publishEvent(event);
```

## Next Steps

With event infrastructure complete, Plan 05-03 can now implement booking API routes that publish these domain events on booking lifecycle changes.

---
*Executed by: GSD Plan Executor*
*Completed: 2026-02-11T13:37:34Z*
*Duration: 273 seconds (4m 33s)*
