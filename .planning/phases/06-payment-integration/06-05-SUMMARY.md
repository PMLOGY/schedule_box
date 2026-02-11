---
phase: 06-payment-integration
plan: 05
subsystem: payments
tags: [saga, choreography, event-handlers, payment-timeout, compensation]
dependency_graph:
  requires:
    - 06-01 (payment domain events)
    - 06-03 (Comgate webhook handler)
    - 05-04 (booking status transitions)
  provides:
    - SAGA choreography handlers for booking-payment flow
    - Payment timeout mechanism
    - Automated booking cancellation on payment failure/expiration
  affects:
    - Phase 7 (RabbitMQ consumers will call these handlers)
    - Phase 15 (Cron job will trigger payment expiration)
tech_stack:
  added:
    - SAGA choreography pattern (event-driven compensation)
    - Payment timeout mechanism (30-minute threshold)
  patterns:
    - SELECT FOR UPDATE for race condition safety
    - Idempotent event handlers
    - Fire-and-forget event publishing
    - Synchronous SAGA handler invocation (MVP, will become async in Phase 7)
key_files:
  created:
    - apps/web/app/api/v1/payments/saga/booking-payment-handlers.ts
    - apps/web/app/api/v1/payments/saga/payment-timeout.ts
    - apps/web/app/api/v1/payments/expire-pending/route.ts
  modified:
    - apps/web/app/api/v1/webhooks/comgate/route.ts
    - .env.example
decisions:
  - decision: "SAGA handlers called synchronously from webhook for MVP"
    rationale: "No RabbitMQ consumer infrastructure yet (Phase 7). Event-driven logic correct, but invocation synchronous. Zero code changes when Phase 7 adds consumers."
  - decision: "Payment timeout triggered manually or by external cron"
    rationale: "Scheduled job infrastructure deferred to Phase 15. Endpoint ready for integration."
  - decision: "Expired payments use 'failed' status with gatewayResponse metadata"
    rationale: "'expired' not in payments.status CHECK constraint. Using 'failed' with { reason: 'payment_timeout' } preserves audit trail."
metrics:
  duration: 293
  tasks_completed: 2
  files_created: 3
  files_modified: 2
  commits: 2
  completed_date: 2026-02-11
---

# Phase 6 Plan 05: SAGA Choreography and Payment Timeout Summary

**One-liner:** SAGA choreography handlers ensure successful payment confirms booking, failed payment cancels booking, and expired payments (30+ min) trigger automatic cancellation with full idempotency and race-condition safety

## What Was Built

### Task 1: SAGA Choreography Event Handlers (Commit: f7df362)

Created three idempotent event handlers for the booking-payment SAGA flow:

**apps/web/app/api/v1/payments/saga/booking-payment-handlers.ts:**

1. **handlePaymentCompleted(data: PaymentCompletedPayload)**
   - Happy path: Successful payment confirms booking
   - Uses transaction with SELECT FOR UPDATE to lock booking row
   - Idempotent: If already confirmed, skip (no-op)
   - Edge case: If already cancelled (late payment after timeout), log warning for manual reconciliation
   - Updates booking: status='confirmed', updatedAt=now
   - Publishes booking.confirmed event
   - Logs: "[SAGA] Booking {uuid} confirmed after payment {paymentUuid}"

2. **handlePaymentFailed(data: PaymentFailedPayload)**
   - Compensation: Failed payment cancels booking
   - Uses transaction with SELECT FOR UPDATE
   - Idempotent: If already cancelled, skip
   - Edge case: If already confirmed (race condition), skip cancellation
   - Updates booking: status='cancelled', cancelledBy='system', cancellationReason=data.reason, cancelledAt=now
   - Publishes booking.cancelled event
   - Logs: "[SAGA] Booking {uuid} cancelled — payment failed: {reason}"

3. **handlePaymentExpired(data: PaymentExpiredPayload)**
   - Timeout compensation: Expired payment cancels booking
   - Uses transaction with SELECT FOR UPDATE
   - Idempotent: If already cancelled, skip
   - Edge case: If already confirmed (payment completed just before timeout), skip
   - Updates booking: status='cancelled', cancelledBy='system', cancellationReason='Payment timeout (30 minutes)'
   - Publishes booking.cancelled event
   - Logs: "[SAGA] Booking {uuid} cancelled — payment expired"

**Updated: apps/web/app/api/v1/webhooks/comgate/route.ts**

- Added imports for handlePaymentCompleted and handlePaymentFailed
- After publishing payment.completed event, calls handlePaymentCompleted synchronously
- After publishing payment.failed event, calls handlePaymentFailed synchronously
- Ensures SAGA flows execute immediately (MVP pattern, no RabbitMQ consumer yet)

### Task 2: Payment Timeout and Expiration (Commit: b296478)

**apps/web/app/api/v1/payments/saga/payment-timeout.ts:**

1. **expirePendingPayments(timeoutMinutes?: number)**
   - Expires pending payments older than timeout threshold
   - Default: 30 minutes (from PAYMENT_TIMEOUT_MINUTES env var or parameter)
   - Query: `SELECT * FROM payments WHERE status = 'pending' AND created_at < NOW() - INTERVAL '{timeout} minutes'`
   - For each expired payment:
     - Update status to 'failed' with gatewayResponse = { reason: 'payment_timeout', expiredAt, timeoutMinutes }
     - Publish payment.expired event
     - Call handlePaymentExpired to cancel booking
   - Returns count of expired payments
   - Logs: "[Payment Timeout] Expired {count} pending payments older than {timeout} minutes"

**apps/web/app/api/v1/payments/expire-pending/route.ts:**

- POST /api/v1/payments/expire-pending
- Protected endpoint (SETTINGS_MANAGE permission)
- Optional request body: { timeout_minutes: number }
- Calls expirePendingPayments and returns { expired_count }
- Can be triggered manually by admin or by external cron job
- Ready for Phase 15 cron job integration (Kubernetes CronJob or node-cron)

**.env.example updated:**

- PAYMENT_TIMEOUT_MINUTES=30 (configurable timeout threshold)
- COMPANY_DEFAULT_IBAN=CZ6508000000192000145399 (for QR payments)

## Architecture Patterns

### SAGA Choreography Pattern

```typescript
// Payment webhook -> SAGA handler (synchronous for MVP)
const eventData = { paymentUuid, bookingUuid, companyId, ... };
await publishEvent(createPaymentCompletedEvent(eventData)); // Fire-and-forget
await handlePaymentCompleted(eventData); // Synchronous execution

// In Phase 7: RabbitMQ consumer will call handler
// Consumer callback: (msg) => handlePaymentCompleted(JSON.parse(msg.content))
```

### Race Condition Safety

```typescript
// SELECT FOR UPDATE ensures no concurrent modifications
await db.transaction(async (tx) => {
  const [booking] = await tx
    .select({ id, status })
    .from(bookings)
    .where(eq(bookings.uuid, bookingUuid))
    .for('update'); // Lock row

  if (booking.status === 'confirmed') return; // Idempotent

  await tx.update(bookings).set({ status: 'confirmed' }).where(eq(bookings.id, booking.id));
});
```

### Idempotency Pattern

```typescript
// All handlers check current booking status before modifying
if (booking.status === 'confirmed') {
  console.log('Already confirmed, skipping');
  return; // No-op
}

if (booking.status === 'cancelled') {
  console.warn('Already cancelled, late payment — manual reconciliation needed');
  return; // No-op
}
```

### Payment Expiration Flow

```
Pending Payment (created_at + 30 min)
  ↓
POST /api/v1/payments/expire-pending (manual or cron)
  ↓
expirePendingPayments()
  ↓
UPDATE payments SET status='failed', gatewayResponse={ reason: 'payment_timeout' }
  ↓
publishEvent(createPaymentExpiredEvent(...))
  ↓
handlePaymentExpired(data)
  ↓
UPDATE bookings SET status='cancelled', cancelledBy='system'
  ↓
publishEvent(createBookingCancelledEvent(...))
```

## Deviations from Plan

None — plan executed exactly as written.

## Verification

All verification checks passed:

```bash
✓ pnpm exec tsc --noEmit -p apps/web/tsconfig.json (only 2 pre-existing OAuth errors)
✓ All 3 SAGA handler functions exported and typed correctly
✓ Comgate webhook route updated to call handlers synchronously
✓ expirePendingPayments function exported and tested
✓ POST /api/v1/payments/expire-pending route protected with SETTINGS_MANAGE permission
✓ All handlers use SELECT FOR UPDATE for race condition safety
✓ All handlers are idempotent (safe to call multiple times)
```

## Success Criteria Met

- [x] Successful Comgate payment automatically confirms the booking
- [x] Failed Comgate payment automatically cancels the booking
- [x] Abandoned payments (30 min) expire and cancel associated booking
- [x] SAGA flow is idempotent and race-condition safe (SELECT FOR UPDATE)
- [x] Compensation logic prevents orphaned pending bookings

## Integration Points

### For Phase 7 (RabbitMQ Consumers)

```typescript
// SAGA handlers become consumer callbacks with ZERO code changes
channel.consume('payment.completed', async (msg) => {
  const data = JSON.parse(msg.content.toString());
  await handlePaymentCompleted(data);
  channel.ack(msg);
});

channel.consume('payment.failed', async (msg) => {
  const data = JSON.parse(msg.content.toString());
  await handlePaymentFailed(data);
  channel.ack(msg);
});

channel.consume('payment.expired', async (msg) => {
  const data = JSON.parse(msg.content.toString());
  await handlePaymentExpired(data);
  channel.ack(msg);
});
```

### For Phase 15 (Cron Job Integration)

```yaml
# Kubernetes CronJob example
apiVersion: batch/v1
kind: CronJob
metadata:
  name: expire-pending-payments
spec:
  schedule: '*/15 * * * *' # Every 15 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: expire-payments
              image: schedulebox/web:latest
              command:
                - curl
                - -X
                - POST
                - -H
                - 'Authorization: Bearer ${ADMIN_API_KEY}'
                - http://schedulebox-web/api/v1/payments/expire-pending
```

Or node-cron:

```typescript
import cron from 'node-cron';
import { expirePendingPayments } from './payments/saga/payment-timeout';

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Running payment expiration job...');
  const count = await expirePendingPayments();
  console.log(`Expired ${count} pending payments`);
});
```

## Technical Notes

1. **MVP vs. Production Architecture:**
   - MVP: SAGA handlers called synchronously from webhook handler
   - Production (Phase 7): SAGA handlers called asynchronously by RabbitMQ consumers
   - Zero code changes to handlers when transitioning to async consumers

2. **Race Condition Scenarios:**
   - Payment completed + timeout race: handlePaymentCompleted wins (booking confirmed), handlePaymentExpired is no-op
   - Payment failed + completed race: First handler wins (SELECT FOR UPDATE), second is no-op
   - Duplicate webhook: Idempotency check in processedWebhooks prevents double execution

3. **Edge Cases Handled:**
   - Late payment after timeout: Logged, requires manual reconciliation
   - Payment not found on webhook: Returns 200, logs warning (webhook might arrive before payment record creation)
   - Unknown status: Logged, doesn't fail request
   - Event publish errors: Logged but don't fail transaction (fire-and-forget)

4. **Why 'failed' status instead of 'expired':**
   - payments.status CHECK constraint only allows 'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
   - Using 'failed' with gatewayResponse = { reason: 'payment_timeout' } preserves audit trail
   - Alternative: Add 'expired' to CHECK constraint (requires migration)

5. **Timeout Configuration:**
   - Default: 30 minutes (industry standard for payment links)
   - Configurable via PAYMENT_TIMEOUT_MINUTES env var
   - Can be overridden per-call via API request body

6. **Idempotency Guarantees:**
   - All handlers check current booking status before modifying
   - Second call for same event is always a no-op
   - Safe to retry on transient failures
   - Safe for duplicate webhook deliveries

## Self-Check: PASSED

### Created Files Verification

```bash
✓ FOUND: apps/web/app/api/v1/payments/saga/booking-payment-handlers.ts
✓ FOUND: apps/web/app/api/v1/payments/saga/payment-timeout.ts
✓ FOUND: apps/web/app/api/v1/payments/expire-pending/route.ts
```

### Modified Files Verification

```bash
✓ FOUND: apps/web/app/api/v1/webhooks/comgate/route.ts (SAGA handler calls added)
✓ FOUND: .env.example (PAYMENT_TIMEOUT_MINUTES added)
```

### Commits Verification

```bash
✓ FOUND: f7df362 (Task 1 - SAGA choreography handlers)
✓ FOUND: b296478 (Task 2 - Payment timeout mechanism)
```

All files created. All commits exist. Plan execution successful.

## Next Steps

**Phase 6 Plan 06:** Payment list and refund endpoints
- Will use paymentListQuerySchema and paymentRefundSchema from Plan 06-01
- Will call refundComgatePayment from Plan 06-03
- Will publish payment.refunded event
- Will integrate with invoice generation for refund documentation

**Phase 7:** RabbitMQ consumer infrastructure
- Will add proper consumers for payment events
- SAGA handlers become consumer callbacks with zero code changes
- Will add retry logic, dead-letter queue, and monitoring

**Phase 15:** Scheduled job infrastructure
- Will add Kubernetes CronJob or node-cron for payment expiration
- Will integrate with monitoring and alerting
- Will add admin UI for manual expiration triggers

---

**Tasks:** 2/2 complete
**Duration:** 4m 53s (293 seconds)
**Commits:** f7df362, b296478
