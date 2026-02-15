# Phase 16: Testing Foundation - Research

**Researched:** 2026-02-15
**Domain:** JavaScript/TypeScript testing for Next.js 14 monorepo with Vitest, MSW, Testing Library
**Confidence:** HIGH

## Summary

Testing Foundation establishes automated unit testing infrastructure for a pnpm workspace monorepo containing Next.js 14 (App Router), Drizzle ORM, and event-driven services. The research confirms that **Vitest 4.0** is the optimal choice for this stack, offering 10-20x faster execution than Jest with native ESM/TypeScript support and official Next.js recommendation. **MSW 2.0** provides production-like API mocking by intercepting network requests rather than stubbing modules, critical for testing Comgate payments, AI service calls, and SMTP. **Testing Library** enforces accessibility-first testing that mirrors user behavior.

The 80% coverage target strikes the right balance between quality assurance and development velocity, with v8 coverage provider offering faster execution than Istanbul. For this monorepo, a **shared configuration pattern** using `mergeConfig` with `vitest.shared.ts` enables consistent testing across 6+ packages (apps/web, packages/database, packages/shared, packages/events, packages/ui, services/notification-worker) while allowing package-specific overrides.

**Primary recommendation:** Use Vitest 4.0 with v8 coverage provider, MSW 2.0 for external API mocking, Testing Library for component testing, and PGLite for database testing. Implement shared config pattern for monorepo consistency. Target 80% coverage enforced in CI with GitHub Actions.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | ^4.0.0 | Test runner, assertion library | 10-20x faster than Jest, native ESM/TypeScript, official Next.js 15 recommendation, workspace support |
| @vitejs/plugin-react | ^4.3.0 | React support for Vitest | Official Vite plugin, required for testing React components with Vitest |
| @testing-library/react | ^16.0.0 | Component testing utilities | Industry standard, enforces accessibility-first testing, 14M+ weekly downloads |
| @testing-library/dom | ^10.0.0 | DOM query utilities | Peer dependency for @testing-library/react, provides query primitives |
| @vitest/coverage-v8 | ^4.0.0 | Code coverage (v8 provider) | Faster than Istanbul (no pre-transpile), AST-based accuracy since v3.2.0 |
| msw | ^2.0.0 | API mocking (network-level) | Industry standard for HTTP mocking, 3.8M+ weekly downloads, intercepts fetch/axios |
| happy-dom | ^15.0.0 | Lightweight DOM simulation | 3-5x faster than jsdom for most use cases, covers 95%+ browser APIs |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-tsconfig-paths | ^6.0.0 | TypeScript path mapping | When using `paths` in tsconfig.json for imports (e.g., `@/components`) |
| @testing-library/user-event | ^14.0.0 | User interaction simulation | Testing forms, clicks, typing (more realistic than fireEvent) |
| @pglite/pglite | ^0.1.0 | In-memory PostgreSQL (WASM) | Testing Drizzle ORM queries without Docker, runs real Postgres in milliseconds |
| @vitest/ui | ^4.0.0 | Visual test UI | Local development, debugging tests in browser |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest is slower (10-20x), requires complex ESM config, no longer officially recommended by Next.js team |
| happy-dom | jsdom | jsdom is more complete (99% browser API coverage vs 95%) but 3-5x slower; use jsdom if you need exact browser parity for edge cases |
| MSW 2.0 | axios-mock-adapter | axios-mock-adapter only works with axios, not fetch; MSW intercepts network layer, works with any HTTP client |
| PGLite | pg-mem | pg-mem is incomplete (70% Postgres feature coverage), PGLite runs real Postgres (100% compatibility) |

**Installation:**

```bash
# Root workspace (for shared config)
pnpm add -Dw vitest @vitest/coverage-v8 @vitest/ui happy-dom

# Each package that needs testing
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom @testing-library/user-event vite-tsconfig-paths

# MSW for API mocking (install in packages that make HTTP calls)
pnpm add -D msw

# PGLite for database testing (install in packages/database)
pnpm add -D @pglite/pglite
```

## Architecture Patterns

### Recommended Project Structure

```
schedulebox/
├── vitest.workspace.ts              # Workspace-level test orchestration
├── vitest.shared.ts                 # Shared config (base settings)
├── apps/
│   └── web/
│       ├── vitest.config.ts         # Merges shared + app-specific config
│       ├── __tests__/               # Unit tests for utilities, schemas
│       ├── app/
│       │   └── **/*.test.tsx        # Colocated component tests
│       └── mocks/
│           ├── handlers.ts          # MSW request handlers
│           └── server.ts            # MSW server instance
├── packages/
│   ├── database/
│   │   ├── vitest.config.ts         # Database-specific config (PGLite)
│   │   └── src/
│   │       ├── __tests__/           # ORM query tests
│   │       └── schemas/             # Drizzle schemas
│   ├── shared/
│   │   ├── vitest.config.ts         # Shared utils config
│   │   └── src/
│   │       ├── schemas/
│   │       │   └── *.test.ts        # Zod schema validation tests
│   │       └── utils/
│   │           └── *.test.ts        # Utility function tests
│   └── events/
│       ├── vitest.config.ts         # Event schema validation config
│       └── src/
│           └── __tests__/           # CloudEvents schema tests
└── services/
    └── notification-worker/
        ├── vitest.config.ts         # Service-specific config
        └── src/
            └── __tests__/           # Worker unit tests
```

### Pattern 1: Shared Configuration with Workspace

**What:** Centralized base configuration merged by individual packages
**When to use:** Always in pnpm monorepos to ensure consistent test behavior across packages

**Example:**

```typescript
// vitest.workspace.ts (root)
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'apps/*',
  'packages/*',
  'services/*',
])
```

```typescript
// vitest.shared.ts (root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        '**/*.config.{js,ts,mjs}',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/mocks/**',
      ],
    },
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

```typescript
// packages/shared/vitest.config.ts
import { defineProject, mergeConfig } from 'vitest/config'
import configShared from '../../vitest.shared'

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      include: ['src/**/*.test.ts'],
      exclude: ['src/**/*.browser.test.ts'], // Package-specific override
    },
  })
)
```

**Source:** [Vitest Workspace Guide](https://vitest.dev/guide/workspace), [GitHub Issue #9484](https://github.com/vitest-dev/vitest/issues/9484)

### Pattern 2: MSW Setup for External API Mocking

**What:** Network-level HTTP interception for testing code that calls external APIs
**When to use:** Testing Comgate payment integration, AI service calls, SMTP/Twilio, any external HTTP dependency

**Example:**

```typescript
// apps/web/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Comgate payment initialization
  http.post('https://payments.comgate.cz/v1.0/create', () => {
    return HttpResponse.json({
      code: 0,
      message: 'OK',
      transId: 'TEST-12345',
      redirect: 'https://payments.comgate.cz/client/instructions/index?id=TEST-12345',
    })
  }),

  // AI service prediction
  http.post('/api/ai/predict-demand', () => {
    return HttpResponse.json({
      predictions: [
        { date: '2026-02-20', demand: 42 },
        { date: '2026-02-21', demand: 38 },
      ],
    })
  }),
]
```

```typescript
// apps/web/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```typescript
// apps/web/vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

// Enable mocking before all tests
beforeAll(() => server.listen())

// Reset handlers between tests (critical for test isolation)
afterEach(() => server.resetHandlers())

// Restore modules after all tests
afterAll(() => server.close())
```

**Source:** [MSW Node.js Integration](https://mswjs.io/docs/integrations/node/), [MSW Best Practices](https://mswjs.io/docs/best-practices/network-behavior-overrides/)

### Pattern 3: Testing Library Query Priority

**What:** Accessibility-first query hierarchy that mirrors user behavior
**When to use:** All component tests, favoring queries users can "see" over implementation details

**Query Priority (highest to lowest):**

1. **getByRole** - Reflects accessibility tree (screen readers)
2. **getByLabelText** - How users navigate forms
3. **getByPlaceholderText** - Secondary form field identification
4. **getByText** - How users find non-interactive content
5. **getByDisplayValue** - Pre-filled form values
6. **getByAltText** - Images, semantic elements
7. **getByTestId** - Last resort (users can't see test IDs)

**Example:**

```typescript
// apps/web/app/components/BookingForm.test.tsx
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { expect, test } from 'vitest'
import BookingForm from './BookingForm'

test('BookingForm - user can select service and submit', async () => {
  const user = userEvent.setup()
  const mockOnSubmit = vi.fn()

  render(<BookingForm onSubmit={mockOnSubmit} />)

  // ✅ GOOD: Query by role (accessibility-first)
  const serviceSelect = screen.getByRole('combobox', { name: /select service/i })
  await user.selectOptions(serviceSelect, 'haircut')

  // ✅ GOOD: Query by label text (how users navigate forms)
  const dateInput = screen.getByLabelText(/appointment date/i)
  await user.type(dateInput, '2026-02-20')

  // ✅ GOOD: Query by role for button
  const submitButton = screen.getByRole('button', { name: /book appointment/i })
  await user.click(submitButton)

  expect(mockOnSubmit).toHaveBeenCalledWith({
    service: 'haircut',
    date: '2026-02-20',
  })

  // ❌ BAD: Don't use test IDs when semantic queries exist
  // const form = screen.getByTestId('booking-form') // Avoid this
})
```

**Source:** [Testing Library Queries](https://testing-library.com/docs/queries/about/), [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Pattern 4: Zod Schema Validation Testing

**What:** Test both successful validation and error cases for Zod schemas
**When to use:** All Zod schemas in packages/shared/src/schemas (auth, booking, payment, customer, etc.)

**Example:**

```typescript
// packages/shared/src/schemas/booking.test.ts
import { describe, it, expect } from 'vitest'
import { bookingCreateSchema } from './booking'

describe('bookingCreateSchema', () => {
  it('validates correct booking data', () => {
    const validData = {
      companyId: 123,
      customerId: 456,
      serviceId: 789,
      employeeId: 101,
      startTime: '2026-02-20T14:00:00+01:00',
      endTime: '2026-02-20T15:00:00+01:00',
      status: 'confirmed',
    }

    const result = bookingCreateSchema.safeParse(validData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.companyId).toBe(123)
    }
  })

  it('rejects booking with end time before start time', () => {
    const invalidData = {
      companyId: 123,
      customerId: 456,
      serviceId: 789,
      employeeId: 101,
      startTime: '2026-02-20T15:00:00+01:00', // End before start
      endTime: '2026-02-20T14:00:00+01:00',
      status: 'confirmed',
    }

    const result = bookingCreateSchema.safeParse(invalidData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('end time must be after start time')
    }
  })

  it('rejects booking with missing required fields', () => {
    const invalidData = {
      companyId: 123,
      // Missing customerId, serviceId, employeeId, times
    }

    const result = bookingCreateSchema.safeParse(invalidData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0)
      expect(result.error.errors.map(e => e.path[0])).toContain('customerId')
    }
  })
})
```

**Source:** [Testing with Zod (Steve Kinney)](https://stevekinney.com/courses/full-stack-typescript/testing-zod-schema), [Schema Validation with Zod](https://deepwiki.com/taiki-ssss/ts-vitest-examples/4.2-schema-validation-with-zod)

### Pattern 5: PGLite for Database Testing

**What:** In-memory WASM-compiled PostgreSQL for testing Drizzle ORM queries
**When to use:** Testing database queries, RLS policies, complex joins (packages/database)

**Example:**

```typescript
// packages/database/vitest.config.ts
import { defineProject, mergeConfig } from 'vitest/config'
import configShared from '../../vitest.shared'

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      environment: 'node', // Not happy-dom (database tests run in Node)
      setupFiles: ['./src/__tests__/setup.ts'],
    },
  })
)
```

```typescript
// packages/database/src/__tests__/setup.ts
import { beforeEach } from 'vitest'
import { PGlite } from '@pglite/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '../schemas'

let pgInstance: PGlite

export async function getTestDb() {
  if (!pgInstance) {
    // Create in-memory Postgres instance (milliseconds, not seconds)
    pgInstance = new PGlite()
    const db = drizzle(pgInstance, { schema })

    // Run migrations
    await db.execute(/* migration SQL */)
  }
  return drizzle(pgInstance, { schema })
}

// Reset database between tests for isolation
beforeEach(async () => {
  if (pgInstance) {
    await pgInstance.close()
  }
  pgInstance = new PGlite() // Fresh instance per test
})
```

```typescript
// packages/database/src/__tests__/bookings.test.ts
import { describe, it, expect } from 'vitest'
import { getTestDb } from './setup'
import { bookings, customers, companies } from '../schemas'

describe('Bookings RLS', () => {
  it('prevents cross-company booking access', async () => {
    const db = await getTestDb()

    // Seed test data
    await db.insert(companies).values({ id: 1, name: 'Company A' })
    await db.insert(companies).values({ id: 2, name: 'Company B' })
    await db.insert(customers).values({ id: 100, companyId: 1, name: 'Customer A' })
    await db.insert(bookings).values({ id: 1, companyId: 1, customerId: 100, /* ... */ })

    // Query as Company B (should not see Company A's bookings)
    const result = await db
      .select()
      .from(bookings)
      .where(eq(bookings.companyId, 2))

    expect(result).toHaveLength(0) // RLS blocks cross-company access
  })
})
```

**Source:** [Drizzle Vitest PGLite Example](https://github.com/rphlmr/drizzle-vitest-pg), [PGLite + Drizzle TDD](https://nikolamilovic.com/posts/fun-sane-node-tdd-postgres-pglite-drizzle-vitest/)

### Anti-Patterns to Avoid

- **Testing implementation details:** Don't test component state, CSS classes, or internal function calls. Test user-visible behavior.
- **Shared global state:** Don't use global variables or singletons in tests. Pass dependencies explicitly via fixtures or function arguments.
- **Hardcoded test data:** Don't hardcode timestamps like `'2026-02-15T10:00:00Z'` that become stale. Use relative dates (`new Date(Date.now() + 86400000)`).
- **Mocking Drizzle ORM directly:** Don't use `vi.mock` on Drizzle chain methods (complex, brittle). Use PGLite for real database testing.
- **Over-mocking:** Don't mock internal modules (your own code). Only mock external dependencies (APIs, database, time).
- **Test interdependence:** Don't rely on test execution order. Each test must run independently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP mocking | Axios interceptors, fetch stubs | MSW 2.0 | MSW intercepts network layer (works with any client), handles CORS, headers, status codes; custom stubs miss edge cases |
| Database mocking | Drizzle mock objects | PGLite (in-memory Postgres) | Drizzle's chain API is complex to mock; PGLite is real Postgres (100% compatibility), runs in milliseconds |
| User interaction | fireEvent (low-level) | @testing-library/user-event | userEvent simulates real user behavior (focus, blur, validation), fireEvent is too low-level and misses browser quirks |
| Test data generation | Manual fixtures | @faker-js/faker (already installed) | Faker generates realistic data, reduces maintenance, exposes edge cases you wouldn't think of |
| Coverage reporting | Custom reporters | @vitest/coverage-v8 + built-in reporters | Built-in reporters handle edge cases (source maps, TypeScript, ESM), integrate with CI tools |
| Environment variables | Manual process.env stubbing | vi.stubEnv() | vi.stubEnv() auto-restores values, works with import.meta.env, prevents test pollution |

**Key insight:** Testing infrastructure has hidden complexity. HTTP mocking must handle redirects, CORS, multipart form data, streaming responses. Database testing needs transaction isolation, constraint validation, timezone handling. Using battle-tested libraries (MSW, PGLite, Testing Library) handles these edge cases so you can focus on application logic.

## Common Pitfalls

### Pitfall 1: Forgetting to Reset MSW Handlers Between Tests

**What goes wrong:** Tests pass in isolation but fail when run together. Test A overrides handler for `/api/users`, Test B expects default handler behavior, receives Test A's mocked response.

**Why it happens:** MSW's `.use()` API prepends handlers without removing them. Without `server.resetHandlers()`, overrides persist across tests.

**How to avoid:**

```typescript
// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers()) // ⚠️ CRITICAL: Reset between tests
afterAll(() => server.close())
```

**Warning signs:** Tests pass individually (`vitest run booking.test.ts`) but fail when running all tests (`vitest run`). Error messages about unexpected response bodies.

**Source:** [MSW Node.js Integration](https://mswjs.io/docs/integrations/node/)

### Pitfall 2: Using getBy for Elements That Appear Asynchronously

**What goes wrong:** Test throws "Unable to find element" error for elements that appear after API call, setTimeout, or animation.

**Why it happens:** `getBy` queries throw immediately if element not found. Async elements need retry logic.

**How to avoid:**

```typescript
// ❌ BAD: getBy throws immediately
test('displays user data after load', async () => {
  render(<UserProfile userId={123} />)
  const userName = screen.getByText(/john doe/i) // Throws if API call pending
})

// ✅ GOOD: findBy retries until element appears (1000ms default timeout)
test('displays user data after load', async () => {
  render(<UserProfile userId={123} />)
  const userName = await screen.findByText(/john doe/i) // Waits for API response
  expect(userName).toBeInTheDocument()
})

// ✅ ALSO GOOD: Use waitFor for complex assertions
import { waitFor } from '@testing-library/react'

test('displays user data after load', async () => {
  render(<UserProfile userId={123} />)
  await waitFor(() => {
    expect(screen.getByText(/john doe/i)).toBeInTheDocument()
  })
})
```

**Warning signs:** Error message "Unable to find element with text matching /.../" on elements you can see in the rendered output. Tests fail intermittently based on network timing.

**Source:** [Testing Library Queries](https://testing-library.com/docs/queries/about/), [Query Variants](https://www.hannaliebl.com/blog/query-vs-find-vs-get-in-react-testing-library/)

### Pitfall 3: Testing Next.js Server Components (Async) with Vitest

**What goes wrong:** Vitest throws errors when trying to test `async` Server Components (Next.js App Router).

**Why it happens:** Async Server Components are new to React ecosystem. Vitest doesn't have built-in support yet (as of Feb 2026).

**How to avoid:**

```typescript
// ❌ BAD: Can't test async Server Components with Vitest
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await fetch('/api/dashboard')
  return <Dashboard data={data} />
}

// __tests__/dashboard.test.tsx
// This will fail - Vitest doesn't support async components
test('renders dashboard', () => {
  render(<DashboardPage />) // Error: async components not supported
})

// ✅ GOOD: Extract logic into separate function, test that
// app/dashboard/page.tsx
export async function getDashboardData() {
  const response = await fetch('/api/dashboard')
  return response.json()
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  return <Dashboard data={data} />
}

// __tests__/dashboard.test.tsx
// Unit test the data fetching function
test('getDashboardData fetches dashboard data', async () => {
  const data = await getDashboardData()
  expect(data).toHaveProperty('metrics')
})

// Test the presentational component separately
test('Dashboard renders metrics', () => {
  const mockData = { metrics: { revenue: 1000 } }
  render(<Dashboard data={mockData} />)
  expect(screen.getByText(/1000/)).toBeInTheDocument()
})

// ✅ ALTERNATIVE: Use Playwright for E2E testing of full page
// tests/e2e/dashboard.spec.ts (Playwright, not Vitest)
test('dashboard page displays user data', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText(/revenue/i)).toBeVisible()
})
```

**Warning signs:** Error messages like "async components are not supported" when testing Next.js App Router pages. Tests fail on components with `async` keyword.

**Recommendation:** Use Vitest for synchronous Server Components and Client Components. Use Playwright E2E tests for async Server Components and full page flows.

**Source:** [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest), [Next.js Testing Overview](https://nextjs.org/docs/app/guides/testing)

### Pitfall 4: Not Isolating Tests (File-Level vs Test-Level)

**What goes wrong:** Tests share state, causing flaky failures. Test 1 modifies global object, Test 2 fails because it expects clean state.

**Why it happens:** Vitest creates one context per test file (not per test like Playwright). Global variables, imports, and module state persist within the file.

**How to avoid:**

```typescript
// ❌ BAD: Global state shared across tests
let userId = 0

test('creates user', () => {
  userId = 123 // Modifies global
  expect(userId).toBe(123)
})

test('deletes user', () => {
  expect(userId).toBe(0) // FAILS - userId is still 123 from previous test
})

// ✅ GOOD: Use beforeEach to reset state
import { beforeEach, test, expect } from 'vitest'

let userId: number

beforeEach(() => {
  userId = 0 // Reset before each test
})

test('creates user', () => {
  userId = 123
  expect(userId).toBe(123)
})

test('deletes user', () => {
  expect(userId).toBe(0) // PASSES - userId reset by beforeEach
})

// ✅ BETTER: Pass state explicitly, no globals
test('creates user', () => {
  const userId = 123
  expect(userId).toBe(123)
})

test('deletes user', () => {
  const userId = 0
  expect(userId).toBe(0)
})
```

**Warning signs:** Tests pass individually but fail when run together. Different results when changing test order. Intermittent failures in CI.

**Source:** [Vitest Browser Mode vs Playwright](https://www.epicweb.dev/vitest-browser-mode-vs-playwright), [Playwright Test Isolation](https://playwright.dev/docs/browser-contexts)

### Pitfall 5: Over-Reliance on Coverage Percentage

**What goes wrong:** 80% coverage achieved, but critical edge cases untested. Coverage metric becomes a vanity metric.

**Why it happens:** Coverage measures lines executed, not scenarios tested. 80% coverage doesn't mean 80% of bugs caught.

**How to avoid:**

```typescript
// ❌ BAD: 100% line coverage, but missing critical edge cases
function divide(a: number, b: number) {
  return a / b
}

test('divide works', () => {
  expect(divide(10, 2)).toBe(5) // 100% coverage, but...
  // Missing: divide by zero, negative numbers, NaN, Infinity
})

// ✅ GOOD: Test edge cases, not just happy path
describe('divide', () => {
  test('divides positive integers', () => {
    expect(divide(10, 2)).toBe(5)
  })

  test('throws on divide by zero', () => {
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero')
  })

  test('handles negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5)
  })

  test('handles decimal results', () => {
    expect(divide(5, 2)).toBe(2.5)
  })
})
```

**How to avoid:** Focus on **scenario coverage**, not line coverage. Ask: "What can go wrong?" Test error cases, boundary conditions, invalid inputs, race conditions.

**Warning signs:** High coverage but production bugs slip through. Tests only check happy paths. No tests for error handling, validation, edge cases.

**Recommendation:** Use coverage as a floor (80% minimum), not a ceiling. Prioritize testing critical paths (payment processing, authentication, data integrity) over hitting coverage targets.

**Source:** [Software Testing Anti-Patterns](https://blog.codepipes.com/testing/software-testing-antipatterns.html), [Unit Testing Anti-Patterns](https://www.yegor256.com/2018/12/11/unit-testing-anti-patterns.html)

## Code Examples

Verified patterns from official sources.

### Next.js 14 Component Test with Testing Library

```typescript
// Source: https://nextjs.org/docs/app/guides/testing/vitest (2026-02-11)
// apps/web/__tests__/page.test.tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from '../app/page'

test('Page renders heading', () => {
  render(<Page />)
  expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeDefined()
})
```

### MSW 2.0 Request Handler

```typescript
// Source: https://mswjs.io/docs/integrations/node/
// apps/web/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('https://payments.comgate.cz/v1.0/create', () => {
    return HttpResponse.json({
      code: 0,
      message: 'OK',
      transId: 'TEST-12345',
      redirect: 'https://payments.comgate.cz/client/instructions/index?id=TEST-12345',
    })
  }),
]
```

### Vitest Setup File with MSW Lifecycle

```typescript
// Source: https://mswjs.io/docs/integrations/node/
// apps/web/vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Vitest Coverage Configuration

```typescript
// Source: https://vitest.dev/guide/coverage
// vitest.shared.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
```

### Testing Library User Interaction

```typescript
// Source: https://testing-library.com/docs/queries/about/
// apps/web/app/components/BookingForm.test.tsx
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { expect, test } from 'vitest'
import BookingForm from './BookingForm'

test('user can submit booking form', async () => {
  const user = userEvent.setup()
  const mockOnSubmit = vi.fn()

  render(<BookingForm onSubmit={mockOnSubmit} />)

  const serviceSelect = screen.getByRole('combobox', { name: /select service/i })
  await user.selectOptions(serviceSelect, 'haircut')

  const submitButton = screen.getByRole('button', { name: /book appointment/i })
  await user.click(submitButton)

  expect(mockOnSubmit).toHaveBeenCalledWith({ service: 'haircut' })
})
```

### Zod Schema Validation Test

```typescript
// Source: https://stevekinney.com/courses/full-stack-typescript/testing-zod-schema
// packages/shared/src/schemas/booking.test.ts
import { describe, it, expect } from 'vitest'
import { bookingCreateSchema } from './booking'

describe('bookingCreateSchema', () => {
  it('validates correct booking data', () => {
    const validData = {
      companyId: 123,
      customerId: 456,
      serviceId: 789,
      startTime: '2026-02-20T14:00:00+01:00',
      endTime: '2026-02-20T15:00:00+01:00',
    }

    const result = bookingCreateSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects booking with missing fields', () => {
    const invalidData = { companyId: 123 }
    const result = bookingCreateSchema.safeParse(invalidData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0)
    }
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|---------|
| Jest | Vitest 4.0 | 2023-2024 | 10-20x faster tests, native ESM, no complex config |
| c8 coverage | v8 coverage (@vitest/coverage-v8) | Vitest 3.2.0 (2024) | AST-based accuracy matching Istanbul, no performance penalty |
| jsdom (default) | happy-dom | 2024-2025 | 3-5x faster for most use cases, still use jsdom for 100% browser API parity |
| MSW 1.x | MSW 2.0 | 2023 | Native fetch support, TypeScript improvements, better error messages |
| axios-mock-adapter | MSW 2.0 | 2023-2024 | Works with fetch + axios, network-level interception, CORS/headers handled |
| pg-mem (database mocking) | PGLite | 2024-2025 | Real Postgres (100% compatibility), WASM-based, millisecond startup |
| Drizzle mocking | PGLite + real Drizzle | 2025 | No mock complexity, test real queries, catch migration issues |
| fireEvent | userEvent | 2022-2023 | Simulates real user behavior (focus, blur), catches validation edge cases |

**Deprecated/outdated:**

- **@vitest/coverage-c8:** Deprecated, use `@vitest/coverage-v8` instead (c8 package abandoned 2+ years ago)
- **Jest with Next.js:** No longer officially recommended by Next.js team (as of Next.js 15)
- **workspace feature (vitest.workspace):** Deprecated since Vitest 3.2, replaced with projects configuration (functionally the same)
- **vi.mock() for Drizzle ORM:** Not officially supported, community consensus is to use PGLite for real database testing

## Open Questions

### 1. RabbitMQ/amqplib mocking strategy

**What we know:**
- `mock-amqplib` package exists but last published 2 years ago (stale)
- Community recommends using Docker Compose with real RabbitMQ for integration tests
- Vitest supports mocking via `vi.mock()` but RabbitMQ client API is complex

**What's unclear:**
- Is `mock-amqplib` still maintained and compatible with latest amqplib?
- Should we mock RabbitMQ for unit tests or only test with real instance?
- How to test event handlers without full RabbitMQ infrastructure?

**Recommendation:**
- **For unit tests:** Mock at the service boundary (test that `publishEvent()` is called with correct payload), don't mock amqplib internals
- **For integration tests:** Use Docker Compose with real RabbitMQ (already in project)
- **For CI:** Consider in-memory AMQP broker (Apache Qpid) if Docker is slow, but validate behavior matches RabbitMQ

**Sources:** [mock-amqplib npm](https://www.npmjs.com/package/mock-amqplib), [RabbitMQ Testing Discussion](https://groups.google.com/g/rabbitmq-users/c/Eegzba39PD4)

### 2. Next.js Server Actions testing approach

**What we know:**
- Server Actions are new to React/Next.js ecosystem
- Vitest doesn't fully support async Server Components (as of Feb 2026)
- Can test Server Actions by extracting logic into separate functions

**What's unclear:**
- Best practice for testing Server Actions that use `revalidatePath`, `cookies()`, `headers()`
- How to mock Next.js runtime APIs (redirect, revalidatePath) in unit tests
- Should we use Playwright for all Server Action tests or just async ones?

**Recommendation:**
- **For unit tests:** Extract data fetching logic into separate functions, test those with Vitest
- **For Server Actions with Next.js runtime APIs:** Use `vi.mock('next/navigation')` to mock redirect, revalidatePath
- **For full page flows:** Use Playwright E2E tests
- **Monitor:** Next.js 15+ may add official testing utilities for Server Actions

**Sources:** [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest), [Server Actions Testing Discussion](https://github.com/vercel/next.js/discussions/69036)

### 3. Playwright integration with Vitest workspace

**What we know:**
- Playwright is chosen for E2E tests (Safari support for 40% CZ iOS users)
- Vitest workspace can orchestrate multiple test types
- Playwright has its own test runner (separate from Vitest)

**What's unclear:**
- Should Playwright tests run via `vitest` command or separate `playwright test` command?
- Can we share MSW handlers between Vitest unit tests and Playwright E2E tests?
- How to coordinate coverage reporting across Vitest (unit) and Playwright (E2E)?

**Recommendation:**
- **Keep separate:** Run Playwright with its own command (`playwright test`), Vitest with `vitest`
- **MSW sharing:** Use MSW for Vitest unit tests only. Playwright should test against real backend (or staging environment)
- **Coverage:** Vitest tracks unit test coverage. Playwright doesn't need coverage (E2E tests cover integration, not line coverage)
- **CI:** Run both in parallel (Vitest unit tests + Playwright E2E) but report separately

**Note:** This is outside Phase 16 scope (Playwright setup is Phase 13: Polish). This phase focuses on unit testing foundation.

**Sources:** [Playwright Best Practices](https://playwright.dev/docs/best-practices), [Vitest vs Playwright Comparison](https://www.browserstack.com/guide/vitest-vs-playwright)

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Vitest Configuration Reference](https://vitest.dev/config/) - Vitest 4.0 configuration options
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage) - Coverage provider comparison, threshold configuration
- [Vitest Workspace Guide](https://vitest.dev/guide/workspace) - Monorepo workspace setup (deprecated, use projects)
- [Vitest Projects Guide](https://vitest.dev/guide/projects) - Modern workspace configuration
- [Next.js Vitest Testing Guide](https://nextjs.org/docs/app/guides/testing/vitest) - Official Next.js 14 App Router setup (updated 2026-02-11)
- [MSW Node.js Integration](https://mswjs.io/docs/integrations/node/) - MSW 2.0 lifecycle setup
- [MSW Network Behavior Overrides](https://mswjs.io/docs/best-practices/network-behavior-overrides/) - Handler reset patterns
- [Testing Library Queries](https://testing-library.com/docs/queries/about/) - Query type differences and priority

**Context7/Official Package Docs:**
- [@vitest/coverage-v8 npm](https://www.npmjs.com/package/@vitest/coverage-v8) - v8 coverage provider
- [MSW GitHub](https://github.com/mswjs/msw) - MSW 2.0 (3.8M+ weekly downloads)
- [@testing-library/react npm](https://www.npmjs.com/package/@testing-library/react) - React Testing Library (14M+ weekly downloads)

### Secondary (MEDIUM confidence)

**Community Examples and Guides:**
- [Vitest Monorepo Setup Issue #9484](https://github.com/vitest-dev/vitest/issues/9484) - Recent discussion (Jan 2026) on shared config pattern
- [Next.js with-vitest Example](https://github.com/vercel/next.js/tree/canary/examples/with-vitest) - Official Next.js Vitest template
- [Drizzle Vitest PGLite Example](https://github.com/rphlmr/drizzle-vitest-pg) - PGLite integration pattern
- [PGLite + Drizzle + Vitest TDD Guide](https://nikolamilovic.com/posts/fun-sane-node-tdd-postgres-pglite-drizzle-vitest/) - Feb 2025 guide
- [Testing with Zod (Steve Kinney)](https://stevekinney.com/courses/full-stack-typescript/testing-zod-schema) - Zod validation testing patterns
- [Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) - Kent C. Dodds best practices
- [Vitest Coverage Report GitHub Action](https://github.com/marketplace/actions/vitest-coverage-report) - CI coverage reporting

**Tutorials and Blog Posts:**
- [How to setup Vitest in Next.js 14](https://www.codemancers.com/blog/2024-04-26-setup-vitest-on-nextjs-14) - Step-by-step setup
- [Setting up Next.js 14 with Vitest and TypeScript](https://medium.com/@jplaniran01/setting-up-next-js-14-with-vitest-and-typescript-71b4b67f7ce1) - Community guide
- [Next.js Unit Testing with Vitest and Playwright](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright) - Comprehensive testing guide
- [Vitest Code Coverage with GitHub Actions](https://medium.com/@alvarado.david/vitest-code-coverage-with-github-actions-report-compare-and-block-prs-on-low-coverage-67fceaa79a47) - CI coverage workflow

### Tertiary (LOW confidence - marked for validation)

**Comparisons and Discussions:**
- [jsdom vs happy-dom Discussion](https://github.com/vitest-dev/vitest/discussions/1607) - Community debate (some outdated perf claims)
- [jsdom vs happy-dom Blog Post](https://blog.seancoughlin.me/jsdom-vs-happy-dom-navigating-the-nuances-of-javascript-testing) - Performance comparison (needs verification)
- [happy-dom Performance Discussion](https://github.com/capricorn86/happy-dom/discussions/1438) - Conflicting performance reports
- [How to unit test Server Actions Discussion](https://github.com/vercel/next.js/discussions/69036) - Community patterns (no official guidance)
- [mock-amqplib npm](https://www.npmjs.com/package/mock-amqplib) - Stale package (2 years old)

**Anti-Patterns and Pitfalls:**
- [Software Testing Anti-Patterns (Codepipes)](https://blog.codepipes.com/testing/software-testing-antipatterns.html) - General testing anti-patterns
- [Unit Testing Anti-Patterns (Yegor Bugayenko)](https://www.yegor256.com/2018/12/11/unit-testing-anti-patterns.html) - Test isolation patterns
- [Playwright Best Practices (BrowserStack)](https://www.browserstack.com/guide/playwright-best-practices) - E2E testing guidance (out of scope for Phase 16)

## Metadata

**Confidence breakdown:**

- **Standard stack:** HIGH - Vitest, MSW, Testing Library are industry standard, officially recommended by Next.js team, verified via official docs updated Feb 2026
- **Architecture:** HIGH - Workspace pattern verified via official Vitest docs, MSW lifecycle from official integration guide, Next.js setup from official Next.js docs
- **Pitfalls:** MEDIUM-HIGH - MSW reset, async components, test isolation verified via official docs; happy-dom performance has conflicting reports (needs project-specific benchmarking)
- **Database testing (PGLite):** MEDIUM - Community consensus favors PGLite over mocking, but less official documentation than other stack choices
- **RabbitMQ mocking:** LOW - Limited current guidance, mock-amqplib is stale, needs project-specific decision on unit vs integration testing approach

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - testing ecosystem is relatively stable)

**Next steps for validation:**
1. Benchmark happy-dom vs jsdom with project's actual components (some reports show happy-dom slower with accessibility queries)
2. Confirm PGLite compatibility with Drizzle ORM v0.36.4 and Postgres 16 features used in project
3. Decide RabbitMQ testing strategy (mock vs Docker vs in-memory broker)
4. Monitor Next.js 15 release for official Server Actions testing utilities
