---
phase: 06-payment-integration
plan: 01
subsystem: shared-payment
tags: [schemas, types, events, validation, cloudevents]
dependency_graph:
  requires:
    - Phase 5 Plan 01 (booking schemas pattern)
    - Phase 5 Plan 02 (CloudEvents infrastructure)
  provides:
    - Payment Zod validation schemas
    - Payment TypeScript types
    - Payment CloudEvents definitions
  affects:
    - Phase 6 Plan 02 (Comgate API will use these schemas)
    - Phase 6 Plan 03 (QR payment will use these schemas)
    - Phase 6 Plan 04 (Webhook will consume these events)
tech_stack:
  added:
    - Zod validation for payment domain
    - CloudEvents v1.0 for payment lifecycle
  patterns:
    - Schema-only exports from schemas/ files
    - Type inference in types/ files
    - Factory function pattern for CloudEvents
key_files:
  created:
    - packages/shared/src/schemas/payment.ts (payment validation schemas)
    - packages/shared/src/types/payment.ts (Payment and Invoice types)
    - packages/events/src/events/payment.ts (5 payment domain events)
  modified:
    - packages/shared/src/schemas/index.ts (barrel re-exports)
    - packages/shared/src/types/index.ts (barrel re-exports)
    - packages/events/src/index.ts (barrel re-exports)
decisions: []
metrics:
  duration: 181s
  tasks_completed: 2
  files_created: 3
  files_modified: 3
  commits: 2
  completed_date: 2026-02-11
---

# Phase 6 Plan 01: Payment Schemas, Types, and Events Summary

**One-liner:** Payment domain foundation with Zod validation schemas, TypeScript types, and CloudEvents for payment lifecycle state changes (initiated, completed, failed, refunded, expired)

## Execution Summary

Plan executed exactly as written. Both tasks completed with zero deviations. All TypeScript compilation checks passed. Pattern established in Phase 5 (booking schemas + events) successfully applied to payment domain.

## Tasks Completed

### Task 1: Payment Zod Schemas and TypeScript Types
**Commit:** 5cb7d90

Created comprehensive payment validation and type definitions:

**Schemas created (packages/shared/src/schemas/payment.ts):**
- `paymentStatusEnum` - 5 status values (pending, paid, failed, refunded, partially_refunded)
- `paymentGatewayEnum` - 5 gateway types (comgate, qrcomat, cash, bank_transfer, gift_card)
- `invoiceStatusEnum` - 4 status values (draft, issued, paid, cancelled)
- `paymentCreateSchema` - Manual payment creation (admin/internal use)
- `comgateCreateSchema` - Comgate payment initiation (booking_id only)
- `qrPaymentGenerateSchema` - QR code generation (booking_id only)
- `paymentRefundSchema` - Refund request with optional amount and required reason
- `paymentListQuerySchema` - Pagination + filtering (status, gateway, date range, booking_id)

**Types created (packages/shared/src/types/payment.ts):**
- `Payment` - Full payment entity matching API response format (14 fields)
- `Invoice` - Full invoice entity matching API response format (12 fields)
- `PaymentStatus`, `PaymentGateway`, `InvoiceStatus` - Enum types
- `ComgateCreateResponse` - transactionId + redirectUrl
- `QrPaymentResponse` - qrCodeBase64 + spdString
- `PaymentCreate`, `PaymentRefund`, `PaymentListQuery` - Inferred from schemas

**Pattern adherence:**
- Schemas export ONLY Zod schemas (no types)
- Types import schemas via `import type` and use `z.infer<typeof schema>`
- Barrel exports updated in both packages/shared/src/schemas/index.ts and packages/shared/src/types/index.ts
- Prevents TS2308 module conflicts per Phase 5 learning

**Files:**
- packages/shared/src/schemas/payment.ts (102 lines)
- packages/shared/src/types/payment.ts (119 lines)
- packages/shared/src/schemas/index.ts (updated)
- packages/shared/src/types/index.ts (updated)

### Task 2: Payment Domain Events (CloudEvents)
**Commit:** 5a0d043

Created 5 payment lifecycle domain events following CloudEvents v1.0 spec:

**Events defined (packages/events/src/events/payment.ts):**

1. **PaymentInitiatedEvent** (`com.schedulebox.payment.initiated`)
   - Emitted when payment process starts
   - Payload: paymentUuid, bookingUuid, companyId, amount, currency, gateway, gatewayTransactionId
   - Subject: paymentUuid

2. **PaymentCompletedEvent** (`com.schedulebox.payment.completed`)
   - Emitted when payment successfully processed
   - Payload: paymentUuid, bookingUuid, companyId, amount, currency, gateway, gatewayTransactionId, paidAt
   - Subject: paymentUuid

3. **PaymentFailedEvent** (`com.schedulebox.payment.failed`)
   - Emitted when payment processing fails
   - Payload: paymentUuid, bookingUuid, companyId, gateway, reason
   - Subject: paymentUuid

4. **PaymentRefundedEvent** (`com.schedulebox.payment.refunded`)
   - Emitted when payment refunded (full or partial)
   - Payload: paymentUuid, bookingUuid, companyId, refundAmount, reason, refundedAt
   - Subject: paymentUuid

5. **PaymentExpiredEvent** (`com.schedulebox.payment.expired`)
   - Emitted when payment timeout occurs
   - Payload: paymentUuid, bookingUuid, companyId, reason ('payment_timeout')
   - Subject: paymentUuid

**Factory functions:** All 5 events have `create*Event()` factory functions using shared `createCloudEvent()` utility.

**Event routing keys (derived by publisher):**
- payment.initiated
- payment.completed
- payment.failed
- payment.refunded
- payment.expired

**Pattern adherence:**
- Event source: 'payment-service'
- Event type prefix: 'com.schedulebox.payment'
- Type exports and value exports in packages/events/src/index.ts
- Matches booking event structure exactly

**Files:**
- packages/events/src/events/payment.ts (184 lines)
- packages/events/src/index.ts (updated)

## Verification Results

All verification checks passed:

```bash
✓ pnpm exec tsc --noEmit -p packages/shared/tsconfig.json
✓ pnpm exec tsc --noEmit -p packages/events/tsconfig.json
✓ All payment schemas importable from @schedulebox/shared
✓ All payment events importable from @schedulebox/events
✓ Zero TypeScript compilation errors
✓ No circular dependencies
```

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- [x] Payment Zod schemas validate all 7 payment operations
- [x] Payment TypeScript types match database schema and API response format
- [x] Five payment CloudEvents defined with typed payloads
- [x] All exports accessible via barrel files
- [x] Zero TypeScript compilation errors

## Self-Check: PASSED

### Created Files Verification
```bash
✓ FOUND: packages/shared/src/schemas/payment.ts
✓ FOUND: packages/shared/src/types/payment.ts
✓ FOUND: packages/events/src/events/payment.ts
```

### Commits Verification
```bash
✓ FOUND: 5cb7d90 (Task 1 - Payment schemas and types)
✓ FOUND: 5a0d043 (Task 2 - Payment domain events)
```

All files created. All commits exist. Plan execution successful.

## Next Steps

Phase 6 Plan 02: Comgate Payment Gateway Integration
- Will use paymentCreateSchema, comgateCreateSchema
- Will emit PaymentInitiatedEvent, PaymentCompletedEvent, PaymentFailedEvent
- Will use Payment and ComgateCreateResponse types

Phase 6 Plan 03: QR Payment (QRcomat) Integration
- Will use qrPaymentGenerateSchema
- Will emit PaymentCompletedEvent when QR payment confirmed
- Will use QrPaymentResponse type

Phase 6 Plan 04: Payment Webhooks
- Will consume payment domain events for state transitions
- Will update booking status based on payment events
- Will generate invoices on PaymentCompletedEvent

## Technical Notes

1. **Gateway flexibility:** paymentGatewayEnum supports 5 payment methods (Comgate, QR, cash, bank transfer, gift card) for Czech/Slovak market requirements.

2. **Refund types:** paymentStatusEnum includes both 'refunded' (full) and 'partially_refunded' for flexible refund workflows.

3. **Amount as string:** All monetary amounts (Payment.amount, PaymentCompletedPayload.amount, etc.) use string type to preserve decimal precision from PostgreSQL NUMERIC type.

4. **Invoice status:** Separate invoiceStatusEnum supports draft invoices (created before payment) and lifecycle transitions (issued, paid, cancelled).

5. **Event-driven architecture:** Payment events enable SAGA choreography for booking confirmation, notification triggers, and invoice generation without tight coupling.

---

*Duration: 181 seconds*
*Completed: 2026-02-11*
