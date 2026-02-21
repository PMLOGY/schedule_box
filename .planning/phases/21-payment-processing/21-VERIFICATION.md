---
phase: 21-payment-processing
verified: 2026-02-20T21:00:00Z
status: human_needed
score: 3/4 must-haves verified
gaps:
human_verification:
  - test: "Comgate merchant account KYC + production credential configuration"
    expected: "COMGATE_MERCHANT_ID and COMGATE_SECRET set in Railway; KYC approved at portal.comgate.cz; webhook URL configured to https://app.schedulebox.cz/api/v1/webhooks/comgate"
    why_human: "Requires KYC approval from Comgate (days/weeks), Railway dashboard access, and real credentials - not automatable"
  - test: "Payment creation works with real cards in production"
    expected: "Customer redirected to Comgate payment page, completes payment, redirected back with booking confirmed"
    why_human: "Requires production Comgate credentials and real card interaction - code exists and is correct but untestable without credentials"
  - test: "Webhook callback processes payment confirmation end-to-end"
    expected: "Comgate POST webhook reaches /api/v1/webhooks/comgate, secret verified, booking status updated to confirmed"
    why_human: "Code is verified correct but live webhook delivery requires production credentials and a deployed environment"
  - test: "Refund flow updates payment status and customer receives money"
    expected: "POST /api/v1/payments/{id}/refund succeeds, Comgate API confirms refund, payment status set to refunded"
    why_human: "refundComgatePayment and refund route are correctly wired but actual money movement requires production credentials"
  - test: "Cron payment expiration runs automatically"
    expected: "Railway Cron calls POST /api/v1/payments/expire-pending/cron every 5 min with CRON_SECRET bearer token; expired_count returned"
    why_human: "Cron endpoint correctly implemented but Railway cron job setup is a human dashboard action; CRON_SECRET must be configured in production"
---

# Phase 21: Payment Processing Verification Report

**Phase Goal:** Customers can pay for bookings with real cards and businesses receive funds
**Verified:** 2026-02-20T21:00:00Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Context: Plan 21-03 Explicitly Deferred

Plan 21-03 (production credential setup, KYC, real card E2E testing) was deferred by the user. It is documented as `status: deferred` in `21-03-SUMMARY.md`. The code deliverables from Plans 21-01 and 21-02 are the subject of this verification.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Webhook verifies Comgate POST body secret (not HMAC header) | VERIFIED | parsedBody.get(secret) + verifyComgateWebhookSecret() in route.ts lines 53-56 |
| 2 | Webhook cross-checks status via Comgate API (defense-in-depth) | VERIFIED | getComgatePaymentStatus(transId) called at route.ts line 95; API overrides webhook on mismatch |
| 3 | Old HMAC verification path fully removed (no dead code) | VERIFIED | Zero references to verifyComgateSignature or computeSignature in source files |
| 4 | Integration tests validate POST body secret verification | VERIFIED | 7 test cases in comgate-webhook.test.ts: valid/wrong/empty/whitespace/null-like/timing-safe/special-char |
| 5 | Cron endpoint exists and protected by CRON_SECRET bearer token | VERIFIED | expire-pending/cron/route.ts: 503 if unconfigured, 401 if wrong token, timing-safe comparison |
| 6 | Cron endpoint calls expirePendingPayments() | VERIFIED | Import at cron/route.ts line 14; called at line 45; returns {expired_count, timestamp} |
| 7 | Env var docs use COMGATE_SECRET (not COMGATE_API_KEY), no COMGATE_TEST_MODE | VERIFIED | env-vars-reference.md line 87 has COMGATE_SECRET; both removed vars absent |
| 8 | .env.example has CRON_SECRET | VERIFIED | .env.example line 64: CRON_SECRET placeholder present |
| 9 | Refund function exists and is wired to refund route | VERIFIED | refundComgatePayment exported from client.ts; imported and called in payments/[id]/refund/route.ts line 142 |
| 10 | KYC complete + real card payment works in production | HUMAN NEEDED | Deferred (Plan 21-03) - requires Comgate portal, KYC approval, Railway env vars |

**Code Score:** 9/9 code truths verified. 1 truth human-gated (production credentials + KYC).

---

## Required Artifacts

### Plan 21-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/app/api/v1/webhooks/comgate/route.ts` | Webhook handler with POST body secret + API status check | VERIFIED | parsedBody.get(secret) line 53; verifyComgateWebhookSecret() line 54; getComgatePaymentStatus() line 95 |
| `apps/web/app/api/v1/payments/comgate/client.ts` | Exports verifyComgateWebhookSecret, initComgatePayment, getComgatePaymentStatus, refundComgatePayment | VERIFIED | All four functions exported; verifyComgateWebhookSecret at line 255 uses crypto.timingSafeEqual with length pre-check |
| `tests/integration/payments/comgate-webhook.test.ts` | Integration tests for POST body secret verification | VERIFIED | 7 test cases; imports verifyComgateWebhookSecret; no HMAC helpers |

### Plan 21-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/app/api/v1/payments/expire-pending/cron/route.ts` | Standalone cron endpoint protected by CRON_SECRET bearer token | VERIFIED | 54 lines, fully implemented; CRON_SECRET check, timing-safe comparison, calls expirePendingPayments() |
| `docs/env-vars-reference.md` | COMGATE_SECRET, CRON_SECRET, PAYMENT_TIMEOUT_MINUTES; no COMGATE_API_KEY or COMGATE_TEST_MODE | VERIFIED | All required vars present; removed vars absent; NODE_ENV note at line 91 |
| `.env.example` | CRON_SECRET placeholder added | VERIFIED | Line 64: CRON_SECRET=generate-a-random-secret-here |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| webhooks/comgate/route.ts | payments/comgate/client.ts | import verifyComgateWebhookSecret | WIRED | Imported line 20, called line 54 |
| webhooks/comgate/route.ts | payments/comgate/client.ts | import getComgatePaymentStatus | WIRED | Imported line 21, called line 95 |
| payments/expire-pending/cron/route.ts | payments/saga/payment-timeout.ts | import expirePendingPayments | WIRED | Imported line 14, called line 45 |
| payments/[id]/refund/route.ts | payments/comgate/client.ts | import refundComgatePayment | WIRED | Imported line 19, called line 142 |

---

## Dead Code Verification

| Item | Expected | Status |
|------|----------|--------|
| verifyComgateSignature | Removed from all source files | VERIFIED - zero matches in apps/ or tests/ |
| computeSignature test helper | Removed from test file | VERIFIED - zero matches in tests/ |
| x-signature header check | Removed from webhook route | VERIFIED - comment at route.ts line 52 explicitly notes NOT HMAC |
| COMGATE_API_KEY in docs | Removed | VERIFIED - zero matches in env-vars-reference.md |
| COMGATE_TEST_MODE in docs | Removed | VERIFIED - zero matches in env-vars-reference.md |

---

## Anti-Patterns Found

None. The webhook route handles PAID, CANCELLED, AUTHORIZED, and unknown status cases. The cron route handles unconfigured CRON_SECRET (503), wrong token (401), and expiration errors (500). The refund route handles missing gateway transaction ID and Comgate API errors. No empty stubs, placeholder returns, or console.log-only implementations detected.

---

## Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| PAY-01: Payment creation with real cards | HUMAN NEEDED | Code exists (initComgatePayment wired to payment API routes); production execution deferred |
| PAY-02: Webhook processes payment confirmations | VERIFIED (code) | POST body secret verification + defense-in-depth API check fully implemented |
| PAY-03: Refund flow works end-to-end | VERIFIED (code) | refundComgatePayment wired to refund route; calls Comgate /v1.0/refund |
| PAY-04: Booking status updated on payment events | VERIFIED (code) | handlePaymentCompleted/handlePaymentFailed SAGA handlers called in webhook route |

---

## Human Verification Required

### 1. Comgate KYC and Production Credential Setup

**Test:** Register at portal.comgate.cz, complete KYC, obtain COMGATE_MERCHANT_ID and COMGATE_SECRET. Set webhook URL to https://app.schedulebox.cz/api/v1/webhooks/comgate. Add credentials and CRON_SECRET to Railway environment variables.
**Expected:** Comgate portal shows KYC approved; Railway variables contain all three secrets; redeployed app responds to webhook test from Comgate portal.
**Why human:** KYC requires document submission (days/weeks); Railway dashboard requires human operator with access.

### 2. Real Card Payment E2E

**Test:** Log in as a business owner, create a booking for a paid service, initiate payment, complete with a Comgate test card (4000000000000002) or real card.
**Expected:** Redirect to Comgate payment page succeeds. After payment, redirect back to app. Booking status changes to confirmed.
**Why human:** Requires live Comgate credentials and browser interaction with payment page.

### 3. Webhook Delivery from Comgate

**Test:** After completing a test payment, check Railway logs for the webhook call to /api/v1/webhooks/comgate.
**Expected:** Log shows Webhook processed (not Invalid secret or Missing required fields). Payment and booking status updated in database.
**Why human:** Requires Comgate to actually POST the webhook, which needs production credentials and a deployed accessible endpoint.

### 4. Refund Processing

**Test:** Find completed test payment in admin panel, initiate full refund via the UI or POST /api/v1/payments/{id}/refund.
**Expected:** Payment status changes to refunded. Comgate API confirms refund (code=0). Money returns to card within 1-5 business days.
**Why human:** Requires production credentials to call Comgate /v1.0/refund API with a real transaction ID.

### 5. Cron Payment Expiration in Production

**Test:** Create a booking with payment but do NOT complete it. Set PAYMENT_TIMEOUT_MINUTES=1 temporarily. Wait for Railway cron to fire, or manually call POST /api/v1/payments/expire-pending/cron with Authorization: Bearer CRON_SECRET.
**Expected:** Response returns expired_count and timestamp. Payment status changes to failed with reason payment_timeout. Booking cancels.
**Why human:** Requires CRON_SECRET set in Railway and a deployed endpoint; Railway cron job setup is a dashboard action.

---

## Summary

**Code deliverables (Plans 21-01 and 21-02) are fully implemented and correctly wired.** The critical production bug - HMAC header verification that would reject 100% of Comgate webhooks - has been fixed with the correct POST body secret pattern using crypto.timingSafeEqual. All old dead code is removed. The cron expiration endpoint and corrected documentation are in place.

**The phase goal cannot be fully verified without production Comgate credentials**, which requires KYC approval (a human, multi-day process). This is expected: Plan 21-03 was intentionally deferred and is documented as status: deferred in 21-03-SUMMARY.md.

The code is production-ready and waiting for credentials. Once Plan 21-03 is executed (KYC complete, credentials in Railway, cron configured), the phase goal will be achievable with no further code changes.

---

_Verified: 2026-02-20T21:00:00Z_
_Verifier: Claude (gsd-verifier)_