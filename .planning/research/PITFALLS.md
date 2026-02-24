# Domain Pitfalls — v1.3 Revenue & Growth

**Domain:** Adding subscription billing, multi-location/franchise, usage metering, analytics dashboards, and frontend polish to existing ScheduleBox SaaS (~65k LOC, v1.2 shipped)
**Researched:** 2026-02-24
**Confidence:** HIGH for billing/RLS/analytics (verified with codebase inspection + multiple sources); MEDIUM for Comgate recurring-specific API (official docs blocked, SDK partially inspected)

---

## Critical Pitfalls

Mistakes that will cause data corruption, production incidents, or full rewrites.

---

### Pitfall 1: Multi-Location Breaks the Single company_id JWT Assumption

**What goes wrong:**
Every JWT token embeds exactly one `company_id` claim. Every call to `findCompanyId(user.sub)` in all ~94 API routes returns a single integer. When a franchise owner manages 3 locations (each a separate `company_id`), there is no way for them to view cross-location data or switch context without a new token. Worse, if you model franchise as a hierarchy on top of existing companies (e.g., adding a `parent_company_id`), queries that filter only by the leaf `company_id` will silently exclude data the owner expects to see.

**Why it happens:**
`tenant-scope.ts` does `users.companyId` → single integer. The function signature returns `{ companyId: number; companyUuid: string }` — no concept of "effective company context" or "set of authorized company IDs." The RLS policies in `policies.sql` use `current_company_id()` which is set to exactly one value per connection.

**Consequences:**
- Franchise dashboard shows zero bookings (all belong to child company IDs, not parent)
- Cross-location reports aggregate incorrectly or throw RLS violations
- Every API route that calls `findCompanyId` must be re-examined — that is currently 94 endpoints
- JWT tokens become stale: a user's token has `company_id: 5` but they need to query companies 5, 6, 7

**Prevention:**
Model franchise before touching any other feature. Design choices early:

Option A — Separate Auth Context (recommended): Add a `franchise_id` to the companies table. Build a separate `GET /api/v1/franchise/switch?location_id=X` that mints a new JWT for the target location. Franchise owner gets a location-picker UI before entering the dashboard. No change to RLS or existing routes.

Option B — Aggregate Queries at Application Layer: Create new `/api/v1/franchise/*` endpoints that explicitly loop or `IN (...)` across a set of location IDs. Never pass a franchise query through the existing single-company-id middleware.

Do NOT modify `findCompanyId` to return multiple IDs — every downstream caller makes assumptions about a scalar company context. That path cascades changes into all 94 routes.

**Detection (warning signs):**
- Anyone proposes "just add `parent_company_id` to companies and query `WHERE company_id IN (...)`" — this will break RLS
- A franchise owner can see another owner's data in test
- Analytics endpoints return 0 rows for the franchise owner

**Phase:** Must be designed in the franchise schema phase before any API work starts. Architecture decision is irreversible once locations start accumulating data.

**Confidence:** HIGH — based on direct inspection of `tenant-scope.ts`, `policies.sql`, and the companies schema.

---

### Pitfall 2: RLS Policies Break When Adding parent_company_id to Existing Tables

**What goes wrong:**
If multi-location is implemented by adding a `parent_company_id` FK to the `companies` table (a tempting shortcut), existing RLS policies fail in subtle ways. The policy `USING (company_id = current_company_id())` on 29 tables still filters by leaf company ID. A franchise admin querying with parent's company_id sees no rows. A developer then adds `OR company_id IN (SELECT id FROM companies WHERE parent_company_id = current_company_id())` to every policy — this runs a subquery on every row access, creating a severe performance regression that is invisible in development but catastrophic under load.

**Why it happens:**
PostgreSQL RLS policies execute for every row evaluated, not just the final result set. A subquery inside a USING clause becomes an N×M problem: for a bookings table with 100k rows, every row triggers the subquery. The EXPLAIN plan may look fine with 100 rows but degrade linearly with data growth.

**Consequences:**
- 20x query slowdown under load that doesn't appear in dev
- Franchise admin can see child locations' data (if policy logic wrong) or can't see any (if too strict)
- Cannot easily roll back: once data exists with parent/child relationships, the schema change is permanent

**Prevention:**
Do not extend RLS policies with subqueries. Enforce franchise isolation entirely at the application layer via explicit `WHERE company_id IN (...)` in new franchise-specific endpoints. Keep existing 29 RLS policies unchanged. The FORCE ROW LEVEL SECURITY on all tables means you must maintain `SET app.company_id` to a valid leaf company ID for every query — this is the constraint you must work within.

**Detection:**
- EXPLAIN ANALYZE on any booking/customer query shows nested loop on companies table inside RLS filter
- Query time increases proportionally to number of child locations

**Phase:** Franchise data model design.
**Confidence:** HIGH — based on `policies.sql` inspection and PostgreSQL RLS performance documentation.

---

### Pitfall 3: Comgate recurring payments require manual approval and a second API flow

**What goes wrong:**
The existing Comgate integration handles one-time payments via a standard redirect flow (`/api/v1/payments/comgate/create`). Adding subscription billing assumes you can simply flag a payment as "recurring" — but Comgate recurring payments are a separate API feature that: (1) requires explicit merchant approval from Comgate support (not automatically enabled), (2) uses a two-phase API flow (`initRecurring=true` on first payment, then a separate server-to-server `POST /v1.0/recurring` call for subsequent charges), and (3) sends recurring charge webhooks to a different endpoint than one-time payment webhooks.

**Why it happens:**
The existing `comgate/client.ts` and webhook handler are built for `status: PAID | CANCELLED | AUTHORIZED`. Recurring payment webhooks from Comgate carry a different payload structure and may arrive at the same webhook URL but with additional fields (`isRecurring`, `recurringId`). Without understanding this, teams add `initRecurring` to the payment create call and expect subsequent charges to happen automatically — they do not. Each billing cycle requires an explicit API call from your server.

**Consequences:**
- Subscriptions never auto-renew: first payment works, renewals silently fail
- Recurring payments processed twice if webhook deduplication uses `transId` only (each recurrence has a new `transId`)
- Comgate sandbox may not support recurring — production testing required
- Missing Comgate approval blocks the entire billing feature

**Prevention:**
1. Contact Comgate support to enable recurring payments on the merchant account before any coding starts (this can take days to weeks)
2. Build a separate `subscriptions` table tracking `comgate_init_trans_id` (the ID from the first payment, used as the token for all future charges)
3. Build a separate scheduled job (cron) that calls Comgate's recurring endpoint for each active subscription on the billing date — do not rely on Comgate to initiate charges
4. Add a separate webhook handler branch for recurring payment confirmations
5. Test the full renewal cycle in Comgate sandbox before production

**Detection:**
- First subscriber payment succeeds, no renewal ever arrives
- Comgate API returns an error code indicating recurring not enabled on account

**Phase:** Billing infrastructure phase, before any subscription UI work.
**Confidence:** MEDIUM — Comgate official docs repeatedly 403'd during research. Findings based on Comgate public site description, GitHub SDK inspection, and general recurring payment gateway patterns. Verify directly with Comgate support.

---

### Pitfall 4: Subscription State Lives in companies.subscription_plan but Comgate Webhook Is Async

**What goes wrong:**
The companies table already has `subscription_plan` (enum: free/starter/professional/enterprise), `subscription_valid_until`, and `trial_ends_at`. The temptation is to update these fields directly in the Comgate webhook handler when a subscription payment succeeds. But Comgate webhooks arrive 1–5 seconds after the user returns from the payment page. The user is immediately redirected back to the dashboard, which reads `subscription_plan` from the database and shows "Free" — their payment was accepted but the webhook hasn't arrived yet.

**Why it happens:**
`apps/web/app/api/v1/webhooks/comgate/route.ts` already demonstrates this pattern for one-time payments: the webhook fires after the redirect. For subscriptions the stakes are higher because the user expects to immediately access paid features.

**Consequences:**
- User pays for Professional, lands on dashboard, still sees Free plan limitations → contacts support, churn risk
- If you add a "sync on return" endpoint (immediately query Comgate API on return), you add a second path to update subscription state — now both the sync endpoint AND the webhook can update the same row simultaneously, causing a race condition on `subscription_plan`
- Downgrade webhooks (subscription cancellation) are even more dangerous: processing a cancellation twice resets a valid subscription

**Prevention:**
1. Add a `subscription_events` table that records every Comgate subscription webhook (with `transId` as primary key for idempotency)
2. The webhook handler inserts into `subscription_events` and updates `subscription_plan` — both in one transaction
3. On the return redirect, the frontend polls `/api/v1/billing/status` with a 1s interval for up to 10 seconds. The endpoint reads from `subscription_events` (reflects webhook arrival) not the companies row directly
4. Protect the update with `SELECT FOR UPDATE` on the company row to prevent concurrent webhook + sync-endpoint from both writing
5. Use the `subscription_valid_until` timestamp as the source of truth for feature gating, not the string plan name

**Detection:**
- Load test: 50 concurrent subscription payments, check how many result in correct plan assignment
- User reports: "I paid but still see Free plan"

**Phase:** Billing webhook handling phase.
**Confidence:** HIGH — race condition pattern verified with Stripe/billing webhook documentation and confirmed against existing Comgate webhook handler in codebase.

---

### Pitfall 5: Usage Metering Enforcement Breaks All Free-Tier Users If Applied Retrospectively

**What goes wrong:**
The system currently has zero usage limits. When you add limits (e.g., "Free tier: 50 bookings/month"), you must decide: do these limits apply from the day you deploy them, or from each user's billing period start? If you deploy limits at midnight and query `SELECT COUNT(*) FROM bookings WHERE company_id = ? AND created_at > NOW() - INTERVAL '30 days'`, every free-tier user who already has 50+ bookings in the past 30 days is immediately blocked from creating new bookings — even for bookings that occurred before the limits were announced. Users who've been using the product freely for months become "locked out" overnight.

**Why it happens:**
No `billing_period_start` anchor exists in the current schema. `companies.subscriptionPlan` is just a string. There is no metering table counting monthly usage per tenant.

**Consequences:**
- Free trial users who were promised unlimited access during beta feel deceived → mass churn
- If you soft-launch limits only for new signups, you need a `grandfathered_until` field or a feature flag — adding this retroactively is a schema migration on a live 49-table database
- Usage count queries on the `bookings` table run on the OLTP database — at scale, `COUNT(*)` with a date range on a large table slows down every booking creation

**Prevention:**
1. Add a `usage_limits` table: `(company_id, period_start, period_end, resource, used_count, limit)` — pre-compute and cache monthly usage
2. Add `billing_period_start` to the `companies` table (default: company `created_at`)
3. Announce limits with a 30-day grace period before enforcement
4. Maintain a Redis counter (`INCR usage:{company_id}:{month}`) as the hot path for limit checks — fall back to DB count for Redis cache miss, not the other way around
5. Never do `COUNT(*) FROM bookings` inline during booking creation — check the Redis counter atomically before the booking insert

**Detection:**
- Free users immediately blocked after deploy without prior announcement
- Booking creation latency spikes after limit check added to the hot path

**Phase:** Usage limits and tier enforcement phase — must come after billing is set up, before limit enforcement goes live.
**Confidence:** HIGH — based on direct schema inspection and general SaaS metering patterns.

---

### Pitfall 6: Analytics Queries on the OLTP Database Will Lock Booking Rows

**What goes wrong:**
The existing `analytics_events` table and the `bookings`, `payments`, `customers` tables are all in the same OLTP PostgreSQL database. Adding analytics dashboards that run `GROUP BY`, `DATE_TRUNC`, `SUM()` across these tables will compete with the booking creation path for I/O, memory, and connection slots. A 30-day revenue report joining bookings × payments × customers on a medium-sized tenant (10k bookings) will run for 2–10 seconds, during which it holds a shared lock on the scanned pages — blocking concurrent inserts on those same pages.

**Why it happens:**
PostgreSQL's MVCC model does reduce lock contention, but analytics queries still consume significant I/O bandwidth and shared buffer cache, evicting the hot booking/availability data. The `idx_analytics_created` and `idx_audit_created` composite indexes are on `(company_id, created_at)` — correct for OLTP lookups but insufficient for cross-company aggregations that admins will need.

**Consequences:**
- Booking creation P99 latency spikes when a large tenant runs a weekly report
- Dashboard queries timeout at 30s under concurrent OLTP load
- Adding indexes to support analytics queries increases write latency on the booking insert path

**Prevention:**
1. Route all analytics reads to a PostgreSQL read replica — this is the minimum viable separation
2. Create materialized views for common aggregations (revenue by day, bookings by employee) and refresh them on a schedule (hourly or nightly), not on demand
3. Never expose a raw `GROUP BY` endpoint without an explicit time-range limit (max 90 days) and result caching in Redis
4. For franchise analytics (aggregate across multiple companies), run these as async jobs that write results to an `analytics_reports` table — the user requests a report, waits for completion, downloads it
5. Index strategy: add `(company_id, created_at, status)` composite indexes to `bookings` and `payments` for analytics range queries, but test the write-path impact before deploying to production

**Detection:**
- EXPLAIN ANALYZE on a "last 30 days revenue" query takes > 500ms on dev data
- Booking creation latency degrades when another tenant triggers a dashboard refresh

**Phase:** Analytics infrastructure phase — before building any dashboard UI.
**Confidence:** HIGH — verified with PostgreSQL OLTP/analytics resource contention documentation and materialized view patterns.

---

## High-Risk Areas

Issues that are likely to cause rework if not caught early, but not immediately catastrophic.

---

### Risk Area 1: Drizzle ORM Cannot Generate Migrations for RLS Policy Changes

**What goes wrong:**
Drizzle Kit's `generate` command creates SQL migrations from schema TypeScript changes. However, adding new RLS policies, modifying existing `CREATE POLICY` statements, or adding a `parent_company_id` column with a cascading RLS check are not schema-level Drizzle changes — they require custom SQL in the migration file. Developers who rely on `drizzle-kit generate` will get a migration file that adds the column but silently omits the policy update. The result is a deployed migration that looks complete but leaves tenant isolation broken.

**Why it happens:**
Drizzle added RLS support in v0.30+ (October 2024) via `pgPolicy`, but the existing `policies.sql` is a standalone SQL file applied separately from Drizzle migrations. Any new RLS policy for new v1.3 tables must be added to `policies.sql` AND the deployment process must re-run it.

**Prevention:**
1. Create a dedicated `0002_v13_rls_policies.sql` custom migration file for every new RLS policy added in v1.3
2. Add an integration test that verifies: when `app.company_id` is set to company A's ID, querying a new v1.3 table returns 0 rows for company B's data
3. Run the full `policies.sql` as part of deploy (it is idempotent — uses DROP IF EXISTS / CREATE POLICY)

**Phase:** Every phase that adds new tables.
**Confidence:** HIGH — based on direct inspection of `policies.sql`, Drizzle Kit documentation, and the existing migration pattern.

---

### Risk Area 2: Invoice Numbering Collision When Recurring Payments Auto-Fire

**What goes wrong:**
The existing invoice system uses a per-company sequential number guaranteed by a UNIQUE constraint on `(company_id, invoice_number)`. Today, invoices are created synchronously in the webhook handler or payment route. When subscription renewals fire automatically (via cron job calling Comgate), multiple renewals may fire near-simultaneously for different customers of the same company. Two concurrent invoice inserts using `MAX(invoice_number) + 1` hit the unique constraint — one transaction succeeds, the other throws a `23505` unique constraint violation and the invoice is never created.

**Why it happens:**
The pattern `await generateInvoiceNumber(tx)` inside the existing invoice generator does not use a PostgreSQL SEQUENCE — it reads the current max and increments. This is a read-modify-write race condition that existing single-invoice-at-a-time flows never trigger but recurring batch billing will.

**Prevention:**
Create a `company_invoice_seq` PostgreSQL SEQUENCE per company, or use a single shared sequence with company prefix, for all v1.3 invoice generation. Alternatively: use `INSERT INTO invoices ... ON CONFLICT (company_id, invoice_number) DO NOTHING` with retry logic in the invoice service. Do not use `MAX() + 1`.

**Phase:** Subscription billing invoice generation.
**Confidence:** HIGH — based on direct inspection of `payments.ts` schema and the `createInvoiceForPayment` call pattern in existing payment routes.

---

### Risk Area 3: Frontend Feature-Gating Creates Inconsistent UI State

**What goes wrong:**
When you add plan-based feature gating (e.g., "Multi-location requires Professional plan"), you must gate both the API (return 403 with `{ code: 'PLAN_LIMIT' }`) and the UI (hide or disable the feature in the sidebar). If only the API is gated, users can see buttons that always fail with cryptic errors. If only the UI is gated, sophisticated users call the API directly and bypass the limit. The inconsistency creates a support burden and erodes trust.

The deeper issue: frontend feature flags are driven by `subscription_plan` read from the API on login. If that value is cached in Zustand global state, a user who upgrades mid-session sees the old plan until they refresh. A user who's downgraded still sees paid features in the UI until they refresh — but the API correctly rejects calls.

**Why it happens:**
Zustand store is populated from the initial auth response. No subscription change event exists to push an update to connected clients.

**Prevention:**
1. Gate every feature at the API layer first (return 403 + `{ code: 'PLAN_LIMIT', requiredPlan: 'professional' }`)
2. Add plan info to the JWT refresh response so it's re-read when the token rotates (every 15 minutes)
3. UI gates should read from a React Query subscription status query that has a short stale time (2 minutes), not from the initial Zustand auth load
4. On the billing success/return page, explicitly invalidate the subscription status query cache so the UI re-renders immediately

**Phase:** Billing UI and feature-flag phase.
**Confidence:** HIGH — based on direct inspection of `route-handler.ts`, Zustand usage, and React Query setup in the codebase.

---

### Risk Area 4: Multi-Location Customers Are Ambiguous

**What goes wrong:**
The `customers` table has `(company_id, email)` with a unique constraint. A customer who visits two franchise locations (e.g., they book at Location A and Location B) exists as two separate customer records — one per `company_id`. When a franchise owner views "all customers across my locations," they see duplicates. Loyalty points earned at Location A are invisible from Location B's dashboard.

**Why it happens:**
The current model assumes one customer per company. Cross-location customer identity was not a design consideration in v1.0.

**Consequences:**
- Franchise-level CRM shows inflated customer counts (double-counts)
- Loyalty program cannot accumulate points across locations
- Marketing segmentation counts are wrong

**Prevention:**
Add a `master_customer_id` nullable FK on the customers table pointing to another customer record designated as the canonical identity. Build a deduplication service that matches by email across locations under the same franchise. Do NOT merge the rows — keep them separate for RLS correctness, just link them via `master_customer_id`. Franchise-level queries JOIN on this field.

**Phase:** Multi-location customer data model design.
**Confidence:** MEDIUM — based on schema inspection and general franchise CRM patterns. Specific deduplication strategy may need iteration.

---

### Risk Area 5: Subscription Cancellation Leaves Orphaned Active Features

**What goes wrong:**
When a subscription is cancelled (either by the user or due to payment failure), the system must downgrade the company to the Free plan. If this happens via the Comgate cancellation webhook, there is a window between "webhook not yet received" and "subscription expired" during which the company continues using paid features. More dangerous: if the downgrade logic deletes or archives resources that exceed the Free tier limit (e.g., "Free plan supports 1 location, Professional supports 5 — delete excess locations on downgrade"), this can destroy a user's data on payment failure.

**Why it happens:**
No graceful downgrade logic exists in v1.2. `subscription_plan` is updated but no cleanup runs.

**Prevention:**
1. Never delete user data on downgrade — set excess resources to `is_active = false` (soft-disable)
2. Give a 7-day grace period after subscription lapse before enforcing tier limits (update `subscription_valid_until` to `now() + 7 days` on cancellation)
3. Send email notification at cancellation and 3 days before grace period ends
4. Build a nightly job that checks expired subscriptions and soft-disables excess resources, logging all actions to audit_logs

**Phase:** Billing subscription lifecycle management phase.
**Confidence:** HIGH — based on general SaaS subscription best practices and confirmed by codebase inspection of the companies schema.

---

### Risk Area 6: next-intl Route Groups Break When New Dashboard Sections Are Added

**What goes wrong:**
The existing frontend uses next-intl with locale prefixes (`/cs/`, `/en/`, `/sk/`). When adding new pages for billing (e.g., `/dashboard/billing/plans`), franchise management (e.g., `/dashboard/locations`), and analytics, developers often forget to: (1) add the new route to the middleware matcher in `middleware.ts`, (2) add Czech/Slovak translation strings for the new section, or (3) add the new section to the sidebar navigation with proper i18n keys. The result is an English-only billing page in an otherwise Czech UI, and sidebar links that throw "missing translation key" warnings.

**Why it happens:**
next-intl requires every user-visible string to come from a message file. New pages that use hardcoded English strings pass TypeScript checks but break the Czech UX.

**Prevention:**
1. Create message file entries for every new UI section in Czech (primary), Slovak, and English simultaneously — do not ship a feature with untranslated strings
2. Add a CI check (or lint rule) that fails if any `t('...')` key is not present in all three locale files
3. Update the middleware matcher array in `middleware.ts` when adding new route segments
4. For the billing/subscription section specifically, ensure plan names and pricing appear in CZK with Czech number formatting (Intl.NumberFormat with `cs-CZ`)

**Phase:** Any phase adding new frontend pages.
**Confidence:** HIGH — based on direct inspection of the i18n setup and next-intl pattern in the codebase.

---

### Risk Area 7: Analytics Aggregate Queries Must Be RLS-Aware for Franchise Context

**What goes wrong:**
When building analytics endpoints (e.g., "total revenue this month"), every query runs with `SET app.company_id = ?` for a single tenant. Franchise-level analytics (aggregate across multiple company IDs) cannot use the RLS machinery at all — you must bypass it with a raw query or with a superuser/service role connection. If developers reuse the existing `db` client (which has `app.company_id` set) for franchise aggregation, they will see data from one location only and silently undercount.

**Why it happens:**
The db client setup in `packages/database/src/client.ts` is configured for single-tenant RLS operation. There is no "multi-tenant aggregation" mode in the current architecture.

**Prevention:**
1. Create a separate `db_service_role` connection that connects with a PostgreSQL role that has `BYPASSRLS` attribute, used exclusively for platform-level analytics and admin queries
2. Never expose this connection in user-facing API routes — restrict to internal analytics job runners
3. Add explicit `WHERE company_id IN (?)` clauses even when using the service role connection, as a defense-in-depth measure
4. Log every service-role query to audit_logs with `user_id = null, action = 'platform_analytics'`

**Phase:** Analytics infrastructure.
**Confidence:** HIGH — based on direct inspection of `policies.sql` (FORCE ROW LEVEL SECURITY is applied), Drizzle client setup, and RLS documentation.

---

## Minor Pitfalls

Friction points that create rework but are recoverable.

---

### Minor 1: Comgate Webhook Idempotency Table Will Fill With Subscription Events

The existing `processed_webhooks` table (used by `checkWebhookIdempotency`) uses `transId` as the primary key. For recurring payments, each monthly charge has a new `transId`. Over 12 months with 1000 active subscribers, this table accumulates 12,000 rows per year. No cleanup job exists. Add a retention policy: delete rows older than 90 days. Index on `processed_at` for efficient cleanup.

**Phase:** Billing webhook infrastructure.

---

### Minor 2: Materialized View Refresh Blocks During Analytics Heavy Load

PostgreSQL `REFRESH MATERIALIZED VIEW` acquires an `ExclusiveLock` on the view table by default. During refresh, any reads against the materialized view return an error. Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` for all v1.3 analytics views. This requires a UNIQUE index on the view, so design views with a `(company_id, period, dimension)` composite unique key from the start. Concurrent refresh is slower but non-blocking.

**Phase:** Analytics database phase.

---

### Minor 3: shadcn/ui Component Updates Between v1.2 and v1.3

shadcn/ui deprecated the `toast` component in favor of `sonner` in late 2024. The existing codebase uses `toast`. Adding new components (e.g., a billing upgrade modal) from the current shadcn/ui CLI will pull in `sonner` if you install new components, creating two toast systems running simultaneously. Either migrate all toasts to `sonner` in v1.3 or pin the shadcn/ui CLI version to pre-sonner and add new components manually.

**Phase:** Frontend polish phase.

---

### Minor 4: Drizzle check() Constraint on subscription_plan Needs Updating

The `companies` table has:
```sql
CHECK subscription_plan IN ('free', 'starter', 'professional', 'enterprise')
```
If v1.3 renames or adds plan tiers (e.g., adding a `franchise` tier), this CHECK constraint must be updated in a migration. Drizzle does not automatically update CHECK constraints when you change `.$type<>()` — you must write a custom migration that `ALTER TABLE companies DROP CONSTRAINT subscription_plan_check, ADD CONSTRAINT ...`. Forgetting this causes silent Drizzle type mismatches (TypeScript says the value is valid, PostgreSQL rejects it with a constraint error at runtime).

**Phase:** Billing plan schema migration.

---

### Minor 5: React Query Cache Stale Time for Subscription Status

The default TanStack Query stale time is 0 (always refetch on mount). For subscription status, this means an extra API call on every page navigation, adding latency to every dashboard load. For billing data that changes only on webhook receipt, set a stale time of 5 minutes and invalidate on billing action completion. Conversely, do not cache subscription status for too long — a cancelled subscription should deactivate features within minutes, not hours.

**Phase:** Frontend billing integration.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Franchise / multi-location schema | company_id JWT assumption broken | Design franchise isolation model before any API work |
| Franchise RLS extension | Subquery in USING clause causes N×M scan | Never extend RLS with parent-child subqueries; use app-layer enforcement |
| Recurring billing setup | Comgate approval may take days | Contact Comgate before sprint starts, not during |
| Subscription webhook handling | Race condition between redirect sync and webhook | Use SELECT FOR UPDATE + subscription_events log table |
| Usage limit enforcement | Retroactive limits block existing users | Billing period anchor date + Redis atomic counters |
| Analytics dashboard | OLTP contention under concurrent load | Read replica + materialized views + 90-day result cache |
| Franchise analytics aggregation | RLS blocks cross-location queries | Service-role connection with explicit IN() clause |
| New frontend pages | Untranslated strings in Czech UI | Message files updated before merge, CI key check |
| Subscription downgrade | Data deleted on payment failure | Soft-disable only, 7-day grace period |
| Invoice generation (recurring) | MAX()+1 race condition | Replace with PostgreSQL SEQUENCE |

---

## Sources

### Primary (HIGH confidence)
- ScheduleBox codebase — `packages/database/src/rls/policies.sql` (direct inspection, 2026-02-24)
- ScheduleBox codebase — `apps/web/lib/db/tenant-scope.ts` (direct inspection, 2026-02-24)
- ScheduleBox codebase — `apps/web/app/api/v1/webhooks/comgate/route.ts` (direct inspection, 2026-02-24)
- ScheduleBox codebase — `packages/database/src/schema/auth.ts`, `payments.ts`, `analytics.ts` (direct inspection, 2026-02-24)
- [PostgreSQL RLS Pitfalls — Permit.io](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [AWS: Multi-Tenant Data Isolation with PostgreSQL RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Billing Webhook Race Condition Solution Guide](https://excessivecoding.com/blog/billing-webhook-race-condition-solution-guide)
- [When OLAP meets OLTP: Long-running queries in PostgreSQL — Springtail](https://www.springtail.io/blog/long-running-queries-postgresql)
- [Drizzle ORM RLS documentation](https://orm.drizzle.team/docs/rls)
- [Stripe Webhooks — Subscription Handling](https://docs.stripe.com/billing/subscriptions/webhooks)

### Secondary (MEDIUM confidence)
- [Comgate Recurring Payments — help.comgate.cz](https://help.comgate.cz/docs/en/recurring-payments) (403 during fetch — content description only from search result snippets)
- [Comgate PHP SDK — GitHub](https://github.com/comgate-payments/sdk-php) (adapted for v1.3 recurring patterns)
- [SaaS Architecture Pitfalls — AWS re:Invent 2024](https://reinvent.awsevents.com/content/dam/reinvent/2024/slides/sas/SAS305_SaaS-architecture-pitfalls-Lessons-from-the-field.pdf)
- [Multi-Tenant Architecture Guide — WorkOS](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture)
- [OLTP Workloads Offload — Materialize](https://materialize.com/blog/oltp-workloads/)
- [Stripe Race Condition Deep Dive — Pedro Alonso](https://www.pedroalonso.net/blog/stripe-webhooks-deep-dive/)
