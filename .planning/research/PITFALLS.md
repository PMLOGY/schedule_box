# Domain Pitfalls: Production Hardening

**Domain:** Adding test coverage, SMTP email, Twilio SMS, and Comgate payments to existing SaaS
**Project:** ScheduleBox (62k LOC, 49 DB tables, ~94 API endpoints, 0% test coverage)
**Researched:** 2026-02-15

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or major production incidents.

### Pitfall 1: Test Data Leaking Into Production Database

**What goes wrong:** Tests connect to production database instead of test database. Test data pollutes real customer data, or worse, tests delete production data during cleanup.

**Why it happens:** DATABASE_URL environment variable not properly isolated between test and production environments. Railway.com automatically injects production DATABASE_URL, and tests inherit it if not overridden.

**Consequences:**
- Customer data deleted during test cleanup
- Test bookings appear in production calendar
- Financial records corrupted
- GDPR violation (test data mixed with real PII)
- Production database locked during parallel test execution

**Prevention:**
```typescript
// WRONG: Tests use process.env.DATABASE_URL directly
const db = drizzle(process.env.DATABASE_URL);

// RIGHT: Force separate test database
const TEST_DB_URL = process.env.NODE_ENV === 'test'
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

if (!TEST_DB_URL) {
  throw new Error('TEST_DATABASE_URL required for tests');
}
```

**Railway.com specific:**
- Create separate Railway service for test database (don't share production DB)
- Use `railway run --environment test npm test` to inject test env vars
- Add pre-test script that validates DATABASE_URL is not production URL

**Detection:**
- Pre-commit hook: Scan test files for `process.env.DATABASE_URL` usage
- Test setup: Assert `DATABASE_URL.includes('test')` before running
- CI pipeline: Fail if production credentials detected in test logs

**Sources:**
- [How to Fix Test Data Management Issues](https://oneuptime.com/blog/post/2026-01-24-fix-test-data-management-issues/view) (MEDIUM confidence)
- [Node.js Testing - Database](https://zagonel.dev/posts/nodejs-testing-database/) (MEDIUM confidence)

---

### Pitfall 2: Email Credentials Exposed in Repository

**What goes wrong:** SMTP credentials committed to Git in `.env.local`, test files, or config examples. Credentials scraped by bots within hours and used for spam.

**Why it happens:** Developers test email locally, hardcode credentials "temporarily," forget to remove before commit. Or `.env.example` contains real credentials instead of placeholders.

**Consequences:**
- Email account compromised and used for phishing
- Domain blacklisted by Gmail/Yahoo/Microsoft
- SMTP provider account suspended
- SendGrid/Mailgun bill skyrockets (thousands in unauthorized sends)
- Domain reputation destroyed, legitimate emails land in spam forever

**Prevention:**

1. **Never use production SMTP in development:**
```typescript
// WRONG: Production SMTP credentials in code
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  auth: { user: 'apikey', pass: 'SG.real_api_key_here' }
});

// RIGHT: Use Mailtrap for local development
const isProd = process.env.NODE_ENV === 'production';
const transporter = nodemailer.createTransport(
  isProd
    ? {
        host: process.env.SMTP_HOST,
        port: 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      }
    : {
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS
        }
      }
);
```

2. **Railway.com: Use sealed variables for SMTP credentials**
- Mark `SMTP_PASS` as sealed (never visible in UI/API)
- Use shared variables for non-secret SMTP config (host, port)
- Restrict production environment access to admins only

3. **Testing: Mock email sending entirely**
```typescript
// services/notification-worker/src/jobs/email.job.ts
import { sendEmail } from '../lib/email';

jest.mock('../lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-id' })
}));

test('sends booking confirmation email', async () => {
  await handleBookingConfirmed(mockEvent);
  expect(sendEmail).toHaveBeenCalledWith({
    to: 'customer@example.com',
    template: 'booking_confirmation'
  });
});
```

**Detection:**
- Pre-commit hook: Block commits containing `smtp.`, `apikey`, `SG.`, email passwords
- Git guardian: Scan repository for leaked credentials
- `.gitignore`: Ensure `.env`, `.env.local`, `.env.production.local` are excluded

**Sources:**
- [Remediating SMTP Credential leaks | GitGuardian](https://www.gitguardian.com/remediation/smtp-credential) (HIGH confidence)
- [SMTP Security: Best Practices and Top Issues | Mailtrap](https://mailtrap.io/blog/smtp-security/) (HIGH confidence)

---

### Pitfall 3: SPF/DKIM/DMARC Not Configured Before Sending

**What goes wrong:** Send production emails before setting up email authentication (SPF, DKIM, DMARC). All emails land in spam or get rejected. Domain reputation tanks immediately.

**Why it happens:** Developers focus on code integration, skip DNS configuration. Or DNS changes made after first production send, but damage already done.

**Consequences:**
- 80%+ of emails land in spam folder
- Gmail/Yahoo/Outlook reject emails outright
- Domain flagged as spammer in first 24 hours
- Recovery takes 4-8 weeks of careful warm-up
- Customers never receive booking confirmations, password resets fail
- Support tickets flood in

**Prevention:**

**Timeline MUST be:**
1. Buy domain → 2. Configure DNS (SPF, DKIM, DMARC) → 3. Verify with mail-tester.com → 4. Start warm-up → 5. Send production emails

**SPF Record (TXT):**
```
v=spf1 include:_spf.sendgrid.net ~all
```
Common mistake: Exceeding 10 DNS lookup limit. If using multiple providers:
```
v=spf1 include:_spf.sendgrid.net include:_spf.railway.app ~all
```
Count includes: each counts as 1 lookup. Above = 2 lookups.

**DKIM:**
- Use 2048-bit keys (not 1024-bit, deprecated)
- Rotate keys every 6-12 months
- SendGrid auto-generates: add 3 CNAME records to DNS

**DMARC (TXT at _dmarc.yourdomain.com):**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100; adkim=s; aspf=s
```
- `p=quarantine`: Suspicious emails go to spam (not rejected)
- `p=reject`: Recommended after 2 weeks of monitoring
- `rua=`: Receive daily reports of authentication failures

**Verification before production:**
```bash
# Send test email to mail-tester.com
curl -X POST https://schedulebox.railway.app/api/v1/internal/test-email \
  -d '{"to": "test-ABC123@mail-tester.com"}'

# Check score (must be 10/10 before production)
```

**Detection:**
- CI pipeline: Query DNS for SPF/DKIM/DMARC records, fail if missing
- Production pre-flight: Send test email to mail-tester.com, assert score >= 9/10
- Monitoring: Alert if DMARC reports show >5% authentication failures

**Sources:**
- [SPF, DKIM, DMARC: Common Setup Mistakes](https://www.infraforge.ai/blog/spf-dkim-dmarc-common-setup-mistakes) (HIGH confidence)
- [Email Deliverability in 2026: SPF, DKIM, DMARC Checklist](https://www.egenconsulting.com/blog/email-deliverability-2026.html) (HIGH confidence)
- [How to Set Up Your SPF, DKIM, and DMARC Records in 2026](https://www.trulyinbox.com/blog/how-to-set-up-spf-dkim-and-dmarc/) (MEDIUM confidence)

---

### Pitfall 4: Sending Too Many Emails Too Fast (No Warm-Up)

**What goes wrong:** Launch production, immediately send 500 booking confirmations in first hour. Email provider throttles/blocks domain. All future emails rejected.

**Why it happens:** Developers don't know about email warm-up. Assume production can handle same volume as development/Mailtrap.

**Consequences:**
- Gmail/Yahoo/Outlook flag domain as spammer after 50-100 rapid sends
- Domain reputation drops to 0 in first day
- SendGrid/Mailgun suspend account for TOS violation
- Recovery requires 2-4 weeks of gradual warm-up
- Business launch delayed

**Prevention:**

**Safe sending limits by domain age:**
| Domain Age | Day 1-7 | Day 8-14 | Day 15-21 | Day 22-28 | Steady State |
|---|---|---|---|---|---|
| New domain | 20-30/day | 50/day | 100/day | 200/day | 500/day max |
| Existing (unused for email) | 20-30/day | 50/day | 100/day | 200/day | 500/day max |
| Warmed domain | 100/day | 200/day | 500/day | 1000/day | 2000/day max |

**Critical rules:**
- Never jump from 10 to 100 emails overnight
- Maintain consistent sending (don't go silent for weeks, then burst)
- Use warmup service (Mailreach, Warmbox) to generate positive engagement

**ScheduleBox specific:**
```typescript
// services/notification-worker/src/lib/rate-limiter.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkEmailRateLimit(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = `email:daily:${today}`;

  const count = await redis.incr(key);
  await redis.expire(key, 86400); // 24h expiry

  // Progressive limits based on domain age
  const domainCreatedAt = new Date('2026-02-01'); // Set your domain purchase date
  const daysOld = Math.floor((Date.now() - domainCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

  const limit = daysOld < 7 ? 30 :
                daysOld < 14 ? 50 :
                daysOld < 21 ? 100 :
                daysOld < 28 ? 200 : 500;

  if (count > limit) {
    console.warn(`Email rate limit exceeded: ${count}/${limit} for ${today}`);
    return false;
  }

  return true;
}
```

**Detection:**
- Real-time monitoring: Alert if >100 emails sent in 1 hour during warm-up period
- Daily report: Email count per day, compare to warm-up schedule
- DMARC reports: Monitor for sudden spike in volume warnings

**Sources:**
- [Warm Up Your Email Domain the Right Way in 2026](https://www.mailreach.co/blog/how-to-warm-up-email-domain) (HIGH confidence)
- [7 Email Warmup Mistakes Killing Your Deliverability](https://warmysender.com/blog/posts/email-warmup-mistakes-killing-deliverability-2026) (HIGH confidence)
- [Cold Email Sending Limits: The 2025 Playbook](https://www.topo.io/blog/safe-sending-limits-cold-email) (HIGH confidence)

---

### Pitfall 5: Twilio Webhook Signature Verification Disabled or Wrong

**What goes wrong:** Skip webhook signature verification "to make it work faster." Attacker sends fake SMS delivery webhooks, drains Twilio account, or triggers malicious actions.

**Why it happens:** Signature verification fails due to SSL termination, empty parameters, or array parameters. Developer disables verification to fix local testing, forgets to re-enable.

**Consequences:**
- Attacker spoofs "SMS delivered" webhook → app marks booking as confirmed without real SMS
- Attacker floods webhook endpoint → DDoS your API
- Financial fraud: Fake "payment confirmed" SMS webhook triggers booking confirmation
- Account takeover: Fake "verification code" webhook bypasses 2FA

**Prevention:**

**1. Always validate signatures (NEVER skip in production):**
```typescript
// apps/web/app/api/webhooks/twilio/sms/route.ts
import { validateRequest } from 'twilio';

export async function POST(req: Request) {
  const twilioSignature = req.headers.get('x-twilio-signature');
  const url = process.env.TWILIO_WEBHOOK_URL; // Must match registered URL exactly
  const params = await req.formData();

  const isValid = validateRequest(
    process.env.TWILIO_AUTH_TOKEN, // Use Primary AuthToken, not secondary
    twilioSignature,
    url,
    Object.fromEntries(params)
  );

  if (!isValid) {
    console.error('Invalid Twilio signature');
    return new Response('Forbidden', { status: 403 });
  }

  // Process webhook...
}
```

**2. Common signature validation pitfalls:**

**Empty parameters excluded:**
Python's `parse_qs()` and JavaScript's `URLSearchParams` ignore empty values by default, but Twilio includes them in signature. Use Twilio SDK (handles this correctly).

**Array parameters break validation:**
Twilio group messaging includes `MessagingBinding.Address` as array. Sorting logic must account for array values. Use Twilio SDK.

**SSL termination changes URL:**
If Railway.com terminates SSL, webhook URL must be `https://` even though internal request is `http://`. Reconstruct original URL:
```typescript
const protocol = req.headers.get('x-forwarded-proto') || 'https';
const host = req.headers.get('host');
const path = new URL(req.url).pathname;
const url = `${protocol}://${host}${path}`;
```

**Wrong auth token:**
Use Primary AuthToken (not secondary). Secondary tokens are for key rotation only.

**3. Testing signature verification:**

**Local development:**
```bash
# Use Twilio CLI to forward webhooks with real signatures
twilio phone-numbers:update +420123456789 \
  --sms-url="http://localhost:3000/api/webhooks/twilio/sms"
```

**Staging:**
Register staging webhook URL in Twilio console with real signature validation enabled.

**Detection:**
- Unit test: Mock Twilio signature validation, assert it's called
- Integration test: Send test webhook with invalid signature, assert 403 response
- Production monitoring: Alert if >1% of webhooks fail signature validation

**Sources:**
- [Webhooks security | Twilio](https://www.twilio.com/docs/usage/webhooks/webhooks-security) (HIGH confidence - official docs)
- [Guide to Twilio Webhooks: Features and Best Practices](https://hookdeck.com/webhooks/platforms/twilio-webhooks-features-and-best-practices-guide) (MEDIUM confidence)
- [Twilio webhook signature validation false negative with arrays](https://github.com/twilio/twilio-node/issues/722) (MEDIUM confidence)

---

### Pitfall 6: Comgate Sandbox vs Production Webhook URL Mismatch

**What goes wrong:** Configure webhook URLs in Comgate sandbox, switch to production, forget to update webhook URLs. Production payments succeed but app never receives confirmation webhooks. Orders stuck in "pending" forever.

**Why it happens:** Comgate requires separate merchant accounts for sandbox and production, each with own webhook configuration. Developers configure sandbox URLs, assume production inherits them.

**Consequences:**
- Customer pays via Comgate, money received, but booking stays "pending"
- No booking confirmation email sent
- Customer support flood: "I paid but no confirmation"
- Manual reconciliation required for every payment
- Revenue loss (customer doesn't come, money refunded)

**Prevention:**

**1. Separate webhook URLs per environment:**
```
Sandbox: https://schedulebox-staging.railway.app/api/webhooks/comgate
Production: https://schedulebox.cz/api/webhooks/comgate
```

**2. Comgate-specific configuration checklist:**

**Before production:**
- [ ] Register production merchant account (separate from sandbox)
- [ ] Configure production webhook URLs (PAID, CANCELLED, PENDING, STATUS)
- [ ] Whitelist Railway.com production IP addresses in Comgate portal
- [ ] Change API URLs from `https://payments.comgate.cz/v1.0/` (sandbox) to production URL
- [ ] Update `COMGATE_MERCHANT_ID` and `COMGATE_SECRET` to production values
- [ ] Test payment in production with €0.01 test transaction
- [ ] Verify webhook received within 5 seconds of payment

**3. IP address whitelisting (Comgate-specific pitfall):**

Comgate rejects webhooks from unauthorized IPs. Railway.com uses dynamic IPs, but static egress IPs available:

```bash
# Get Railway production service egress IPs
railway run --environment production env | grep RAILWAY_STATIC_IP
```

Add these IPs to Comgate portal → Settings → Permitted IP addresses.

**Common mistake:** Forgetting to add webhook endpoint IP. Comgate payment succeeds but webhook silently fails (no error logs).

**4. Webhook validation:**
```typescript
// apps/web/app/api/webhooks/comgate/route.ts
import { createHmac } from 'crypto';

export async function POST(req: Request) {
  const params = await req.formData();
  const receivedSignature = params.get('signature');

  // Comgate signature: HMAC-SHA256 of payment params
  const message = [
    params.get('transId'),
    params.get('price'),
    params.get('curr'),
    params.get('refId')
  ].join('');

  const expectedSignature = createHmac('sha256', process.env.COMGATE_SECRET)
    .update(message)
    .digest('hex');

  if (receivedSignature !== expectedSignature) {
    console.error('Invalid Comgate signature');
    return new Response('Forbidden', { status: 403 });
  }

  // Process payment...
}
```

**Detection:**
- Pre-production checklist: Verify webhook URLs match environment
- Production monitoring: Alert if no webhooks received for >10 minutes after payment initiated
- Daily reconciliation: Compare Comgate payment reports with app payment records

**Sources:**
- [Common Payment Gateway Integration Mistakes to Avoid](https://www.enkash.com/resources/blog/common-payment-gateway-integration-mistakes-to-avoid) (MEDIUM confidence)
- [Comgate payment gateway pitfalls](https://docs.kvik.shop/help/comgate-payment-gateway) (LOW confidence - user docs, not official)

---

### Pitfall 7: Test Database Not Isolated for Parallel Tests

**What goes wrong:** Multiple Jest workers run tests in parallel, all sharing same test database. Tests race, random failures, data corruption. "Works locally, fails in CI."

**Why it happens:** PostgreSQL allows single database, multiple connections. Tests don't isolate schemas or use transactions. Jest runs tests in parallel by default.

**Consequences:**
- Flaky tests: Pass locally (1 worker), fail in CI (4+ workers)
- Data races: Test A creates booking, Test B deletes same booking
- Constraint violations: Two tests insert same email simultaneously
- Test pollution: Test A's data affects Test B's assertions
- CI unreliable, developers ignore test failures

**Prevention:**

**Strategy 1: Separate schema per Jest worker (recommended)**
```typescript
// tests/setup.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const workerId = process.env.JEST_WORKER_ID || '1';
const schema = `test_worker_${workerId}`;

// Each Jest worker gets own schema
const sql = postgres(process.env.TEST_DATABASE_URL!, {
  search_path: schema
});

export const db = drizzle(sql);

// Setup: Create schema and run migrations
beforeAll(async () => {
  await sql`CREATE SCHEMA IF NOT EXISTS ${sql(schema)}`;
  await sql`SET search_path TO ${sql(schema)}`;
  // Run migrations on this schema
  await migrate(db, { migrationsFolder: 'packages/database/migrations' });
});

// Cleanup: Drop schema after all tests
afterAll(async () => {
  await sql`DROP SCHEMA ${sql(schema)} CASCADE`;
  await sql.end();
});
```

**Strategy 2: Transactions with rollback (simpler, but slower)**
```typescript
// tests/setup.ts
beforeEach(async () => {
  await db.execute(sql`BEGIN`);
});

afterEach(async () => {
  await db.execute(sql`ROLLBACK`);
});
```

**Strategy 3: Separate database per worker (IntegreSQL)**
Uses template databases and pooling. Best for large test suites.

**Jest configuration:**
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  maxWorkers: 4, // Limit parallel workers to avoid DB connection exhaustion
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

**Detection:**
- Run tests with `--runInBand` (sequential). If failures disappear, isolation issue.
- CI: Run tests 5 times. If different tests fail each run, race condition.
- Monitoring: Log SQL queries with worker ID, check for conflicts.

**Sources:**
- [How to Run Jest Integration Tests in Parallel Using Isolated SQL Schemas](https://medium.com/@sebastinchikn/how-to-run-jest-integration-tests-in-parallel-using-isolated-sql-schemas-f4c5e534030a) (HIGH confidence)
- [Postgres Testing with Node.js](https://www.atdatabases.org/docs/pg-test) (MEDIUM confidence)
- [IntegreSQL - manages isolated PostgreSQL databases for integration tests](https://github.com/allaboutapps/integresql) (MEDIUM confidence)

---

## Moderate Pitfalls

Cause production issues, but recoverable with manual intervention.

### Pitfall 8: Drizzle Migrations Have No Rollback

**What goes wrong:** Migration fails halfway (syntax error, constraint violation). Database left in inconsistent state. No automatic rollback, must manually fix.

**Why it happens:** Drizzle ORM doesn't support "down" migrations. Can't `drizzle-kit migrate:rollback`. Once applied, migration is permanent unless manually reverted.

**Consequences:**
- Failed migration blocks all future migrations
- Production database schema broken
- Downtime while manually fixing
- Risk of data loss if reverting destructive changes

**Prevention:**

**1. Never edit migrations after applied to any environment:**
Drizzle tracks migrations in `__drizzle_migrations` table. Editing applied migration causes checksum mismatch.

**2. Test migrations in staging before production:**
```bash
# Staging
railway run --environment staging npm run db:migrate

# Verify staging works for 24h
# Then production
railway run --environment production npm run db:migrate
```

**3. Write reversible migrations manually:**
```sql
-- Migration: 0012_add_booking_notes.sql

-- UP
ALTER TABLE bookings ADD COLUMN notes TEXT;

-- To revert (manual):
-- ALTER TABLE bookings DROP COLUMN notes;
```

**4. Backup before migrations:**
```bash
# Railway: Create database snapshot before migration
railway db backup create --environment production

# Or manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

**5. Safeguards for destructive changes:**
```sql
-- WRONG: Drops column immediately
ALTER TABLE users DROP COLUMN old_field;

-- RIGHT: Multi-step migration
-- Step 1 (deploy): Stop writing to old_field
-- Step 2 (wait 1 week): Deploy
-- Step 3: Drop column
ALTER TABLE users DROP COLUMN old_field;
```

**Detection:**
- CI: Dry-run migrations on copy of production data
- Pre-migration checklist: Reviewed by 2 people
- Monitoring: Alert if migration takes >5 minutes (likely stuck)

**Sources:**
- [Drizzle ORM - Migrations](https://orm.drizzle.team/docs/migrations) (HIGH confidence - official docs)
- [Migrations Rollback Discussion](https://github.com/drizzle-team/drizzle-orm/discussions/1339) (MEDIUM confidence)
- [Migration best practices - Mastering Drizzle ORM](https://app.studyraid.com/en/read/11288/352164/migration-best-practices) (LOW confidence)

---

### Pitfall 9: Async/Await Tests Missing Error Handling

**What goes wrong:** Test calls async function but doesn't await. Test passes even though function threw error. False positive test.

**Why it happens:** Forgetting `await`, or using `.then()` without `.catch()`. Jest doesn't fail test if promise rejection unhandled.

**Consequences:**
- Tests pass locally, production breaks
- Regression bugs slip through
- False confidence in test coverage

**Prevention:**

**WRONG:**
```typescript
test('creates booking', () => {
  // Missing await - test passes even if createBooking throws
  createBooking({ customerId: 1, serviceId: 1 });
  expect(true).toBe(true);
});
```

**RIGHT:**
```typescript
test('creates booking', async () => {
  await expect(createBooking({ customerId: 1, serviceId: 1 }))
    .resolves
    .toHaveProperty('id');
});

// Or with try/catch
test('creates booking', async () => {
  try {
    const booking = await createBooking({ customerId: 1, serviceId: 1 });
    expect(booking).toHaveProperty('id');
  } catch (error) {
    fail(`Should not throw: ${error}`);
  }
});
```

**ESLint rule:**
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-floating-promises': 'error', // Require await on promises
    '@typescript-eslint/no-floating-promises': 'error'
  }
};
```

**Detection:**
- ESLint: Flag unawaited promises in test files
- Code review: Check all test functions with async calls use `await`

**Sources:**
- [Mitigate JavaScript Flaky Unit Tests](https://adequatica.medium.com/mitigate-javascript-flaky-unit-tests-67e8e2790e7f) (MEDIUM confidence)
- [How to Manage Flaky Tests in Jest](https://semaphore.io/blog/flaky-tests-jest) (MEDIUM confidence)

---

### Pitfall 10: Mocking External Services in Integration Tests

**What goes wrong:** Mock RabbitMQ, Twilio, Comgate in integration tests. Tests pass, but real integration broken in production.

**Why it happens:** Real services slow, require credentials, hard to reset. Developers mock to speed up tests.

**Consequences:**
- Integration bugs only found in production
- Payment gateway changes API, tests don't catch it
- RabbitMQ message format drift

**Prevention:**

**Use two-tier testing strategy:**

**1. Unit tests: Mock everything**
```typescript
// tests/unit/services/booking.service.test.ts
jest.mock('@/lib/rabbitmq');
jest.mock('@/lib/twilio');

test('creates booking and publishes event', async () => {
  const booking = await createBooking(mockData);
  expect(rabbitmq.publish).toHaveBeenCalledWith('booking.created', expect.anything());
});
```

**2. Integration tests: Use real services (Docker/Testcontainers)**
```typescript
// tests/integration/booking-flow.test.ts
// Start real RabbitMQ in Docker before tests
beforeAll(async () => {
  await exec('docker-compose -f docker-compose.test.yml up -d rabbitmq');
  await waitForRabbitMQ();
});

test('booking flow publishes to real queue', async () => {
  const booking = await createBooking(mockData);

  // Wait for message in real RabbitMQ
  const message = await consumeFromQueue('booking.created');
  expect(message.bookingId).toBe(booking.id);
});
```

**For ScheduleBox:**
- **RabbitMQ:** Use real instance via Docker Compose (fast, local)
- **PostgreSQL:** Use real test database (separate from production)
- **Redis:** Use real instance via Docker Compose
- **Twilio/Comgate:** Mock in integration tests, test manually in staging
- **Email:** Use Mailtrap in integration tests (catches real SMTP, no delivery)

**Detection:**
- Code review: Flag integration tests that mock databases or queues
- Coverage: Require >=1 integration test with real RabbitMQ per event type

**Sources:**
- [Writing Integration Tests for RabbitMQ-Based Components](https://dzone.com/articles/writing-integration-tests-for-rabbitmq-basedcompon) (MEDIUM confidence)
- [Integration testing done right](https://sonalake.com/latest/integration-testing-done-right/) (MEDIUM confidence)

---

### Pitfall 11: Twilio Czech Republic Regulatory Compliance Ignored

**What goes wrong:** Buy any Twilio phone number, send SMS to Czech customers. SMS rejected or flagged as spam. Account suspended for TOS violation.

**Why it happens:** Twilio has country-specific regulations for Czech Republic. Developers skip regulatory guidelines, assume any number works.

**Consequences:**
- SMS delivery rate <50%
- Czech carriers block messages
- Twilio account suspended
- Customer complaints about missing notifications
- Regulatory fine (GDPR + telecom regulations)

**Prevention:**

**1. Use Czech-compliant phone numbers:**
- Buy Czech virtual number (+420) or toll-free number
- Register for A2P (Application-to-Person) messaging
- Complete Twilio regulatory compliance checklist

**2. Opt-in required:**
Czech Republic requires opt-in for marketing SMS. For transactional SMS (booking confirmations), opt-in not required but recommended.

**ScheduleBox implementation:**
```typescript
// packages/database/schema/customers.ts
export const customers = pgTable('customers', {
  // ... other fields
  smsOptIn: boolean('sms_opt_in').default(false).notNull(),
  smsOptInDate: timestamp('sms_opt_in_date', { withTimezone: true }),
  smsOptInSource: text('sms_opt_in_source') // 'registration', 'booking_form', 'profile_settings'
});
```

**3. Sender ID restrictions:**
Czech carriers may reject alphanumeric sender IDs. Use phone number as sender ID.

**4. Content restrictions:**
- Include opt-out instructions: "Reply STOP to unsubscribe"
- Identify sender: "ScheduleBox: Your booking..."
- No URL shorteners (flagged as spam)

**Detection:**
- Pre-production: Test SMS to Czech numbers in Twilio console
- Monitoring: Alert if delivery rate <90% for Czech numbers
- Compliance audit: Review Twilio regulatory guidelines quarterly

**Sources:**
- [Czech Republic: SMS Guidelines | Twilio](https://www.twilio.com/en-us/guidelines/cz/sms) (HIGH confidence - official docs)
- [Twilio Regulatory Guidelines](https://www.twilio.com/en-us/guidelines/regulatory) (HIGH confidence - official docs)

---

### Pitfall 12: Railway Environment Variables Not Separated

**What goes wrong:** Use same environment variables for staging and production. Staging tests trigger production Comgate payments, send production emails to real customers.

**Why it happens:** Railway.com shares variables across environments by default. Developers forget to override per environment.

**Consequences:**
- Staging tests charge real credit cards
- Test emails sent to production customer list
- Production data modified by staging code
- GDPR violation (test environment accesses production data)

**Prevention:**

**Railway.com environment strategy:**
```
1. Create 3 Railway environments:
   - development (local only, not deployed)
   - staging (test with real integrations)
   - production

2. Use shared variables for non-secret config:
   - NODE_ENV
   - LOG_LEVEL

3. Use environment-specific variables for secrets:
   - DATABASE_URL (different per environment)
   - COMGATE_MERCHANT_ID (sandbox vs production)
   - SMTP_HOST (Mailtrap vs SendGrid)
   - TWILIO_AUTH_TOKEN (test vs live)
```

**Example:**
```
# Shared variables (all environments)
NODE_ENV=production
LOG_LEVEL=info

# Staging environment
DATABASE_URL=postgres://staging-db...
COMGATE_MERCHANT_ID=staging_merchant
SMTP_HOST=sandbox.smtp.mailtrap.io
TWILIO_ACCOUNT_SID=AC_test_...

# Production environment
DATABASE_URL=postgres://prod-db...
COMGATE_MERCHANT_ID=prod_merchant_real
SMTP_HOST=smtp.sendgrid.net
TWILIO_ACCOUNT_SID=AC_live_...
```

**Validation:**
```typescript
// apps/web/lib/config.ts
const ENVIRONMENT = process.env.RAILWAY_ENVIRONMENT || 'development';

if (ENVIRONMENT === 'production') {
  // Assert production uses live credentials
  if (process.env.COMGATE_MERCHANT_ID?.includes('test')) {
    throw new Error('Production using test Comgate credentials!');
  }
  if (process.env.SMTP_HOST?.includes('mailtrap')) {
    throw new Error('Production using Mailtrap!');
  }
}
```

**Detection:**
- Pre-deployment checklist: Verify environment variables per environment
- Monitoring: Alert if production uses sandbox APIs

**Sources:**
- [Using Variables | Railway Docs](https://docs.railway.com/variables) (HIGH confidence - official docs)
- [Using Environments | Railway Docs](https://docs.railway.com/guides/environments) (HIGH confidence - official docs)

---

## Minor Pitfalls

Reduce code quality, but don't break production.

### Pitfall 13: Jest Fake Timers Forgot to Restore

**What goes wrong:** Use `jest.useFakeTimers()` in test, forget `jest.useRealTimers()` cleanup. Subsequent tests fail with timeout errors.

**Why it happens:** Fake timers global state persists across tests. Next test waits for setTimeout, but fake timers don't advance.

**Consequences:**
- Flaky tests: Test order matters
- CI failures: Tests pass locally, fail in CI
- Debugging pain: "Why does Test B fail after Test A?"

**Prevention:**

**WRONG:**
```typescript
test('schedules reminder', () => {
  jest.useFakeTimers();
  scheduleReminder(booking);
  jest.advanceTimersByTime(3600000); // 1 hour
  expect(sendEmail).toHaveBeenCalled();
  // Missing cleanup!
});
```

**RIGHT:**
```typescript
test('schedules reminder', () => {
  jest.useFakeTimers();
  try {
    scheduleReminder(booking);
    jest.advanceTimersByTime(3600000);
    expect(sendEmail).toHaveBeenCalled();
  } finally {
    jest.useRealTimers(); // Always restore
  }
});

// Or use afterEach
afterEach(() => {
  jest.useRealTimers();
});
```

**Detection:**
- ESLint: Custom rule to flag `useFakeTimers` without `useRealTimers`
- Code review: Check cleanup in tests using timers

**Sources:**
- [Mitigate JavaScript Flaky Unit Tests](https://adequatica.medium.com/mitigate-javascript-flaky-unit-tests-67e8e2790e7f) (MEDIUM confidence)

---

### Pitfall 14: Next.js API Route Tests Missing Request Context

**What goes wrong:** Test Next.js API route handler directly (call function), skip Request/Response mocking. Handler fails accessing `req.headers`, `req.cookies`.

**Why it happens:** Developers treat API routes like regular functions, forget they need HTTP context.

**Consequences:**
- Tests don't catch auth bugs (missing JWT in headers)
- Cookie handling untested
- Multipart form data parsing fails in production

**Prevention:**

**Use `next-test-api-route-handler` (official Next.js testing library):**
```typescript
// tests/api/bookings.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import * as bookingsHandler from '@/app/api/v1/bookings/route';

test('GET /api/v1/bookings requires auth', async () => {
  await testApiHandler({
    appHandler: bookingsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({ method: 'GET' });
      expect(res.status).toBe(401); // Unauthorized
    }
  });
});

test('GET /api/v1/bookings returns bookings', async () => {
  await testApiHandler({
    appHandler: bookingsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid_jwt_token'
        }
      });
      expect(res.status).toBe(200);
      const bookings = await res.json();
      expect(bookings).toBeInstanceOf(Array);
    }
  });
});
```

**Detection:**
- Code review: Require `testApiHandler` for all API route tests
- Coverage: Ensure auth middleware tested with headers

**Sources:**
- [How to Unit Test Next.js API Routes with TypeScript](https://www.paigeniedringhaus.com/blog/how-to-unit-test-next-js-api-routes-with-typescript/) (MEDIUM confidence)
- [next-test-api-route-handler - npm](https://www.npmjs.com/package/next-test-api-route-handler) (HIGH confidence - official package)

---

### Pitfall 15: Email Template Variables Unescaped (XSS in Emails)

**What goes wrong:** Insert user input into email templates without escaping. Attacker books appointment with name `<script>alert('xss')</script>`, email client executes script.

**Why it happens:** Developers treat email as plain text, forget HTML injection risks.

**Consequences:**
- XSS in email clients (Gmail, Outlook)
- Phishing attacks (inject fake login forms)
- Customer trust damaged

**Prevention:**

**WRONG:**
```typescript
// services/notification-worker/src/templates/booking-confirmation.ts
export const bookingConfirmationTemplate = (data: any) => `
  <h1>Booking Confirmed</h1>
  <p>Hello ${data.customerName},</p>
  <p>Service: ${data.serviceName}</p>
`;
```

**RIGHT:**
```typescript
import { escape } from 'lodash';

export const bookingConfirmationTemplate = (data: any) => `
  <h1>Booking Confirmed</h1>
  <p>Hello ${escape(data.customerName)},</p>
  <p>Service: ${escape(data.serviceName)}</p>
`;
```

**Or use template engine with auto-escaping:**
```typescript
import Handlebars from 'handlebars';

const template = Handlebars.compile(`
  <h1>Booking Confirmed</h1>
  <p>Hello {{customerName}},</p>
  <p>Service: {{serviceName}}</p>
`);

// Handlebars auto-escapes by default
const html = template({ customerName: '<script>alert(1)</script>' });
// Output: <p>Hello &lt;script&gt;alert(1)&lt;/script&gt;,</p>
```

**Detection:**
- Code review: Check all email templates escape user input
- Security scan: Static analysis for unescaped template variables

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Research Flag |
|---|---|---|---|
| **Phase 1: Test Setup** | Test DB pointing to production | Validate DATABASE_URL contains 'test' before running | NO |
| **Phase 2: Unit Tests (Auth)** | JWT secrets hardcoded in tests | Use test-specific JWT_SECRET env var | NO |
| **Phase 3: Integration Tests (Bookings)** | Double-booking prevention untested | Test concurrent bookings with real DB locks | YES - research SELECT FOR UPDATE testing |
| **Phase 4: SMTP Setup** | Missing SPF/DKIM/DMARC before first send | DNS configuration checklist BEFORE code deploy | NO |
| **Phase 5: Email Warm-Up** | Sending 500 emails on day 1 | Rate limiter with progressive daily limits | NO |
| **Phase 6: Twilio Setup** | Non-compliant Czech phone number | Review Twilio CZ regulatory guidelines | NO |
| **Phase 7: SMS Testing** | Webhook signature verification disabled | Always validate in production, use Twilio CLI for local | NO |
| **Phase 8: Comgate Setup** | Sandbox webhook URLs in production | Environment-specific webhook URL checklist | NO |
| **Phase 9: Payment Testing** | Real payments in test environment | Mock Comgate SDK in unit tests, sandbox in integration | NO |
| **Phase 10: Deployment** | Production env vars shared with staging | Railway environment separation validation | NO |

---

## Open Questions & Research Gaps

### HIGH Priority (blocking implementation)

1. **Drizzle ORM SELECT FOR UPDATE testing:**
   - How to test double-booking prevention with real concurrent requests?
   - Best way to simulate race conditions in Jest?
   - Does Drizzle transaction rollback work correctly in tests?

2. **Railway.com static IP management:**
   - Are egress IPs guaranteed stable for Comgate whitelisting?
   - What happens if Railway changes IPs without notice?
   - Backup plan if Comgate rejects webhooks?

3. **Email deliverability monitoring:**
   - Which metrics to track (bounce rate, spam complaints, open rate)?
   - How to detect sudden deliverability drop?
   - When to pause sending automatically?

### MEDIUM Priority (nice to have)

4. **Test coverage targets:**
   - What's realistic coverage for 62k LOC codebase?
   - Which modules to prioritize (auth > payments > bookings)?
   - Integration vs unit test ratio?

5. **RabbitMQ test isolation:**
   - Should tests use real RabbitMQ or mock?
   - How to prevent test queues polluting production?
   - TestContainers vs Docker Compose for CI?

### LOW Priority (future improvement)

6. **Chaos testing:**
   - How to test email provider downtime (SendGrid outage)?
   - What happens if Twilio rate limits?
   - Payment gateway timeout handling?

---

## Sources Summary

### HIGH Confidence (Official Docs)
- [Twilio Czech Republic: SMS Guidelines](https://www.twilio.com/en-us/guidelines/cz/sms)
- [Twilio Webhooks Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Railway Variables Documentation](https://docs.railway.com/variables)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [GitGuardian SMTP Credential Remediation](https://www.gitguardian.com/remediation/smtp-credential)

### MEDIUM Confidence (Technical Blogs, 2026 Content)
- [Email Deliverability in 2026: SPF, DKIM, DMARC Checklist](https://www.egenconsulting.com/blog/email-deliverability-2026.html)
- [SPF, DKIM, DMARC: Common Setup Mistakes](https://www.infraforge.ai/blog/spf-dkim-dmarc-common-setup-mistakes)
- [Warm Up Your Email Domain the Right Way in 2026](https://www.mailreach.co/blog/how-to-warm-up-email-domain)
- [Jest Integration Tests with Isolated SQL Schemas](https://medium.com/@sebastinchikn/how-to-run-jest-integration-tests-in-parallel-using-isolated-sql-schemas-f4c5e534030a)
- [Hookdeck: Twilio Webhooks Best Practices](https://hookdeck.com/webhooks/platforms/twilio-webhooks-features-and-best-practices-guide)

### LOW Confidence (User Docs, Unverified)
- [Comgate Payment Gateway Setup](https://docs.kvik.shop/help/comgate-payment-gateway)

---

**Research confidence:** MEDIUM (70%)

**Gaps:**
- Comgate official documentation not extensively available in English
- Drizzle ORM testing patterns under-documented
- Railway.com production deployment specifics limited

**Recommendation:**
Validate Comgate integration with official Czech documentation and support. Test Drizzle transaction rollback behavior in isolated environment before relying on in production tests.
