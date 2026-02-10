# Testing Patterns

**Analysis Date:** 2026-02-10

## Test Framework

**Runner:**
- Vitest (primary for unit & integration tests)
- Jest as fallback (compatible with Next.js)
- Config: `vitest.config.ts` or `jest.config.js` at workspace root

**Assertion Library:**
- `expect()` from Vitest / Jest (no external assertion libraries needed)

**Run Commands:**
```bash
pnpm test                 # Run all tests once
pnpm test:watch          # Watch mode (re-run on file changes)
pnpm test:ui             # UI dashboard for test results
pnpm test:coverage       # Generate coverage report
pnpm test:integration    # Run integration tests only (requires Docker services)
pnpm test:e2e            # Run Playwright E2E tests
pnpm test:e2e:ui         # E2E with UI
```

## Test File Organization

**Location:**
- Co-located pattern: `*.test.ts` / `*.spec.ts` next to source file
- Alternative: `tests/` directory at workspace root for integration/E2E

**Naming:**
- Unit tests: `src/lib/services/booking.service.test.ts`
- Component tests: `src/components/BookingForm.test.tsx`
- API route tests: `tests/integration/api/bookings.test.ts`
- E2E tests: `tests/e2e/booking-flow.spec.ts`

**Structure:**
```
apps/web/
├── src/
│   ├── lib/
│   │   ├── services/
│   │   │   ├── booking.service.ts
│   │   │   └── booking.service.test.ts       # Unit test (co-located)
│   │   ├── middleware/
│   │   │   ├── validation.ts
│   │   │   └── validation.test.ts            # Unit test (co-located)
│   └── components/
│       ├── BookingForm.tsx
│       └── BookingForm.test.tsx              # Component test (co-located)
└── tests/
    ├── integration/
    │   ├── api/
    │   │   ├── bookings.test.ts              # API endpoint tests
    │   │   ├── payments.test.ts
    │   │   └── auth.test.ts
    │   ├── services/
    │   │   └── booking-payment-saga.test.ts  # SAGA workflow tests
    │   └── fixtures/
    │       ├── factories.ts                  # Test data factories
    │       └── mocks.ts                      # Mock implementations
    ├── e2e/
    │   ├── booking-flow.spec.ts
    │   ├── payment-flow.spec.ts
    │   ├── auth-flow.spec.ts
    │   └── customer-management.spec.ts
    └── support/
        ├── test-helpers.ts                   # Shared test utilities
        └── db-setup.ts                       # Test database initialization
```

## Test Structure

**Suite organization (Vitest/Jest):**
```typescript
// apps/web/src/lib/services/booking.service.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createBooking } from './booking.service';
import { AppError } from '@schedulebox/shared';

describe('BookingService', () => {
  describe('createBooking', () => {
    let mockDb: any;
    let mockEventBus: any;

    beforeEach(() => {
      // Setup: create mocks, fixtures
      mockDb = { insert: vi.fn() };
      mockEventBus = { publish: vi.fn() };
    });

    afterEach(() => {
      // Cleanup: reset mocks, close connections
      vi.clearAllMocks();
    });

    it('should create booking with valid input', async () => {
      // Arrange: set up test data
      const input = {
        serviceId: 1,
        customerId: 42,
        startTime: new Date('2026-02-15T14:00:00Z'),
      };
      const companyId = 1;

      // Act: call function
      const booking = await createBooking(input, { companyId });

      // Assert: verify result
      expect(booking).toMatchObject({
        id: expect.any(Number),
        serviceId: 1,
        customerId: 42,
        status: 'pending',
      });

      // Assert: verify side effects
      expect(mockEventBus.publish).toHaveBeenCalledWith('booking.created', {
        bookingId: booking.id,
        companyId,
      });
    });

    it('should throw AppError if time slot is taken', async () => {
      // Arrange
      mockDb.insert.mockRejectedValue(new Error('Unique constraint violation'));

      // Act & Assert
      await expect(() =>
        createBooking({ serviceId: 1, ... }, { companyId: 1 })
      ).rejects.toThrow(AppError);
    });

    it('should fall back to default no-show prediction if AI unavailable', async () => {
      // Arrange: mock AI service failure
      vi.mocked(aiService.predict).mockRejectedValue(new Error('AI timeout'));

      // Act
      const booking = await createBooking(input, { companyId });

      // Assert: verify fallback value used
      expect(booking.noShowProbability).toBe(0.15); // default
      expect(mockLogger.warn).toHaveBeenCalledWith('AI fallback triggered', {
        reason: 'timeout',
      });
    });
  });
});
```

**Patterns:**

- **Arrange-Act-Assert (AAA):** Organize every test into 3 phases
- **One assertion per test** (or logically grouped related assertions)
- **Descriptive test names:** `should [verb] [condition] [when specific case]`
- **Setup/teardown:** Use `beforeEach()` / `afterEach()` for common setup
- **Fixtures:** Use factories for test data consistency

## Mocking

**Framework:** Vitest's `vi` object (compatible with Jest)

**Patterns:**

```typescript
// Mock a module entirely
vi.mock('@schedulebox/shared', () => ({
  AppError: class AppError extends Error {},
}));

// Mock specific exports
import { validateEmail } from '@schedulebox/shared';
vi.mocked(validateEmail).mockReturnValue(true);

// Partial mock (keep some real implementations)
vi.doMock('./booking.service', async () => {
  const actual = await vi.importActual<typeof import('./booking.service')>('./booking.service');
  return {
    ...actual,
    createBooking: vi.fn(),
  };
});

// Mock database queries
const mockDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }]),
      }),
    }),
  }),
};

// Mock external API calls
vi.mocked(comgateAPI.createPayment).mockResolvedValue({
  transactionId: 'tx-123',
  redirectUrl: 'https://comgate.cz/...',
  status: 'created',
});

// Mock with side effects
const publishEventSpy = vi.fn(async (type, data) => {
  if (type === 'booking.failed') throw new Error('RabbitMQ offline');
});
```

**What to mock:**
- ✅ External APIs (Comgate, QRcomat, OpenAI, Zoom) → use static fixtures
- ✅ Database layer (in unit tests) → return predictable data
- ✅ RabbitMQ event bus → verify publish/subscribe calls
- ✅ Cache/Redis → avoid dependency on infrastructure
- ✅ Third-party services (SMTP, SMS) → avoid sending real emails
- ✅ Time/Date → use `vi.useFakeTimers()` for testing time-dependent logic

**What NOT to mock:**
- ❌ Validation logic (Zod) → test with real schemas
- ❌ Error handling → test real AppError class
- ❌ Business logic layer → test actual implementations
- ❌ Type definitions → test real types
- ❌ Middleware → test actual middleware in integration tests

## Fixtures and Factories

**Test data factories:**
```typescript
// tests/integration/fixtures/factories.ts
import { faker } from '@faker-js/faker';

export function createBookingFixture(overrides = {}) {
  return {
    id: 1,
    uuid: faker.string.uuid(),
    companyId: 1,
    customerId: faker.number.int({ min: 1, max: 1000 }),
    serviceId: faker.number.int({ min: 1, max: 50 }),
    startTime: faker.date.future(),
    endTime: faker.date.future(),
    status: 'confirmed' as const,
    price: faker.number.float({ min: 100, max: 5000 }),
    noShowProbability: 0.15,
    ...overrides,
  };
}

export function createCustomerFixture(overrides = {}) {
  return {
    id: 1,
    uuid: faker.string.uuid(),
    companyId: 1,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number('+420 7## ### ###'),
    healthScore: 75,
    clvPredicted: 50000,
    totalBookings: 5,
    totalSpent: 2500,
    ...overrides,
  };
}

export function createPaymentFixture(overrides = {}) {
  return {
    id: 1,
    uuid: faker.string.uuid(),
    companyId: 1,
    bookingId: 1,
    customerId: 1,
    amount: 500,
    currency: 'CZK',
    status: 'paid' as const,
    gateway: 'comgate' as const,
    gatewayTransactionId: faker.string.alphaNumeric(20),
    ...overrides,
  };
}

// Usage in tests:
const booking = createBookingFixture({ companyId: 5, status: 'pending' });
const customer = createCustomerFixture({ email: 'test@example.com' });
```

**Mock data location:**
- `tests/integration/fixtures/factories.ts` — factory functions for creating test entities
- `tests/integration/fixtures/mocks.ts` — static mock API responses
- `tests/integration/fixtures/seeds.sql` — database seed data for integration tests

## Coverage

**Target:** ≥80% coverage for critical paths (services, middleware, validators)

**View coverage:**
```bash
pnpm test:coverage                    # Generate HTML report
open coverage/index.html              # View in browser
```

**Coverage rules:**
- Branches: ≥80% (every if/else tested)
- Statements: ≥80% (every line executed)
- Functions: ≥85% (all public functions tested)
- Lines: ≥80% (every line executed)

**Configuration (vitest.config.ts):**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        branches: 80,
        functions: 85,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

## Test Types

### Unit Tests

**Scope:** Single function/module in isolation

**Approach:**
- Mock all dependencies
- Test happy path + error cases + edge cases
- Target: 5-10 tests per function

**Example:**
```typescript
// apps/web/src/lib/utils/date.test.ts
import { formatDateForDb, addBusinessDays } from './date';

describe('date utilities', () => {
  describe('formatDateForDb', () => {
    it('should convert Date to ISO timestamp with timezone', () => {
      const date = new Date('2026-02-15T14:30:00');
      expect(formatDateForDb(date)).toBe('2026-02-15T14:30:00+01:00');
    });

    it('should handle timezone offset', () => {
      const date = new Date('2026-02-15T14:30:00+02:00');
      expect(formatDateForDb(date)).toMatch(/2026-02-15T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/);
    });

    it('should throw if input is invalid', () => {
      expect(() => formatDateForDb(null as any)).toThrow();
      expect(() => formatDateForDb('invalid' as any)).toThrow();
    });
  });
});
```

### Integration Tests

**Scope:** Multiple modules working together (e.g., API route → service → database)

**Approach:**
- Use real database (test database, not production)
- Mock external APIs (Comgate, OpenAI, Zoom)
- Test SAGA workflows, RLS enforcement, event publishing
- Use `testcontainers` or test fixtures for Docker services

**Example:**
```typescript
// tests/integration/api/bookings.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer } from '../support/test-server';
import { seedTestDb } from '../support/db-setup';
import fetch from 'node-fetch';

describe('POST /api/v1/bookings (integration)', () => {
  let server: any;
  let baseUrl: string;
  let testCompanyId: number;

  beforeAll(async () => {
    server = await startTestServer();
    baseUrl = `http://localhost:${server.port}`;
    testCompanyId = await seedTestDb();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should create booking and publish event', async () => {
    const payload = {
      serviceId: 1,
      customerId: 42,
      startTime: '2026-02-15T14:00:00Z',
    };

    const response = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
        'X-Company-ID': testCompanyId,
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data).toMatchObject({
      id: expect.any(Number),
      uuid: expect.any(String),
      serviceId: 1,
      status: 'pending',
    });

    // Verify event was published
    const publishedEvents = await getPublishedEvents();
    expect(publishedEvents).toContainEqual(
      expect.objectContaining({ type: 'booking.created', data: expect.objectContaining({ bookingId: data.id }) })
    );
  });

  it('should prevent double-booking with SELECT FOR UPDATE', async () => {
    // Arrange: create two concurrent requests for same slot
    const payload = {
      serviceId: 1,
      customerId: 42,
      startTime: '2026-02-15T14:00:00Z',
    };

    // Act: send both requests simultaneously
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/api/v1/bookings`, { method: 'POST', headers: { ... }, body: JSON.stringify(payload) }),
      fetch(`${baseUrl}/api/v1/bookings`, { method: 'POST', headers: { ... }, body: JSON.stringify(payload) }),
    ]);

    // Assert: one succeeds (201), one fails (409)
    expect([res1.status, res2.status].sort()).toEqual([201, 409]);
    const failed = res2.status === 409 ? res2 : res1;
    const { error } = await failed.json();
    expect(error.code).toBe('BOOKING_CONFLICT');
  });

  it('should enforce RLS (company_id isolation)', async () => {
    // Arrange: create booking for company A
    const booking = await createTestBooking(companyA);

    // Act: try to access booking as company B
    const response = await fetch(`${baseUrl}/api/v1/bookings/${booking.id}`, {
      headers: { 'X-Company-ID': companyB },
    });

    // Assert: 403 or 404 (booking invisible to company B)
    expect([403, 404]).toContain(response.status);
  });
});
```

### E2E Tests (Playwright)

**Scope:** Full user flows from browser perspective

**Approach:**
- Real application running
- Real database (test database)
- Mock external services (Comgate with fixture, OpenAI with fallback)
- Test 20 critical scenarios

**Configuration (playwright.config.ts):**
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 1,
  workers: process.env.CI ? 1 : 4,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

**Critical E2E scenarios:**
```typescript
// tests/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Booking flow', () => {
  test('TC-01: Create booking (happy path)', async ({ page }) => {
    // 1. Navigate to booking page
    await page.goto('/booking/salon-krasa');

    // 2. Select service
    await page.click('[data-testid="service-choice"]');
    await page.click('text=Střih dámský');

    // 3. Pick date/time
    await page.click('[data-testid="date-picker"]');
    await page.click('text=15');  // Pick 15th
    await page.click('[data-testid="time-slot-14:00"]');

    // 4. Enter customer info
    await page.fill('[name="customerName"]', 'Jana Testová');
    await page.fill('[name="email"]', 'jana@example.com');

    // 5. Confirm
    await page.click('button:has-text("Potvrdit")');

    // Verify success
    await expect(page).toHaveURL(/\/booking\/confirmation\/\d+/);
    await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('Vaše rezervace je potvrzena');
  });

  test('TC-02: Double-booking prevention', async ({ browser }) => {
    // Open booking page in 2 tabs simultaneously
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/booking/salon-krasa');
    await page2.goto('/booking/salon-krasa');

    // Both select same slot
    for (const page of [page1, page2]) {
      await page.click('[data-testid="service-choice"]');
      await page.click('text=Střih dámský');
      await page.click('[data-testid="date-picker"]');
      await page.click('text=15');
      await page.click('[data-testid="time-slot-14:00"]');
      await page.fill('[name="customerName"]', 'Jana');
      await page.fill('[name="email"]', 'jana@example.com');
    }

    // Submit both (rapidly)
    await Promise.all([
      page1.click('button:has-text("Potvrdit")'),
      page2.click('button:has-text("Potvrdit")'),
    ]);

    // One should succeed, one should fail
    const page1Success = page1.url().includes('confirmation');
    const page2Success = page2.url().includes('confirmation');

    expect(page1Success || page2Success).toBe(true);  // At least one succeeded
    expect(page1Success && page2Success).toBe(false); // But not both

    if (!page2Success) {
      await expect(page2.locator('[data-testid="error-message"]')).toContainText('Slot byl zarezervován');
    }
  });

  test('TC-03: Comgate payment flow', async ({ page, context }) => {
    // Navigate to booking requiring payment
    await page.goto('/booking/salon-krasa');
    // ... select service, date, time, confirm ...
    // System redirects to Comgate

    // Intercept Comgate redirect and mock payment
    await page.route('https://comgate.cz/**', async (route) => {
      // Mock successful payment
      await route.abort();
      // Simulate webhook callback
      await context.evaluate(() => {
        // Call our webhook endpoint with success payload
        fetch('/api/v1/webhooks/comgate', {
          method: 'POST',
          body: JSON.stringify({
            transactionId: 'tx-123',
            status: 'PAID',
            amount: 500,
          }),
        });
      });
    });

    // Verify booking confirmed
    await expect(page).toHaveURL(/\/booking\/confirmation/);
    await expect(page.locator('[data-testid="status"]')).toContainText('Potvrzeno');
  });
});
```

## Common Patterns

### Async Testing

```typescript
// ✅ Use async/await
it('should fetch user', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('Jana');
});

// ✅ Or return promise
it('should fetch user', () => {
  return fetchUser(1).then((user) => {
    expect(user.name).toBe('Jana');
  });
});

// ❌ Don't forget to await/return
it('should fetch user', () => {
  fetchUser(1); // Missing await/return → test passes before fetch completes
  expect(user.name).toBe('Jana');
});

// ✅ Test rejection
it('should handle fetch error', async () => {
  await expect(() => fetchUser(999)).rejects.toThrow('User not found');
});
```

### Error Testing

```typescript
// ✅ Good: test specific error
it('should throw AppError on validation failure', () => {
  expect(() => validateBooking(invalidInput)).toThrow(
    new AppError('VALIDATION_ERROR', 'Invalid email', 400)
  );
});

// ✅ Good: test with expect.rejects
it('should handle async error', async () => {
  await expect(() => async () => {
    throw new AppError('PAYMENT_FAILED', 'Card declined', 402);
  }).rejects.toThrow(AppError);
});

// ❌ Bad: too generic
it('should throw error', () => {
  expect(() => validateBooking(invalidInput)).toThrow();
});

// ✅ Test error details
it('should include validation details', () => {
  try {
    validateBooking({ email: 'invalid' });
  } catch (err) {
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details.email).toEqual(['Invalid email format']);
  }
});
```

### Testing with Timestamps

```typescript
// ✅ Use fake timers for time-dependent tests
it('should expire booking after 30 minutes', () => {
  vi.useFakeTimers();
  const now = new Date('2026-02-15T14:00:00Z');
  vi.setSystemTime(now);

  const booking = createBookingFixture({ createdAt: now });
  expect(isBookingExpired(booking)).toBe(false);

  // Fast forward 31 minutes
  vi.advanceTimersByTime(31 * 60 * 1000);
  expect(isBookingExpired(booking)).toBe(true);

  vi.useRealTimers();
});

// ✅ Or use helper for flexible dates
it('should calculate reminder timing', () => {
  const bookingDate = new Date('2026-02-15T14:00:00Z');
  const reminderTime = calculateReminderTime(bookingDate); // should return ~2026-02-14T14:00:00Z (24h before)
  expect(reminderTime.getTime()).toBeLessThan(bookingDate.getTime());
});
```

### Testing Database Transactions

```typescript
it('should rollback on error', async () => {
  const db = createTestDb();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(bookingsTable).values(booking1);
      await tx.insert(bookingsTable).values(booking2);
      throw new Error('Simulated error');
    });
  } catch (err) {
    // Transaction should rollback
  }

  const bookings = await db.select().from(bookingsTable);
  expect(bookings).toHaveLength(0); // Both rolled back
});
```

## Test Helpers and Utilities

**Location:** `tests/support/test-helpers.ts`

```typescript
// tests/support/test-helpers.ts
import { db } from '@/lib/db';

export async function seedDatabase() {
  const company = await createTestCompany();
  const customer = await createTestCustomer(company.id);
  const service = await createTestService(company.id);
  const employee = await createTestEmployee(company.id);

  return { company, customer, service, employee };
}

export async function createTestBooking(overrides = {}) {
  return db.insert(bookingsTable).values({
    companyId: 1,
    customerId: 1,
    serviceId: 1,
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000),
    status: 'confirmed',
    price: 500,
    ...overrides,
  }).returning();
}

export async function createTestPayment(bookingId: number, overrides = {}) {
  return db.insert(paymentsTable).values({
    bookingId,
    companyId: 1,
    customerId: 1,
    amount: 500,
    currency: 'CZK',
    status: 'paid',
    gateway: 'comgate',
    ...overrides,
  }).returning();
}

export function createMockRequest(overrides = {}) {
  return {
    headers: new Map([
      ['Authorization', 'Bearer test-token'],
      ['X-Company-ID', '1'],
    ]),
    method: 'GET',
    url: 'http://localhost:3000/api/v1/test',
    ...overrides,
  };
}
```

---

*Testing analysis: 2026-02-10*
