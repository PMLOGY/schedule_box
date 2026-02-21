# Technology Stack — v1.1 Production Hardening

**Project:** ScheduleBox v1.1
**Focus:** Testing infrastructure, SMTP email delivery, SMS integration, payment gateway
**Researched:** 2026-02-15
**Confidence:** HIGH

---

## Executive Summary

v1.1 focuses on production-hardening ScheduleBox with testing infrastructure (0% → 80% coverage), real email/SMS delivery, and payment processing. Stack additions are **minimal and targeted** — existing packages (nodemailer, twilio, BullMQ) remain, with new testing framework (Vitest), test utilities, and service provider credentials.

**Key Decision:** Vitest over Jest for 10-20x faster tests, native ESM/TypeScript support, and Next.js 15 alignment.

---

## Recommended Stack — NEW Additions Only

### Testing Framework

| Technology                 | Version  | Purpose                      | Why Vitest                                                                                                     |
| -------------------------- | -------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **vitest**                 | ^4.0.18  | Test runner                  | 10-20x faster than Jest in watch mode, native ESM/TypeScript, Next.js 15 recommended, 95% Jest-compatible     |
| @vitest/coverage-v8        | ^4.0.18  | Code coverage (v8 provider)  | Native v8 coverage with AST remapping (since v3.2.0) gives Istanbul accuracy at v8 speed                       |
| @vitest/ui                 | ^4.0.18  | Visual test UI (optional)    | Browser-based test viewer for debugging failures                                                               |
| @testing-library/react     | ^16.3.2  | Component testing            | User-centric testing, React 19 compatible (RTL 16+)                                                            |
| @testing-library/jest-dom  | ^6.6.3   | DOM matchers                 | Use `'@testing-library/jest-dom/vitest'` import, provides `toBeInTheDocument()`, `toHaveValue()`, etc.         |
| @testing-library/user-event | ^14.5.3 | User interaction simulation  | Realistic user events (click, type, hover) for component tests                                                 |
| happy-dom                  | ^15.11.11 | Lightweight DOM for Vitest  | 2-3x faster than jsdom, sufficient for most React tests (fallback to jsdom if issues)                          |
| msw                        | ^2.12.10 | API mocking (MSW 2.0)        | Fetch API-native mocking for API routes, works in both tests and browser                                       |
| supertest                  | ^7.2.2   | HTTP API integration testing | SuperAgent-driven HTTP testing for Next.js API routes                                                          |
| testcontainers             | ^11.11.0 | Real DB/Redis for integration | Spin up PostgreSQL/Redis/RabbitMQ in Docker for integration tests (critical for double-booking, payment flows) |

**Install command:**
```bash
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom msw supertest testcontainers
```

**Rationale:**
- **Vitest over Jest:** Next.js 15 works with both, but Vitest's ESM/TypeScript support requires minimal config (no `transform` needed), runs 10-20x faster in watch mode, and aligns with Vite ecosystem (ScheduleBox uses pnpm workspaces, modern tooling)
- **V8 coverage over Istanbul:** Since Vitest 3.2.0, v8 uses AST-based remapping for Istanbul-level accuracy at native v8 speed (no upfront instrumentation)
- **happy-dom over jsdom:** 2-3x faster, sufficient for React Testing Library DOM queries (use jsdom only if browser API issues arise)
- **Testcontainers for integration tests:** ScheduleBox has critical flows (double-booking prevention via `SELECT FOR UPDATE`, Comgate webhooks, RabbitMQ events) that MUST test against real PostgreSQL/Redis/RabbitMQ, not mocks

### E2E Testing

| Technology | Version | Purpose         | Why Playwright                                                                                   |
| ---------- | ------- | --------------- | ------------------------------------------------------------------------------------------------ |
| playwright | ^1.49.5 | E2E/browser tests | Cross-browser (Chrome, Firefox, Safari), native parallelism, visual regression, better for enterprise scale than Cypress |

**Install command:**
```bash
pnpm add -D playwright @playwright/test
pnpm exec playwright install # installs browsers
```

**Rationale:**
- **Playwright over Cypress:** ScheduleBox needs Safari/WebKit testing (Czech SMB users use iOS), native parallel execution (faster CI), and multi-page/context support (test tenant isolation, multi-tab payment flows). Cypress lacks Safari, no native parallelism, JS-only.
- **When to use:** Critical user flows (booking creation, Comgate payment, double-booking prevention, GDPR anonymization) — target 20 E2E scenarios per documentation (line 7698)

### SMTP Email Delivery

| Provider    | Pricing (2026)                                      | Purpose              | Why Recommended                                                                                                                          |
| ----------- | --------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Brevo** (recommended) | Free: 300 emails/day<br>Paid: $9/mo (10K emails) | Transactional email  | Best free tier (300/day vs Mailgun 100/day), CZ-friendly UI, $0.0005-$0.0007/email, marketing + transactional in one platform          |
| Mailgun     | Free: 100 emails/day<br>Paid: $15/mo (10K emails)  | Transactional email  | Developer-focused, flexible API, $0.0007-$0.0009/email, excellent logs                                                                  |
| SMTP.com    | Enterprise pricing                                  | High-volume SMTP     | 100K+ businesses, deliverability-focused, best for scale (10K+ emails/day)                                                              |
| Maileroo    | Enterprise (CZ-based)                               | CZ data sovereignty  | Czech Republic-hosted, 99.99% uptime, GDPR-native, required if strict data sovereignty (government, medical)                            |
| EmailLabs   | Contact for pricing                                 | CZ market expert     | Seznam.cz compliance expert, direct phone support at Seznam.cz, essential if targeting CZ users with Seznam emails (40%+ CZ market share) |

**Existing package:** `nodemailer@^7.0.11` (notification-worker) — **NO CHANGE NEEDED**

**Configuration (env variables):**
```bash
# Brevo SMTP (recommended for v1.1)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your-brevo-email>
SMTP_PASS=<brevo-smtp-key>
SMTP_FROM="ScheduleBox <noreply@schedulebox.cz>"
```

**Rationale:**
- **Brevo for v1.1:** Best free tier for early-stage (300 emails/day handles 10-20 bookings/day), lowest cost scaling ($9/mo vs $15-19/mo), includes marketing tools (future loyalty campaigns)
- **When to upgrade:**
  - **Mailgun:** If need advanced deliverability analytics, detailed event logs, developer-first API
  - **SMTP.com:** If crossing 10K+ emails/day consistently
  - **Maileroo/EmailLabs:** If strict CZ data residency required (rare for SMB SaaS)
- **Seznam.cz consideration:** If A/B testing shows 40%+ Czech customers use @seznam.cz emails, consult EmailLabs for deliverability optimization (Seznam has strict anti-spam rules)

### SMS Integration

| Provider     | Coverage      | Pricing (estimate)                 | Purpose             | Why Recommended                                                                                              |
| ------------ | ------------- | ---------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Twilio** (existing) | 220+ countries | $0.07-0.15/SMS (CZ varies by carrier) | SMS delivery        | Already installed (`twilio@^5.3.5`), proven global scale, Node.js v4 SDK (TypeScript-native, 31% smaller bundle) |
| GatewayAPI   | Global (EU-focused) | €0.01+/SMS (pay-as-you-go)       | EU GDPR-compliant SMS | Denmark-based, 99.99% uptime, EU data hosting, no monthly fees                                               |
| Plivo        | 220+ countries | Competitive with Twilio            | Twilio alternative  | Closest apples-to-apples Twilio alternative, SMS/voice/phone APIs across 60+ countries                       |
| Bird (MessageBird) | Global (omnichannel) | Competitive                     | Omnichannel messaging | SMS + WhatsApp + email + Instagram APIs, good for future multi-channel expansion                             |

**Existing package:** `twilio@^5.3.5` (notification-worker) — **NO CHANGE NEEDED**

**Configuration (env variables):**
```bash
# Twilio (existing, just add credentials)
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_FROM_NUMBER=<your-twilio-phone-number>
```

**Rationale:**
- **Keep Twilio for v1.1:** Code already exists (`services/notification-worker/src/services/sms-sender.ts`), proven reliability, TypeScript-native SDK v4, handles Czech diacritics (UCS-2 encoding, 70 chars/segment)
- **When to switch:**
  - **GatewayAPI:** If EU data residency required + lower volume (pay-per-SMS cheaper than Twilio for <1K/month)
  - **Plivo/Bird:** If Twilio pricing becomes prohibitive at scale (test at 10K+ SMS/month)
- **DO NOT switch unless:** Twilio costs exceed budget OR EU regulation mandates EU-hosted SMS provider (unlikely for CZ SMB market in 2026)

### Payment Gateway

| Technology | Version      | Purpose                 | Why Comgate                                                                                                      |
| ---------- | ------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Comgate    | API v1.0     | CZ/SK payment gateway   | Already implemented (`apps/web/app/api/v1/payments/comgate/`), dominant CZ/SK market share, supports ALL Czech payment methods (cards, bank transfers, Google Pay, Apple Pay) |
| (none)     | -            | No new packages needed  | Comgate API is REST over `application/x-www-form-urlencoded`, no SDK required (custom client already built)     |

**Existing implementation:** `apps/web/app/api/v1/payments/comgate/client.ts` — **NO CHANGES NEEDED**

**Configuration (env variables):**
```bash
COMGATE_MERCHANT_ID=<your-merchant-id>
COMGATE_SECRET=<your-secret-key>
COMGATE_API_URL=https://payments.comgate.cz # production
# For testing: https://payments.comgate.cz (set test=true in API params)
```

**Rationale:**
- **Comgate already integrated:** v1.0 shipped with full Comgate implementation (init payment, status check, refund, webhook signature verification)
- **No alternatives needed:** Comgate dominates CZ/SK market, supports all local payment methods (essential for Czech SMBs accepting payments from Czech customers)
- **Testing strategy:** Use Comgate test mode (`test=true` param), mock webhooks in integration tests with MSW

---

## Alternatives Considered

| Category    | Recommended | Alternative       | Why Not                                                                                                                 |
| ----------- | ----------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Test runner | Vitest      | Jest              | Jest requires `transform` config for TypeScript, 10-20x slower in watch mode, experimental ESM support, heavier bundle |
| Coverage    | V8          | Istanbul (c8)     | V8 with AST remapping (Vitest 3.2.0+) achieves Istanbul accuracy at native speed, no upfront instrumentation needed    |
| E2E         | Playwright  | Cypress           | Cypress lacks Safari support (critical for iOS users), no native parallelism, JS-only, worse debugging than Playwright time-travel |
| SMTP        | Brevo       | SendGrid          | SendGrid $19.95/mo entry (50K emails) overkill for early-stage, Brevo $9/mo (10K emails) + better free tier (300/day)  |
| SMTP        | Brevo       | Mailgun           | Mailgun $15/mo competitive but worse free tier (100/day vs 300/day), Brevo includes marketing tools                     |
| SMS         | Twilio      | GatewayAPI        | Twilio already integrated, proven scale, GatewayAPI only better if EU data residency mandated (not required for CZ SMB) |
| Payment     | Comgate     | Stripe            | Stripe poor CZ/SK coverage (no bank transfers, limited local methods), Comgate dominates local market                  |

---

## Integration Points with Existing Stack

### Vitest + Next.js 15

**Config:** `vitest.config.ts` (workspace root + per-package)
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'happy-dom', // or 'jsdom' if issues
    setupFiles: ['./vitest-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/*.config.*',
        '**/migrations/**',
        '**/seeds/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

**Setup file:** `vitest-setup.ts`
```typescript
import '@testing-library/jest-dom/vitest'; // IMPORTANT: /vitest import for Vitest
import { beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './src/mocks/server'; // MSW server

// MSW setup
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

**TypeScript:** Update `tsconfig.json`
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### Testcontainers + Drizzle ORM

**Integration test setup:** Spin up PostgreSQL, Redis, RabbitMQ for integration tests
```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from 'testcontainers';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

let pgContainer: StartedPostgreSqlContainer;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  // Start PostgreSQL container
  pgContainer = await new PostgreSqlContainer('postgres:16').start();
  const connectionString = pgContainer.getConnectionUri();

  // Connect Drizzle ORM
  const client = postgres(connectionString);
  db = drizzle(client);

  // Run migrations
  await migrate(db, { migrationsFolder: './packages/database/migrations' });
}, 60000); // 60s timeout for container startup

afterAll(async () => {
  await pgContainer.stop();
});
```

**Why Testcontainers:** ScheduleBox has critical flows that MUST test against real DB:
1. **Double-booking prevention:** `SELECT FOR UPDATE` + UNIQUE constraint (TC-02 in docs, line 7720)
2. **RLS tenant isolation:** PostgreSQL Row Level Security policies (TC-07, line 7773)
3. **Comgate payment webhooks:** Concurrent payment status updates
4. **GDPR anonymization:** Complex UPDATE queries (TC-06, line 7760)

### MSW (Mock Service Worker) + Next.js API Routes

**Mock Comgate API for unit/integration tests:**
```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Comgate payment creation
  http.post('https://payments.comgate.cz/v1.0/create', async ({ request }) => {
    const body = await request.text();
    const params = new URLSearchParams(body);

    return HttpResponse.text(
      new URLSearchParams({
        code: '0',
        message: 'OK',
        transId: 'TEST_TRANS_123',
        redirect: 'https://payments.comgate.cz/client/instructions/index?id=TEST_TRANS_123',
      }).toString()
    );
  }),

  // Mock Comgate status check
  http.post('https://payments.comgate.cz/v1.0/status', async () => {
    return HttpResponse.text(
      new URLSearchParams({
        code: '0',
        message: 'OK',
        status: 'PAID',
        transId: 'TEST_TRANS_123',
        price: '50000', // 500.00 CZK in hellers
      }).toString()
    );
  }),
];
```

**Why MSW:** Comgate API uses `application/x-www-form-urlencoded`, MSW 2.0's Fetch API-native mocking handles this cleanly (no need for axios interceptors or nock)

### Playwright + Next.js

**Config:** `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }, // CRITICAL for iOS users
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Critical E2E tests (per docs line 7698):**
1. Booking creation (TC-01, line 7705)
2. Double-booking prevention (TC-02, line 7720)
3. Comgate payment success (TC-03, line 7729)
4. Comgate payment timeout (TC-04, line 7741)
5. AI fallback (TC-05, line 7750)
6. GDPR anonymization (TC-06, line 7760)
7. Multi-tenant isolation (TC-07, line 7773)

---

## Package Versions Summary (2026-02-15)

**Testing:**
- vitest: `^4.0.18` (released Jan 2026, Vitest 4.0 stable)
- @vitest/coverage-v8: `^4.0.18`
- @testing-library/react: `^16.3.2` (React 19 compatible)
- @testing-library/jest-dom: `^6.6.3`
- @testing-library/user-event: `^14.5.3`
- happy-dom: `^15.11.11`
- msw: `^2.12.10` (MSW 2.0 stable, Fetch API-native)
- supertest: `^7.2.2`
- testcontainers: `^11.11.0`
- playwright: `^1.49.5`

**Email/SMS (existing, no version changes):**
- nodemailer: `^7.0.11` → `^8.0.1` (RECOMMENDED UPGRADE: published 8 days ago, SMTP improvements)
- twilio: `^5.3.5` (already on SDK v4, TypeScript-native)

**Payment:**
- (none) Comgate uses REST API, no SDK needed

---

## What NOT to Add

### DO NOT Install

1. **Jest** — Vitest replaces it entirely (95% compatible, no migration pain)
2. **c8** (standalone) — Use `@vitest/coverage-v8` instead (integrated)
3. **nyc** — Obsolete, replaced by c8/v8 coverage
4. **Mocha/Chai/Jasmine** — Vitest provides test runner + assertions
5. **nock** — MSW 2.0 replaces it for HTTP mocking
6. **axios-mock-adapter** — MSW handles API mocking
7. **Stripe SDK** — Comgate already integrated, Stripe poor CZ/SK coverage
8. **SendGrid SDK** — Nodemailer + SMTP sufficient, no SDK lock-in needed
9. **bull-mock** — Use real Redis with Testcontainers for BullMQ integration tests

### DO NOT Switch Providers (v1.1)

1. **Twilio → GatewayAPI/Plivo** — Twilio code works, switching adds risk with no benefit unless cost becomes prohibitive (test at 10K+ SMS/month)
2. **Comgate → Stripe** — Comgate dominates CZ/SK, Stripe lacks local payment methods (bank transfers)
3. **Nodemailer → SendGrid SDK** — SMTP keeps provider flexibility, SendGrid SDK locks in (harder to switch later)

---

## Installation Commands

```bash
# === TESTING FRAMEWORK ===
pnpm add -D vitest@^4.0.18 \
  @vitest/coverage-v8@^4.0.18 \
  @vitest/ui@^4.0.18 \
  @testing-library/react@^16.3.2 \
  @testing-library/jest-dom@^6.6.3 \
  @testing-library/user-event@^14.5.3 \
  happy-dom@^15.11.11 \
  msw@^2.12.10 \
  supertest@^7.2.2 \
  testcontainers@^11.11.0

# === E2E TESTING ===
pnpm add -D playwright@^1.49.5 @playwright/test@^1.49.5
pnpm exec playwright install # Installs Chrome, Firefox, Safari browsers

# === OPTIONAL: Upgrade nodemailer (recommended) ===
pnpm add nodemailer@^8.0.1 --filter @schedulebox/notification-worker
```

---

## Service Provider Setup Checklist

### Brevo (SMTP Email)
1. Sign up at [brevo.com](https://www.brevo.com)
2. Verify domain (SPF/DKIM records)
3. Generate SMTP API key (Settings → SMTP & API)
4. Set env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

### Twilio (SMS)
1. Sign up at [twilio.com](https://www.twilio.com)
2. Purchase phone number (Czech-compatible, supports SMS)
3. Get credentials from Console
4. Set env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

### Comgate (Payment Gateway)
1. Register merchant account at [comgate.cz](https://www.comgate.cz)
2. Complete KYC/business verification
3. Get merchant ID and secret from portal
4. Set env vars: `COMGATE_MERCHANT_ID`, `COMGATE_SECRET`
5. Configure webhook URL: `https://app.schedulebox.cz/api/v1/webhooks/comgate`

---

## CI/CD Integration

### GitHub Actions — Updated Workflow

```yaml
jobs:
  # === UNIT TESTS ===
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4 # Upload coverage

  # === INTEGRATION TESTS ===
  test-integration:
    runs-on: ubuntu-latest
    needs: test-unit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:integration
        # Testcontainers will auto-start PostgreSQL/Redis/RabbitMQ

  # === E2E TESTS ===
  test-e2e:
    runs-on: ubuntu-latest
    needs: test-integration
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**Package.json scripts (workspace root):**
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest watch"
  }
}
```

---

## Cost Estimates (v1.1 early-stage, ~50 bookings/day)

| Service     | Free Tier          | Estimated v1.1 Usage | Cost   | When to Upgrade                |
| ----------- | ------------------ | -------------------- | ------ | ------------------------------ |
| **Brevo**   | 300 emails/day     | ~150 emails/day      | $0/mo  | When exceeding 300/day → $9/mo |
| **Twilio**  | Trial credits      | ~50 SMS/day          | ~$150/mo | If SMS reminders enabled for all bookings (~$0.10/SMS × 50/day × 30 days) |
| **Comgate** | Transaction fees   | ~50 payments/month   | 2-3% per transaction | N/A (industry standard)        |
| **Testcontainers** | Free (local Docker) | CI only          | $0/mo  | N/A (runs in CI, no hosting cost) |

**Total monthly (excl. Comgate fees):** $0-150 (Twilio SMS primary cost driver)

**Cost optimization:**
- Start with email-only reminders (free with Brevo 300/day)
- Enable SMS only for high-risk no-shows (AI score > 0.7) to reduce Twilio costs
- Monitor Brevo daily limit (add tracking alert at 250/day)

---

## Sources

### Testing Framework
- [Vitest vs Jest Comparison 2026](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9)
- [Vitest 4.0 Release](https://vitest.dev/blog/vitest-4)
- [Next.js Testing Guide](https://nextjs.org/docs/app/guides/testing)
- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)
- [BullMQ Integration Testing Guide (Jan 2026)](https://oneuptime.com/blog/post/2026-01-21-bullmq-integration-testing/view)
- [Playwright vs Cypress 2026 Enterprise Guide](https://devin-rosario.medium.com/playwright-vs-cypress-the-2026-enterprise-testing-guide-ade8b56d3478)

### SMTP Providers
- [Czech Email Providers Security](https://www.cybersecurity-help.cz/blog/27.html)
- [Maileroo Czech Republic SMTP](https://maileroo.com/enterprise-smtp-hosting/czech-republic)
- [EmailLabs Seznam.cz Rules](https://emaillabs.io/en/sending-to-czech-republic-rules-introduced-by-seznam-cz/)
- [SendGrid vs Mailgun Comparison](https://moosend.com/blog/sendgrid-vs-mailgun/)
- [Brevo vs Mailgun vs SendGrid](https://sourceforge.net/software/compare/Brevo-vs-Mailgun-vs-SendGrid/)

### SMS Providers
- [Twilio Alternatives 2026](https://prelude.so/blog/twilio-competitors)
- [European Twilio Alternatives](https://european-alternatives.eu/alternative-to/twilio)
- [Twilio Node.js SDK v4](https://www.twilio.com/en-us/blog/introducing-twilio-for-nodejs-v4)
- [GatewayAPI Pricing](https://gatewayapi.com/pricing/)

### Payment Gateway
- [Comgate PHP SDK](https://github.com/comgate-payments/sdk-php)
- [Comgate Checkout SDK Examples](https://github.com/comgate-payments/checkout-sdk-examples)

### NPM Packages
- [@vitest/coverage-v8 npm](https://www.npmjs.com/package/@vitest/coverage-v8)
- [Testing Library React npm](https://www.npmjs.com/package/@testing-library/react)
- [MSW npm](https://www.npmjs.com/package/msw)
- [Supertest npm](https://www.npmjs.com/package/supertest)
- [Testcontainers npm](https://www.npmjs.com/package/testcontainers)
- [Nodemailer npm](https://www.npmjs.com/package/nodemailer)
- [Twilio npm](https://www.npmjs.com/package/twilio)
