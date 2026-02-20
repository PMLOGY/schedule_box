# Phase 21: Payment Processing - Research

**Researched:** 2026-02-20
**Domain:** Comgate payment gateway production deployment, webhook verification, refund processing
**Confidence:** MEDIUM

## Summary

Phase 21 moves the ScheduleBox Comgate payment integration from test mode to production. The entire payment codebase already exists and is well-structured: a Comgate HTTP client (`comgate/client.ts`), payment service layer with status transitions and idempotency, SAGA choreography handlers for booking-payment coordination, webhook endpoint with signature verification, and refund processing. The code handles test mode via `test=true/false` based on `NODE_ENV`.

The core work for this phase is operational rather than code-heavy: obtaining production Comgate credentials (KYC/merchant verification), configuring Railway environment variables, setting up the webhook URL in Comgate's merchant portal (portal.comgate.cz), IP whitelisting the Railway server, and validating the end-to-end flow with real cards. A critical finding is that the current webhook signature verification uses HMAC-SHA256 header verification (per the project documentation), but Comgate's actual API sends the `secret` as a POST body parameter -- this discrepancy must be resolved for production to work.

The refund flow is already implemented with full/partial refund support, gateway-specific handling (Comgate API call vs. manual reconciliation for cash), and proper event publishing. The payment timeout mechanism (30-minute expiration of pending payments) exists but requires a cron trigger in production.

**Primary recommendation:** Focus on three areas: (1) Fix webhook verification to match actual Comgate API behavior (secret in POST body, not HMAC header), (2) Configure production credentials in Railway environment, (3) Validate end-to-end with real test cards before going live.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
| ------- | ------- | ------- | ------------ |
| Comgate REST API v1.0 | v1.0 | Payment gateway for Czech market | Already integrated, Czech market standard |
| Node.js crypto | built-in | HMAC signature verification | Used in existing webhook handler |
| Drizzle ORM | existing | Payment records, status transitions | Project standard ORM |
| @schedulebox/events | existing | Payment domain events (CloudEvents) | Project event infrastructure |

### Supporting

| Library | Version | Purpose | When to Use |
| ------- | ------- | ------- | ----------- |
| comgate-node | 1.1.2 | TypeScript SDK for Comgate API | NOT recommended -- existing custom client is better suited and already tested |
| qrcode | existing | QR payment generation (SPD format) | Czech bank transfer QR codes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| ---------- | --------- | -------- |
| Custom Comgate client | comgate-node npm package | Custom client is already built, tested, and matches our patterns. comgate-node has low downloads and no webhook handling |
| HMAC webhook verification | POST body secret verification | Comgate actually sends secret in POST body, not as HMAC header -- must align with reality |

**Installation:**
No new packages needed. All dependencies already exist.

## Architecture Patterns

### Existing Payment Architecture (Already Implemented)

```
apps/web/app/api/v1/
  payments/
    comgate/
      client.ts           # Comgate HTTP client (create, status, refund, verify)
      create/route.ts     # POST - initiate payment, get redirect URL
      callback/route.ts   # GET - user redirect after payment
    saga/
      booking-payment-handlers.ts  # SAGA choreography (completed/failed/expired)
      payment-timeout.ts           # 30-min pending payment expiration
    service.ts            # Payment service layer (CRUD, status transitions, idempotency)
    route.ts              # GET list, POST manual payment (cash/bank_transfer)
    [id]/route.ts         # GET payment detail
    [id]/refund/route.ts  # POST refund (full/partial)
    expire-pending/route.ts # POST trigger payment expiration
    qr-payment/
      client.ts           # Czech QR payment (SPD format)
      generate/route.ts   # POST generate QR code
  webhooks/
    comgate/route.ts      # POST - Comgate webhook handler (public, no auth)
```

### Pattern 1: Environment-Based Test/Production Toggle

**What:** The Comgate client already toggles test mode based on NODE_ENV
**When to use:** Production deployment
**Example:**
```typescript
// Source: apps/web/app/api/v1/payments/comgate/client.ts, line 99
requestParams.set('test', process.env.NODE_ENV !== 'production' ? 'true' : 'false');
```

### Pattern 2: Lazy Credential Validation

**What:** Comgate credentials are validated only when a payment function is called, not at startup
**When to use:** Already in place -- allows app to start even without Comgate credentials
**Example:**
```typescript
// Source: apps/web/app/api/v1/payments/comgate/client.ts
function getComgateCredentials() {
  const merchantId = process.env.COMGATE_MERCHANT_ID;
  const secret = process.env.COMGATE_SECRET;
  if (!merchantId || !secret) {
    throw new AppError(
      'PAYMENT_GATEWAY_ERROR',
      'Comgate credentials not configured (COMGATE_MERCHANT_ID, COMGATE_SECRET)',
      500,
    );
  }
  return { merchantId, secret };
}
```

### Pattern 3: SAGA Choreography for Booking-Payment Coordination

**What:** Payment events (completed/failed/expired) trigger booking status changes idempotently
**When to use:** Already implemented -- called synchronously from webhook handler in MVP
**Key behavior:**
- `payment.completed` -> booking `pending` -> `confirmed`
- `payment.failed` -> booking `pending` -> `cancelled`
- `payment.expired` -> booking `pending` -> `cancelled` (30-min timeout)
- All handlers are idempotent (safe to call multiple times)

### Pattern 4: Webhook Idempotency via Database

**What:** `processed_webhooks` table with PRIMARY KEY on `event_id` prevents duplicate processing
**When to use:** Already in place for Comgate webhook handler
**How it works:** INSERT attempt -- if 23505 (unique_violation) error, webhook already processed

### Anti-Patterns to Avoid

- **Trusting webhook data blindly:** Always verify payment status via Comgate API (`getComgatePaymentStatus`) after receiving webhook, not just the POST parameters
- **Blocking on event publishing:** All RabbitMQ event publishing is fire-and-forget; never let event publish failure break the payment flow
- **Exposing SERIAL IDs:** All API responses use UUIDs, not internal SERIAL payment/booking IDs
- **Hardcoding production credentials:** All Comgate credentials must be in environment variables, never in code

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| ------- | ----------- | ----------- | --- |
| Payment status tracking | Custom state machine | Existing `VALID_STATUS_TRANSITIONS` map + `updatePaymentStatus` with SELECT FOR UPDATE | Race conditions, concurrent webhooks |
| Webhook idempotency | Redis-based dedup | Existing `processed_webhooks` table + INSERT/23505 pattern | Database-backed, survives restarts |
| Invoice numbering | Sequential counter | Existing `generateInvoiceNumber` with transaction isolation | Race conditions on concurrent payments |
| Payment timeout | Custom scheduler | Existing `expirePendingPayments` + cron trigger | Already handles edge cases (late payments) |
| Comgate API client | Third-party SDK | Existing `comgate/client.ts` | Already built, tested, matches our error handling |

**Key insight:** The entire payment processing code is already built. This phase is about configuration and validation, not new feature development.

## Common Pitfalls

### Pitfall 1: Webhook Signature Verification Mismatch (CRITICAL)

**What goes wrong:** Current code uses HMAC-SHA256 header verification (`x-signature` header), but Comgate's actual API sends the `secret` as a POST body parameter, not as an HMAC hash in a header.
**Why it happens:** The project documentation (section 27.1) describes HMAC-SHA256 verification, but this appears to be an idealized security pattern, not what Comgate actually implements. The official Comgate PHP SDK's `PaymentNotification` class has `getSecret()`/`setSecret()` methods for extracting the secret from POST data. Multiple community SDKs (Clojure, PHP, Node) show no HMAC header verification.
**How to avoid:** Update the webhook handler to verify the `secret` parameter in the POST body matches `COMGATE_SECRET` env var. Optionally also call `getComgatePaymentStatus(transId)` to independently verify payment status via API.
**Warning signs:** Webhook returns 401 "Invalid signature" for all Comgate callbacks in production.
**Confidence:** MEDIUM -- Comgate's official docs (help.comgate.cz) were inaccessible (403). Evidence from PHP SDK, Node SDK, Clojure client, and other community implementations consistently shows secret-in-body pattern. No evidence of HMAC header signing found in any implementation.

### Pitfall 2: IP Whitelisting in Comgate Portal

**What goes wrong:** Comgate requires whitelisting your server's IP address in portal.comgate.cz. If Railway's outbound IP is not whitelisted, payment creation API calls fail.
**Why it happens:** Comgate restricts API access by IP for security.
**How to avoid:** Find Railway's static outbound IP (or set one up), whitelist it in Comgate portal.
**Warning signs:** All Comgate API calls return connection refused or 403.

### Pitfall 3: Callback/Redirect URL Must Use Production Domain

**What goes wrong:** The `callbackUrl` and `redirectUrl` in payment creation use `NEXT_PUBLIC_APP_URL`. If this is still `http://localhost:3000`, Comgate cannot call back.
**Why it happens:** Environment variable not updated for production.
**How to avoid:** Ensure `NEXT_PUBLIC_APP_URL` is set to the production domain (e.g., `https://app.schedulebox.cz`) in Railway environment variables.
**Warning signs:** Payments created successfully but webhooks never arrive; user redirected to localhost after payment.

### Pitfall 4: Comgate API Endpoint URL Discrepancy

**What goes wrong:** Documentation (section 28.5) lists endpoints as `/v1.0/createPayment`, `/v1.0/paymentStatus`, `/v1.0/cancelPayment`, `/v1.0/refundPayment`. But the actual API endpoints (verified via comgate-node SDK source) are `/v1.0/create`, `/v1.0/status`, `/v1.0/refund`, `/v1.0/cancel`.
**Why it happens:** Documentation uses method names, not URL paths.
**How to avoid:** Our existing client already uses the correct endpoints (`/v1.0/create`, `/v1.0/status`, `/v1.0/refund`). No change needed.
**Warning signs:** None -- already correct.

### Pitfall 5: Price in Hellers, Not CZK

**What goes wrong:** Comgate expects amounts in hellers (1 CZK = 100 hellers). Sending CZK directly results in 100x underpayment.
**Why it happens:** API parameter confusion.
**How to avoid:** Already handled in `initComgatePayment()` with `Math.round(price * 100)`.
**Warning signs:** Payments created for 1/100th of expected amount.

### Pitfall 6: Payment Timeout Cron Not Running

**What goes wrong:** Pending payments never expire because the `/api/v1/payments/expire-pending` endpoint is never called in production.
**Why it happens:** The timeout logic exists but requires an external trigger (cron job or scheduled task).
**How to avoid:** Set up a Railway Cron Job or external cron service to call `POST /api/v1/payments/expire-pending` every 5-10 minutes.
**Warning signs:** Booking slots permanently held by abandoned payments.

### Pitfall 7: Missing COMGATE_SECRET in Railway Environment

**What goes wrong:** Payment creation throws 500 "Comgate credentials not configured".
**Why it happens:** Environment variables not copied to Railway.
**How to avoid:** Add `COMGATE_MERCHANT_ID`, `COMGATE_SECRET`, and `COMGATE_API_URL` to Railway service environment variables.
**Warning signs:** Any payment operation returns 500 immediately.

## Code Examples

### Existing Payment Creation Flow (Already Working)

```typescript
// Source: apps/web/app/api/v1/payments/comgate/create/route.ts
// 1. Validate booking (exists, pending, company scope)
// 2. Check no existing payment for booking
// 3. Get customer email
// 4. Build callback/redirect URLs from NEXT_PUBLIC_APP_URL
// 5. Call Comgate API
const { transactionId, redirectUrl } = await initComgatePayment({
  price: parseFloat(booking.price),
  currency,
  label: `ScheduleBox #${booking.uuid.slice(0, 8)}`,
  refId: booking.uuid,
  email,
  redirectUrl,
  callbackUrl,
});
// 6. Create payment record in DB
// 7. Publish payment.initiated event
// 8. Return redirect URL to frontend
```

### Webhook Handler (Needs Fix for Production)

```typescript
// Source: apps/web/app/api/v1/webhooks/comgate/route.ts
// CURRENT (HMAC header verification -- may not match Comgate's actual behavior):
const signature = req.headers.get('x-signature') || req.headers.get('signature') || '';
if (!signature || !verifyComgateSignature(rawBody, signature)) { ... }

// RECOMMENDED FIX (secret in POST body -- matches Comgate SDK patterns):
const parsedBody = new URLSearchParams(rawBody);
const receivedSecret = parsedBody.get('secret');
const { secret: expectedSecret } = getComgateCredentials();
if (receivedSecret !== expectedSecret) {
  return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
}
// ALSO: verify via API call for defense-in-depth
const apiStatus = await getComgatePaymentStatus(transId);
```

### Refund Flow (Already Working)

```typescript
// Source: apps/web/app/api/v1/payments/[id]/refund/route.ts
// 1. Validate payment (exists, company scope, status = paid|partially_refunded)
// 2. Calculate refund amount (full or partial)
// 3. For Comgate: call refundComgatePayment(transactionId, amountInHellers)
// 4. Update payment status (paid->refunded or paid->partially_refunded)
// 5. Publish payment.refunded event
```

### Environment Variables Required for Production

```bash
# Railway environment variables for Comgate production
COMGATE_MERCHANT_ID=<production-merchant-id-from-portal.comgate.cz>
COMGATE_SECRET=<production-secret-from-portal.comgate.cz>
COMGATE_API_URL=https://payments.comgate.cz
NEXT_PUBLIC_APP_URL=https://app.schedulebox.cz  # Must be reachable by Comgate
NODE_ENV=production  # Switches test=false in Comgate API calls
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| ------------ | ---------------- | ------------ | ------ |
| test=true (dev) | test=false (production) | Phase 21 | Real card charges, real money |
| HMAC header verification | Secret-in-body verification | Phase 21 (fix needed) | Webhooks actually work in production |
| Manual expire-pending trigger | Cron-triggered expiration | Phase 21 | Abandoned payments auto-expire |
| localhost URLs | Production domain URLs | Phase 21 | Comgate can reach webhook/redirect endpoints |

**Deprecated/outdated:**

- `verifyComgateSignature()` with HMAC-SHA256 header: Likely does not match Comgate's actual webhook format. Needs to be replaced or supplemented with POST body secret verification.

## Open Questions

1. **Does Comgate actually send HMAC signatures in headers, or only secret in POST body?**
   - What we know: The official PHP SDK has `getSecret()` method on `PaymentNotification`, extracting from POST data. No community SDK implements HMAC header verification. Our project docs describe HMAC-SHA256 but this may be aspirational.
   - What's unclear: Comgate's official API docs (help.comgate.cz) returned 403 and could not be verified. There's a possibility Comgate supports both modes or has updated their API.
   - Recommendation: Test with Comgate's test webhook simulator in portal.comgate.cz. Examine the actual HTTP request headers and body that Comgate sends. Implement dual verification: check both header signature (existing) AND POST body secret (new), accept if either passes.

2. **Railway static IP for Comgate IP whitelisting?**
   - What we know: Comgate requires IP whitelisting in portal.comgate.cz. Railway's default outbound IP may be dynamic.
   - What's unclear: Whether Railway provides static outbound IPs or requires a proxy.
   - Recommendation: Check Railway documentation for static IP support. If not available, consider a proxy service or contact Comgate about wildcard/CIDR whitelisting.

3. **Comgate KYC verification timeline?**
   - What we know: Registration at comgate.cz required, merchant ID and secret obtained after verification.
   - What's unclear: How long KYC takes, what documents are needed for Czech SaaS business.
   - Recommendation: Start KYC process immediately as it may take days/weeks. This is a blocking dependency for PAY-01.

4. **Is PAYMENT_TIMEOUT_MINUTES cron set up on Railway?**
   - What we know: Code exists at `expire-pending/route.ts` but requires external trigger.
   - What's unclear: Whether Railway has cron job capability or needs an external service.
   - Recommendation: Use Railway's cron service or a simple external cron (e.g., cron-job.org) hitting the endpoint every 5 minutes.

5. **Comgate test cards for staging validation?**
   - What we know: Documentation mentions test cards: 4000000000000002 (success), 4000000000000010 (decline). Webhook simulator available in Comgate admin panel.
   - What's unclear: Whether test mode on production credentials works, or if separate test credentials are needed.
   - Recommendation: Use Comgate admin panel webhook simulator for initial testing. Then test with test cards before switching to production.

## Sources

### Primary (HIGH confidence)

- Existing codebase analysis: `apps/web/app/api/v1/payments/` -- full payment implementation reviewed
- Existing codebase analysis: `apps/web/app/api/v1/webhooks/comgate/route.ts` -- webhook handler reviewed
- Existing codebase analysis: `packages/database/src/schema/payments.ts` -- payment schema reviewed
- Existing codebase analysis: `packages/events/src/events/payment.ts` -- payment events reviewed
- Existing codebase analysis: `tests/integration/payments/comgate-webhook.test.ts` -- integration tests reviewed
- comgate-node TypeScript SDK (GitHub: xGearForce/comgate-node) -- API endpoints verified: `/v1.0/create`, `/v1.0/status`, `/v1.0/refund`, `/v1.0/cancel`

### Secondary (MEDIUM confidence)

- Comgate PHP SDK (GitHub: comgate-payments/sdk-php) -- `PaymentNotification` class shows `secret` in POST body, `getStatus()` for verification
- Comgate PHP SDK README -- Webhook handling: "Use PaymentNotification only for getting transactionId. For other details about payment please use $client->getStatus"
- clj-comgate (GitHub: druids/clj-comgate) -- Corroborates secret-in-body pattern, no HMAC header verification
- ScheduleBox documentation section 28 (Comgate Integration) -- Payment flow, API endpoints, test credentials
- ScheduleBox documentation section 27.1 -- Webhook signature verification pattern (HMAC-SHA256)

### Tertiary (LOW confidence)

- Comgate official docs at help.comgate.cz -- Referenced by multiple SDKs but returned 403 on access attempt
- Comgate portal setup requirements -- Assembled from PHP SDK README and community references
- Comgate KYC process details -- General payment gateway knowledge, not Comgate-specific verification

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- all code already exists, reviewed directly in codebase
- Architecture: HIGH -- patterns already implemented and tested (243+ unit tests, 31 integration tests)
- Webhook verification: MEDIUM -- strong evidence from multiple SDKs that secret-in-body is correct, but official docs inaccessible
- Production deployment: MEDIUM -- env var configuration well-understood, but Railway IP/cron specifics unverified
- KYC/merchant setup: LOW -- process steps inferred from general payment gateway patterns and partial documentation

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain -- Comgate API v1.0 is mature)
