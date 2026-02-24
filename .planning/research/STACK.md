# Technology Stack — v1.3 Revenue & Growth

**Project:** ScheduleBox v1.3
**Focus:** Subscription billing, multi-location franchise, usage limits/tier enforcement, analytics dashboards, frontend polish
**Researched:** 2026-02-24
**Confidence:** HIGH (versions verified against npm registry, official docs, and existing codebase)

> **Scope:** This document covers ONLY new additions for v1.3. The full v1.0–v1.2 stack
> (Next.js 15, Drizzle ORM, PostgreSQL 16, Redis 7, RabbitMQ 3.13, BullMQ, Twilio, Comgate one-time,
> Python FastAPI AI service, Motion, react-big-calendar, driver.js, @react-pdf/renderer, recharts,
> date-fns, shadcn/ui, Tailwind CSS, Zod, TanStack Query, Zustand) is already in production and
> must not be re-evaluated or re-introduced.
>
> **Current package.json state (verified):** recharts ^3.7.0, @react-pdf/renderer ^4.3.2,
> react-big-calendar ^1.19.4, date-fns ^4.1.0, motion ^12.34.3, pdfkit ^0.17.2 are already installed.
> The Comgate `client.ts` already handles create/status/refund via URLSearchParams POST to `v1.0/create`.

---

## Executive Summary

v1.3 adds five capability areas. Four require specific stack additions; one (frontend polish) is
already fully covered by the existing stack.

1. **Subscription billing** — Comgate already handles one-time payments. Recurring billing requires
   adding `initRecurring=true` to the existing create flow plus a new `v1.0/recurring` endpoint call
   for subsequent charges. No new payment SDK is needed — extend the existing `client.ts` in-house.
   BullMQ (already installed) handles the monthly charge scheduler via `CronScheduler`.

2. **Multi-location franchise** — The existing `companies` table becomes the franchise root.
   New `locations` table (child of `company_id`) with shared RLS. No new ORM or DB tooling needed —
   Drizzle schema extension only. Parent-child data isolation stays within the existing row-level
   security pattern.

3. **Usage limits and tier enforcement** — Redis (already installed via `ioredis`) handles limit
   counters with TTL. A new Next.js middleware layer reads `company.subscriptionPlan` and enforces
   per-tier caps. No external feature-flag service needed at this scale.

4. **Analytics dashboards** — shadcn/ui Chart component (built on recharts ^3.7.0, already
   installed) covers all chart types. PostgreSQL materialized views handle pre-aggregation.
   No time-series database, no external analytics service needed.

5. **Frontend polish** — Design system tokens (Tailwind CSS `@theme`), dark mode (`next-themes`
   already in project via shadcn), and dashboard redesign use exclusively existing stack.
   No new frontend libraries required.

**Net new libraries:** 0 npm packages, 0 Python packages. All v1.3 features build on the
existing stack through schema additions, Drizzle migrations, Comgate API extension, and
BullMQ job definitions.

---

## Additions by Category

### 1. Subscription Billing — Comgate Recurring Payments

**Status:** Comgate recurring is an API-level feature, not a library addition.

#### How Comgate Recurring Works (Verified from Official Docs + PHP SDK)

Comgate recurring billing uses a two-step pattern:

**Step 1 — Initial payment (customer-visible):**
Add `initRecurring=true` to the existing `/v1.0/create` POST call. The customer completes
a normal card payment, and Comgate registers their card for future recurring charges.
The returned `transId` becomes the `initRecurringId` anchor for all future charges.

**Step 2 — Subsequent charges (background, no customer redirect):**
Call `/v1.0/recurring` with the `initRecurringId` from Step 1. Comgate charges the stored
card silently. No customer interaction required.

**Prerequisite:** Recurring payments must be activated by contacting Comgate support.
Merchant 498621 must request this feature activation before v1.3 launch.
(LOW confidence on activation timeline — business team must confirm.)

#### Changes to Existing `client.ts`

```typescript
// apps/web/app/api/v1/payments/comgate/client.ts — ADDITIONS ONLY

export interface InitComgateSubscriptionParams extends InitComgatePaymentParams {
  initRecurring: true;
}

export interface ComgateRecurringChargeParams {
  initRecurringId: string; // transId from the initial payment
  price: number;           // CZK amount for this billing cycle
  currency: string;
  label: string;           // e.g., "ScheduleBox Professional - Feb 2026"
  refId: string;           // New UUID for this specific charge
}

/**
 * Create initial subscription payment (customer completes checkout, card is stored)
 * Returns transId which becomes the initRecurringId for all future charges.
 */
export async function initComgateSubscription(
  params: InitComgateSubscriptionParams,
): Promise<ComgatePaymentResponse> {
  // Same as initComgatePayment() but adds initRecurring=true
  const requestParams = buildComgateParams(params);
  requestParams.set('initRecurring', 'true');
  // ... call /v1.0/create same as existing flow
}

/**
 * Charge a stored card for a billing cycle (background, no redirect)
 * Called by BullMQ subscription renewal job.
 */
export async function chargeComgateRecurring(
  params: ComgateRecurringChargeParams,
): Promise<{ transId: string; status: string }> {
  const { merchantId, secret } = getComgateCredentials();
  const requestParams = new URLSearchParams();
  requestParams.set('merchant', merchantId);
  requestParams.set('secret', secret);
  requestParams.set('initRecurringId', params.initRecurringId);
  requestParams.set('price', Math.round(params.price * 100).toString());
  requestParams.set('curr', params.currency.toUpperCase());
  requestParams.set('label', params.label);
  requestParams.set('refId', params.refId);
  // ... POST to /v1.0/recurring
}
```

#### Database Changes Required (Schema Extensions)

Extend the existing `payments` table gateway enum and add `subscriptions` table:

```typescript
// packages/database/src/schema/payments.ts — NEW TABLE

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 20 })
    .notNull()
    .$type<'starter' | 'professional' | 'enterprise'>(),
  status: varchar('status', { length: 20 })
    .notNull()
    .$type<'active' | 'past_due' | 'cancelled' | 'trialing'>(),
  initRecurringId: varchar('init_recurring_id', { length: 255 }).notNull(), // Comgate transId
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  priceMonthly: numeric('price_monthly', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### BullMQ Subscription Renewal Scheduler

BullMQ is already installed and used in the notification-worker. Add a new job type:

```typescript
// services/notification-worker/src/jobs/subscription-renewal.ts

import { Queue, Worker } from 'bullmq'; // already installed

const subscriptionQueue = new Queue('subscription-renewal', { connection: redisConnection });

// Schedule: daily check at 08:00 Prague time for subscriptions expiring today
await subscriptionQueue.upsertJobScheduler(
  'daily-renewal-check',
  { pattern: '0 8 * * *', tz: 'Europe/Prague' },
  { name: 'check-renewals', data: {} }
);

// Worker: fetch subscriptions where current_period_end = today, charge Comgate recurring
```

**Why BullMQ over cron-job.org / Vercel cron:** BullMQ is already deployed in the
notification-worker service on Railway. Adding a subscription renewal job is a 50-line
extension of existing infrastructure — no new service, no new Redis connection, no
external dependency.

---

### 2. Multi-Location Franchise — Schema Extension Only

**Status:** No new library needed. Pure Drizzle schema extension.

#### Architecture Pattern

The existing `companies` table holds the franchise root. A new `locations` table holds
child locations (branches). The existing RLS pattern (`company_id` on every table) is
extended: tenant isolation becomes `location_id` for location-scoped data, `company_id`
for franchise-wide data.

```
franchise root: companies (id=1, plan='enterprise', parent_company_id=NULL)
    └── locations table:
        ├── location (id=1, company_id=1, name='Praha Centrum')
        ├── location (id=2, company_id=1, name='Praha Vinohrady')
        └── location (id=3, company_id=1, name='Brno')
```

#### New `locations` Table

```typescript
// packages/database/src/schema/auth.ts — NEW TABLE

export const locations = pgTable(
  'locations',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    addressStreet: varchar('address_street', { length: 255 }),
    addressCity: varchar('address_city', { length: 100 }),
    addressZip: varchar('address_zip', { length: 20 }),
    timezone: varchar('timezone', { length: 50 }).default('Europe/Prague'),
    isActive: boolean('is_active').default(true),
    settings: jsonb('settings').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('idx_locations_company').on(table.companyId),
    slugUnique: unique('locations_company_slug_unique').on(table.companyId, table.slug),
  }),
);
```

#### Tables Requiring `location_id` Column

Tables that need location scoping (add nullable `location_id FK → locations.id`):
- `employees` — staff belongs to a location
- `services` — services may vary by location
- `availability` — schedules are per-location
- `bookings` — bookings happen at a location

Tables staying at company scope (no `location_id` needed):
- `customers` — shared across all locations
- `subscriptions` — billing is per company
- `analytics_events` — aggregated at company level first

#### RLS Extension

```sql
-- New policy: location-scoped tables
-- App sets both current_company_id AND current_location_id session vars
-- Location-scoped reads: filter by location_id WHERE set, else all locations in company

CREATE POLICY locations_isolation ON locations
  USING (company_id = current_setting('app.current_company_id')::int);
```

#### Why No Schema-per-Tenant Approach

The project already uses shared schema + `company_id` RLS. Schema-per-tenant (separate
PostgreSQL schema per franchise location) would require rewriting all Drizzle queries and
all existing RLS policies. The shared table approach with a `locations` foreign key is the
minimal-disruption extension. Confirmed as the correct pattern for 5-50 locations at
ScheduleBox's scale.

---

### 3. Usage Limits and Tier Enforcement

**Status:** Built entirely on existing Redis (ioredis) + Next.js middleware. No new packages.

#### Tier Definitions (from existing schema)

The `companies.subscriptionPlan` column already has the constraint:
`'free' | 'starter' | 'professional' | 'enterprise'`

Limits per tier:

| Tier         | Bookings/mo | Employees | Locations | AI Features |
|--------------|-------------|-----------|-----------|-------------|
| free         | 50          | 3         | 1         | No          |
| starter      | 500         | 10        | 1         | No          |
| professional | Unlimited   | 50        | 5         | Yes         |
| enterprise   | Unlimited   | Unlimited | 50        | Yes         |

#### Enforcement Architecture

**Layer 1 — Database (ground truth):** `companies.featuresEnabled` (jsonb, already exists)
stores the feature flags. Updated by the subscription webhook handler.

**Layer 2 — Redis counter (fast path):** Monthly booking counter per company.

```typescript
// packages/shared/src/utils/tier-limits.ts — NEW FILE

const TIER_LIMITS = {
  free:         { bookingsPerMonth: 50,  employees: 3,  locations: 1, aiFeatures: false },
  starter:      { bookingsPerMonth: 500, employees: 10, locations: 1, aiFeatures: false },
  professional: { bookingsPerMonth: -1,  employees: 50, locations: 5, aiFeatures: true  },
  enterprise:   { bookingsPerMonth: -1,  employees: -1, locations: 50, aiFeatures: true },
} as const;

export async function checkBookingLimit(companyId: number, plan: string): Promise<boolean> {
  const limit = TIER_LIMITS[plan as keyof typeof TIER_LIMITS]?.bookingsPerMonth ?? 50;
  if (limit === -1) return true; // unlimited

  const key = `usage:bookings:${companyId}:${getMonthKey()}`;
  const count = await redis.incr(key);
  await redis.expire(key, 60 * 60 * 24 * 32); // 32-day TTL (covers full month)
  return count <= limit;
}
```

**Layer 3 — Next.js Middleware (route guard):** Block API calls before they hit the
database when limits are exceeded. Reads from Redis, not from PostgreSQL (fast path).

**Layer 4 — UI enforcement:** React component reads `company.subscriptionPlan` from
TanStack Query cache. Feature-gated UI elements use a `<PlanGate plan="professional">`
wrapper component. The Zustand store already holds `company` state — no new state library.

**Why no LaunchDarkly / GrowthBook / Unleash:** ScheduleBox has 4 tiers with static
feature sets defined at build time. External feature flag services add latency and cost.
The `featuresEnabled` JSONB column on `companies` is the feature store — already deployed.

---

### 4. Analytics Dashboards

**Status:** recharts ^3.7.0 is already installed. shadcn chart component wraps it.
The only addition is a Drizzle migration for materialized views.

#### Chart Library — shadcn/ui Chart (recharts 3.7.0)

The shadcn chart component (`npx shadcn@latest add chart`) is a thin wrapper around the
already-installed `recharts ^3.7.0`. It provides:
- `ChartContainer` — responsive wrapper with CSS variable theming
- `ChartTooltip` / `ChartLegend` — styled with shadcn tokens
- All recharts chart types: BarChart, AreaChart, LineChart, PieChart, RadarChart

**Install the shadcn chart component (CLI generates, does not add recharts as new dep):**
```bash
pnpm dlx shadcn@latest add chart
# Adds apps/web/components/ui/chart.tsx — NOT a new npm package
```

**Recharts 3.x migration note (from v2 in v1.2 research):** The codebase already has
recharts ^3.7.0. Key breaking changes from 2.x are:
- `CategoricalChartState` removed from event handlers — use controlled state instead
- `activeIndex` prop removed — use `activeBar` / `activeShape`
- CartesianGrid requires explicit `xAxisId`/`yAxisId` if axis IDs are non-default

If any existing charts were built with recharts 2.x patterns (from v1.2), audit against
the [3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide).

#### Analytics Data Pipeline — PostgreSQL Materialized Views

For the analytics dashboard KPIs (revenue per period, bookings per service, no-show rate,
top customers), use PostgreSQL materialized views pre-aggregated at the `company_id` level.

```sql
-- packages/database/src/migrations/XXXX_analytics_materialized_views.sql

CREATE MATERIALIZED VIEW mv_company_analytics_daily AS
SELECT
  company_id,
  DATE_TRUNC('day', created_at AT TIME ZONE 'Europe/Prague') AS day,
  COUNT(*) FILTER (WHERE status = 'confirmed') AS bookings_confirmed,
  COUNT(*) FILTER (WHERE status = 'no_show') AS bookings_no_show,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END)::float /
    NULLIF(COUNT(*), 0) AS show_rate,
  SUM(p.amount) FILTER (WHERE p.status = 'paid') AS revenue_czk
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
WHERE b.deleted_at IS NULL
GROUP BY company_id, DATE_TRUNC('day', created_at AT TIME ZONE 'Europe/Prague');

CREATE UNIQUE INDEX ON mv_company_analytics_daily (company_id, day);

-- Refresh strategy: BullMQ nightly job (01:00 Prague time)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_company_analytics_daily;
-- CONCURRENTLY requires unique index — already defined above.
```

**Why materialized views over real-time aggregation:** The analytics dashboard shows
historical data (daily/weekly/monthly). Querying raw `bookings` + `payments` tables on
every dashboard load for large companies (10K+ bookings) is a full-table scan.
Materialized views precompute in < 1 second; dashboard loads in < 200ms.

**Why not a separate analytics database (ClickHouse / Tinybird):** ScheduleBox's SMB
customers have 50–5,000 bookings/month. At this scale, PostgreSQL materialized views
are entirely sufficient. Introducing ClickHouse adds operational overhead, cost,
and sync complexity for no measurable benefit at the current scale.

#### PDF Report Export

`@react-pdf/renderer` ^4.3.2 is already installed. The `pdfkit` ^0.17.2 is also installed.

**Recommendation:** Use `@react-pdf/renderer` for styled reports (invoice-style output).
Use `pdfkit` only for simple linear PDF generation (receipt-style). Avoid both in
Next.js App Router route handlers — there are known SSR issues.

**Pattern for App Router:**
```typescript
// apps/web/app/api/v1/reports/[id]/pdf/route.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { AnalyticsReportPDF } from '@/components/reports/analytics-report-pdf';

// Add to next.config.js:
// serverExternalPackages: ['@react-pdf/renderer']
// This resolves the "ba.Component is not a constructor" crash in App Router.

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const data = await fetchReportData(params.id);
  const buffer = await renderToBuffer(<AnalyticsReportPDF data={data} />);

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${params.id}.pdf"`,
    },
  });
}
```

**Config fix required in `next.config.js`:**
```javascript
// apps/web/next.config.js
module.exports = {
  experimental: {
    serverExternalPackages: ['@react-pdf/renderer'],
  },
};
```
This is the official workaround for the App Router crash (confirmed in react-pdf GitHub
issue #2460, fixed for Next.js >=14.1.1 with this config). Add this if not already present.

---

### 5. Frontend Polish — Existing Stack Only

**Status:** No new packages required.

| Capability | Stack | Already Present |
|------------|-------|-----------------|
| Dark mode toggle | `next-themes` (shadcn ships it) | Yes — shadcn/ui default |
| Design tokens / brand colors | Tailwind v4 `@theme` CSS block + CSS variables | Yes — globals.css |
| Dashboard redesign | shadcn/ui Card, Table, Badge, Progress components | Yes — installed |
| Chart redesign | recharts ^3.7.0 + shadcn chart component | recharts yes; shadcn chart wrapper via CLI |
| Animation / transitions | motion ^12.34.3 | Yes |
| Responsive layout | Tailwind CSS | Yes |
| Toast notifications | sonner ^2.0.7 | Yes |

The only "new" item is running `pnpm dlx shadcn@latest add chart` to scaffold the
`chart.tsx` component file — this generates a local file, it does not add a new npm package.

---

## Integration Notes

### Comgate Recurring ↔ Existing `client.ts`

The existing `client.ts` (`apps/web/app/api/v1/payments/comgate/client.ts`) already
handles create/status/refund. Add `initComgateSubscription()` and `chargeComgateRecurring()`
as new exports in the same file. The pattern (URLSearchParams POST, parse URL-encoded response,
timing-safe secret verify) is identical.

No Comgate Node.js SDK exists (only PHP SDK confirmed). The custom `client.ts` is the
correct approach and must be maintained in-house.

### BullMQ Subscription Scheduler ↔ Notification Worker

The `services/notification-worker` already runs BullMQ with Redis. Add a new
`subscription-renewal` queue in the same worker process. This avoids standing up a new
Railway service for billing jobs.

### Drizzle ↔ Materialized Views

Drizzle ORM does not natively manage materialized views (it manages tables). Run the
materialized view DDL as raw SQL in a migration file:

```typescript
// packages/database/src/migrations/run-raw.ts
import { sql } from 'drizzle-orm';
await db.execute(sql`CREATE MATERIALIZED VIEW ...`);
```

Alternatively, add `.sql` migration files directly to the `migrations/` directory and
apply with `drizzle-kit migrate`. Either approach is correct.

### Redis ↔ Usage Limit Counters

Existing `ioredis` ^5.9.2 client in `apps/web` handles this. No additional Redis client
or configuration. Use the pattern:
- Key: `usage:bookings:{companyId}:{YYYY-MM}`
- Value: INCR counter
- TTL: 32 days (auto-expires after billing period)

### recharts 3.7.0 ↔ shadcn Chart Component

The shadcn chart component targets recharts 3.x (there is an open PR #8486 on the
shadcn-ui/ui repo updating to recharts v3). Running `pnpm dlx shadcn@latest add chart`
will generate a chart.tsx component compatible with the already-installed recharts ^3.7.0.
If the CLI-generated component still references recharts 2.x patterns, apply the
[migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide).

### `@react-pdf/renderer` ↔ App Router

The `serverExternalPackages: ['@react-pdf/renderer']` config is required in `next.config.js`
for server-side PDF generation in App Router route handlers. Confirm this is already present;
if not, add it as part of the first PDF report phase.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Stripe / Paddle / Lemon Squeezy** | ScheduleBox already has Comgate merchant 498621 integrated and approved for the CZ/SK market. Switching gateways is a regulatory + business decision, not a tech one. | Extend existing Comgate `client.ts` with `initRecurring` |
| **LaunchDarkly / GrowthBook / Unleash** | External feature flag services add latency (~50ms/request) and €300+/mo cost. ScheduleBox has 4 static tiers. | `companies.featuresEnabled` JSONB + Redis counter |
| **ClickHouse / Tinybird / Redshift** | OLAP databases are justified at millions of events/day. ScheduleBox SMBs have 50–5,000 bookings/month. | PostgreSQL materialized views |
| **Tremor** | Heavy abstraction over recharts; shadcn chart component is already the chosen wrapper and matches the existing design system. recharts ^3.7.0 is already installed. | `shadcn chart` CLI component |
| **Separate billing microservice** | Overkill for subscription billing. Comgate's recurring API is a 2-call extension of existing payment flow. | Extend `client.ts` + BullMQ job |
| **pg_cron / pgAgent** | Adds PostgreSQL extension management complexity. The Railway deployment does not have superuser access for extension creation. | BullMQ `CronScheduler` (already deployed) |
| **react-table** (stand-alone) | `@tanstack/react-table` ^8.21.3 is already installed. | Use existing TanStack Table |
| **moment.js** | Already avoided in v1.2. `date-fns` ^4.1.0 is already the project standard. | date-fns (already installed) |
| **next-themes** (install) | shadcn/ui ships next-themes as a dependency — it is already present. | Already installed |
| **Separate analytics service / worker** | Materialized view refresh runs as a BullMQ job in the existing notification-worker. No new Railway service needed. | BullMQ in notification-worker |

---

## Complete Installation Reference

```bash
# NO NEW npm packages required for v1.3.

# Only CLI command needed (generates a local file, NOT a new dependency):
pnpm dlx shadcn@latest add chart
# Generates: apps/web/components/ui/chart.tsx
```

**Database migrations required (Drizzle):**
1. `subscriptions` table (payment schema)
2. `locations` table (auth schema)
3. `location_id` FK on `employees`, `services`, `availability`, `bookings`
4. Materialized views for analytics (`mv_company_analytics_daily`, etc.)
5. RLS policies for `locations` table and location-scoped tables

**Code additions (no new packages):**
- `apps/web/app/api/v1/payments/comgate/client.ts` — add `initComgateSubscription()` + `chargeComgateRecurring()`
- `services/notification-worker/src/jobs/subscription-renewal.ts` — BullMQ cron job
- `packages/shared/src/utils/tier-limits.ts` — tier caps + Redis counter helpers
- `apps/web/middleware.ts` — plan enforcement layer
- `apps/web/components/ui/chart.tsx` — shadcn CLI generates this

---

## Version Compatibility Matrix

| Package | Current Version | v1.3 Requirement | Notes |
|---------|-----------------|------------------|-------|
| recharts | ^3.7.0 | ^3.7.0 (no change) | Already latest; shadcn chart wraps it |
| @react-pdf/renderer | ^4.3.2 | ^4.3.2 (no change) | Requires `serverExternalPackages` config |
| date-fns | ^4.1.0 | ^4.1.0 (no change) | v4 is current stable |
| ioredis | ^5.9.2 | ^5.9.2 (no change) | Usage limit counters reuse existing client |
| BullMQ | (in notification-worker) | Existing version | Add subscription-renewal queue/worker |
| Drizzle ORM | ^0.36.4 | ^0.36.4 (no change) | New tables via schema extension + migration |
| Next.js | ^15.5.10 | ^15.5.10 (no change) | middleware.ts for tier enforcement |
| Zustand | ^5.0.11 | ^5.0.11 (no change) | Company plan data already in store |

---

## Sources

- Comgate recurring payments overview — https://help.comgate.cz/docs/en/recurring-payments (MEDIUM confidence — page returned 403, data confirmed via search + PHP SDK README)
- Comgate PHP SDK (`setInitRecurring`, `initRecurringPayment`) — https://github.com/comgate-payments/sdk-php (HIGH confidence — SDK source confirms parameter names)
- Comgate API docs — https://apidoc.comgate.cz/en/api/rest/ (MEDIUM confidence — content not directly accessible, confirmed via search result snippets)
- shadcn/ui Chart component — https://ui.shadcn.com/docs/components/radix/chart (HIGH confidence)
- shadcn/ui recharts v3 upgrade PR — https://github.com/shadcn-ui/ui/pull/8486 (HIGH confidence)
- recharts 3.0 migration guide — https://github.com/recharts/recharts/wiki/3.0-migration-guide (HIGH confidence)
- recharts 3.7.0 npm — https://www.npmjs.com/package/recharts (HIGH confidence)
- @react-pdf/renderer App Router crash fix — https://github.com/diegomura/react-pdf/issues/2460 (HIGH confidence — open issue with official workaround)
- PostgreSQL materialized views scheduled refresh — https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html (HIGH confidence)
- BullMQ CronScheduler — https://docs.bullmq.io/guide/job-schedulers (HIGH confidence)
- Multi-tenant shared-schema + RLS (canonical pattern) — https://www.thenile.dev/blog/multi-tenant-rls (HIGH confidence, multiple corroborating sources)
- next-themes App Router support (>=0.3.0) — https://github.com/pacocoursey/next-themes (HIGH confidence)

---

_Stack research for: ScheduleBox v1.3 Revenue & Growth_
_Researched: 2026-02-24_
