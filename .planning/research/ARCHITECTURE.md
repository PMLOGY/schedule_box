# Architecture Patterns: v1.3 Revenue & Growth Integration

**Domain:** AI-powered SaaS Booking Platform — v1.3 Feature Integration
**Researched:** 2026-02-24
**Overall confidence:** HIGH (codebase-verified for all existing constraints; MEDIUM for Comgate recurring API specifics)

---

## Current State Summary

### What Exists and Is Locked In

The existing architecture has constraints that v1.3 must work within — not around. These are non-negotiable:

| Constraint | Detail | Impact on v1.3 |
|------------|--------|----------------|
| `company_id` on every row | 49 tables, all scoped by `company_id` FK | Multi-location must decide: new `organization_id` FK or parent `company_id` |
| `findCompanyId(userUuid)` | Every API handler calls this; returns `{ companyId, companyUuid }` | Must extend — not replace — this function for multi-location |
| JWT payload contains `company_id: number` | Token is issued with ONE company ID | Multi-location: user must switch context, not have multi-company JWT |
| `subscriptionPlan` on `companies` table | 4 values: `free\|starter\|professional\|enterprise` (but docs say Essential/Growth/AI-Powered) | Already exists — needs billing enforcement code around it |
| No subscription enforcement in code | `subscriptionPlan` column exists but no middleware checks it | Limits enforcement is entirely new code |
| Comgate client handles one-time payments | `initComgatePayment()` builds single payments | Must add `initRecurring=true` and `recurring()` paths |
| Views are regular PostgreSQL views | `v_daily_booking_summary`, `v_customer_metrics` are `pgView()` | Analytics can graduate to `pgMaterializedView()` for performance |
| 127 API route files under `/api/v1/` | All use `createRouteHandler` factory | Usage limits can hook into this factory with minimal diffs |

### Database: Table Count and Schema Files

```
packages/database/src/schema/
├── auth.ts        → companies, users, roles, permissions, api_keys, ...
├── payments.ts    → payments (gateway: comgate|qrcomat|cash|bank_transfer|gift_card)
├── analytics.ts   → analytics_events, audit_logs, competitor_data
├── views.ts       → v_daily_booking_summary, v_customer_metrics (pgView)
└── [17 other schema files]
```

**Total existing tables: 49.** v1.3 adds approximately 6-8 new tables.

---

## Integration Analysis: Feature by Feature

### Feature 1: Comgate Recurring Subscription Billing

**What already exists:**
- `companies.subscriptionPlan` (`free|starter|professional|enterprise`) — column exists, no enforcement
- `companies.subscriptionValidUntil` — column exists, no enforcement
- `companies.trialEndsAt` — column exists, no enforcement
- `payments` table with Comgate gateway support
- `comgate/client.ts` with `initComgatePayment()`, `getComgatePaymentStatus()`, `refundComgatePayment()`

**Comgate recurring billing API (MEDIUM confidence — PHP SDK verified, REST docs inaccessible):**

Comgate recurring works in two phases:
1. **Initial payment**: `initComgatePayment()` + `initRecurring: true` parameter → user pays via card → Comgate stores card token linked to transaction ID
2. **Subsequent charges**: Call `recurring` endpoint with original transaction ID (`initRecurringId`) → silent background charge, no user redirect needed

The Comgate PHP SDK confirms:
- `setInitRecurring(true)` on the first payment
- `setInitRecurringId('XXXX-YYYY-ZZZZ')` on subsequent recurring charges
- These two parameters are mutually exclusive

**What must change in `comgate/client.ts`:**

```typescript
// EXTEND (do not replace) initComgatePayment:
export interface InitComgatePaymentParams {
  // ... existing fields ...
  initRecurring?: boolean; // NEW: mark as subscription setup payment
}

// NEW function for recurring charges:
export async function chargeRecurringPayment(params: {
  initRecurringTransactionId: string; // From original subscription payment
  price: number;
  currency: string;
  label: string;
  refId: string; // subscription period reference
}): Promise<ComgatePaymentResponse>
```

**New tables required:**

```typescript
// packages/database/src/schema/subscriptions.ts (NEW FILE)

subscriptions: {
  id: serial PK
  uuid: uuid UNIQUE
  companyId: integer FK companies.id
  plan: varchar(20)  // free|essential|growth|ai_powered
  status: varchar(20) // trialing|active|past_due|cancelled|paused
  billingCycle: varchar(10) // monthly|annual
  priceMonthly: numeric(10,2) // snapshot at subscription time
  comgateInitTransactionId: varchar(255) // from first payment — used for recurring charges
  currentPeriodStart: timestamp with timezone
  currentPeriodEnd: timestamp with timezone
  cancelAtPeriodEnd: boolean default false
  cancelledAt: timestamp with timezone nullable
  trialStart: timestamp with timezone nullable
  trialEnd: timestamp with timezone nullable
  createdAt, updatedAt timestamps
}

subscriptionInvoices: {
  id: serial PK
  uuid: uuid UNIQUE
  companyId: integer FK
  subscriptionId: integer FK subscriptions.id
  amount: numeric(10,2)
  currency: varchar(3)
  status: varchar(20) // draft|issued|paid|failed
  period: varchar(20) // e.g. '2026-03'
  comgateTransactionId: varchar(255) nullable
  paidAt: timestamp nullable
  failedAt: timestamp nullable
  failureReason: text nullable
  createdAt timestamp
}
```

**Integration with existing `payments` table:** Subscription invoices are a SEPARATE table from `payments`. The existing `payments` table is for booking-level transactions. Mixing subscription billing into it would break the current per-booking invoice logic and the SAGA pattern. Keep them separate.

**BullMQ job for recurring charges:**

The notification worker already uses BullMQ. Add a recurring billing job queue to it:

```
services/notification-worker/
└── queues/
    └── subscription-billing.ts  (NEW)
        - scheduleBillingCycle(subscriptionId): enqueue charge job for period end
        - chargingJob handler: call Comgate recurring API → update subscription_invoices → update companies.subscriptionPlan if failed
```

**New API routes:**

```
/api/v1/billing/
├── subscribe/route.ts       POST — initiate subscription (creates trial or first payment)
├── plans/route.ts           GET  — list available plans with pricing
├── subscription/route.ts    GET/PUT — current subscription status, cancel-at-period-end
├── invoices/route.ts        GET  — subscription invoice history (separate from booking invoices)
└── comgate/callback/route.ts POST — webhook from Comgate for subscription payments
```

**How `companies.subscriptionPlan` gets updated:** The billing system is the single writer. After a successful Comgate charge callback: `UPDATE companies SET subscription_plan = 'essential', subscription_valid_until = [period_end] WHERE id = ?`. Failed payment: `UPDATE companies SET subscription_plan = 'free'` after grace period.

---

### Feature 2: Multi-Location Franchise

**This is the most architecturally complex v1.3 feature. Two viable approaches exist.**

#### Option A: New `organizations` Entity (Recommended)

Add an `organizations` table that sits above `companies`:

```typescript
organizations: {
  id: serial PK
  uuid: uuid UNIQUE
  name: varchar(255)
  ownerUserId: integer FK users.id  // franchise owner
  subscriptionPlan: varchar(20)     // billing at org level
  subscriptionId: integer FK subscriptions.id nullable
  maxLocations: integer default 50
  settings: jsonb
  createdAt, updatedAt timestamps
}

// Junction: user can manage multiple locations under one org
organizationMembers: {
  id: serial PK
  organizationId: integer FK organizations.id
  userId: integer FK users.id
  role: varchar(20)  // org_owner|org_admin|location_manager
  createdAt timestamp
}
```

**No changes to existing 49 tables.** The `companies` table gets one new nullable FK:

```typescript
// ALTER companies table:
organizationId: integer FK organizations.id nullable
```

**RLS implications:** The existing RLS policies on all 49 tables remain unchanged — they still filter by `company_id`. Cross-location queries (aggregate analytics for franchise dashboard) go through a service layer that collects all `company_id` values the user controls, then queries with `WHERE company_id = ANY([id1, id2, ...])`. This is NOT a RLS change — it's application-layer query expansion.

**JWT implications:** The JWT still contains ONE `company_id`. For franchise owners, the UI shows a location switcher that exchanges the current JWT for one scoped to the selected location. The `findCompanyId()` function is unchanged — the context switch happens at login/switch time by issuing a new token.

```
// Location switcher flow:
POST /api/v1/auth/switch-location
  body: { company_uuid: "..." }
  validates: user belongs to organization that owns this company
  returns: new JWT with company_id = selected location's id
```

**`findCompanyId()` unchanged.** This is the key safety property: all existing code works with zero modification. Multi-location is additive.

#### Option B: Parent-Child on `companies` (Not Recommended)

Add `parentCompanyId: integer FK companies.id` to `companies`. This requires:
- Recursive CTE queries for every aggregate view
- RLS policies must be updated to allow parent company access to child rows
- JWT must encode the parent/child relationship
- Every single query that filters by `company_id` either needs updating OR must use a session variable that expands to include child IDs

**Why Option A is better:** Option B touches all 49 tables' worth of query logic and all RLS policies. Option A is purely additive — it adds 2 new tables and 1 nullable FK on `companies`. No existing code requires modification.

**New tables summary (multi-location):**
- `organizations` (NEW)
- `organization_members` (NEW)
- `companies.organization_id` FK (ALTER, nullable — existing companies unaffected)

**New API routes (multi-location):**
```
/api/v1/organizations/
├── route.ts                    GET (list locations), POST (create org)
├── [id]/
│   ├── route.ts                GET/PUT (org settings)
│   ├── locations/route.ts      GET/POST (list/add locations)
│   └── members/route.ts        GET/POST (team members across locations)
/api/v1/auth/switch-location/route.ts  POST (context switch)
/api/v1/analytics/cross-location/route.ts  GET (aggregate across all locations)
```

---

### Feature 3: Usage Limits Enforcement

**What already exists:** `companies.subscriptionPlan` (column, no enforcement). `companies.featuresEnabled` JSONB (exists, not used for limits). No middleware enforces limits anywhere.

**Recommended approach: Application-layer checking, not database constraints.**

Database constraints (CHECK constraints on bookings count) would require triggers and are hard to grandfacially manage. Application-layer is simpler and maps directly to the subscription plan tiers:

| Plan | Bookings/month | Employees | Locations | API access |
|------|---------------|-----------|-----------|------------|
| Free | 50 | 1 | 1 | No |
| Essential | 500 | 5 | 1 | No |
| Growth | 5,000 | 25 | 3 | No |
| AI-Powered | Unlimited | Unlimited | 50 | Yes |

**Counter strategy:** Use Redis for monthly booking counts (fast increment/check) with PostgreSQL as the authoritative source-of-truth fallback:

```typescript
// New utility: lib/limits/usage-checker.ts

const PLAN_LIMITS = {
  free: { bookings: 50, employees: 1, locations: 1 },
  essential: { bookings: 500, employees: 5, locations: 1 },
  growth: { bookings: 5000, employees: 25, locations: 3 },
  ai_powered: { bookings: Infinity, employees: Infinity, locations: 50 },
};

// Redis key: limits:{companyId}:bookings:{YYYY-MM}
// INCR on each booking creation
// Set with TTL = end of month + 7 days (buffer)

export async function checkBookingLimit(companyId: number): Promise<void>
export async function checkEmployeeLimit(companyId: number): Promise<void>
export async function incrementBookingCount(companyId: number): Promise<void>
export async function getUsageStats(companyId: number): Promise<UsageStats>
```

**Where to hook the limit check:**

NOT in Next.js middleware — middleware runs on every request including static assets. Instead, hook into `createRouteHandler` or the specific POST handlers for bookings and employees:

```typescript
// In apps/web/app/api/v1/bookings/route.ts POST handler:
// After findCompanyId(), before createBooking():
await checkBookingLimit(companyId);
// Throws PlanLimitError if over limit → caught by handleRouteError

// In apps/web/app/api/v1/employees/route.ts POST handler:
await checkEmployeeLimit(companyId);
```

**`createRouteHandler` stays unchanged.** Limit checks are in individual handlers, not the factory. This keeps the factory generic and avoids one-size-fits-all overhead on every route.

**PlanLimitError response format:**
```json
{
  "error": "PLAN_LIMIT_EXCEEDED",
  "code": "BOOKING_LIMIT_REACHED",
  "message": "Dosáhli jste limitu 50 rezervací pro plán Free.",
  "details": {
    "current": 50,
    "limit": 50,
    "plan": "free",
    "upgrade_url": "/cs/billing/plans"
  }
}
```

**Frontend upgrade prompts:** When the API returns `PLAN_LIMIT_EXCEEDED`, React Query's error handling displays an upgrade modal. The 402 HTTP status code is appropriate here.

---

### Feature 4: Analytics and Reporting

**What already exists:**
- `analytics_events` table (behavioral events, per company)
- `audit_logs` table (system audit trail)
- `v_daily_booking_summary` regular PostgreSQL view
- `v_customer_metrics` regular PostgreSQL view
- `/api/v1/analytics/overview`, `/api/v1/analytics/bookings`, `/api/v1/analytics/revenue`
- `/api/v1/reports/bookings/pdf`, `/api/v1/reports/revenue/pdf`

**What v1.3 analytics adds:**
1. Cross-location aggregate dashboard (franchise owners)
2. Revenue breakdown by service/employee
3. Trend analysis with period-over-period comparison (already partially exists)
4. Export in additional formats

**Performance decision: Regular views vs. materialized views.**

The existing `v_daily_booking_summary` is a regular PostgreSQL view — it recomputes on every query. At current scale (<1,000 bookings/day), this is fine. For v1.3, consider converting to materialized views:

Benchmark evidence: Regular views on 28-second complex queries → 180ms with materialized view + 4.2s refresh overhead (from research). For daily summaries, refreshing hourly is acceptable.

**Drizzle ORM materialized view support:** `pgMaterializedView()` exists. `db.refreshMaterializedView(view)` is callable from application code. Drizzle Kit does NOT yet fully support materialized views in introspect/push — they must be created via raw SQL migration.

**Recommendation:** Convert `v_daily_booking_summary` to a materialized view in v1.3. Add a BullMQ job to refresh it hourly. Leave `v_customer_metrics` as a regular view for now (used by AI models that need fresh data).

```typescript
// NEW in packages/database/src/schema/views.ts:
export const dailyBookingSummaryMaterialized = pgMaterializedView(
  'mv_daily_booking_summary'
).as(/* same query as current view */);

// NEW: BullMQ job in notification-worker to refresh hourly:
// REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_booking_summary;
```

**Cross-location analytics query pattern:**

```typescript
// For franchise owners: collect all company_ids under their org
const locationIds = await getOrganizationCompanyIds(organizationId);

// Query using ANY:
db.select({...}).from(dailyBookingSummaryMaterialized)
  .where(inArray(dailyBookingSummaryMaterialized.companyId, locationIds))
  .groupBy(...)
```

**New analytics tables for v1.3:**

The existing `analytics_events` table stores raw behavioral events but is not designed for aggregate reporting. Add summary tables:

```typescript
// packages/database/src/schema/analytics.ts — ADD to existing file:

revenueSnapshots: {
  id: serial PK
  companyId: integer FK
  period: varchar(7)    // 'YYYY-MM'
  totalRevenue: numeric
  bookingCount: integer
  avgBookingValue: numeric
  newCustomers: integer
  returningCustomers: integer
  cancellationRate: numeric
  noShowRate: numeric
  snapshotAt: timestamp
}
// Populated monthly by a BullMQ job. One row per company per month.
// Enables fast historical trend queries without scanning bookings.
```

---

### Feature 5: Frontend Redesign and Design System

**What already exists:**
- `apps/web/app/globals.css` — CSS variables for shadcn/ui tokens (primary, secondary, background, etc.)
- `tailwind.config.ts` — maps CSS vars to Tailwind colors (border, input, ring, background, foreground, primary, secondary, destructive, muted, accent, popover, card)
- `apps/web/components/ui/` — 21 shadcn/ui primitives (in-place, not in `packages/ui`)
- `apps/web/components/` — subdirectories: ai, analytics, auth, booking, calendar, dashboard, i18n, layout, loyalty, onboarding, shared, ui

**What v1.3 frontend adds:**
1. Billing/subscription UI (plan selector, usage meter, upgrade modals)
2. Multi-location switcher in app shell
3. Analytics dashboard expansion (charts, cross-location views)
4. Design system tokens formalization

**Design system approach:**

The existing CSS variable structure is already correct shadcn/ui theming. For v1.3, add missing tokens for the new billing/upgrade UI without touching existing tokens:

```css
/* globals.css — ADD these tokens: */
--warning: 38 92% 50%;         /* amber-500 for usage warning */
--warning-foreground: 0 0% 100%;
--success: 142 71% 45%;        /* already --secondary, alias it */
--info: 217 91% 60%;           /* already --primary, alias it */

/* Plan tier colors (for badge/indicator use): */
--plan-free: 215 20.2% 65.1%;
--plan-essential: 217 91% 60%;
--plan-growth: 142 71% 45%;
--plan-ai: 270 91% 60%;
```

**Component locations for v1.3 additions:**

```
apps/web/components/
├── billing/                     (NEW)
│   ├── plan-selector.tsx        Plan upgrade card grid
│   ├── usage-meter.tsx          Booking usage progress bar with limit
│   ├── upgrade-modal.tsx        Triggered by PLAN_LIMIT_EXCEEDED
│   ├── subscription-status.tsx  Current plan + renewal date
│   └── invoice-list.tsx         Subscription invoice history
├── organization/                (NEW)
│   ├── location-switcher.tsx    Dropdown in dashboard nav
│   ├── location-card.tsx        Per-location summary card
│   └── cross-location-table.tsx Aggregate stats across locations
├── analytics/                   (EXISTING — extend)
│   ├── revenue-chart.tsx        Add service/employee breakdown
│   └── trend-chart.tsx          Add comparison overlays
└── dashboard/                   (EXISTING — extend)
    └── usage-indicator.tsx      Mini usage meter in sidebar
```

**`packages/ui` decision:** Still do not migrate from `apps/web/components/ui/`. No second consumer exists. The billing and org components are app-specific logic, not generic primitives. If v1.4 adds a separate admin panel, THEN populate `packages/ui`. Keep placeholder for now.

---

## Schema Changes Summary

### New Tables (6)

| Table | File | Purpose |
|-------|------|---------|
| `subscriptions` | `schema/subscriptions.ts` (NEW) | Subscription state per company |
| `subscription_invoices` | `schema/subscriptions.ts` (NEW) | Per-period billing records |
| `organizations` | `schema/auth.ts` (ADD) | Franchise/multi-location owner entity |
| `organization_members` | `schema/auth.ts` (ADD) | User-organization role junction |
| `revenue_snapshots` | `schema/analytics.ts` (ADD) | Monthly aggregated revenue records |
| Materialized view `mv_daily_booking_summary` | `schema/views.ts` (MODIFY) | Converted from regular view |

### Modified Tables (3)

| Table | Change | Risk |
|-------|--------|------|
| `companies` | Add nullable `organization_id` FK | LOW — nullable, existing rows unaffected |
| `companies` | `subscriptionPlan` rename from `starter` → `essential` if needed | MEDIUM — check existing data first |
| `users` | Add `primaryCompanyId` nullable to track default location for multi-location users | LOW — nullable |

### New Columns on Existing Tables (0)

The multi-location design (Option A: separate `organizations` table) intentionally adds NO new columns to the 49 existing tenant tables. This is the key advantage.

---

## Build Order and Data Model Dependencies

The following order is forced by data model dependencies:

```
Step 1: Subscription billing schema + Comgate recurring (FIRST — unblocks billing)
   packages/database/src/schema/subscriptions.ts
   apps/web/app/api/v1/billing/
   apps/web/app/api/v1/payments/comgate/client.ts (extend)
   Duration: 3-4 days
   Risk: MEDIUM — Comgate recurring API needs testing in sandbox mode
   Blocks: Usage limits (needs subscription status to know plan), Frontend billing UI

Step 2: Usage limits enforcement (SECOND — depends on subscription state)
   apps/web/lib/limits/usage-checker.ts
   Hook into booking POST and employee POST handlers
   Duration: 1-2 days
   Risk: LOW — Redis counter pattern is straightforward
   Blocks: Frontend upgrade prompts

Step 3: Multi-location organizations (THIRD — architecturally independent of billing)
   packages/database/src/schema/auth.ts (add organizations, organization_members)
   Drizzle migration: ALTER companies ADD organization_id
   apps/web/app/api/v1/organizations/
   apps/web/app/api/v1/auth/switch-location/route.ts
   Duration: 4-5 days
   Risk: HIGH — JWT context switching needs careful testing to prevent cross-tenant data leaks
   Blocks: Cross-location analytics, Organization frontend

Step 4: Analytics expansion (FOURTH — depends on subscription for plan-gating, benefits from org structure)
   Convert v_daily_booking_summary → mv_daily_booking_summary (materialized)
   Add revenue_snapshots table + BullMQ monthly job
   Extend /api/v1/analytics/ routes with cross-location support
   Duration: 2-3 days
   Risk: LOW — additive query work
   Blocks: Analytics frontend

Step 5: Frontend (LAST — depends on all backend APIs being ready)
   billing/, organization/, analytics/ component directories
   Dashboard layout updates for location switcher
   Usage meter in sidebar
   Duration: 3-4 days
   Risk: LOW — UI work against stable APIs
```

**Steps 1, 2, 3 can parallelize across segments:**
- DATABASE: Steps 1+3 schema work in parallel (different schema files)
- BACKEND: Step 1 API, then Step 2 hooks, then Step 3 API
- FRONTEND: Step 5 (starts once BACKEND APIs are drafted)
- DEVOPS: BullMQ job additions for subscription billing and view refresh

---

## Migration Strategy for Existing Data

### For `companies.organization_id` (multi-location FK)

```sql
-- Migration: Add organization_id to companies (nullable, no data loss)
ALTER TABLE companies
  ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;

-- No data backfill required: NULL means "standalone business" (single location)
-- Existing companies continue working exactly as before
```

### For `subscriptions` table (billing state)

```sql
-- Migration: Create subscriptions table
-- Backfill: For each company, create a subscription record matching current plan
INSERT INTO subscriptions (company_id, plan, status, current_period_start, current_period_end)
SELECT
  id,
  subscription_plan,
  CASE WHEN subscription_plan = 'free' THEN 'active' ELSE 'legacy' END,
  NOW(),
  COALESCE(subscription_valid_until, NOW() + INTERVAL '30 days')
FROM companies;
-- 'legacy' status means: existing paying customer, no Comgate recurring token yet
-- These customers will be prompted to set up recurring billing on next renewal
```

### For materialized view conversion

```sql
-- Step 1: Drop existing regular view
DROP VIEW IF EXISTS v_daily_booking_summary;

-- Step 2: Create materialized view with same schema
CREATE MATERIALIZED VIEW mv_daily_booking_summary AS
  SELECT company_id, DATE(start_time) AS booking_date, ...
  FROM bookings GROUP BY company_id, DATE(start_time);

-- Step 3: Create unique index (required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX ON mv_daily_booking_summary (company_id, booking_date);

-- No Drizzle push — this must be a raw SQL migration file
```

**Drizzle Kit caveat:** Drizzle Kit does not fully support materialized view schema pushes. The materialized view creation must go into a handwritten SQL migration file (`packages/database/src/migrations/XXXX_add_mv_daily_booking.sql`) rather than relying on `drizzle-kit generate`. This is a KNOWN Drizzle limitation (GitHub issue #1787).

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|------------------|
| `apps/web` (Next.js) | All API routes, frontend, billing webhooks | PostgreSQL (Drizzle), Redis (limits counters), RabbitMQ, AI service, Comgate API |
| `services/notification-worker` | Email/SMS delivery, subscription billing jobs, view refresh jobs | PostgreSQL, Redis (BullMQ), RabbitMQ |
| `services/ai` (FastAPI) | ML inference — unchanged in v1.3 | Redis, `apps/web` internal API |
| `packages/database` | Drizzle schema — add subscriptions.ts, extend auth.ts | Used by `apps/web` only |
| Comgate API | Payment gateway — extend with recurring support | Called from `apps/web` |
| Redis | Rate limits, usage counters, session cache | `apps/web`, `notification-worker` |

---

## Data Flow Changes

### Subscription Billing Flow (New)

```
New customer registers → companies.subscription_plan = 'free'
    ↓
Owner clicks "Upgrade to Essential"
    → POST /api/v1/billing/subscribe { plan: 'essential', cycle: 'monthly' }
    → Create subscription record (status='trialing' or 'active')
    → Call initComgatePayment({ initRecurring: true, price: 490, ... })
    → Redirect user to Comgate payment page
    ↓
User pays → Comgate callback → POST /api/v1/billing/comgate/callback
    → Verify Comgate webhook secret
    → Update subscription status → 'active'
    → Store comgateInitTransactionId on subscription
    → UPDATE companies SET subscription_plan = 'essential', subscription_valid_until = [+30d]
    → Schedule BullMQ job: charge again in 30 days
    ↓
30 days later → BullMQ executes subscription billing job
    → chargeRecurringPayment({ initRecurringTransactionId, price: 490, ... })
    → No user redirect — silent background charge
    → Comgate callback updates subscription_invoice status
    → If successful: reset subscription_valid_until + 30d
    → If failed: retry 3x, then downgrade to 'free' after grace period (7 days)
```

### Multi-Location Context Switch Flow (New)

```
Franchise owner logs in → JWT: { company_id: [headquarters_id], role: 'owner', ... }
    ↓
Dashboard shows location switcher (org has 5 locations)
    ↓
Owner selects "Location: Praha Žižkov"
    → POST /api/v1/auth/switch-location { company_uuid: "abc-123" }
    → Validate: user's organization owns this company
    → Issue new JWT: { company_id: [zizkov_id], role: 'owner', ... }
    → Store new token → all subsequent API calls scoped to Žižkov
    ↓
Existing API routes unchanged — they still call findCompanyId() which returns Žižkov's ID
    ↓
Owner navigates to "Cross-Location Analytics"
    → GET /api/v1/analytics/cross-location (uses organization_id from user's token or query param)
    → Service layer: SELECT all company_ids WHERE organization_id = [org_id]
    → Query materialized view WHERE company_id = ANY([all_location_ids])
    → Aggregate results across locations
```

### Usage Limit Enforcement Flow (New)

```
Customer tries to book (company on Free plan, 50 bookings used this month)
    → POST /api/v1/bookings
    → findCompanyId(userSub) → companyId
    → checkBookingLimit(companyId):
        → GET Redis key: limits:{companyId}:bookings:{2026-02} → "50"
        → Company plan = 'free', limit = 50, current = 50 → LIMIT EXCEEDED
        → throw PlanLimitError(402, 'BOOKING_LIMIT_REACHED', { upgrade_url: '/billing/plans' })
    → handleRouteError catches PlanLimitError → returns 402 JSON
    ↓
Frontend React Query error handler:
    → response.status === 402 && code === 'BOOKING_LIMIT_REACHED'
    → Display UpgradeModal with plan comparison
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Parent-Child on `companies` for Multi-Location

**What:** Adding `parent_company_id` FK to `companies` table.
**Why bad:** Every aggregate query becomes a recursive CTE. All 49 tables' RLS policies need updating for parent access. JWT must carry hierarchy context. Every existing query potentially returns wrong data if the WHERE clause doesn't account for the child relationship.
**Instead:** Use the `organizations` entity (Option A). Additive, zero existing code changes.

### Anti-Pattern 2: Mixing Subscription Invoices with Booking Payments

**What:** Adding `payment_type: 'subscription' | 'booking'` to the existing `payments` table.
**Why bad:** The existing `payments` table is FK-constrained to `bookings` (`booking_id` NOT NULL). Subscription charges have no associated booking. Nullable FKs on a NOT NULL column require table migrations and break the SAGA pattern's assumption that every payment maps to a booking.
**Instead:** Separate `subscription_invoices` table. The concept is different: booking payments are transactional, subscription invoices are periodic.

### Anti-Pattern 3: Enforcing Usage Limits in Next.js Middleware

**What:** Checking subscription limits in `apps/web/middleware.ts` for every request.
**Why bad:** Next.js middleware runs on EVERY request including static asset serving, API health checks, and public routes. Loading subscription state on every request is expensive and fragile. Middleware crashes can take down the entire app.
**Instead:** Inline checks in specific POST handlers (bookings, employees). The overhead is proportional to the action being limited.

### Anti-Pattern 4: Storing Usage Counts Only in PostgreSQL

**What:** `SELECT COUNT(*) FROM bookings WHERE company_id = ? AND created_at >= start_of_month` on every booking creation.
**Why bad:** Under concurrent booking load, this query runs on every POST. At 100 concurrent bookings, that's 100 full-table-scan-equivalent queries hitting PostgreSQL simultaneously.
**Instead:** Redis INCR as the fast counter, PostgreSQL as the reconciliation source (nightly job verifies Redis counts match DB).

### Anti-Pattern 5: Multi-Company JWT

**What:** Including an array of company IDs in the JWT for franchise owners: `{ company_ids: [1, 2, 3, 4, 5] }`.
**Why bad:** JWTs grow large with many locations. The `findCompanyId()` function is used in 127 route files — it expects ONE company ID. Changing the JWT payload type breaks every single route handler. RBAC checks would need to handle array context, which is undefined behavior in the current permission system.
**Instead:** Single active `company_id` in JWT + explicit location switch endpoint. Context is always unambiguous. Existing code unchanged.

---

## Scalability Considerations

| Concern | At 100 companies | At 1K companies | At 10K companies |
|---------|-----------------|----------------|-----------------|
| Usage limit Redis keys | ~300 keys (100 companies × 3 periods buffer) | ~3K keys | ~30K keys — trivial for Redis |
| Materialized view refresh | Hourly refresh, <1s at 100 companies | <5s at 1K | Consider incremental refresh at 10K |
| Cross-location queries | ANY([5 ids]) | ANY([50 ids]) | Consider read replica for org-level analytics |
| Subscription billing jobs | 100 jobs/month max | 1K jobs/month | 10K — BullMQ handles this comfortably |
| Comgate recurring | 100 API calls/month | 1K | Rate limits may apply — check Comgate docs |

---

## Sources

- Codebase: `packages/database/src/schema/auth.ts` — `companies` table verified, subscription columns confirmed — HIGH confidence
- Codebase: `packages/database/src/schema/payments.ts` — `payments` table structure verified — HIGH confidence
- Codebase: `apps/web/app/api/v1/payments/comgate/client.ts` — current Comgate client functions verified — HIGH confidence
- Codebase: `apps/web/lib/db/tenant-scope.ts` — `findCompanyId()` signature verified — HIGH confidence
- Codebase: `apps/web/lib/auth/jwt.ts` — JWT payload structure with single `company_id` verified — HIGH confidence
- Codebase: `packages/database/src/schema/views.ts` — current regular pgView implementation — HIGH confidence
- Comgate PHP SDK: [github.com/comgate-payments/sdk-php](https://github.com/comgate-payments/sdk-php) — `setInitRecurring`, `setInitRecurringId`, `initRecurringPayment()` — MEDIUM confidence (PHP SDK, not direct REST API docs)
- [Comgate recurring payments help page](https://help.comgate.cz/docs/en/recurring-payments) — confirmed recurring is an approved feature requiring activation — MEDIUM confidence (403 on full docs)
- [PostgreSQL RLS for multi-tenant](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) — parent-child RLS complexity confirmed — HIGH confidence
- [Drizzle ORM materialized view issue #1787](https://github.com/drizzle-team/drizzle-orm/issues/1787) — confirmed Drizzle Kit does not fully support materialized views in introspect — HIGH confidence
- [Drizzle ORM views docs](https://orm.drizzle.team/docs/views) — `pgMaterializedView()` and `db.refreshMaterializedView()` API verified — HIGH confidence
- [PostgreSQL materialized view benchmark](https://stormatics.tech/blogs/postgresql-materialized-views-when-caching-your-query-results-makes-sense) — 28s → 180ms performance improvement, 4.2s refresh overhead — MEDIUM confidence (single source)
