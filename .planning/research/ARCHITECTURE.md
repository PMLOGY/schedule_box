# Architecture Patterns: Testing, SMTP, Twilio, Comgate Integration

**Domain:** Production Hardening (v1.1)
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

This architecture research documents how testing infrastructure, SMTP email delivery, Twilio SMS, and Comgate payment processing integrate with the existing ScheduleBox Next.js monorepo. The architecture emphasizes minimal changes to existing code, leveraging environment variable configuration for feature enablement, and following established patterns already in place.

**Key Finding:** The existing codebase is already structured for production services - notification-worker has nodemailer/twilio clients, payment routes have Comgate client with signature verification. The integration requires environment variable configuration, test infrastructure setup, and minimal code modifications.

---

## Current Architecture Overview

### 1. Existing Components

```
schedulebox/
├── apps/web/                           # Next.js 14 App Router
│   ├── app/api/v1/                    # API route handlers
│   │   ├── payments/                  # Payment routes
│   │   │   ├── comgate/client.ts     # ✅ Comgate HTTP client (existing)
│   │   │   └── comgate/callback/     # ✅ User redirect handler (existing)
│   │   └── webhooks/
│   │       └── comgate/route.ts      # ✅ Webhook handler (existing)
│   └── lib/                           # Business logic
│       ├── middleware/                # Auth, validation, RBAC
│       └── ai/circuit-breaker.ts     # ✅ Opossum circuit breaker (existing)
├── packages/
│   ├── database/                      # Drizzle ORM schemas
│   └── shared/                        # Zod schemas, types
└── services/
    └── notification-worker/           # BullMQ + RabbitMQ consumers
        └── src/services/
            ├── email-sender.ts        # ✅ Nodemailer SMTP (existing)
            └── sms-sender.ts          # ✅ Twilio SMS (existing)
```

### 2. Current Data Flow

**Email/SMS Notifications:**
```
API Route → BullMQ Queue (Redis) → notification-worker → nodemailer/twilio
```

**Comgate Payments:**
```
POST /payments/comgate/create → Comgate API → User pays → Webhook → SAGA handlers
```

---

## Integration Points: What's New vs Modified

### A. Testing Infrastructure (NEW)

#### A.1. Test Framework Selection

**Recommendation: Vitest + React Testing Library**

**Rationale:**
- Next.js 15 official docs emphasize Vitest as modern choice
- Native ESM support (ScheduleBox uses "type": "module")
- 4x faster than Jest (3.8s vs 15.5s for 100 tests per benchmarks)
- Jest-compatible API (easy migration if needed)
- Built-in TypeScript support

**Source: Medium confidence** - Based on official Next.js docs and community consensus in 2026.

#### A.2. Test Structure (NEW)

```
schedulebox/
├── apps/web/
│   ├── __tests__/                    # NEW: Integration tests
│   │   ├── api/                      # Route handler tests
│   │   │   ├── payments.test.ts
│   │   │   └── webhooks.test.ts
│   │   └── lib/                      # Business logic tests
│   │       └── booking-service.test.ts
│   └── vitest.config.ts              # NEW: Vitest configuration
├── packages/database/
│   └── __tests__/                    # NEW: Schema tests
│       └── migrations.test.ts
├── services/notification-worker/
│   ├── __tests__/                    # NEW: Worker tests
│   │   ├── email-sender.test.ts
│   │   └── sms-sender.test.ts
│   └── vitest.config.ts              # NEW: Vitest configuration
└── vitest.workspace.ts               # NEW: Monorepo workspace config
```

#### A.3. Testing Layers

| Layer | Tool | What to Test | Where |
|-------|------|--------------|-------|
| Unit | Vitest | Pure functions, validators, utils | All packages |
| Integration | Vitest + Testcontainers | API routes, DB queries, queue jobs | apps/web, services/* |
| E2E | Playwright | Critical user flows (20 scenarios) | apps/web |
| Contract | Pact (future) | API contracts between services | Future milestone |

**Integration test pattern for BullMQ:**
- Use real Redis instance (Testcontainers recommended)
- Pattern: Arrange → Act → Wait → Assert
- Use dedicated queue names per test to prevent interference
- Clean up queues in afterEach hooks

**Source: High confidence** - Based on official BullMQ docs and oneuptime.com integration testing guide (Jan 2026).

#### A.4. Database Testing Patterns (MODIFIED)

**Current:** Drizzle migrations in `packages/database/drizzle/`

**New:** Test migrations in isolated database

```typescript
// packages/database/__tests__/migrations.test.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

describe('Database Migrations', () => {
  let testDb: ReturnType<typeof drizzle>;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    // Use Testcontainers or dedicated test DB
    sql = postgres(process.env.TEST_DATABASE_URL!);
    testDb = drizzle(sql);
  });

  afterAll(async () => {
    await sql.end();
  });

  it('should apply all migrations successfully', async () => {
    await migrate(testDb, { migrationsFolder: './drizzle' });
    // Verify schema
  });

  it('should enforce RLS policies', async () => {
    // Test multi-tenant isolation
  });
});
```

**Pattern: Additive DDL for safety**
- Add columns/tables (low risk, online)
- Rename via add-migrate-drop pattern
- Use concurrent indexes for large tables
- Idempotency in migration scripts

**Source: High confidence** - From Drizzle migration patterns (Medium article, 2025).

---

### B. SMTP Email Delivery (MODIFIED)

#### B.1. Current Implementation

**File:** `services/notification-worker/src/services/email-sender.ts`

**Already implemented:**
- ✅ Nodemailer transporter with connection pooling
- ✅ Environment variable configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- ✅ Fallback to mock message ID when SMTP not configured
- ✅ Tracking pixel injection for email open tracking

**Configuration flow:**
```
ENV VARS → config.ts → email-sender.ts → getTransporter()
```

#### B.2. Production Changes Required

**MODIFIED file:** `services/notification-worker/src/config.ts`

**Current:**
```typescript
const smtp = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || 'noreply@schedulebox.cz',
};
```

**No code changes needed** - just set Railway environment variables:
- `SMTP_HOST=smtp.sendgrid.net` (or other provider)
- `SMTP_PORT=587`
- `SMTP_USER=apikey`
- `SMTP_PASS=<SendGrid API key>`
- `SMTP_FROM=noreply@schedulebox.cz`

#### B.3. SMTP Testing Patterns

**Development/Testing:** Use Ethereal Email (nodemailer built-in test service)

```typescript
// services/notification-worker/__tests__/email-sender.test.ts
import nodemailer from 'nodemailer';
import { sendEmail } from '../src/services/email-sender';

describe('Email Sender', () => {
  let testAccount: any;

  beforeAll(async () => {
    testAccount = await nodemailer.createTestAccount();
    process.env.SMTP_HOST = 'smtp.ethereal.email';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = testAccount.user;
    process.env.SMTP_PASS = testAccount.pass;
  });

  it('should send email and return message ID', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test email</p>',
    });

    expect(result).toContain('@ethereal.email');

    // View email at: https://ethereal.email/message/{messageId}
    console.log('Preview URL:', nodemailer.getTestMessageUrl(result));
  });
});
```

**Alternative: Mock transport for unit tests**

```typescript
import { nodemailerMock } from 'nodemailer-mock';

// In test, replace real nodemailer with mock
jest.mock('nodemailer', () => nodemailerMock);

// Access sent emails
const sentEmails = nodemailerMock.mock.getSentMail();
```

**Source: High confidence** - Official Nodemailer docs for testing.

#### B.4. SMTP Deployment Architecture

**Railway configuration:**

1. **Development environment:**
   - No SMTP vars → falls back to mock IDs
   - Logs: "[Email Sender] SMTP not configured, using mock message ID"

2. **Staging environment:**
   - SMTP_HOST=smtp.ethereal.email (free test service)
   - All emails captured, none delivered
   - Team reviews emails at ethereal.email

3. **Production environment:**
   - SMTP_HOST=smtp.sendgrid.net (or Mailgun, AWS SES)
   - Real delivery with connection pooling (maxConnections: 5)
   - Monitor via SendGrid dashboard

**No code changes needed between environments** - only Railway env vars.

---

### C. Twilio SMS (MODIFIED)

#### C.1. Current Implementation

**File:** `services/notification-worker/src/services/sms-sender.ts`

**Already implemented:**
- ✅ Twilio client initialization
- ✅ Environment variable configuration (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)
- ✅ Fallback to mock SID when Twilio not configured
- ✅ SMS segment estimation (GSM-7 vs UCS-2 for Czech diacritics)

**Configuration flow:**
```
ENV VARS → config.ts → sms-sender.ts → getTwilioClient()
```

#### C.2. Production Changes Required

**MODIFIED file:** `services/notification-worker/src/config.ts`

**Current:**
```typescript
const twilio = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_FROM_NUMBER,
};
```

**No code changes needed** - just set Railway environment variables:
- `TWILIO_ACCOUNT_SID=AC...`
- `TWILIO_AUTH_TOKEN=...`
- `TWILIO_FROM_NUMBER=+420...` (purchased Twilio number)

#### C.3. Twilio Testing Patterns

**Test Credentials + Magic Numbers:**

Twilio provides test credentials that don't charge account or send real SMS.

```typescript
// services/notification-worker/__tests__/sms-sender.test.ts
import { sendSMS } from '../src/services/sms-sender';

describe('SMS Sender', () => {
  beforeAll(() => {
    // Use test credentials from Twilio Console
    process.env.TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // Test SID
    process.env.TWILIO_AUTH_TOKEN = 'test_token';
    process.env.TWILIO_FROM_NUMBER = '+15005550006'; // Magic number (valid)
  });

  it('should send SMS without errors (using magic number)', async () => {
    const result = await sendSMS({
      to: '+420123456789', // Any valid number (not actually sent)
      body: 'Test SMS with Czech characters: Příliš žluťoučký kůň',
    });

    expect(result).toMatch(/^SM/); // Twilio SID format
  });

  it('should handle invalid number error (magic number)', async () => {
    process.env.TWILIO_FROM_NUMBER = '+15005550001'; // Magic number → invalid error

    await expect(sendSMS({
      to: '+420123456789',
      body: 'Test',
    })).rejects.toThrow();
  });
});
```

**Magic phone numbers (from Twilio docs):**
- `+15005550006` → Valid number (no error, no delivery)
- `+15005550001` → Invalid phone number error
- `+15005550007` → Forbidden error

**IMPORTANT:** Twilio Verify API does NOT support test credentials. For SMS verification testing, use trial account credits (not test credentials).

**Source: High confidence** - Official Twilio test credentials documentation.

#### C.4. SMS Cost Optimization

**Segment estimation already implemented:**
```typescript
export function estimateSMSSegments(body: string): number {
  const hasUnicode = /[^\x00-\x7F]/.test(body);
  const maxLength = hasUnicode ? 70 : 160; // UCS-2 for Czech diacritics
  return Math.ceil(body.length / maxLength);
}
```

**Cost optimization strategies:**
1. **Template shortening** - Review SMS templates, remove unnecessary text
2. **Dynamic pricing alert** - If segment count > 2, consider email fallback
3. **Monitoring** - Track `sms_segments_sent_total` metric (add to existing logging)

---

### D. Comgate Payment Gateway (MODIFIED)

#### D.1. Current Implementation

**Files:**
- ✅ `apps/web/app/api/v1/payments/comgate/client.ts` - HTTP client
- ✅ `apps/web/app/api/v1/payments/comgate/callback/route.ts` - User redirect
- ✅ `apps/web/app/api/v1/webhooks/comgate/route.ts` - Webhook handler

**Already implemented:**
- ✅ Init payment (initComgatePayment)
- ✅ Get status (getComgatePaymentStatus)
- ✅ Refund (refundComgatePayment)
- ✅ Signature verification (verifyComgateSignature) using HMAC-SHA256 + timingSafeEqual
- ✅ Webhook idempotency (checkWebhookIdempotency)
- ✅ SAGA pattern (handlePaymentCompleted, handlePaymentFailed)

**Configuration flow:**
```
ENV VARS → comgate/client.ts → getComgateCredentials()
```

#### D.2. Production Changes Required

**MODIFIED file:** `apps/web/app/api/v1/payments/comgate/client.ts`

**Current:**
```typescript
const COMGATE_API_URL = process.env.COMGATE_API_URL || 'https://payments.comgate.cz';

function getComgateCredentials() {
  const merchantId = process.env.COMGATE_MERCHANT_ID;
  const secret = process.env.COMGATE_SECRET;
  if (!merchantId || !secret) {
    throw new AppError(...);
  }
  return { merchantId, secret };
}
```

**No code changes needed** - just set Railway environment variables:
- `COMGATE_MERCHANT_ID=12345`
- `COMGATE_SECRET=<secret from portal.comgate.cz>`
- `COMGATE_API_URL=https://payments.comgate.cz` (production) or test URL

**Test mode handling:**
```typescript
requestParams.set('test', process.env.NODE_ENV !== 'production' ? 'true' : 'false');
```

Already toggles based on NODE_ENV - no changes needed.

#### D.3. Webhook Signature Verification

**Current implementation (already secure):**

```typescript
export function verifyComgateSignature(rawBody: string, signature: string): boolean {
  const { secret } = getComgateCredentials();
  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}
```

**Security features:**
- ✅ HMAC-SHA256 hashing
- ✅ Constant-time comparison (prevents timing attacks)
- ✅ Raw body verification (before parsing)
- ✅ Length validation before comparison

**Testing webhook signature:**

```typescript
// apps/web/__tests__/api/webhooks/comgate.test.ts
import crypto from 'crypto';
import { POST } from '@/app/api/v1/webhooks/comgate/route';

describe('Comgate Webhook', () => {
  const mockSecret = 'test_secret_key';

  beforeAll(() => {
    process.env.COMGATE_SECRET = mockSecret;
    process.env.COMGATE_MERCHANT_ID = '12345';
  });

  it('should reject webhook with invalid signature', async () => {
    const body = 'transId=123&status=PAID';
    const req = new Request('http://localhost/api/v1/webhooks/comgate', {
      method: 'POST',
      headers: { 'x-signature': 'invalid_signature' },
      body,
    });

    const response = await POST(req as any);
    expect(response.status).toBe(401);
  });

  it('should accept webhook with valid signature', async () => {
    const body = 'transId=123&status=PAID';
    const validSignature = crypto
      .createHmac('sha256', mockSecret)
      .update(body)
      .digest('hex');

    const req = new Request('http://localhost/api/v1/webhooks/comgate', {
      method: 'POST',
      headers: { 'x-signature': validSignature },
      body,
    });

    // Mock database calls
    // ... test logic
  });
});
```

**Note:** Verify actual signature header name from Comgate docs (currently assumes `x-signature` or `signature`).

#### D.4. Comgate Testing Strategy

**Test environment configuration:**

1. **Development:**
   - No credentials → lazy validation (error only when function called)
   - Mock payment flow in tests

2. **Staging:**
   - Use Comgate test merchant ID
   - `test=true` parameter automatically set (NODE_ENV !== 'production')
   - Real API calls, no actual money transfer
   - Test cards from Comgate docs

3. **Production:**
   - Production merchant ID
   - `test=false` parameter
   - Real transactions

**Webhook testing without Comgate:**

Use webhook testing tools:
- Hookdeck (webhook development platform)
- ngrok + manual POST with signature
- Unit tests with mocked requests (as shown above)

**Source: Medium confidence** - Based on general payment gateway testing patterns and Comgate GitHub SDK examples.

#### D.5. Payment Saga Architecture (EXISTING)

**Current implementation:**

```
Webhook → verifySignature → updatePaymentStatus → publishEvent → SAGA handlers
```

**SAGA handlers (synchronous in MVP):**
- `handlePaymentCompleted` - Confirm booking, award loyalty points, send email
- `handlePaymentFailed` - Cancel booking, release slot, send notification

**Future enhancement (not in v1.1):**
- RabbitMQ consumer for async SAGA execution
- Retry logic for transient failures
- Dead letter queue for permanent failures

---

## New Components Required

### 1. Test Infrastructure (NEW)

**Files to create:**

```
vitest.workspace.ts                    # Monorepo test workspace
apps/web/vitest.config.ts             # Web app test config
apps/web/__tests__/setup.ts           # Test setup (DB, mocks)
services/notification-worker/vitest.config.ts
packages/database/__tests__/migrations.test.ts
```

**Dependencies to add:**

```json
// Root package.json (devDependencies)
{
  "vitest": "^2.0.0",
  "@vitest/ui": "^2.0.0",
  "@testing-library/react": "^16.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "testcontainers": "^10.0.0",
  "next-test-api-route-handler": "^4.0.0"
}
```

**Scripts to add:**

```json
// Root package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### 2. CI/CD Integration (MODIFIED)

**File to modify:** `.github/workflows/ci.yml` (or create new)

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm db:deploy # Run migrations on test DB
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm type-check
```

### 3. Environment Variable Documentation (NEW)

**File to create:** `.env.example`

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/schedulebox
REDIS_URL=redis://localhost:6379

# SMTP Email (Production)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx
SMTP_FROM=noreply@schedulebox.cz

# Twilio SMS (Production)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+420123456789

# Comgate Payments (Production)
COMGATE_MERCHANT_ID=12345
COMGATE_SECRET=your_secret_key
COMGATE_API_URL=https://payments.comgate.cz

# Testing (Development/CI)
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/schedulebox_test
NODE_ENV=development
```

---

## Data Flow Changes

### Before (v1.0 - Mock Services)

```
Email: API → BullMQ → email-sender → Mock message ID → Log
SMS:   API → BullMQ → sms-sender → Mock SID → Log
Payment: API → Comgate client → throws error (no credentials)
```

### After (v1.1 - Production Services)

```
Email: API → BullMQ → email-sender → SMTP → SendGrid → Delivered
SMS:   API → BullMQ → sms-sender → Twilio API → Delivered
Payment: API → Comgate API → User pays → Webhook → SAGA → Complete
```

**Configuration switches behavior** - no code changes in existing files.

---

## Build Order & Dependencies

### Phase 1: Foundation (Week 1)

**No dependencies**

1. **Setup test infrastructure**
   - Create `vitest.workspace.ts`
   - Add Vitest configs for apps/web, services/notification-worker
   - Install testing dependencies
   - Create test setup files

2. **Add environment variable documentation**
   - Create `.env.example`
   - Document all required vars
   - Add Railway deployment guide

### Phase 2: Testing (Week 1-2)

**Depends on: Phase 1 complete**

3. **Write unit tests**
   - Test email-sender.ts (with Ethereal mock)
   - Test sms-sender.ts (with Twilio test credentials)
   - Test Comgate client (with mocked fetch)
   - Test signature verification

4. **Write integration tests**
   - Test webhook endpoint (with valid/invalid signatures)
   - Test payment SAGA handlers
   - Test BullMQ workers (with Testcontainers Redis)

5. **Setup CI pipeline**
   - Add GitHub Actions workflow
   - Run tests on every push
   - Run migrations before tests
   - Generate coverage reports

### Phase 3: Service Configuration (Week 2)

**Depends on: Tests passing**

6. **Configure SMTP on Railway**
   - Add staging environment with Ethereal
   - Add production environment with SendGrid/Mailgun
   - Test email delivery end-to-end

7. **Configure Twilio on Railway**
   - Purchase Twilio phone number
   - Add credentials to Railway
   - Test SMS delivery to real numbers

8. **Configure Comgate on Railway**
   - Register merchant account at portal.comgate.cz
   - Add test credentials to staging
   - Add production credentials to production
   - Configure webhook URL: `https://app.schedulebox.cz/api/v1/webhooks/comgate`
   - Whitelist Railway IP addresses at Comgate portal

### Phase 4: Validation (Week 2-3)

**Depends on: Phase 3 complete**

9. **End-to-end testing**
   - Create booking requiring payment
   - Complete Comgate payment flow
   - Verify webhook signature in logs
   - Verify booking confirmation email/SMS

10. **Monitoring setup**
    - Add Sentry for error tracking (if not already)
    - Monitor webhook delivery success rate
    - Monitor email/SMS delivery rates
    - Set up alerts for failed payments

---

## Testing Strategy by Component

### A. Email Sender Testing

| Test Type | Approach | Tools |
|-----------|----------|-------|
| Unit | Mock nodemailer transport | nodemailer-mock |
| Integration | Real SMTP with Ethereal | Testcontainers + Ethereal |
| E2E | Send to test email, verify receipt | Manual + Ethereal inbox |
| Production | Monitor SendGrid dashboard | SendGrid analytics |

### B. SMS Sender Testing

| Test Type | Approach | Tools |
|-----------|----------|-------|
| Unit | Mock Twilio client | jest.mock('twilio') |
| Integration | Twilio test credentials + magic numbers | Twilio test API |
| E2E | Send to real test number | Manual verification |
| Production | Monitor Twilio console | Twilio logs |

### C. Comgate Integration Testing

| Test Type | Approach | Tools |
|-----------|----------|-------|
| Unit | Mock fetch, test signature verification | Vitest + crypto |
| Integration | Comgate test merchant + test mode | Comgate test environment |
| Webhook | Simulate webhook with valid/invalid signatures | Hookdeck or manual curl |
| E2E | Complete payment with test card | Comgate test portal |
| Production | Monitor via Comgate portal + logs | Comgate dashboard |

### D. Database Migration Testing

| Test Type | Approach | Tools |
|-----------|----------|-------|
| Unit | Test individual migration SQL | Vitest + pg |
| Integration | Apply migrations to clean DB | Testcontainers Postgres |
| Idempotency | Run migrations twice, verify no errors | Drizzle migrate |
| Rollback | Test down migrations (if created) | Manual testing |

---

## Railway Deployment Architecture

### Environment Structure

```
Railway Project: ScheduleBox
├── Development
│   ├── web (apps/web)
│   ├── notification-worker (services/notification-worker)
│   ├── postgres (Railway template)
│   ├── redis (Railway template)
│   └── rabbitmq (Railway template)
│
├── Staging
│   ├── web (branch: staging)
│   ├── notification-worker
│   ├── postgres
│   ├── redis
│   ├── rabbitmq
│   └── Environment Variables:
│       ├── SMTP: Ethereal (test email catcher)
│       ├── Twilio: Test credentials
│       └── Comgate: Test merchant ID
│
└── Production
    ├── web (branch: main)
    ├── notification-worker
    ├── postgres (production instance)
    ├── redis
    ├── rabbitmq
    └── Environment Variables:
        ├── SMTP: SendGrid production
        ├── Twilio: Production credentials
        └── Comgate: Production merchant ID
```

### Variable Inheritance Pattern

Railway supports environment-specific variables. Use this pattern:

**Shared variables (all environments):**
- `NEXT_PUBLIC_APP_URL` → Env-specific
- `DATABASE_URL` → Railway provides
- `REDIS_URL` → Railway provides
- `RABBITMQ_URL` → Railway provides

**Environment-specific:**
- Development: No SMTP/Twilio/Comgate → fallback to mocks
- Staging: Test credentials
- Production: Production credentials

**Sealed variables (production only):**
- `SMTP_PASS` → Sealed
- `TWILIO_AUTH_TOKEN` → Sealed
- `COMGATE_SECRET` → Sealed

---

## Security Considerations

### 1. Webhook Signature Verification

**Current implementation is secure:**
- ✅ HMAC-SHA256 with secret key
- ✅ Timing-safe comparison
- ✅ Raw body verification (before parsing)

**No changes needed.**

### 2. Environment Variable Security

**Best practices:**
- ✅ Use Railway sealed variables for secrets
- ✅ Never commit `.env` files
- ✅ Use `.env.example` for documentation only
- ✅ Rotate secrets periodically (quarterly)

### 3. SMTP Authentication

**Recommendation:** Use API keys, not passwords
- SendGrid: API key authentication
- Mailgun: API key authentication
- AWS SES: IAM credentials

**Current nodemailer config supports both** - no changes needed.

### 4. Twilio Account Security

**Recommendations:**
- Enable two-factor authentication on Twilio account
- Use API keys (not master credentials) if available
- Restrict allowed IPs in Twilio console
- Monitor usage for anomalies

---

## Performance Considerations

### 1. Email Connection Pooling

**Already optimized:**
```typescript
transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});
```

No changes needed.

### 2. SMS Segment Optimization

**Already implemented:**
```typescript
const segments = estimateSMSSegments(options.body);
console.log(`Sending SMS (${segments} segment${segments > 1 ? 's' : ''})`);
```

**Recommendation:** Add monitoring metric for cost tracking.

### 3. Comgate API Timeout

**Already configured:**
```typescript
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000)
```

**Webhook response time requirement:** Comgate expects response within 5 seconds.

**Current implementation returns 200 immediately after processing** - compliant.

### 4. Database Connection Pooling

**Already managed by Drizzle + PostgreSQL driver** - no changes needed.

---

## Monitoring & Observability

### 1. Metrics to Track (NEW)

Add to existing metrics collection:

```typescript
// Email metrics
email_sent_total{status="success|failed", provider="sendgrid"}
email_delivery_duration_seconds

// SMS metrics
sms_sent_total{status="success|failed"}
sms_segments_sent_total
sms_delivery_duration_seconds

// Payment metrics
payment_created_total{gateway="comgate"}
payment_completed_total{gateway="comgate"}
payment_failed_total{gateway="comgate", reason}
webhook_received_total{gateway="comgate", status="valid|invalid_signature"}
webhook_processing_duration_seconds
```

### 2. Logging Requirements (MODIFIED)

Enhance structured logging for new services:

```typescript
// Email logging
console.log('[Email Sender] Sent email', {
  to: options.to,
  messageId: info.messageId,
  provider: 'sendgrid',
  duration_ms: Date.now() - startTime,
});

// SMS logging (already exists, enhance with cost)
console.log('[SMS Sender] Sent SMS', {
  to: options.to,
  sid: message.sid,
  segments: segments,
  estimated_cost: segments * 0.05, // Example pricing
});

// Webhook logging (already exists, add more detail)
console.log('[Comgate Webhook] Processed', {
  transId: transId,
  status: status,
  signature_valid: true,
  processing_time_ms: Date.now() - startTime,
});
```

### 3. Alerting Rules (NEW)

Add to existing alerting setup:

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Webhook signature failures | > 5 in 10 min | High | Check Comgate secret, investigate logs |
| Email delivery failures | > 10% in 1 hour | High | Check SMTP status, verify credentials |
| SMS delivery failures | > 10% in 1 hour | High | Check Twilio status, verify credits |
| Payment webhook timeout | Processing > 4s | Medium | Optimize SAGA handlers |

---

## Migration Checklist

### Pre-deployment

- [ ] All tests passing in CI
- [ ] `.env.example` documented
- [ ] Railway environments created (staging, production)
- [ ] SMTP credentials obtained (SendGrid/Mailgun)
- [ ] Twilio account created, phone number purchased
- [ ] Comgate merchant account registered
- [ ] Webhook URL configured in Comgate portal
- [ ] IP whitelist updated in Comgate portal

### Staging Deployment

- [ ] Set staging environment variables
- [ ] Deploy to staging
- [ ] Test email delivery (send test booking confirmation)
- [ ] Test SMS delivery (send test reminder)
- [ ] Test Comgate payment flow (with test card)
- [ ] Verify webhook signature validation in logs
- [ ] Monitor logs for errors

### Production Deployment

- [ ] Set production environment variables (sealed)
- [ ] Deploy to production
- [ ] Monitor error rates for 24 hours
- [ ] Test one real booking with payment
- [ ] Verify email/SMS delivery to real customer
- [ ] Set up alerts (Sentry, Slack)
- [ ] Document rollback procedure

---

## Rollback Strategy

### If email delivery fails:

1. **Check:** SMTP credentials valid? SendGrid account active?
2. **Rollback:** Set `SMTP_HOST=` (empty) to fall back to mock mode
3. **Impact:** Emails logged but not sent (customer doesn't receive notifications)
4. **Fix:** Resolve SMTP issue, re-deploy with credentials

### If SMS delivery fails:

1. **Check:** Twilio account active? Credits available?
2. **Rollback:** Set `TWILIO_ACCOUNT_SID=` (empty) to fall back to mock mode
3. **Impact:** SMS logged but not sent (customer doesn't receive reminders)
4. **Fix:** Resolve Twilio issue, re-deploy with credentials

### If Comgate payments fail:

1. **Check:** Merchant ID valid? Secret correct? Webhook URL reachable?
2. **Rollback:** Not possible - requires manual payment processing
3. **Impact:** Customers cannot pay online (must pay in person)
4. **Fix:** Urgent - resolve Comgate issue ASAP

**Critical:** Payment failures require immediate attention. Comgate cannot be "disabled" without breaking booking flow.

---

## Open Questions & Future Enhancements

### Questions for validation:

1. **Comgate webhook signature header:** Verify actual header name (`x-signature` vs `signature`) from official docs
2. **Comgate IP whitelist:** Obtain Railway outbound IP addresses for Comgate portal configuration
3. **Twilio number purchase:** Which country code? (+420 Czech or +421 Slovak?)
4. **SMTP provider choice:** SendGrid vs Mailgun vs AWS SES? (Cost/features comparison)

### Future enhancements (not in v1.1):

1. **Email template testing:** Visual regression testing with Percy or similar
2. **SMS delivery receipts:** Implement Twilio status callbacks
3. **Payment retry logic:** Retry failed payments before cancellation
4. **Multi-currency support:** Extend Comgate integration for EUR
5. **Email bounce handling:** Implement webhook for SendGrid bounce events
6. **A/B testing notifications:** Test different email/SMS templates for conversion

---

## Sources & References

### High Confidence

- [Next.js Vitest Testing Guide](https://nextjs.org/docs/app/guides/testing/vitest) - Official Next.js 15 testing documentation
- [Nodemailer Testing Documentation](https://nodemailer.com/smtp/testing) - Official SMTP testing guide with Ethereal
- [Twilio Test Credentials](https://www.twilio.com/docs/iam/test-credentials) - Official Twilio testing documentation
- [Railway Environment Variables](https://docs.railway.com/variables) - Official Railway configuration guide
- [BullMQ Integration Testing](https://oneuptime.com/blog/post/2026-01-21-bullmq-integration-testing/view) - Integration testing patterns (Jan 2026)

### Medium Confidence

- [Vitest vs Jest for Next.js](https://www.wisp.blog/blog/vitest-vs-jest-which-should-i-use-for-my-nextjs-app) - Performance comparison
- [Drizzle Migration Patterns](https://medium.com/@bhagyarana80/8-drizzle-orm-patterns-for-clean-fast-migrations-456c4c35b9d8) - Production-safe migration strategies
- [Next.js Route Handler Testing](https://github.com/Xunnamius/next-test-api-route-handler) - Testing library for API routes

### Low Confidence (verify before using)

- Comgate webhook signature header name (assumed `x-signature`) - Verify with official Comgate docs
- Comgate IP whitelist requirement - Confirm with Comgate support
