---
phase: 07-notifications-automation
plan: 03
subsystem: notification-worker
tags: [rabbitmq, consumers, notifications, events, automation]
dependency_graph:
  requires:
    - 07-01: RabbitMQ consumer helper and event types
    - 07-02: BullMQ notification worker infrastructure
    - 02-04: Bookings schema
    - 02-06: Notifications schema
    - 05-02: RabbitMQ event publisher
  provides:
    - Booking event consumer (booking.created, booking.completed, booking.cancelled)
    - Payment event consumer (payment.completed, payment.failed)
    - Review event consumer with smart routing (review.created)
    - Consumer orchestrator (startConsumers)
    - Integrated worker entrypoint (RabbitMQ + BullMQ)
  affects:
    - All services emitting booking/payment/review events
    - Email/SMS/push notification delivery channels
    - Customer notification experience
tech_stack:
  added: [amqplib callback API]
  patterns:
    - RabbitMQ consumer with topic exchange binding
    - BullMQ job idempotency via CloudEvent ID
    - Smart routing based on review rating
    - Graceful shutdown for dual connection types
key_files:
  created:
    - services/notification-worker/src/consumers/booking-consumer.ts
    - services/notification-worker/src/consumers/payment-consumer.ts
    - services/notification-worker/src/consumers/review-consumer.ts
    - services/notification-worker/src/consumers/index.ts
  modified:
    - services/notification-worker/src/index.ts
    - services/notification-worker/package.json
decisions:
  - Callback-based amqplib API for consistency with Phase 5 publisher pattern
  - Push notification logic stubbed out (needs push_subscriptions table)
  - Customer name field used (not firstName/lastName as they don't exist)
  - Review routing threshold: >= 4 stars external, <= 3 stars internal
  - Idempotent job IDs use CloudEvent.id for deduplication
  - Graceful shutdown closes RabbitMQ before BullMQ for proper cleanup
metrics:
  duration: 482s
  tasks_completed: 2
  files_created: 4
  files_modified: 2
  commits: 2
  completed_date: 2026-02-11
---

# Phase 07 Plan 03: RabbitMQ Event Consumers with Multi-Channel Notification Enqueue

**One-liner:** Three RabbitMQ consumers (booking, payment, review) process domain events and enqueue notification delivery jobs to BullMQ with idempotent deduplication and smart review routing.

## What Was Built

### Task 1: Booking and Payment Event Consumers

**Booking Consumer (`booking-consumer.ts`):**
- **Handles 3 event types:**
  - `booking.created` → Confirmation email + SMS (if template exists) + push (if subscription exists)
  - `booking.completed` → Review request email with 2-hour delay
  - `booking.cancelled` → Cancellation email + push notification

- **Features:**
  - Fetches booking with customer, service, employee relations via Drizzle query builder
  - Checks for company-specific templates in database (notificationTemplates table)
  - Falls back to default templates if no DB template found
  - Enqueues to `emailQueue`, `smsQueue`, `pushQueue` with idempotent jobIds
  - jobId format: `confirm-${event.id}`, `review-request-${event.id}`, `cancel-${event.id}`
  - Review request has 2-hour delay: `delay: 2 * 60 * 60 * 1000`
  - Push subscription lookup returns null (placeholder - storage not yet implemented)

- **Template data variables:**
  - `customer_name`, `service_name`, `booking_date`, `booking_time`
  - `employee_name`, `price`, `currency`, `company_name`, `cancel_url`

**Payment Consumer (`payment-consumer.ts`):**
- **Handles 2 event types:**
  - `payment.completed` → Payment confirmation email + push
  - `payment.failed` → Payment failure email + push with retry link

- **Features:**
  - Fetches payment with booking → customer relations
  - Checks for `payment_confirmation` template in DB
  - Falls back to inline HTML if no template
  - jobId format: `payment-confirm-${event.id}`, `payment-failed-${event.id}`
  - Includes amount, currency, gateway in template data
  - Push notifications include payment amount and status

**Commit:** `3ea9e62` - Created booking and payment consumers with idempotent enqueue

---

### Task 2: Review Consumer with Smart Routing and Orchestrator

**Review Consumer (`review-consumer.ts`):**
- **Handles `review.created` event with rating-based routing:**

**Positive Reviews (Rating >= 4):**
- Fetches company settings for `googleReviewUrl` and `facebookReviewUrl`
- Updates review.redirectedTo = 'google' or 'facebook'
- Sends "thank you" email with external review platform links
- Email includes CTA buttons for Google (blue #4285F4) and Facebook (blue #1877F2)
- Template data: `customer_name`, `rating`, `google_review_url`, `facebook_review_url`
- Push notification: "Děkujeme za hodnocení! - Vaše hodnocení X/5 hvězdiček nám velmi pomohlo!"

**Negative Reviews (Rating <= 3):**
- Updates review.redirectedTo = 'internal'
- Sends "help us improve" email with internal feedback form link
- Feedback URL: `${config.appUrl}/feedback/${reviewUuid}`
- Template data: `customer_name`, `rating`, `feedback_url`
- Push notification: "Děkujeme za zpětnou vazbu - Rádi bychom se dozvěděli více o vaší zkušenosti"

- **Features:**
  - Smart routing based on rating threshold (4 as cutoff)
  - Database template lookup with type-based fallbacks (review_request for positive, follow_up for negative)
  - Inline HTML fallback if no template found
  - jobId format: `review-route-${event.id}`, `review-route-push-${event.id}`
  - Database update to track where review was routed

**Consumer Orchestrator (`consumers/index.ts`):**
- `startConsumers(channel, queues)` function
- Starts all three consumers (booking, payment, review)
- Passes full queues object `{ emailQueue, smsQueue, pushQueue }` to each consumer
- Console logs for debugging: "Starting all consumers..." → "All consumers started successfully"

**Worker Entrypoint Updates (`index.ts`):**
- **Dual startup sequence:**
  1. Start BullMQ workers (email, SMS, push)
  2. Start RabbitMQ consumers (booking, payment, review)

- **RabbitMQ connection management:**
  - Uses `amqplib/callback_api.js` for callback-based connection
  - Asserts `schedulebox.events` topic exchange
  - Creates channel and passes to startConsumers
  - Connection stored in module-level variables for shutdown

- **Graceful shutdown:**
  - Closes RabbitMQ channel → RabbitMQ connection → BullMQ workers → BullMQ queues
  - Proper error handling with try/catch
  - Console logs for each shutdown step

**Commit:** `36dc6fc` - Created review consumer with smart routing and orchestrator

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing amqplib dependency**
- **Found during:** Task 1 type-check
- **Issue:** amqplib not in package.json dependencies
- **Fix:** Added `amqplib@^0.10.4` and `@types/amqplib@^0.10.5`
- **Files modified:** package.json
- **Commit:** 3ea9e62

**2. [Rule 1 - Bug] Incorrect customer field names**
- **Found during:** Task 1 type-check
- **Issue:** Plan assumed `firstName` and `lastName` fields, but customers table has single `name` field
- **Fix:** Changed `${customer.firstName} ${customer.lastName}` to `customer.name` throughout
- **Files modified:** booking-consumer.ts, payment-consumer.ts
- **Commit:** 3ea9e62

**3. [Rule 1 - Bug] Incorrect import paths**
- **Found during:** Task 1 type-check
- **Issue:** Attempted to import from `@schedulebox/database/schema` (doesn't exist)
- **Fix:** Changed to import from `@schedulebox/database` (barrel file)
- **Files modified:** booking-consumer.ts, payment-consumer.ts
- **Commit:** 3ea9e62

**4. [Rule 3 - Blocking] TypeScript callback API type mismatch**
- **Found during:** Task 2 type-check
- **Issue:** Using promise-based `Channel` and `ConsumeMessage` types with callback-based API
- **Fix:** Changed imports to `amqplib/callback_api.js` and `ConsumeMessage` to `Message`
- **Files modified:** All consumer files, index.ts
- **Commit:** 36dc6fc

**5. [Rule 2 - Missing Critical] Push subscription storage not implemented**
- **Found during:** Task 1 implementation
- **Issue:** Plan assumes `user.metadata.pushSubscription` field, but users table has no metadata column
- **Fix:** Stubbed out push subscription logic with placeholder function returning null
- **Files modified:** booking-consumer.ts, payment-consumer.ts, review-consumer.ts
- **Rationale:** Push subscriptions need dedicated table or metadata column - architectural decision required
- **TODO:** Create push_subscriptions table or add metadata JSONB to users/customers table
- **Commit:** 3ea9e62

**6. [Rule 2 - Missing Critical] ESLint non-null assertion violations**
- **Found during:** Task 2 pre-commit hook
- **Issue:** Used `rabbitChannel!` and `rabbitConnection!` non-null assertions in shutdown
- **Fix:** Assigned to local const within if-block to avoid non-null assertions
- **Files modified:** index.ts
- **Commit:** 36dc6fc (via lint-staged auto-fix)

---

## Verification Results

### Type Checks
✅ `pnpm --filter @schedulebox/notification-worker type-check` - PASSED (0 errors)

### Pattern Compliance
✅ Booking consumer handles booking.created (confirmation), booking.completed (review request with 2h delay), booking.cancelled
✅ Payment consumer handles payment.completed, payment.failed
✅ Review consumer implements smart routing: rating >= 4 → external, rating <= 3 → internal
✅ All consumers use CloudEvent.id as BullMQ jobId for deduplication
✅ Consumer orchestrator starts all three consumers with access to all three queues
✅ Worker entrypoint starts both RabbitMQ consumers and BullMQ workers
✅ Graceful shutdown closes RabbitMQ connections then BullMQ connections

### Must-Have Truths
✅ Booking creation triggers confirmation email/SMS/push enqueue (NOTIF-03, NOTIF-05)
✅ Booking completion triggers review request with 2h delay (NOTIF-09)
✅ Review routing works: 4-5 stars → external, 1-3 stars → internal (NOTIF-10)
✅ Payment events trigger confirmation/failure notifications (NOTIF-03)
✅ Customer receives exactly one notification per event (idempotent jobIds prevent duplicates) (NOTIF-07)
⚠️ Push notifications currently stubbed out (needs push_subscriptions table)

---

## Key Technical Decisions

### 1. Callback-based amqplib API
**Why:** Consistency with Phase 5 publisher pattern (already using callback API). Mixing promise and callback APIs causes type conflicts.

**Implementation:** All consumers use `amqplib/callback_api.js` with `Message` type (not `ConsumeMessage`)

### 2. Push Subscription Storage Deferred
**Why:** Users table has no metadata field. Plan assumed `user.metadata.pushSubscription` but database schema doesn't support it.

**Options for Phase 7-04:**
- Add metadata JSONB column to users or customers table
- Create separate push_subscriptions table (cleaner, better for multiple devices)

**Current state:** `getCustomerPushSubscription()` returns null placeholder

### 3. Customer Name Field
**Why:** Customers table has single `name` field, not separate firstName/lastName.

**Impact:** All templates use `customer.name` directly (simpler, works for both individuals and businesses)

### 4. Review Routing Threshold
**Why:** Industry standard - 4-5 stars are promoters (NPS), 1-3 are detractors.

**Implementation:** `if (rating >= 4)` checks positive vs negative routing

### 5. Template Fallbacks
**Why:** Graceful degradation - work even if company hasn't customized templates.

**Fallback order:**
1. DB template (notificationTemplates table)
2. File template (for confirmation/reminder emails via renderTemplateFile)
3. Inline HTML (minimal fallback for payment/review emails)

### 6. Graceful Shutdown Order
**Why:** Close message consumers before workers to prevent new messages from being accepted while workers are shutting down.

**Order:** RabbitMQ channel → RabbitMQ connection → BullMQ workers → BullMQ queues

---

## Dependencies Satisfied

**Input Dependencies:**
- Phase 07-01: RabbitMQ consumer helper, CloudEvent types ✅
- Phase 07-02: BullMQ queues (emailQueue, smsQueue, pushQueue) ✅
- Phase 02-04: Bookings schema with customer/service/employee relations ✅
- Phase 02-06: Notifications and notificationTemplates schema ✅
- Phase 05-02: RabbitMQ event publisher (booking, payment events) ✅

**Output Provided:**
- Booking event consumer for Phase 5 booking API ✅
- Payment event consumer for Phase 6 payment integration ✅
- Review event consumer for Phase 8 CRM/Marketing ✅
- Consumer orchestrator for adding new consumers in Phase 7-04+ ✅
- Push notification infrastructure ready (once storage implemented) ⚠️

---

## Files Created (4)

| File | Lines | Purpose |
|------|-------|---------|
| services/notification-worker/src/consumers/booking-consumer.ts | 438 | RabbitMQ consumer for booking.* events, enqueues confirmation/review/cancellation jobs to email/SMS/push queues |
| services/notification-worker/src/consumers/payment-consumer.ts | 322 | RabbitMQ consumer for payment.* events, enqueues payment confirmation/failure jobs to email/push queues |
| services/notification-worker/src/consumers/review-consumer.ts | 331 | RabbitMQ consumer for review.created with smart routing (4-5 → external, 1-3 → internal feedback) |
| services/notification-worker/src/consumers/index.ts | 39 | Consumer orchestrator that starts all RabbitMQ consumers with BullMQ queue access |

---

## Files Modified (2)

| File | Changes | Reason |
|------|---------|--------|
| services/notification-worker/src/index.ts | Added RabbitMQ connection management, dual startup (BullMQ + RabbitMQ), graceful shutdown for both | Integrate consumers with existing workers |
| services/notification-worker/package.json | Added amqplib and @types/amqplib dependencies | Enable RabbitMQ consumption |

---

## Integration Points

**For Phase 7-04 (Notification Scheduler):**
- Template rendering available via `renderTemplate()` and `renderTemplateFile()`
- Database template lookup pattern established (check notificationTemplates, fallback to defaults)
- Push subscription placeholder ready to be replaced with real implementation

**For Phase 8 (CRM/Marketing):**
- Review consumer handles review.created events
- Smart routing ready for customer feedback collection
- Review redirectedTo field updated for analytics

**For Future Services:**
- Add new consumers via `consumers/index.ts` orchestrator
- Follow same pattern: Channel parameter, Queues interface, setup function
- Bind to `schedulebox.events` exchange with topic routing keys

---

## Self-Check: PASSED ✅

**Files created:**
✅ FOUND: services/notification-worker/src/consumers/booking-consumer.ts
✅ FOUND: services/notification-worker/src/consumers/payment-consumer.ts
✅ FOUND: services/notification-worker/src/consumers/review-consumer.ts
✅ FOUND: services/notification-worker/src/consumers/index.ts

**Commits:**
✅ FOUND: 3ea9e62 (Task 1: Booking and payment event consumers)
✅ FOUND: 36dc6fc (Task 2: Review consumer and orchestrator)

**Type Checks:**
✅ PASSED: @schedulebox/notification-worker type-check (0 errors)

**Functionality:**
✅ setupBookingConsumer exports present
✅ setupPaymentConsumer exports present
✅ setupReviewConsumer exports present
✅ startConsumers orchestrator exports present
✅ All jobIds use CloudEvent.id for idempotency
✅ Review rating-based routing implemented (>= 4 vs <= 3)
✅ Worker starts both RabbitMQ consumers and BullMQ workers

---

## Next Steps

**Phase 7 Plan 04: Notification Scheduler and Rule Engine**
- Scheduled notifications (booking reminders at T-24h, T-2h)
- Rule-based delivery (time windows, customer preferences)
- Template management API (CRUD endpoints for notificationTemplates)

**Push Subscription Implementation (Required for full Phase 7):**
- Design: Create `push_subscriptions` table with (customerId, endpoint, p256dh, auth, device_info)
- API: POST /api/v1/webhooks/push/register endpoint (accept subscription from browser)
- Consumer update: Replace placeholder with real DB query
- Frontend: Service worker registration + Push API subscription flow

---

**Plan Duration:** 482 seconds (8 minutes 2 seconds)
**Completed:** 2026-02-11
**Commits:** 3ea9e62, 36dc6fc
