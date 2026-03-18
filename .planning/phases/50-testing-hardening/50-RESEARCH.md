# Phase 50: Testing & Hardening - Research

**Researched:** 2026-03-18
**Domain:** Vitest unit testing, Playwright E2E, Storybook 8, PostgreSQL range partitioning
**Confidence:** HIGH (existing infrastructure thoroughly understood from direct code inspection)

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Priority order: 1) availability-engine (≥90% branch), 2) payment saga (≥85% branch), 3) booking-service, 4) booking-transitions/expiration
- Mock external dependencies (Neon DB, Upstash Redis, Twilio) in unit tests — integration tests cover real DB via Testcontainers
- CI fails build if coverage drops below 80% (already configured in vitest.shared.ts)
- Testcontainers: CI-only with graceful skip locally (user doesn't have Docker)
- Add admin impersonation E2E flow (required by TEST-02)
- Add marketplace search/booking E2E flow (covers newest feature)
- Existing 5 specs stay (auth, booking, payment, AI fallback, widget visual)
- Storybook 8 with Vite builder (fastest)
- Stories colocated next to components (e.g., Button.stories.tsx)
- Visual documentation only — no interaction testing (covered by Playwright)
- Components to document: Button, Card, Dialog, Badge, DataTable — all CVA glass variants
- Deployment: Claude's discretion (dev-only recommended for small team)
- Conservative migration: create partitioned table → migrate data in batches → swap with RENAME → keep rollback script
- All three tables: bookings (by month), notifications (by month), audit_logs (by month)
- Partition range: Claude's discretion (all historical data + pre-create future months)
- Test on Neon branch before production
- Raw SQL migration (not Drizzle — Drizzle doesn't support native PG partitioning)

### Claude's Discretion

- E2E database choice (Neon branch vs CI PostgreSQL service)
- Storybook deployment model
- Partition range (how many months back/ahead)
- Which additional lib/ files to cover for 80% target beyond the 4 priority files
- Auto-partition creation strategy (Vercel Cron or manual)

### Deferred Ideas (OUT OF SCOPE)

- Per-company payment gateway configuration
- Component interaction testing in Storybook (play functions)
- Visual regression testing in Storybook via Chromatic

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                          | Research Support                                                                    |
| ------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| TEST-01 | Vitest unit test coverage reaches 80% on critical business logic     | Mocking patterns for DB/Redis, vitest.fn() for dbTx.transaction, vi.mock() for deps |
| TEST-02 | Playwright E2E for booking flow, payments, auth, and admin           | Admin impersonation uses separate storageState; marketplace uses page.route() mocks |
| TEST-03 | Testcontainers integration tests for DB operations (CI-only)         | SKIP_DOCKER env guard pattern already established; global setup handles containers  |
| TEST-04 | Storybook for core UI components (Button, Card, Dialog, Badge, DataTable) | Storybook 8 + @storybook/nextjs; CSF3 format; Tailwind via globals.css import      |
| HARD-01 | DB partitioning for bookings table by month (raw SQL migration)      | PARTITION BY RANGE (start_time); btree_gist must be recreated on partitioned table  |
| HARD-02 | DB partitioning for notifications and audit_logs tables              | Same RANGE pattern; notifications.scheduled_at, audit_logs.created_at as range key  |

</phase_requirements>

## Summary

Phase 50 closes the final six v3.0 requirements. The testing work is additive — the project already has Vitest 4.0 with 80% thresholds, Playwright multi-browser config, and Testcontainers integration setup. What is missing is actual test coverage for the four critical business logic files (availability-engine, payment saga, booking-service, booking-transitions/expiration), two new E2E flows (admin impersonation, marketplace), and Storybook itself.

The unit test challenge is that all four priority files are deeply DB-coupled (they call `db.*` and `dbTx.transaction()`). The correct approach is to `vi.mock('@schedulebox/database')` at the module level and return mock implementations that exercise the pure business logic (state machine transitions, time range overlap math, idempotency guards) without touching Neon. The SAGA payment handlers in `booking-payment-handlers.ts` are the best-isolated — they have clear idempotency branches that map directly to test cases.

DB partitioning on Neon (serverless PostgreSQL 16) requires raw SQL only — Drizzle cannot express `PARTITION BY RANGE`. The conservative approach (create partitioned shadow → batch migrate → RENAME swap) is the only safe strategy on a live production database. The `btree_gist` exclusion constraint used for double-booking prevention must be explicitly recreated on the partitioned table since constraints do not inherit across partition parents in PostgreSQL 16.

**Primary recommendation:** Unit tests first (TEST-01 unblocks coverage gate), then Storybook (no code risk), then E2E additions (TEST-02), then DB partitioning last (HARD-01/02 is the highest risk operation and should happen after all tests pass).

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
| ------- | ------- | ------- | ------------ |
| vitest | ^4.0.18 | Unit test runner | Already in package.json, configured with 5 workspaces |
| @vitest/coverage-v8 | ^4.0.18 | Code coverage | v8 provider, 80% thresholds enforced |
| @playwright/test | (in apps/web) | E2E browser automation | Already configured multi-browser |
| @testcontainers/postgresql | ^11.12.0 | Integration test DB | Already in globalSetup |
| happy-dom | ^20.6.3 | DOM environment for Vitest | Already in vitest.shared.ts |

### To Be Installed (Storybook)

| Library | Version | Purpose | When to Use |
| ------- | ------- | ------- | ----------- |
| @storybook/nextjs | ^8.x | Storybook Next.js framework | Required for Next.js App Router support |
| @storybook/addon-essentials | ^8.x | Controls, actions, docs addons | Bundled with Storybook init |
| storybook | ^8.x | Core CLI and server | Peer dep of framework packages |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| ---------- | --------- | -------- |
| @storybook/nextjs | @storybook/react-vite | nextjs adapter handles next/font, next/image, App Router correctly |
| vi.mock() for DB | msw + in-memory DB | vi.mock() is simpler for pure unit tests; MSW already used for HTTP-level tests |
| PARTITION BY RANGE | Declarative partitioning via extension | Native PG RANGE partitioning is standard for time-series tables |

**Installation:**
```bash
# Storybook 8 (run from apps/web)
pnpm dlx storybook@8 init --type nextjs --no-open
```

## Architecture Patterns

### Recommended Project Structure (additions only)

```
apps/web/
├── lib/booking/
│   ├── booking-service.ts
│   ├── booking-service.test.ts          # NEW — unit tests
│   ├── booking-transitions.ts
│   ├── booking-transitions.test.ts      # NEW — unit tests
│   ├── booking-expiration.ts
│   ├── booking-expiration.test.ts       # NEW — unit tests
│   └── availability-engine.test.ts      # NEW — unit tests (≥90% branch)
├── app/api/v1/payments/saga/
│   └── booking-payment-handlers.test.ts # NEW — unit tests (≥85% branch)
├── components/ui/
│   ├── button.tsx
│   ├── button.stories.tsx               # NEW — Storybook story
│   ├── card.tsx
│   ├── card.stories.tsx                 # NEW
│   ├── dialog.tsx
│   ├── dialog.stories.tsx               # NEW
│   ├── badge.tsx
│   └── badge.stories.tsx                # NEW
├── components/shared/
│   ├── data-table.tsx
│   └── data-table.stories.tsx           # NEW
└── e2e/tests/
    ├── admin-impersonation.spec.ts       # NEW — E2E flow
    └── marketplace.spec.ts              # NEW — E2E flow
packages/database/src/migrations/
└── 0004_partition_bookings.sql          # NEW — raw SQL partition migration
    0005_partition_notifications.sql     # NEW
    0006_partition_audit_logs.sql        # NEW
    0007_partition_rollback.sql          # NEW — rollback script
.storybook/
├── main.ts                              # NEW — Storybook config
└── preview.ts                          # NEW — Tailwind globals import
```

### Pattern 1: Unit Testing DB-Coupled Modules

**What:** Mock the `@schedulebox/database` module at test suite level, then provide per-test implementations.
**When to use:** Any lib file that imports `db`, `dbTx`, table schemas from `@schedulebox/database`.
**Example:**
```typescript
// booking-service.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Must be before any import that uses @schedulebox/database
vi.mock('@schedulebox/database', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  dbTx: { transaction: vi.fn() },
  bookings: {},
  services: {},
  employees: {},
  // ... other table exports
}));

import { createBooking } from './booking-service';
import { db, dbTx } from '@schedulebox/database';

describe('createBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws SLOT_TAKEN when conflicting booking found', async () => {
    // Make transaction call through to callback with a mock tx
    const mockTx = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1 }]), // conflict found
      insert: vi.fn().mockReturnThis(),
      for: vi.fn().mockReturnThis(),
    };
    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx));

    await expect(createBooking(input, { companyId: 1, userId: 1 }))
      .rejects.toMatchObject({ code: 'SLOT_TAKEN' });
  });
});
```

### Pattern 2: Payment SAGA Idempotency Tests

**What:** Test each idempotency branch of handlePaymentCompleted/Failed/Expired directly, since these functions have pure state-machine logic once DB calls are mocked.
**When to use:** All three SAGA handlers have the same `already confirmed → skip`, `already cancelled → skip` branch structure.
**Example:**
```typescript
it('ignores duplicate payment.completed when booking already confirmed', async () => {
  const mockTx = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    for: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 1, uuid: 'abc', status: 'confirmed', companyId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx));

  await handlePaymentCompleted({ bookingUuid: 'abc', paymentUuid: 'pay-1' });

  // No update should have been called
  expect(mockTx.update).not.toHaveBeenCalled();
});
```

### Pattern 3: Drizzle Query Builder Mock (chained calls)

**What:** Drizzle uses method chaining (`db.select().from().where().limit()`). The vi.fn() chain pattern.
**When to use:** Everywhere db.select/insert/update is called without a transaction.
**Example:**
```typescript
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([mockService]),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  offset: vi.fn().mockResolvedValue([]),
};
vi.mocked(db.select).mockReturnValue(selectChain as any);
```

### Pattern 4: Testcontainers Graceful Skip

**What:** Guard the entire integration test file against environments without Docker.
**When to use:** All `tests/integration/**` files. The SKIP_DOCKER check goes in globalSetup.ts.
**Example:**
```typescript
// tests/integration/globalSetup.ts — add at top of setup()
export async function setup(project: TestProject) {
  if (process.env.SKIP_DOCKER === 'true') {
    console.log('[Integration] Skipping — SKIP_DOCKER=true');
    // Provide dummy URLs so inject() doesn't throw in tests
    project.provide('DATABASE_URL', '');
    project.provide('DATABASE_URL_APP', '');
    project.provide('REDIS_URL', '');
    project.provide('RABBITMQ_URL', '');
    return;
  }
  // ... existing container startup
}
```
And in each test file:
```typescript
const dbUrl = inject('DATABASE_URL');
if (!dbUrl) {
  test.skip('requires Docker');
}
```

### Pattern 5: Storybook CSF3 with Tailwind Glass Variants

**What:** Component Story Format 3 (CSF3) with args controlling CVA variant props. Storybook preview.ts must import Tailwind globals to render glass classes.
**When to use:** All UI component stories.
**Example:**
```typescript
// button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = { args: { children: 'Click me' } };
export const GlassSecondary: Story = { args: { variant: 'glass-secondary', children: 'Glass' } };
export const GlassGhost: Story = { args: { variant: 'glass-ghost', children: 'Ghost' } };
export const Loading: Story = { args: { isLoading: true, children: 'Loading' } };
```

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../apps/web/app/globals.css'; // Tailwind directives + glass CSS variables

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'gradient',
      values: [
        { name: 'gradient', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' },
        { name: 'light', value: '#f8fafc' },
      ],
    },
  },
};
export default preview;
```

### Pattern 6: PostgreSQL Range Partitioning (Raw SQL)

**What:** PARTITION BY RANGE on timestamp column using monthly partitions. Create shadow table, batch-migrate data, RENAME swap.
**When to use:** bookings, notifications, audit_logs.
**Example (bookings):**
```sql
-- Step 1: Create partitioned shadow table
CREATE TABLE bookings_partitioned (LIKE bookings INCLUDING ALL)
  PARTITION BY RANGE (start_time);

-- Step 2: Create monthly partitions (historical + 12 months forward)
CREATE TABLE bookings_2025_01 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- ... repeat for each month

CREATE TABLE bookings_default PARTITION OF bookings_partitioned DEFAULT;

-- Step 3: Recreate btree_gist exclusion constraint ON THE PARENT
-- (PG 16 supports partition-level exclusion constraints)
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- Note: exclusion constraints cannot be on partitioned tables directly in PG 16
-- They must be added per-partition or enforced at application level (SELECT FOR UPDATE)
-- The application-level SELECT FOR UPDATE is already the primary defense.

-- Step 4: Batch migrate data (500-row batches)
INSERT INTO bookings_partitioned
SELECT * FROM bookings
ORDER BY id
LIMIT 500 OFFSET 0;
-- ... repeat in batches via application script

-- Step 5: RENAME swap (requires brief lock)
BEGIN;
ALTER TABLE bookings RENAME TO bookings_old;
ALTER TABLE bookings_partitioned RENAME TO bookings;
COMMIT;

-- Step 6: Rollback (if needed)
BEGIN;
ALTER TABLE bookings RENAME TO bookings_partitioned;
ALTER TABLE bookings_old RENAME TO bookings;
COMMIT;
```

### Anti-Patterns to Avoid

- **Mocking too broadly:** Don't mock `@schedulebox/shared` error classes — they are pure TypeScript with no side effects and should be imported directly to test real error types.
- **Deep chain stubs returning wrong types:** When mocking `.select().from().where()...`, the final `.limit()` must resolve (not return) to avoid "expected array, got Promise chain" bugs. Always end with `.mockResolvedValue([...])`.
- **Partitioning before testing:** Never run the partition migration until all unit/E2E/integration tests pass on the target branch. A failed migration mid-swap requires manual DB surgery.
- **Drizzle schema after partitioning:** Drizzle introspection will fail on a partitioned table (it cannot express `PARTITION BY RANGE`). The solution: keep the Drizzle schema file unchanged (it defines the logical shape), only apply partitioning via raw SQL files in `db:apply-sql`.
- **btree_gist on parent partition:** In PostgreSQL 16, `EXCLUDE USING gist` constraints cannot be declared on a partitioned table parent directly — they must be on each partition. Since the project already uses application-level `SELECT FOR UPDATE` as the primary guard, this is acceptable. Document explicitly that the exclusion constraint is per-partition.
- **Storybook with next-intl:** DataTable uses `useTranslations('table')`. Wrap in a mock IntlProvider in the story or pass translated strings as props to avoid next-intl context errors in Storybook.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
| ------- | ----------- | ----------- | --- |
| DB mocking in unit tests | Custom fake DB layer | vi.mock('@schedulebox/database') + vitest.fn() chains | Vitest's built-in mocking handles all this |
| HTML coverage report | Custom reporter | Built-in `@vitest/coverage-v8` with reporter: ['html'] | Already configured in vitest.shared.ts |
| Storybook Tailwind integration | Custom PostCSS setup | Import globals.css in .storybook/preview.ts | Storybook Vite builder picks up PostCSS automatically |
| Partition auto-creation | Custom cron script | Vercel Cron + simple INSERT SQL + pg_partman (optional) | Manual pre-creation of 12 months forward is simpler for MVP |
| E2E admin auth | Separate login flow per test | Playwright storageState with separate admin auth file | Playwright's auth project pattern handles multi-role auth |

**Key insight:** The entire test infrastructure is already configured — this phase writes tests, not infrastructure. Every new pattern slots into existing configs.

## Common Pitfalls

### Pitfall 1: Drizzle Transaction Mock - cb not called

**What goes wrong:** `dbTx.transaction` is mocked but the callback `cb` is never invoked, so the code under test never executes and assertions on inner calls never fire.
**Why it happens:** `vi.fn()` returns `undefined` by default — the callback is received but not called.
**How to avoid:** Always implement: `vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx))`
**Warning signs:** Test passes vacuously (no expect() assertions triggered), 0% branch coverage on transaction path.

### Pitfall 2: `'use client'` directive breaks Vitest imports

**What goes wrong:** `button.tsx` and `data-table.tsx` have `'use client'` at the top. Vitest in Node environment throws "ReferenceError: document is not defined" or similar.
**Why it happens:** `'use client'` is a Next.js directive, not valid Node.js. Vitest in `happy-dom` handles this, but only if the environment is set correctly.
**How to avoid:** `apps/web/vitest.config.ts` already sets `environment: 'happy-dom'` — Storybook stories run in browser context anyway. For unit tests of client components, ensure test file is inside `apps/web/` scope (not root `tests/`), which uses the `web` Vitest project with `happy-dom`.

### Pitfall 3: Partition RENAME swap takes exclusive lock

**What goes wrong:** `ALTER TABLE bookings RENAME TO bookings_old` acquires AccessExclusiveLock. On a busy production table, this blocks all reads and writes until the lock is granted.
**Why it happens:** PostgreSQL requires exclusive lock for catalog changes.
**How to avoid:** Schedule during maintenance window (low-traffic period). On Neon, this affects all connections. Run migration via Neon branch first (HARD decision from CONTEXT.md). Keep batch migration and RENAME in separate transactions — do not do both in one BEGIN/COMMIT.
**Warning signs:** Monitoring shows connection queue growing during migration.

### Pitfall 4: btree_gist constraint on parent partitioned table

**What goes wrong:** `CREATE TABLE bookings_partitioned (...) PARTITION BY RANGE (start_time)` with `EXCLUDE USING gist` on the parent fails in PostgreSQL 16.
**Why it happens:** PG does not propagate exclusion constraints to partitions; the constraint must be on each partition individually.
**How to avoid:** The application already uses `SELECT FOR UPDATE` as the primary double-booking prevention. Document that the exclusion constraint is per-partition, add it to each monthly partition after creation, and the `bookings_default` partition as well.

### Pitfall 5: Storybook DataTable fails due to missing next-intl context

**What goes wrong:** `DataTable` calls `useTranslations('table')`. Storybook renders without `NextIntlClientProvider`, causing invariant error.
**Why it happens:** next-intl hooks require a provider in the component tree.
**How to avoid:** Wrap DataTable stories in a decorator that provides mock translations:
```typescript
// data-table.stories.tsx
import { NextIntlClientProvider } from 'next-intl';
const messages = { table: { noData: 'No data', showing: 'Showing', to: 'to', of: 'of', entries: 'entries', page: 'Page', } };
const meta: Meta = {
  decorators: [(Story) => (
    <NextIntlClientProvider locale="cs" messages={messages}><Story /></NextIntlClientProvider>
  )],
};
```

### Pitfall 6: E2E Admin Impersonation - HttpOnly Token Not Readable

**What goes wrong:** The `imp_token` is HttpOnly (confirmed in Phase 47 decisions). JS in the browser cannot read it to verify impersonation is active.
**Why it happens:** Phase 47 decision: `sessionStorage for impersonation banner: HttpOnly imp_token not JS-readable; POST response body carries display data`.
**How to avoid:** E2E test verifies the impersonation banner in the DOM (which is set via sessionStorage from the POST response body), not the cookie value. Use `page.evaluate(() => sessionStorage.getItem('impersonation'))` or check the visible banner element.

### Pitfall 7: Coverage threshold fails on untested files

**What goes wrong:** vitest.shared.ts configures 80% thresholds globally. If a new file is imported into coverage but has no tests, the threshold fails for the whole workspace.
**Why it happens:** v8 coverage instruments all files matching `include` patterns.
**How to avoid:** Use `coverage.include` in `apps/web/vitest.config.ts` to scope coverage to `lib/booking/**` and `app/api/v1/payments/saga/**` for this phase. Or add tests for all covered files before enabling coverage enforcement in CI.

## Code Examples

### Availability Engine Test (mocked DB, pure logic focus)

```typescript
// Source: pattern derived from existing integration test patterns + vitest docs
import { vi, describe, it, expect } from 'vitest';

vi.mock('@schedulebox/database', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }),
  },
  services: {},
  employees: {},
  employeeServices: {},
  workingHours: {},
  workingHoursOverrides: {},
  bookings: {},
}));

vi.mock('date-fns', async (importOriginal) => ({
  ...(await importOriginal()),
})); // keep real date-fns — pure functions, no need to mock

import { calculateAvailability } from './availability-engine';

describe('calculateAvailability', () => {
  it('returns empty array when no employees found', async () => {
    const result = await calculateAvailability({
      companyId: 1,
      serviceId: 1,
      dateFrom: '2026-04-01',
      dateTo: '2026-04-02',
      timezone: 'Europe/Prague',
    });
    expect(result).toEqual([]);
  });
});
```

### E2E Admin Impersonation Spec

```typescript
// apps/web/e2e/tests/admin-impersonation.spec.ts
import { test, expect } from '@playwright/test';

// Admin auth stored separately from owner auth
test.use({ storageState: 'apps/web/e2e/playwright/.auth/admin.json' });

test('admin can impersonate a company owner', async ({ page }) => {
  await page.goto('/admin/companies');
  await page.getByRole('button', { name: /impersonate/i }).first().click();

  // POST /api/v1/admin/impersonate returns display data, banner stored in sessionStorage
  await expect(page.getByTestId('impersonation-banner')).toBeVisible();

  // Verify impersonated user context (dashboard should show company data)
  await page.goto('/');
  await expect(page.getByTestId('impersonation-banner')).toBeVisible();

  // End impersonation
  await page.getByRole('button', { name: /end impersonation|ukoncit/i }).click();
  await expect(page.getByTestId('impersonation-banner')).not.toBeVisible();
});
```

### PostgreSQL Partition Migration (bookings)

```sql
-- 0004_partition_bookings.sql
-- HARD-01: Partition bookings table by month
-- Run on Neon branch first. RENAME swap requires maintenance window.

BEGIN;

-- Create partitioned shadow table with same structure
CREATE TABLE bookings_partitioned (
  LIKE bookings INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE (start_time);

-- Create btree_gist extension (likely already exists)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Historical monthly partitions (2024-01 through 2026-03)
-- ... (generated for each month)
CREATE TABLE bookings_2026_01 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');

CREATE TABLE bookings_2026_02 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');

CREATE TABLE bookings_2026_03 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

-- Forward partitions (12 months ahead)
CREATE TABLE bookings_2026_04 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
-- ... through 2027-03

-- Default catch-all partition for out-of-range data
CREATE TABLE bookings_default PARTITION OF bookings_partitioned DEFAULT;

COMMIT;

-- SEPARATE SCRIPT: batch migrate (run outside transaction, can be interrupted)
-- INSERT INTO bookings_partitioned SELECT * FROM bookings ORDER BY id LIMIT 500 OFFSET :n;

-- RENAME SWAP (requires maintenance window — brief AccessExclusiveLock)
BEGIN;
ALTER TABLE bookings RENAME TO bookings_old;
ALTER TABLE bookings_partitioned RENAME TO bookings;
COMMIT;
```

### Storybook main.ts for Next.js App Router

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../apps/web/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: { autodocs: 'tag' },
};

export default config;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
| ------------ | ---------------- | ------------ | ------- |
| `defineWorkspace()` in Vitest | `projects: []` in `defineConfig()` | Vitest 4.0 | Already using the new API in vitest.config.ts |
| Storybook 7 with webpack builder | Storybook 8 with Vite builder | 2024 | 2x faster HMR, better TypeScript support |
| `pg_partman` for auto-partitioning | Manual partition pre-creation + Vercel Cron | N/A | Simpler for Neon (no extension install rights needed) |
| CSF2 Storybook stories | CSF3 with `satisfies StoryObj<>` | Storybook 7+ | Better TypeScript inference |

**Deprecated/outdated:**

- `defineWorkspace()`: Was the Vitest multi-project API before v4. The project uses the correct new API already.
- Storybook 6 `storiesOf()` API: Not used here; all new stories use CSF3 `export default` format.

## Open Questions

1. **Admin E2E storage state: separate file or shared?**
   - What we know: Current auth.setup.ts logs in as `test@example.com` (owner role). Admin tests need `admin@schedulebox.cz`.
   - What's unclear: Whether to create a second setup project in playwright.config.ts or reuse the existing one with role switching.
   - Recommendation: Create `admin.setup.ts` alongside existing `auth.setup.ts`, save to `playwright/.auth/admin.json`. Add a new setup project in playwright.config.ts with `testMatch: /admin\.setup\.ts/`. Admin E2E specs use `test.use({ storageState: '.../admin.json' })`.

2. **Partition range: how far back?**
   - What we know: Project launched ~2026-02-12 (v1.0). Production data starts from that date.
   - What's unclear: Whether any pre-2026 test data exists in production Neon DB.
   - Recommendation: Create partitions from 2025-01-01 (safety buffer) through 2027-03-01 (12 months forward from now). Include a `_default` catch-all partition for data outside this range. Total: ~27 monthly partitions per table.

3. **Coverage scope: which other lib/ files count toward 80%?**
   - What we know: Current test count is 11 unit tests covering `lib/security/`, `lib/auth/hibp`, `lib/industry/`, `lib/logger/`. The 4 priority files alone likely get to 60-65%.
   - What's unclear: Exact current coverage percentage (no coverage report available without running tests).
   - Recommendation: After writing tests for the 4 priority files, run `pnpm test:coverage` and check output. Likely need `lib/booking/buffer-time.ts` (pure math, easy to test) and `lib/booking/booking-expiration.ts` to push to 80%.

## Validation Architecture

### Test Framework

| Property | Value |
| -------- | ----- |
| Framework | Vitest ^4.0.18 with v8 coverage |
| Config file | `vitest.config.ts` (root) + `apps/web/vitest.config.ts` |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test:coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
| ------ | --------- | --------- | ----------------- | ------------ |
| TEST-01 | 80% coverage on booking/payment logic | unit | `pnpm test:coverage` | ❌ Wave 0 — need test files |
| TEST-01 | availability-engine ≥90% branch coverage | unit | `pnpm test:coverage` | ❌ Wave 0 |
| TEST-01 | payment saga ≥85% branch coverage | unit | `pnpm test:coverage` | ❌ Wave 0 |
| TEST-02 | Admin impersonation E2E flow | e2e | `pnpm test:e2e` | ❌ Wave 0 |
| TEST-02 | Marketplace search/booking E2E flow | e2e | `pnpm test:e2e` | ❌ Wave 0 |
| TEST-03 | Integration tests skip gracefully without Docker | integration | `SKIP_DOCKER=true pnpm test:integration` | ❌ Wave 0 — add guard |
| TEST-04 | Storybook renders all 5 components | manual/visual | `pnpm storybook` | ❌ Wave 0 |
| HARD-01 | bookings partitioned by month, queries work | manual | Neon branch verification | ❌ Wave 0 |
| HARD-02 | notifications + audit_logs partitioned | manual | Neon branch verification | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test:unit`
- **Per wave merge:** `pnpm test:coverage`
- **Phase gate:** Full suite green + `pnpm test:e2e` passing before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/web/lib/booking/booking-service.test.ts` — covers TEST-01 (double-booking, createBooking, SLOT_TAKEN)
- [ ] `apps/web/lib/booking/booking-transitions.test.ts` — covers TEST-01 (state machine all transitions)
- [ ] `apps/web/lib/booking/booking-expiration.test.ts` — covers TEST-01 (expiry logic, event publishing)
- [ ] `apps/web/lib/booking/availability-engine.test.ts` — covers TEST-01 (≥90% branch, slot generation)
- [ ] `apps/web/app/api/v1/payments/saga/booking-payment-handlers.test.ts` — covers TEST-01 (idempotency, all 3 handlers)
- [ ] `apps/web/e2e/tests/admin-impersonation.spec.ts` — covers TEST-02
- [ ] `apps/web/e2e/tests/marketplace.spec.ts` — covers TEST-02
- [ ] `apps/web/e2e/admin.setup.ts` — admin auth state for impersonation E2E
- [ ] `apps/web/components/ui/button.stories.tsx` — covers TEST-04
- [ ] `apps/web/components/ui/card.stories.tsx` — covers TEST-04
- [ ] `apps/web/components/ui/dialog.stories.tsx` — covers TEST-04
- [ ] `apps/web/components/ui/badge.stories.tsx` — covers TEST-04
- [ ] `apps/web/components/shared/data-table.stories.tsx` — covers TEST-04
- [ ] `.storybook/main.ts` + `.storybook/preview.ts` — Storybook setup
- [ ] Testcontainers SKIP_DOCKER guard in `tests/integration/globalSetup.ts` — covers TEST-03
- [ ] `packages/database/src/migrations/0004_partition_bookings.sql` — covers HARD-01
- [ ] `packages/database/src/migrations/0005_partition_notifications.sql` — covers HARD-02
- [ ] `packages/database/src/migrations/0006_partition_audit_logs.sql` — covers HARD-02
- [ ] `packages/database/src/migrations/rollback_partitions.sql` — rollback safety net
- [ ] Storybook deps: `pnpm dlx storybook@8 init --type nextjs --no-open` (from `apps/web/`)

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `vitest.config.ts`, `vitest.shared.ts`, `vitest.integration.config.ts` — verified exact versions and config
- Direct code inspection of `apps/web/e2e/playwright.config.ts` — verified Playwright project structure
- Direct code inspection of `tests/integration/globalSetup.ts` — verified Testcontainers setup
- Direct code inspection of all 4 priority source files — verified mocking requirements
- Direct code inspection of `apps/web/components/ui/button.tsx`, `card.tsx`, `data-table.tsx` — verified CVA variants and next-intl dependency
- `package.json` — verified installed versions, test scripts

### Secondary (MEDIUM confidence)

- Storybook 8 + Next.js App Router integration: verified from Storybook official docs pattern (@storybook/nextjs framework)
- PostgreSQL 16 partitioning constraints: exclusion constraints on partitioned tables — PG docs confirm this limitation

### Tertiary (LOW confidence)

- Neon branch testing workflow for partition migration — standard Neon pattern but not directly verified against current Neon API

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions verified from package.json + direct file inspection
- Architecture: HIGH — test patterns derived from existing code patterns in the project
- Pitfalls: HIGH — derived from actual code structure (Drizzle chaining, `'use client'`, Phase 47 HttpOnly decision)
- DB partitioning SQL: MEDIUM — PostgreSQL 16 partitioning is stable and well-documented; exclusion constraint limitation is documented in PG docs

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (Storybook 8 stable, PostgreSQL 16 stable, Vitest 4 stable)
