# Deferred Tasks — Human Action Required

These tasks were identified during v1.1 Production Hardening but require human action
(external account setup, credentials, legal content). They must be completed before
ScheduleBox can process real SMS messages and payments.

## Status: PENDING

---

### 1. Twilio Account Setup (Phase 20-03)

**Priority:** HIGH — SMS reminders cannot send without this
**What to do:**

- [ ] Create Twilio account at https://www.twilio.com
- [ ] Purchase a Czech phone number (+420)
- [ ] Get Account SID, Auth Token, and From Number
- [ ] Add credentials to Railway environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER`
- [ ] Run the usage trigger setup script: `npx tsx scripts/setup-twilio-usage-trigger.ts`
- [ ] Send a test SMS to verify delivery

**Code status:** Complete. AI-gated SMS logic, UCS-2 encoding, cost monitoring, Helm secrets — all implemented.
**Files:** `services/notification-worker/src/sms-sender.ts`, `scripts/setup-twilio-usage-trigger.ts`

---

### 2. Comgate Production Credentials (Phase 21-03)

**Priority:** HIGH — Real card payments cannot process without this
**What to do:**

- [ ] Complete Comgate merchant KYC verification
- [ ] Get production merchant ID and API secret
- [ ] Add credentials to Railway environment variables:
  - `COMGATE_MERCHANT_ID`
  - `COMGATE_SECRET`
  - `COMGATE_API_URL` (production: `https://payments.comgate.cz/v1.0`)
- [ ] Set `NODE_ENV=production` on Railway (disables test mode)
- [ ] Run a test payment with a real card
- [ ] Verify webhook callback updates booking status correctly

**Code status:** Complete. Webhook verification (POST body secret), defense-in-depth API check, cron payment expiration — all implemented.
**Files:** `apps/web/app/api/v1/payments/comgate/webhook/route.ts`, `apps/web/app/api/v1/payments/expire-pending/cron/route.ts`

---

### 3. CRON_SECRET for Payment Expiration (Phase 21-02)

**Priority:** MEDIUM — Pending payments won't auto-expire without this
**What to do:**

- [ ] Generate a random secret: `openssl rand -hex 32`
- [ ] Add to Railway: `CRON_SECRET=<generated-secret>`
- [ ] Set up external cron (e.g., cron-job.org) to call:
  ```
  POST https://your-domain/api/v1/payments/expire-pending/cron
  Authorization: Bearer <CRON_SECRET>
  ```
  Schedule: every 15 minutes

**Code status:** Complete. Endpoint returns 503 if CRON_SECRET not set, 401 on bad token.

---

### 4. Railway Email — Switch to HTTP API Provider

**Priority:** HIGH — Emails don't send on Railway (all SMTP ports blocked)
**What to do:**

- [ ] Sign up for an email provider with HTTP API (Resend, Brevo, or Mailgun)
- [ ] Verify schedulebox.cz domain with the provider
- [ ] Replace nodemailer SMTP calls with HTTP API calls in:
  - `apps/web/lib/email/auth-emails.ts` (password reset, email verification)
  - `services/notification-worker/src/services/email-sender.ts` (booking notifications)
  - `services/notification-worker/src/monitoring/alert-sender.ts` (monitoring alerts)
- [ ] Add API key to Railway env vars

**Code status:** SMTP works locally (cesky-hosting.cz port 587). Railway blocks outbound SMTP (ports 25, 465, 587).
**Recommended:** Resend (free tier: 100 emails/day, 3000/month, simple Node.js SDK)

---

### 5. Czech Legal Content (v1.2 Phase 25 — upcoming)

**Priority:** MEDIUM — Needed before landing page goes live
**What to do:**

- [ ] Prepare company ICO, DIC, and registered address for footer
- [ ] Write or commission Czech privacy policy (Zasady ochrany osobnich udaju)
- [ ] Write or commission Czech terms of service (Obchodni podminky)
- [ ] Secure 3+ real beta customer testimonials (do NOT fabricate)

**Note:** Phase 25 code uses `NEXT_PUBLIC_COMPANY_ICO`, `NEXT_PUBLIC_COMPANY_DIC`, `NEXT_PUBLIC_COMPANY_ADDRESS` env vars — set these when ready.

---

_Created: 2026-02-21_
_Review before each deployment to check if any items can be completed._
