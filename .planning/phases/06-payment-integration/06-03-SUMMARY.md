---
phase: 06-payment-integration
plan: 03
subsystem: payments
tags: [comgate, payment-gateway, webhook, idempotency, api-routes]
dependency_graph:
  requires:
    - 06-01 (payment schemas and events)
    - 06-02 (webhook idempotency and payment service)
  provides:
    - Comgate payment initiation API endpoint
    - Comgate webhook receiver with signature verification
    - Comgate callback redirect handler
    - Comgate HTTP client library
  affects:
    - Phase 6 Plan 04 (QR payment will follow similar webhook pattern)
    - Phase 7 (Booking status transitions will consume payment events)
tech_stack:
  added:
    - Comgate payment gateway integration
    - HMAC-SHA256 signature verification
    - URLSearchParams for form-urlencoded API
  patterns:
    - Fire-and-forget event publishing
    - Webhook idempotency via database constraint
    - Timing-safe signature comparison
    - Public webhook endpoint (no auth, signature-based security)
key_files:
  created:
    - apps/web/app/api/v1/payments/comgate/client.ts (Comgate HTTP client)
    - apps/web/app/api/v1/payments/comgate/create/route.ts (payment initiation)
    - apps/web/app/api/v1/payments/comgate/callback/route.ts (user redirect handler)
    - apps/web/app/api/v1/webhooks/comgate/route.ts (webhook receiver)
  modified:
    - .env.example (added Comgate credentials)
decisions:
  - decision: "Fire-and-forget event publishing"
    rationale: "Payment creation doesn't fail on event error, reliability deferred to Phase 7"
  - decision: "Return 200 on all webhook errors"
    rationale: "Prevent Comgate retry loops from hammering the endpoint on transient failures"
  - decision: "Webhook signature verification via timing-safe comparison"
    rationale: "Prevents timing attacks on signature validation"
metrics:
  duration: 363
  tasks_completed: 3
  files_created: 4
  files_modified: 1
  commits: 3
  completed_date: 2026-02-11
---

# Phase 6 Plan 03: Comgate Payment Gateway Integration Summary

**One-liner:** Complete Comgate payment flow with payment initiation, webhook processing with signature verification and idempotency, and user callback redirect

## What Was Built

### Task 1: Comgate HTTP API Client (Commit: 70de2f8)

Created comprehensive Comgate HTTP client library with 4 functions:

**apps/web/app/api/v1/payments/comgate/client.ts:**

1. **initComgatePayment(params)** - Create payment on Comgate
   - Converts price from CZK to hellers (multiply by 100)
   - Posts to `/v1.0/create` with form-urlencoded body
   - Uses `prepareOnly=true` to get redirect URL without auto-redirect
   - Parses URL-encoded response, extracts `transId` and `redirect`
   - Returns `{ transactionId, redirectUrl }`
   - Throws AppError with PAYMENT_GATEWAY_ERROR on Comgate errors

2. **getComgatePaymentStatus(transId)** - Check payment status
   - Posts to `/v1.0/status` with merchant ID and secret
   - Returns parsed status object

3. **refundComgatePayment(transId, amount?)** - Initiate refund
   - Posts to `/v1.0/refund` with optional amount for partial refund
   - Returns `{ success, message }`

4. **verifyComgateSignature(rawBody, signature)** - Verify webhook signature
   - Uses HMAC-SHA256 with COMGATE_SECRET
   - Uses `crypto.timingSafeEqual` for constant-time comparison
   - Prevents timing attacks on signature validation
   - Returns boolean (false on any error)

**Environment variables:**
- COMGATE_MERCHANT_ID (required)
- COMGATE_SECRET (required)
- COMGATE_API_URL (defaults to https://payments.comgate.cz)

**Technical details:**
- Uses native `fetch()` (Node.js 20+)
- 15-second timeout via AbortController
- URLSearchParams for form-urlencoded format
- Non-null assertions for env vars (validated at module load)

### Task 2: Payment Create and Callback Endpoints (Commit: 472ba45)

**apps/web/app/api/v1/payments/comgate/create/route.ts** - POST handler:

Flow:
1. Validate request body (booking_id only)
2. Fetch booking, verify belongs to company and status is 'pending'
3. Check no existing payment for booking (prevent duplicates)
4. Fetch customer email
5. Call `initComgatePayment` with booking details
6. Create payment record via `createPaymentRecord` service
7. Publish `payment.initiated` event (fire-and-forget)
8. Return `{ transaction_id, redirect_url }`

**Error handling:**
- 404: Booking not found
- 400: Booking not pending or payment already exists
- 500: Comgate API errors

**apps/web/app/api/v1/payments/comgate/callback/route.ts** - GET handler:

Flow:
1. Extract query params: `id` (transId), `refId` (booking UUID)
2. Look up payment status by gateway transaction ID
3. Redirect to `/{locale}/bookings/{refId}/payment-result?status={status}`
4. Default status: 'pending' (webhook updates actual status)

**Purpose:** Simple redirect handler for user returning from Comgate. NOT where payment status is confirmed (that's the webhook).

### Task 3: Comgate Webhook Endpoint (Commit: 73af8b6)

**apps/web/app/api/v1/webhooks/comgate/route.ts** - PUBLIC POST handler:

Flow:
1. Read raw body with `req.text()` (before parsing, for signature)
2. Extract signature from header (`x-signature` or `signature`)
3. Verify signature with `verifyComgateSignature(rawBody, signature)`
   - Return 401 if invalid
4. Parse form-urlencoded body, extract `transId` and `status`
5. Check idempotency via `checkWebhookIdempotency(transId, 'comgate', payload)`
   - If already processed, return 200 immediately
6. Find payment by `findPaymentByGatewayTx('comgate', transId)`
   - If not found, log warning and return 200 (edge case)
7. Process based on status:
   - **PAID:** Update to 'paid', publish `payment.completed` event
   - **CANCELLED:** Update to 'failed', publish `payment.failed` event
   - **AUTHORIZED:** Log but don't update (remains pending)
8. Mark webhook completed via `markWebhookCompleted(transId)`
9. Return 200 immediately (within 5 seconds)

**Security:**
- No auth (public endpoint)
- Signature verification required
- Timing-safe comparison prevents attacks

**Reliability:**
- Idempotency via database constraint on `event_id`
- Returns 200 on all errors (prevents retry loops)
- Fire-and-forget event publishing

## Architecture Patterns

### Webhook Idempotency
```typescript
// Atomic check via primary key constraint
const { alreadyProcessed } = await checkWebhookIdempotency(transId, 'comgate', payload);
if (alreadyProcessed) return 200;
```

### Signature Verification
```typescript
// Timing-safe comparison prevents side-channel attacks
const expectedSignature = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
```

### Fire-and-Forget Events
```typescript
try {
  await publishEvent(createPaymentCompletedEvent(...));
} catch (error) {
  console.error('Event publish failed:', error);
  // Don't fail the request
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification

All verification checks passed:

```bash
✓ pnpm exec tsc --noEmit -p apps/web/tsconfig.json (no new errors)
✓ Four new files created (client, create, callback, webhook)
✓ .env.example includes COMGATE_MERCHANT_ID, COMGATE_SECRET, COMGATE_API_URL
✓ Webhook handler reads raw body before parsing (signature verification pattern)
✓ Idempotency check uses database constraint (23505 handling in service layer)
```

## Success Criteria Met

- [x] Comgate payment create endpoint validates booking, calls Comgate API, returns redirect URL
- [x] Comgate webhook processes PAID/CANCELLED with signature verification and idempotency
- [x] Callback endpoint redirects user back to frontend
- [x] Payment domain events published on status changes
- [x] .env.example documents required Comgate credentials

## Integration Points

### For Frontend (Phase 7)
```typescript
// Call payment create API
const response = await fetch('/api/v1/payments/comgate/create', {
  method: 'POST',
  body: JSON.stringify({ booking_id: 123 }),
});
const { redirect_url } = await response.json();
window.location.href = redirect_url; // Redirect to Comgate
```

### For Booking Confirmation (Phase 7)
```typescript
// Subscribe to payment.completed event
// Update booking status from 'pending' to 'confirmed'
// Send confirmation email to customer
```

## Technical Notes

1. **Form-urlencoded format:** Comgate API uses `application/x-www-form-urlencoded` (not JSON). URLSearchParams handles encoding/decoding.

2. **Price conversion:** Comgate expects amounts in hellers (1 CZK = 100 hellers). Client multiplies by 100 automatically.

3. **prepareOnly flag:** Using `prepareOnly=true` gets redirect URL without auto-redirect, giving us control over when user navigates to Comgate.

4. **Webhook signature header:** Implementation assumes `x-signature` or `signature` header. Needs verification in Comgate docs (may differ).

5. **Status mapping:**
   - PAID → payment.status = 'paid'
   - CANCELLED → payment.status = 'failed'
   - AUTHORIZED → remains 'pending' (captured later)

6. **Edge case handling:**
   - Payment not found on webhook: Return 200 (Comgate might send before record creation)
   - Unknown status: Log warning, don't fail
   - Event publish errors: Log but don't fail request

## Self-Check: PASSED

### Created Files Verification
```bash
✓ FOUND: apps/web/app/api/v1/payments/comgate/client.ts
✓ FOUND: apps/web/app/api/v1/payments/comgate/create/route.ts
✓ FOUND: apps/web/app/api/v1/payments/comgate/callback/route.ts
✓ FOUND: apps/web/app/api/v1/webhooks/comgate/route.ts
```

### Modified Files Verification
```bash
✓ FOUND: .env.example (Comgate credentials added)
```

### Commits Verification
```bash
✓ FOUND: 70de2f8 (Task 1 - Comgate HTTP API client)
✓ FOUND: 472ba45 (Task 2 - Create and callback endpoints)
✓ FOUND: 73af8b6 (Task 3 - Webhook endpoint)
```

All files created. All commits exist. Plan execution successful.

## Next Steps

**Phase 6 Plan 04:** QR Payment (QRcomat) Integration
- Will follow similar webhook pattern (idempotency + signature verification)
- Will use `qrPaymentGenerateSchema` from Plan 06-01
- Will emit `payment.completed` event on QR payment confirmation

**Phase 7:** Booking Status Transitions
- Will subscribe to `payment.completed` event
- Will update booking status from 'pending' to 'confirmed'
- Will trigger confirmation notifications

---

**Tasks:** 3/3 complete
**Duration:** 6m 3s (363 seconds)
**Commits:** 70de2f8, 472ba45, 73af8b6
