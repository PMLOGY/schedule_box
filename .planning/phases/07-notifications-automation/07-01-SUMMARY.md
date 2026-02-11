---
phase: 07-notifications-automation
plan: 01
subsystem: notification-system
tags: [events, schemas, rabbitmq, consumer, foundation]
dependency_graph:
  requires: [Phase 5 RabbitMQ infrastructure, Phase 2 database schemas]
  provides: [Consumer helper, Notification/Review/Payment event types, Validation schemas]
  affects: [All Phase 7 plans, notification worker service, automation service]
tech_stack:
  added: [amqplib consumer pattern]
  patterns: [CloudEvents v1.0, Zod validation, schema-first design]
key_files:
  created:
    - packages/events/src/consumer.ts
    - packages/events/src/events/notification.ts
    - packages/events/src/events/review.ts
    - packages/shared/src/schemas/notification.ts
    - packages/shared/src/schemas/automation.ts
    - packages/shared/src/types/notification.ts
    - packages/shared/src/types/automation.ts
  modified:
    - packages/events/src/events/payment.ts
    - packages/events/src/index.ts
    - packages/shared/src/schemas/index.ts
    - packages/shared/src/types/index.ts
decisions:
  - Consumer helper mirrors publisher pattern (callback-based amqplib)
  - Fire-and-forget semantics deferred to Phase 7 consumer implementation
  - Enum values match database check constraints exactly
  - Schema-only exports prevent TS2308 module conflicts
metrics:
  duration: 202s
  tasks_completed: 2
  files_created: 7
  files_modified: 4
  commits: 2
  completed_date: 2026-02-11
---

# Phase 7 Plan 01: Event Consumer Infrastructure and Shared Types Summary

**One-liner:** RabbitMQ consumer helper with queue binding and CloudEvent types for notification, review, and payment domains, plus Zod validation schemas for notification and automation APIs.

## What Was Built

### Task 1: RabbitMQ Consumer Helper and Domain Event Types

Created the foundational event consumer infrastructure that mirrors the publisher pattern established in Phase 5:

**Consumer Helper (`packages/events/src/consumer.ts`):**
- `createConsumerConnection()` - Creates RabbitMQ connection + channel with error/close handlers
- `consumeMessages()` - Asserts durable queue, binds routing keys to `schedulebox.events` exchange, sets prefetch (default 10), consumes with ACK on success / NACK+requeue on error
- `gracefulShutdown()` - Closes channel then connection in proper order
- Uses same callback-based amqplib API as publisher.ts for consistency
- Same RABBITMQ_URL default (`amqp://schedulebox:schedulebox@localhost:5672`)

**Notification Domain Events (`packages/events/src/events/notification.ts`):**
- `NotificationSentPayload` - Notification ID, company ID, channel, recipient, template type, sent timestamp
- `NotificationFailedPayload` - Notification ID, company ID, channel, recipient, error, failed timestamp
- `NotificationOpenedPayload` - Notification ID, company ID, opened timestamp
- `NotificationClickedPayload` - Notification ID, company ID, URL, clicked timestamp
- Factory functions for all four event types using `com.schedulebox.notification.*` type prefix

**Review Domain Events (`packages/events/src/events/review.ts`):**
- `ReviewCreatedPayload` - Review UUID, company ID, customer ID, booking ID, rating, created timestamp
- Factory function using `com.schedulebox.review.created` type

**Payment Event Updates (`packages/events/src/events/payment.ts`):**
- Updated `PaymentCompletedPayload` to use `completedAt` instead of `paidAt` (matches plan spec)
- Added `failedAt` timestamp to `PaymentFailedPayload`
- Updated `PaymentRefundedPayload` to use `amount` and `currency` instead of `refundAmount`
- All changes align payment events with notification/review patterns

All event types follow the exact same CloudEvent v1.0 pattern as booking.ts (CloudEvent<Payload>, type aliases, factory functions using createCloudEvent). Re-exported from `packages/events/src/index.ts`.

**Verification:** `pnpm --filter @schedulebox/events type-check` - PASSED ✅

**Commit:** `2d5c87f`

### Task 2: Zod Schemas and TypeScript Types for Notification and Automation APIs

Created comprehensive validation schemas and type definitions for all notification and automation endpoints:

**Notification Schemas (`packages/shared/src/schemas/notification.ts`):**
- `notificationTemplateCreateSchema` - Validates: type (10 enum values), channel (email/sms/push), subject (max 255, optional for sms/push), bodyTemplate (required), isActive (default true)
- `notificationTemplateUpdateSchema` - Partial of create schema (all fields optional)
- `notificationListQuerySchema` - Pagination (page, limit 1-100), filters (channel, status, customerId, dateFrom, dateTo)
- `notificationTemplatePreviewSchema` - Template ID + test data (record of any)
- Three enums: `notificationTemplateTypeEnum`, `notificationChannelEnum`, `notificationStatusEnum`

**Automation Schemas (`packages/shared/src/schemas/automation.ts`):**
- `automationRuleCreateSchema` - Validates: name (1-255 chars), description (optional), triggerType (11 enum values), triggerConfig (record default {}), actionType (8 enum values), actionConfig (record default {}), delayMinutes (min 0, default 0), isActive (default true)
- `automationRuleUpdateSchema` - Partial of create
- `automationRuleListQuerySchema` - Pagination (page, limit), filters (triggerType, isActive)
- Two enums: `automationTriggerTypeEnum`, `automationActionTypeEnum`

**Notification Types (`packages/shared/src/types/notification.ts`):**
- Type aliases inferred from Zod schemas: `NotificationTemplateCreate`, `NotificationTemplateUpdate`, `NotificationListQuery`, `NotificationTemplatePreview`
- Union types: `NotificationChannel`, `NotificationStatus`, `NotificationTemplateType`

**Automation Types (`packages/shared/src/types/automation.ts`):**
- Type aliases inferred from Zod schemas: `AutomationRuleCreate`, `AutomationRuleUpdate`, `AutomationRuleListQuery`
- Union types: `AutomationTriggerType`, `AutomationActionType`, `AutomationLogStatus`

**Key Design Decision:** Schema-only exports from `schemas/` files, types inferred in `types/` files - prevents TS2308 module conflicts (following Phase 5 pattern).

**Enum Value Accuracy:** All enum values verified to match database check constraints exactly:
- Notification template types: 10 values (booking_confirmation, booking_reminder, booking_cancellation, payment_confirmation, payment_reminder, review_request, welcome, loyalty_update, follow_up, custom)
- Notification channels: 3 values (email, sms, push)
- Notification statuses: 6 values (pending, sent, delivered, failed, opened, clicked)
- Automation trigger types: 11 values (booking_created through review_received)
- Automation action types: 8 values (send_email through ai_follow_up)
- Automation log statuses: 4 values (pending, executed, failed, skipped)

All schemas and types re-exported from barrel files (`packages/shared/src/schemas/index.ts` and `packages/shared/src/types/index.ts`).

**Verification:** `pnpm --filter @schedulebox/shared type-check` - PASSED ✅

**Commit:** `72dfe5d`

## Deviations from Plan

None - plan executed exactly as written. All required exports, event types, schemas, and types created with exact specifications. Consumer helper follows publisher.ts patterns. Enum values match DB constraints. Type-checks pass.

## Verification Results

### Type Checks
- `pnpm --filter @schedulebox/events type-check` - ✅ PASSED (0 errors)
- `pnpm --filter @schedulebox/shared type-check` - ✅ PASSED (0 errors)

### Pattern Compliance
- ✅ Consumer helper uses callback-based amqplib (matches publisher.ts)
- ✅ Event types follow CloudEvent v1.0 pattern (matches booking.ts)
- ✅ Schema-only exports prevent TS module conflicts (matches Phase 5 convention)
- ✅ Enum values match database check constraints exactly
- ✅ Uses z.coerce.number() for query parameters (Phase 5 convention)

## Dependencies Satisfied

**Input Dependencies:**
- Phase 5: RabbitMQ publisher infrastructure (publisher.ts, types.ts, CloudEvent factory)
- Phase 2: Database schemas (notifications.ts, automation.ts with check constraints)

**Output Provided:**
- Consumer connection helper for notification worker (Phase 7-02)
- CloudEvent types for notification lifecycle tracking (Phase 7-03)
- CloudEvent types for review requests (Phase 8 CRM/Marketing)
- Zod schemas for notification template API (Phase 7-04)
- Zod schemas for automation rule API (Phase 7-05)

## Files Created (7)

| File | Lines | Purpose |
|------|-------|---------|
| packages/events/src/consumer.ts | 196 | RabbitMQ consumer connection helper with queue assertion, routing key binding, and message consumption |
| packages/events/src/events/notification.ts | 145 | CloudEvent types for notification lifecycle (sent, failed, opened, clicked) |
| packages/events/src/events/review.ts | 37 | CloudEvent types for review lifecycle (created) |
| packages/shared/src/schemas/notification.ts | 78 | Zod schemas for notification template and notification list API validation |
| packages/shared/src/schemas/automation.ts | 69 | Zod schemas for automation rule CRUD API validation |
| packages/shared/src/types/notification.ts | 52 | TypeScript types for notification templates and notifications |
| packages/shared/src/types/automation.ts | 50 | TypeScript types for automation rules and logs |

## Files Modified (4)

| File | Changes | Reason |
|------|---------|--------|
| packages/events/src/events/payment.ts | Updated payload fields (completedAt, failedAt, currency for refund) | Align with plan spec and notification/review patterns |
| packages/events/src/index.ts | Added consumer helper exports, review exports, notification exports | Re-export all new types and functions |
| packages/shared/src/schemas/index.ts | Added notification and automation schema exports | Barrel file for all validation schemas |
| packages/shared/src/types/index.ts | Added notification and automation type exports | Barrel file for all TypeScript types |

## Key Technical Decisions

1. **Consumer helper mirrors publisher pattern** - Same callback-based amqplib API, same error handlers, same connection management for consistency across event infrastructure.

2. **Fire-and-forget semantics** - Consumer helper ACKs on success / NACKs+requeues on error. Reliable delivery with retry logic deferred to Phase 7 consumer implementation (notification worker).

3. **Schema-first design** - Zod schemas defined first, TypeScript types inferred via `z.infer<>`. Prevents type drift, ensures runtime validation matches compile-time types.

4. **Enum accuracy** - All enum values verified against database check constraints. Used exact string values from Drizzle schemas to prevent validation failures.

5. **Query parameter coercion** - Used `z.coerce.number()` and `z.coerce.boolean()` for query parameters per Phase 5 convention (enables automatic string-to-number/boolean conversion from URL query strings).

## Self-Check: PASSED ✅

**Files Created:**
- ✅ FOUND: packages/events/src/consumer.ts
- ✅ FOUND: packages/events/src/events/notification.ts
- ✅ FOUND: packages/events/src/events/review.ts
- ✅ FOUND: packages/shared/src/schemas/notification.ts
- ✅ FOUND: packages/shared/src/schemas/automation.ts
- ✅ FOUND: packages/shared/src/types/notification.ts
- ✅ FOUND: packages/shared/src/types/automation.ts

**Commits:**
- ✅ FOUND: 2d5c87f (Task 1: RabbitMQ consumer helper and domain event types)
- ✅ FOUND: 72dfe5d (Task 2: Zod schemas and TypeScript types)

**Type Checks:**
- ✅ PASSED: @schedulebox/events type-check (0 errors)
- ✅ PASSED: @schedulebox/shared type-check (0 errors)

## Next Steps

Phase 7 Plan 02 can now proceed with notification worker service implementation:
- Consumer helper ready for queue subscription
- CloudEvent types ready for message deserialization
- Validation schemas ready for API input validation
- All foundational types and infrastructure in place

---

**Plan Duration:** 202 seconds (3 minutes 22 seconds)
**Completed:** 2026-02-11
**Commits:** 2d5c87f, 72dfe5d
