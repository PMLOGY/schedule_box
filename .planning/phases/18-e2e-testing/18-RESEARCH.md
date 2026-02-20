# Phase 18: E2E Testing - Research

**Researched:** 2026-02-20
**Domain:** End-to-end browser testing with Playwright for Next.js 14 App Router
**Confidence:** HIGH

## Summary

Playwright is the right choice for this project's E2E testing needs. It is the only major E2E framework that natively supports WebKit (Safari's engine), which is critical for the 40% Czech iOS user base. Playwright v1.58 is current, provides built-in cross-browser testing across Chromium, Firefox, and WebKit, and has first-class support for Next.js via the `webServer` configuration option.

The ScheduleBox app has a clear set of user flows that map directly to E2E requirements: registration/login via Zustand auth store + JWT API routes, a 4-step booking wizard (service select -> date/time -> customer info -> confirm), payment initiation through Comgate (external redirect pattern), and AI predictions that gracefully degrade via Opossum circuit breaker with fallback functions. All of these can be tested end-to-end by running the actual Next.js server with mocked external dependencies (Comgate API, AI Python service) via Playwright's `page.route()` network interception.

The project already has MSW handlers for Comgate and AI service mocking in `apps/web/mocks/handlers.ts` from Phase 16. However, MSW operates at the Node.js level (intercepting `fetch` in the server process), while Playwright's `page.route()` operates at the browser network level. For E2E tests, we will use Playwright's native `page.route()` to intercept external HTTP calls made by the browser, and for server-side calls (e.g., API routes calling Comgate), we will configure environment variables to point to a mock server or use the existing dev/test mode that Comgate supports.

**Primary recommendation:** Install `@playwright/test` v1.58, configure `playwright.config.ts` with `webServer` pointing to the Next.js production build, create Page Object Models for auth and booking flows, and use `page.route()` to mock external Comgate and AI service calls at the browser network level.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| `@playwright/test` | ^1.58 | E2E test framework + browser automation | Only framework with native WebKit/Safari support; cross-browser single API |

### Supporting

| Library | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| `playwright` | ^1.58 | Browser binaries (Chromium, Firefox, WebKit) | Installed via `npx playwright install --with-deps` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| Playwright | Cypress | Cypress lacks Safari/WebKit support entirely - disqualified by project requirement |
| Playwright `page.route()` | MSW in browser | MSW requires service worker setup; `page.route()` is simpler for E2E and works at browser network level |

**Installation:**
```bash
pnpm add -D @playwright/test
npx playwright install --with-deps chromium firefox webkit
```

## Architecture Patterns

### Recommended Project Structure

```
apps/web/
  e2e/
    playwright.config.ts        # Playwright configuration (lives at web app level)
    fixtures/
      auth.fixture.ts           # Custom fixtures for authenticated sessions
    page-objects/
      login.page.ts             # LoginPage POM
      register.page.ts          # RegisterPage POM
      booking-wizard.page.ts    # BookingWizardPage POM
      dashboard.page.ts         # DashboardPage POM
    helpers/
      mock-api.ts               # Reusable page.route() mock helpers
      test-data.ts              # Test user credentials, service data
    auth.setup.ts               # Global setup: authenticate and save storageState
    tests/
      auth.spec.ts              # E2E-02: Registration and login flow
      booking.spec.ts           # E2E-03: Booking creation end-to-end
      payment.spec.ts           # E2E-04: Payment flow with Comgate
      ai-fallback.spec.ts       # E2E-05: AI circuit breaker fallback behavior
    playwright/
      .auth/                    # Saved auth state (gitignored)
```

### Pattern 1: Page Object Model for Multi-Step Flows

**What:** Encapsulate page interactions into reusable classes that expose semantic methods.
**When to use:** For every E2E test. The booking wizard has 4 steps; a POM prevents duplicating step navigation logic across tests.
**Example:**
```typescript
// Source: https://playwright.dev/docs/pom
import { type Page, type Locator, expect } from '@playwright/test';

export class BookingWizardPage {
  readonly page: Page;
  readonly serviceCards: Locator;
  readonly nextButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.serviceCards = page.locator('[data-testid="service-card"]');
    this.nextButton = page.getByRole('button', { name: /next|dalsi/i });
    this.confirmButton = page.getByRole('button', { name: /confirm|potvrdit/i });
  }

  async goto() {
    await this.page.goto('/bookings/new');
  }

  async selectService(serviceName: string) {
    await this.page.getByText(serviceName).click();
  }

  async selectEmployee(employeeName: string) {
    // Select from the employee dropdown
    await this.page.getByRole('combobox').click();
    await this.page.getByRole('option', { name: employeeName }).click();
  }

  async proceedToNextStep() {
    await this.nextButton.click();
  }

  async confirmBooking() {
    await this.confirmButton.click();
  }
}
```

### Pattern 2: Authentication Setup with storageState

**What:** Run login once in a setup project, save browser state to file, reuse across all test projects.
**When to use:** All tests that require an authenticated user. Avoids repeating login in every test.
**Example:**
```typescript
// Source: https://playwright.dev/docs/auth
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, 'playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in|login|prihlasit/i }).click();
  // Wait for redirect to dashboard
  await page.waitForURL('**/');
  // Verify we're logged in
  await expect(page.getByText(/dashboard|prehled/i)).toBeVisible();
  // Save signed-in state
  await page.context().storageState({ path: authFile });
});
```

### Pattern 3: Network Mocking for External Services

**What:** Use `page.route()` to intercept and mock external API calls that the Next.js server makes.
**When to use:** For Comgate payment API and AI service calls. The Next.js API routes call these external services server-side, so browser-level route interception won't catch them. Instead, use environment variables to control external service URLs.
**Example:**
```typescript
// For browser-level API calls (client-side fetch):
await page.route('**/api/v1/ai/**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: { probability: 0.15, risk_level: 'low', fallback: true }
    }),
  });
});

// For server-side external calls (Comgate, AI Python service):
// Configure via environment variables in playwright.config.ts webServer.env:
// COMGATE_API_URL=http://localhost:3001/mock-comgate
// AI_SERVICE_URL=http://localhost:3001/mock-ai
// Or use Comgate's built-in test mode (process.env.NODE_ENV !== 'production')
```

### Pattern 4: Comgate Payment Flow Testing

**What:** Test the payment redirect flow by intercepting the redirect URL.
**When to use:** E2E-04 payment flow test.
**Important context:** Comgate create endpoint returns a `redirect` URL. The app redirects the user to Comgate's payment page. In test mode (`test=true`), Comgate operates in sandbox. For E2E, we can:
1. Mock the Comgate API at the server level via `COMGATE_API_URL` env var pointing to a local mock
2. Intercept the browser redirect to the Comgate URL and simulate the callback
**Example:**
```typescript
// Intercept redirect to Comgate payment page
await page.route('**/payments.comgate.cz/**', async (route) => {
  // Instead of going to real Comgate, redirect back to our callback URL
  const url = new URL(route.request().url());
  const bookingId = url.searchParams.get('id') || 'test-booking';
  await route.fulfill({
    status: 302,
    headers: {
      'Location': `/api/v1/payments/comgate/callback?bookingId=${bookingId}&status=PAID`,
    },
  });
});
```

### Anti-Patterns to Avoid

- **Testing through the real Comgate gateway in CI:** External payment gateways are flaky, slow, and rate-limited. Always mock or use test mode.
- **Logging in via UI in every test:** Use `storageState` to authenticate once and reuse. Login UI testing should be a separate, dedicated test.
- **Using CSS selectors for elements:** Use role-based locators (`getByRole`, `getByLabel`, `getByText`) which are more resilient and test accessibility.
- **Hardcoding absolute URLs:** Use `baseURL` from config so tests work across environments.
- **Testing third-party UI (Comgate payment page):** We don't control it. Mock the redirect and test our callback handler instead.
- **Sharing state between tests:** Each test must be independent. Use test fixtures and fresh data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| --- | --- | --- | --- |
| Browser automation | Custom Puppeteer scripts | `@playwright/test` | Built-in assertions, retries, parallel execution, HTML reports |
| Auth state management | Custom cookie injection | Playwright `storageState` | Handles cookies + localStorage + sessionStorage automatically |
| Network mocking in E2E | Custom proxy server | `page.route()` | Built-in, no extra infrastructure, per-test configuration |
| Cross-browser testing | Separate CI jobs per browser | Playwright `projects` config | Single config, matrix-like parallel execution |
| Test data generation | Manual SQL inserts | API calls in `beforeAll` or fixture setup | Tests the API as a side benefit; more maintainable |
| CI browser installation | Manual Docker images | `npx playwright install --with-deps` | Handles system dependencies automatically on Ubuntu |
| Visual debugging | Console.log | Playwright trace viewer + HTML report | Timeline, DOM snapshots, network log, screenshots |

**Key insight:** Playwright is a complete E2E testing platform, not just a browser driver. Its built-in features (assertions, fixtures, reporters, trace viewer) replace the need for separate test utilities.

## Common Pitfalls

### Pitfall 1: Next.js i18n Locale Prefix in URLs

**What goes wrong:** Tests navigate to `/login` but the app redirects to `/cs/login` (Czech default locale). Test assertions on URL fail.
**Why it happens:** The app uses `next-intl` with `localePrefix: 'as-needed'` and `defaultLocale: 'cs'`. For the default locale, the prefix is omitted, BUT the middleware may still redirect.
**How to avoid:** Use `page.waitForURL()` with a pattern matcher: `await page.waitForURL('**/login')` or `await page.waitForURL(/\/(cs\/)?login/)`. Set `baseURL` in config to include locale if needed.
**Warning signs:** Tests pass locally but fail in CI with "Expected URL to match" errors.

### Pitfall 2: Zustand Persist Rehydration Timing

**What goes wrong:** Tests check for authenticated state immediately after page load, but Zustand `persist` middleware hasn't rehydrated from localStorage yet. Elements flash or don't appear.
**Why it happens:** The auth store uses `zustand/persist` with `name: 'schedulebox-auth'`. On page load, there's a brief moment where `isAuthenticated` is `false` before localStorage is read.
**How to avoid:** After using `storageState`, always wait for a dashboard-specific element to be visible before asserting: `await expect(page.getByText('Dashboard')).toBeVisible()`. Playwright's auto-waiting handles most cases, but be explicit for auth-dependent content.
**Warning signs:** Tests are flaky - pass sometimes, fail with "element not visible" sometimes.

### Pitfall 3: Booking Wizard API Dependencies

**What goes wrong:** The booking wizard Step 1 fetches `/api/v1/services` and `/api/v1/employees` via React Query. If the dev database has no seed data, the wizard shows "No services available" and tests can't proceed.
**Why it happens:** E2E tests run against a real Next.js server connected to a real database. Without seed data, API endpoints return empty arrays.
**How to avoid:** Ensure the database is seeded before E2E tests run. Use `pnpm --filter @schedulebox/database db:setup` in CI before starting the test server. Alternatively, use `page.route()` to mock the API responses at the browser level for pure UI flow testing.
**Warning signs:** Tests pass locally (seeded DB) but fail in CI (empty DB).

### Pitfall 4: WebKit/Safari CSS and Behavior Differences

**What goes wrong:** Tests pass in Chromium and Firefox but fail in WebKit. Form submissions behave differently, date inputs render differently, or scroll behavior varies.
**Why it happens:** WebKit has different default styles, form handling, and JavaScript engine behavior compared to Chromium/Firefox. Radix UI components (used by shadcn/ui) may have WebKit-specific rendering issues.
**How to avoid:** Run all three browsers in CI. Use Playwright's `test.describe.configure({ mode: 'parallel' })` to run browser projects in parallel. For known WebKit issues, use `test.skip(browserName === 'webkit', 'Known WebKit issue: #XXX')` with a tracking issue.
**Warning signs:** CI fails only on WebKit project.

### Pitfall 5: CI Timeout from Next.js Build + Server Start

**What goes wrong:** The `webServer` command times out because `next build && next start` takes too long in CI.
**Why it happens:** Default Playwright webServer timeout is 60 seconds. Next.js production build can take 2-3 minutes in resource-constrained CI environments.
**How to avoid:** Separate build from serve. In CI, build Next.js in a prior step, then use `webServer: { command: 'pnpm start', ... }` which only starts the already-built server. Increase `webServer.timeout` to 120000 (120s) as a safety margin.
**Warning signs:** Tests never execute; CI shows "webServer timed out" error.

### Pitfall 6: Comgate Server-Side Calls Not Interceptable by page.route()

**What goes wrong:** `page.route()` intercepts browser-level HTTP requests, but the Comgate API is called server-side from the Next.js API route (`/api/v1/payments/comgate/create`). Browser mocking doesn't catch it.
**Why it happens:** `page.route()` operates on browser network traffic. Server-side `fetch()` calls in API routes bypass the browser entirely.
**How to avoid:** Use `COMGATE_API_URL` environment variable (already configurable in `apps/web/app/api/v1/payments/comgate/client.ts` line 32: `const COMGATE_API_URL = process.env.COMGATE_API_URL || 'https://payments.comgate.cz'`). In `playwright.config.ts` `webServer.env`, set `COMGATE_API_URL` to a local mock server, or accept Comgate test mode (already enabled: line 99 `requestParams.set('test', process.env.NODE_ENV !== 'production' ? 'true' : 'false')`).
**Warning signs:** Payment tests fail with "Comgate credentials not configured" or network errors to `payments.comgate.cz`.

## Code Examples

Verified patterns from official sources and project analysis:

### Playwright Configuration for ScheduleBox

```typescript
// Source: https://playwright.dev/docs/test-configuration + https://nextjs.org/docs/app/guides/testing/playwright
// apps/web/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project: authenticate once
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Browser projects: depend on setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
      // AI service will use fallback (no AI_SERVICE_URL = calls fail = circuit breaker opens)
    },
  },
});
```

### Auth Setup (storageState pattern)

```typescript
// Source: https://playwright.dev/docs/auth
// apps/web/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, 'playwright/.auth/user.json');

setup('authenticate as test owner', async ({ page }) => {
  // Navigate to login - handles locale redirect automatically
  await page.goto('/login');

  // Fill login form using role-based locators
  await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: /sign in|prihlasit/i }).click();

  // Wait for dashboard redirect (Next.js App Router)
  await page.waitForURL('**/');
  await expect(page.locator('body')).not.toContainText('login');

  // Persist authenticated state
  await page.context().storageState({ path: authFile });
});
```

### Booking Creation E2E Test

```typescript
// apps/web/e2e/tests/booking.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Booking Creation Flow', () => {
  test('user can create a booking end-to-end', async ({ page }) => {
    // Mock API responses for booking wizard
    await page.route('**/api/v1/services*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1, uuid: 'svc-001', name: 'Haircut',
              duration_minutes: 30, price: '500', currency: 'CZK',
              category_id: 1, is_active: true,
            },
          ],
        }),
      });
    });

    // Navigate to booking wizard
    await page.goto('/bookings/new');

    // Step 1: Select service
    await page.getByText('Haircut').click();
    await page.getByRole('button', { name: /next|dalsi/i }).click();

    // Step 2: Select date and time (implementation depends on calendar component)
    // ... date picker interaction ...

    // Step 3: Customer info
    // ... fill customer details ...

    // Step 4: Confirm
    await page.getByRole('button', { name: /confirm|potvrdit/i }).click();

    // Verify redirect to bookings list
    await page.waitForURL('**/bookings');
    await expect(page.locator('body')).toContainText(/success|uspesne/i);
  });
});
```

### AI Fallback E2E Test

```typescript
// apps/web/e2e/tests/ai-fallback.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AI Circuit Breaker Fallback', () => {
  test('AI predictions return fallback when service is unavailable', async ({ page }) => {
    // The AI_SERVICE_URL is not configured in test env, so calls to it will fail.
    // The circuit breaker should catch the failure and return fallback values.

    // Navigate to AI dashboard
    await page.goto('/ai');

    // Navigate to capacity forecast
    await page.getByText(/capacity|kapacita/i).click();

    // The page should render with fallback data (not error)
    // Fallback returns rule-based forecasts with fallback: true
    await expect(page.locator('body')).not.toContainText(/error|chyba/i);

    // Verify the AI health endpoint reports circuit breaker state
    const healthResponse = await page.request.get('/api/v1/ai/health');
    const health = await healthResponse.json();
    // Circuit breaker may be OPEN (after failures) or CLOSED (no calls yet)
    expect(['healthy', 'degraded', 'unhealthy']).toContain(health.data.status);
  });
});
```

### GitHub Actions CI Job for E2E

```yaml
# .github/workflows/ci.yml - new e2e job to add
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: [lint, test, build]
  if: github.ref == 'refs/heads/main' || github.event_name == 'pull_request'
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_USER: schedulebox
        POSTGRES_PASSWORD: schedulebox
        POSTGRES_DB: schedulebox
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
    redis:
      image: redis:7
      ports:
        - 6379:6379
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    - run: pnpm install --frozen-lockfile

    # Database setup
    - run: pnpm --filter @schedulebox/database db:setup
      env:
        DATABASE_URL: postgresql://schedulebox:schedulebox@localhost:5432/schedulebox

    # Build Next.js (reuse from build job via cache or artifact)
    - run: pnpm --filter @schedulebox/web build
      env:
        DATABASE_URL: postgresql://schedulebox:schedulebox@localhost:5432/schedulebox
        REDIS_URL: redis://localhost:6379

    # Install Playwright browsers
    - run: npx playwright install --with-deps chromium firefox webkit

    # Run E2E tests
    - run: npx playwright test --config apps/web/e2e/playwright.config.ts
      env:
        DATABASE_URL: postgresql://schedulebox:schedulebox@localhost:5432/schedulebox
        REDIS_URL: redis://localhost:6379
        JWT_ACCESS_SECRET: test-access-secret
        JWT_REFRESH_SECRET: test-refresh-secret
        NEXT_PUBLIC_APP_URL: http://localhost:3000

    # Upload test results
    - uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: playwright-report
        path: apps/web/e2e/playwright-report/
        retention-days: 14
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| Cypress for all E2E | Playwright for cross-browser E2E | 2023-2024 | Native WebKit support, faster execution, better CI performance |
| `@playwright/test` separate from browser package | Single `@playwright/test` includes everything | Playwright 1.40+ | Simpler installation |
| `page.waitForSelector()` + manual checks | Web-first assertions (auto-retry) | Playwright 1.20+ | `expect(locator).toBeVisible()` auto-waits, much less flake |
| Custom login in every test | `storageState` + setup projects | Playwright 1.30+ | 10x faster test suites, cleaner test code |
| `page.$()` CSS selectors | Role-based locators (`getByRole`, `getByLabel`) | Playwright 1.27+ | Tests are more resilient and verify accessibility |
| GitHub Action `microsoft/playwright-github-action` | `npx playwright install --with-deps` CLI | Playwright docs 2025 | CLI approach is simpler and more current |

**Deprecated/outdated:**

- `microsoft/playwright-github-action`: Deprecated in favor of CLI-based installation in CI
- CSS-selector-based locators: Still work but not recommended; use role/text/label locators
- `page.waitForNavigation()`: Replaced by `page.waitForURL()` for URL-based waiting

## Open Questions

1. **Database State for E2E Tests**
   - What we know: The app has seed scripts (`db:setup`) that create test users and sample data. E2E tests need services, employees, and customers in the DB.
   - What's unclear: Should E2E tests use the full seed data, or a minimal E2E-specific seed? Should tests clean up after themselves?
   - Recommendation: Use the existing full seed data (`db:setup`). Don't clean up between tests -- re-seed before the entire E2E suite if needed. This keeps tests fast and realistic.

2. **Comgate Test Mode vs. Full Mock**
   - What we know: Comgate client has `test=true` when `NODE_ENV !== 'production'`. The `COMGATE_API_URL` is configurable. Comgate test sandbox exists but requires valid merchant credentials.
   - What's unclear: Do we have Comgate test credentials available in CI? If not, we need a full mock.
   - Recommendation: Use a lightweight local mock server or `page.route()` interception at the API response level (mock the `/api/v1/payments/comgate/create` response, not the Comgate external call). This avoids needing real Comgate credentials in CI.

3. **RabbitMQ in CI for E2E**
   - What we know: The app publishes events to RabbitMQ (e.g., `payment.initiated`). E2E tests may trigger these event publish calls.
   - What's unclear: Does the app crash if RabbitMQ is unavailable, or does it handle failures gracefully?
   - Recommendation: Include RabbitMQ service container in CI, or ensure `publishEvent()` calls are try/caught (they appear to be -- line 137 in comgate create route has try/catch). Verify this during implementation.

4. **CI Resource Constraints**
   - What we know: Running 3 browsers (Chromium + Firefox + WebKit) in parallel on `ubuntu-latest` requires significant resources. The CI also needs PostgreSQL, Redis, and potentially RabbitMQ containers.
   - What's unclear: Will GitHub Actions runners have enough resources? Should we limit workers to 1?
   - Recommendation: Start with `workers: 1` in CI (conservative), run browsers sequentially via projects. Optimize later if E2E suite time becomes a bottleneck.

## Sources

### Primary (HIGH confidence)

- [Next.js Playwright Testing Guide](https://nextjs.org/docs/app/guides/testing/playwright) - Official Next.js docs, verified webServer config pattern and test structure
- [Playwright Test Configuration](https://playwright.dev/docs/test-configuration) - Official config reference, defineConfig, projects, webServer
- [Playwright Authentication](https://playwright.dev/docs/auth) - Official storageState pattern, setup projects, role-based auth
- [Playwright Best Practices](https://playwright.dev/docs/best-practices) - Official locator strategy, test isolation, CI guidance
- [Playwright Mock APIs](https://playwright.dev/docs/mock) - Official page.route() pattern, HAR replay
- [Playwright CI Introduction](https://playwright.dev/docs/ci-intro) - Official GitHub Actions workflow template
- [Playwright Page Object Model](https://playwright.dev/docs/pom) - Official POM pattern
- [Playwright WebServer Config](https://playwright.dev/docs/test-webserver) - Official webServer documentation

### Secondary (MEDIUM confidence)

- [Playwright Release Notes](https://playwright.dev/docs/release-notes) - v1.58 confirmed as latest (verified Feb 2026)
- [NuGet Playwright 1.58.0](https://www.nuget.org/packages/microsoft.playwright) - Cross-verified version 1.58 (published 2/2/2026)
- [Playwright CI/CD Integration Guide](https://www.techlistic.com/2026/02/playwright-cicd-integration-with-github.html) - GitHub Actions matrix strategy

### Codebase Analysis (HIGH confidence)

- `apps/web/app/[locale]/(auth)/login/page.tsx` - Login page structure
- `apps/web/components/auth/login-form.tsx` - Login form with email/password + MFA
- `apps/web/components/auth/register-form.tsx` - Registration form with 5 fields
- `apps/web/components/booking/BookingWizard.tsx` - 4-step wizard structure
- `apps/web/stores/booking-wizard.store.ts` - Wizard state management
- `apps/web/app/api/v1/payments/comgate/client.ts` - Comgate client with configurable URL
- `apps/web/lib/ai/circuit-breaker.ts` - Opossum circuit breaker (5s timeout, 50% threshold)
- `apps/web/lib/ai/fallback.ts` - 10+ fallback functions for AI predictions
- `apps/web/lib/ai/client.ts` - AI client with circuit breaker wrapping
- `apps/web/mocks/handlers.ts` - MSW handlers for Comgate + AI (Phase 16)
- `apps/web/lib/i18n/routing.ts` - Locale config: cs (default), sk, en
- `apps/web/middleware.ts` - next-intl middleware for locale routing
- `.github/workflows/ci.yml` - Current CI: lint -> test -> build pipeline

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Playwright v1.58 verified through official docs and release notes; sole choice due to WebKit requirement
- Architecture: HIGH - Page Object Model, storageState auth, webServer config all documented in official Playwright docs and verified against codebase structure
- Pitfalls: HIGH - Locale routing, Zustand persistence, server-side API mocking all identified from direct codebase analysis of actual implementations
- Code examples: MEDIUM - Config patterns verified from official docs; specific ScheduleBox patterns based on codebase analysis but not yet tested

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (Playwright is stable; Next.js integration patterns well-established)
