# Project Research Summary

**Project:** ScheduleBox v1.3 — Revenue & Growth
**Domain:** SaaS Subscription Billing, Multi-Location Franchise, Usage Metering, Analytics, Frontend Polish
**Researched:** 2026-02-24
**Confidence:** HIGH overall (MEDIUM specifically for Comgate recurring API — official docs return 403)

---

## Executive Summary

ScheduleBox v1.3 transforms a fully functional demo product into a revenue-generating SaaS business. The core work is: (1) activating subscription billing via Comgate recurring payments, (2) enforcing the plan tiers that already exist in the schema but are completely unenforced, (3) extending the data model to support multi-location franchise accounts, and (4) adding the analytics dashboards that justify premium tier pricing. Critically, zero new npm packages are required — every capability builds on the existing stack through schema additions, Drizzle migrations, Comgate API extensions, and BullMQ job definitions already deployed in the notification worker.

The highest-risk item is not technical: Comgate recurring payments must be manually activated by contacting their support team before any billing code ships. This is a business process blocker with an unknown timeline (days to weeks). Architecture-wise, the biggest decision is how to model multi-location without breaking the existing `company_id`-everywhere tenant isolation system. The recommended pattern — a new `organizations` table sitting above `companies` with a context-switch JWT endpoint — adds only 2 new tables and 1 nullable FK to `companies`, leaving all 49 existing tables and 29 RLS policies completely untouched. This is the only viable approach; the alternative (adding `parent_company_id` to `companies`) would require subqueries in all RLS USING clauses causing N×M performance regression, plus modifications to all 127 existing API routes.

Build order is forced by data model and business logic dependencies: billing infrastructure first (everything else depends on knowing a company's active plan), usage enforcement second (the upgrade loop needs billing to exist as the destination), multi-location third (independent but high complexity), analytics fourth (cross-location views need the org model; platform admin dashboard needs subscription records), frontend last (polishing pages that depend on stable APIs). The subscription state machine, Comgate webhook idempotency, and the JWT context-switch security boundary are the three implementation areas requiring the most disciplined execution.

---

## Key Findings

### Stack Additions (v1.3)

v1.3 requires **zero new npm packages**. All five capability areas build on the existing stack.

**What actually changes:**

- `comgate/client.ts` — extend with `initComgateSubscription()` (adds `initRecurring=true` to existing create flow) and `chargeComgateRecurring()` (calls `/v1.0/recurring` server-to-server). No Comgate Node.js SDK exists; the in-house client is the correct approach and must remain in-house.
- `packages/database` — 6 new/modified objects via Drizzle migration: `subscriptions` table, `subscription_invoices` table, `organizations` table, `organization_members` table, `revenue_snapshots` table, materialized view `mv_daily_booking_summary` (converted from existing regular view).
- `services/notification-worker` — add `subscription-renewal` BullMQ queue to the existing worker process (already runs BullMQ + Redis on Railway). Also add hourly BullMQ job to refresh the materialized view. No new Railway service required.
- `packages/shared` — new `utils/tier-limits.ts` with Redis INCR counter helpers and plan limit constants.
- `apps/web/components/ui/chart.tsx` — scaffolded via `pnpm dlx shadcn@latest add chart` CLI. This generates a local file, not a new npm package. It wraps already-installed recharts ^3.7.0.

**Config fix required:** `serverExternalPackages: ['@react-pdf/renderer']` in `next.config.js` to prevent the known App Router crash on PDF generation in route handlers. Verify this is present before building any PDF report endpoint.

**What NOT to add:** Stripe/Paddle/Lemon Squeezy (Comgate already approved for CZ/SK market); LaunchDarkly/GrowthBook/Unleash (4 static tiers, no dynamic flags needed); ClickHouse/Tinybird/Redshift (SMBs have 50-5,000 bookings/month — PostgreSQL materialized views are sufficient); Tremor (shadcn chart wraps recharts which is already installed); separate billing microservice (2-function Comgate extension + BullMQ job); pg_cron (Railway lacks superuser access for extension creation).

See `.planning/research/STACK.md` for full version compatibility matrix and integration notes.

---

### Expected Features

**Must have for v1.3 launch (revenue generation depends on these):**

- Comgate recurring subscription integration — first-party Czech gateway; avoids regulatory re-approval for alternatives
- Subscription lifecycle state machine — `trialing → active → past_due → cancelled/paused`; 6+ states including dunning
- Monthly renewal BullMQ job + dunning email flow — day 1, 3, 7, 14 retries; 14-day grace period before downgrade
- Booking count entitlement check (Free: 50/mo) with Redis INCR counter — returns HTTP 402 with structured error
- Staff count + AI feature gating — server-side only; UI-only gating is trivially bypassed
- Subscription invoice PDF — Czech law: within 15 days, IČO required, 10-year retention
- Revenue + bookings analytics dashboard — 4 KPI cards + date-range charts + top services/staff
- Loading states, empty states, and error states audit — currently inconsistent across the app

**Should have (increases tier adoption and retention):**

- Proration on mid-period upgrade (calculate remaining-days delta; charge immediately)
- Multi-location entity (`organizations` table) + location switcher in app nav
- Central admin (`org_owner`) and location manager (`location_manager`) RBAC roles
- Peak hours heatmap, occupancy rate, new vs returning customer ratio
- Dark mode (Tailwind CSS variable flip; shadcn already supports `class="dark"`)
- Plan upgrade prompts at 80% limit threshold — better conversion than prompting at hard block
- Subscription pause feature — critical for Czech/Slovak seasonal businesses (ski, summer camps); reduces churn vs. cancellation
- Annual billing option (2 months free; 30% annual adoption target; meaningful ARR improvement)

**Defer to v1.4:**

- Cross-location booking — availability fan-out across locations; very high complexity
- Per-location Comgate payout accounts — Comgate multi-merchant configuration; not standard
- Customer cohort retention analysis — needs 3+ months of data history to be meaningful
- Overage billing — new metered billing concept; defer until subscription baseline is stable
- Branch-level AI models — per-location training data required; insufficient data at v1.3 launch
- Command palette (cmdk) — quality-of-life, not revenue-blocking

**CZ/SK market specifics that affect implementation:**

- Slovak VAT is 20% (not Czech 21%) — invoice VAT rate must be configurable per company country; do not hardcode 21%
- Czech B2B buyers require IČO on every invoice — extend existing invoice template, not new template
- Subscription pause reduces seasonal churn — this is a retention priority, not a nice-to-have
- Pricing at 490 Kč/1,490 Kč needs clear value justification in upgrade modals (AI features, multi-staff, multi-location)

See `.planning/research/FEATURES.md` for full user flows, per-category complexity assessments, and cross-category dependency graph.

---

### Architecture Approach

v1.3 is an **additive extension** of the existing architecture. The core constraint: never modify `findCompanyId()`, never change the JWT payload structure, and never add subqueries to RLS USING clauses.

**Multi-location model: organizations above companies (Option A — the only viable choice)**

Add an `organizations` table above `companies`. A context-switch endpoint `POST /api/v1/auth/switch-location` validates the user belongs to the organization that owns the target company, then mints a new JWT with `company_id` scoped to the selected location. All 49 existing tables and all 29 RLS policies remain unchanged. Existing `findCompanyId()` function remains unchanged. `companies.organization_id` is added as a nullable FK — `NULL` means "standalone business" (single location), no data migration required.

Option B (adding `parent_company_id` to `companies`) is explicitly ruled out: it forces recursive CTE queries on every aggregate, requires subqueries in all 29 RLS USING clauses (N×M performance regression invisible in dev), and necessitates modifications to all 127 existing API routes.

**Subscription invoices: separate table from `payments`**

The existing `payments` table is FK-constrained to `bookings.id` as NOT NULL. Subscription charges have no associated booking. A separate `subscription_invoices` table is required. Mixing subscription billing into `payments` breaks the SAGA pattern's assumption that every payment maps to a booking.

**Usage limits: inline checks in POST handlers, not Next.js middleware**

`apps/web/middleware.ts` runs on every request including static asset serving. Checking subscription limits there is expensive and fragile — a middleware crash takes down the entire app. Instead: add `checkBookingLimit(companyId)` before booking creation logic, `checkEmployeeLimit(companyId)` before employee creation. Redis INCR as the fast counter; PostgreSQL as nightly reconciliation source.

**Analytics: materialized views + BullMQ refresh + service-role connection for cross-location**

Convert existing `v_daily_booking_summary` (regular view, recomputes on every query) to `mv_daily_booking_summary` (materialized, refreshed hourly by BullMQ). Franchise cross-location queries require a `db_service_role` connection with PostgreSQL `BYPASSRLS` attribute — the standard single-tenant RLS `db` client cannot aggregate across multiple `company_id` values. The `db_service_role` connection must never be exposed in user-facing API routes.

**Major components and their v1.3 changes:**

1. `apps/web` — new `/api/v1/billing/`, `/api/v1/organizations/`, `/api/v1/auth/switch-location/` route groups; extend `comgate/client.ts` with recurring functions; add `lib/limits/usage-checker.ts`; new `components/billing/`, `components/organization/` directories; extend `components/analytics/`
2. `services/notification-worker` — add `subscription-renewal` and `mv-refresh` BullMQ queues; no new Railway service
3. `packages/database` — new `schema/subscriptions.ts`; extend `schema/auth.ts` (organizations, organization_members); extend `schema/analytics.ts` (revenue_snapshots); modify `schema/views.ts` (materialized view)
4. `packages/shared` — new `utils/tier-limits.ts`
5. Comgate API — recurring billing (two-phase: `initRecurring=true` on first payment, `/v1.0/recurring` for subsequent charges)

See `.planning/research/ARCHITECTURE.md` for data flow diagrams, full schema change summary, and migration strategy for existing data.

---

### Critical Pitfalls

**1. Comgate recurring requires manual merchant approval — contact them before coding starts.**
Recurring is a separate API feature requiring explicit merchant-account activation (not auto-enabled). Missing this blocks all of Phase 1. Do not begin subscription implementation until Comgate confirms recurring is active on merchant account 498621. Timeline is unknown (days to weeks). Start this conversation immediately.

**2. Multi-location must not break the single company_id JWT assumption.**
Adding `parent_company_id` to `companies` forces subqueries inside all 29 RLS USING clauses — N×M performance regression that is invisible in development but catastrophic under production load. The fix: `organizations` entity above `companies`, explicit JWT context-switch endpoint. Never modify `findCompanyId()` to return multiple IDs.

**3. Comgate webhook async race condition on subscription activation.**
User pays → redirects to dashboard → webhook hasn't arrived yet → dashboard shows "Free plan" for 1-5 seconds. If a sync-on-return endpoint and the webhook both write `subscription_plan` simultaneously, you have a race condition. Fix: `subscription_events` log table for idempotency; `SELECT FOR UPDATE` on company row; frontend polls `/api/v1/billing/status` for up to 10 seconds after payment return.

**4. Retroactive usage limits will immediately block existing free users.**
Deploying "Free: 50 bookings/month" using a 30-day lookback query locks out users who used the product freely during beta. Fix: add `billing_period_start` anchor column to `companies`; limits apply from the anchor date forward; announce with a 30-day grace period before enforcement. Never deploy limits without this anchor.

**5. Franchise analytics cannot use the standard RLS db client.**
The standard `db` client has `app.company_id` set for single-tenant isolation — cross-location aggregation silently returns data for only one location or throws RLS violations. Fix: separate `db_service_role` connection with `BYPASSRLS` for franchise/platform analytics only; always add explicit `WHERE company_id IN (...)` even with service role; log all service-role queries to `audit_logs`.

**6. Invoice numbering race condition under concurrent recurring billing.**
The existing `MAX(invoice_number) + 1` pattern works for sequential invoice creation but fails under concurrent subscription renewals (multiple companies billing simultaneously). The race produces a `23505` unique constraint violation and the invoice is silently not created. Fix: replace with a PostgreSQL SEQUENCE for all subscription invoice numbering.

**7. Subscription cancellation must never delete user data.**
Downgrading from 5 locations to a 1-location limit must soft-disable excess locations (`is_active = false`), never delete them. A 7-day grace period after subscription lapse before enforcement. A nightly job checks expired subscriptions; never delete on webhook receipt alone.

See `.planning/research/PITFALLS.md` for detection signals, phase assignments, full prevention strategies, and the complete phase-specific warnings table.

---

## Implications for Roadmap

Build order is imposed by data model and business logic dependencies. Subscription billing is the unlock for all other features.

### Phase 1: Subscription Billing Infrastructure

**Rationale:** Everything else — usage prompts, upgrade flows, platform admin dashboard — requires a subscription record per company. This also has the longest external dependency (Comgate approval); it must start first. The subscription state machine is the most complex piece in all of v1.3.

**Delivers:** Working monthly subscription billing. Companies subscribe, pay via Comgate, auto-renew monthly via BullMQ cron job, receive dunning emails on failure (4 retries over 14 days), and get downgraded to Free after grace period. Invoice PDFs generated and emailed. Plan column in `companies` is now enforced by actual billing state, not just a string.

**Features addressed:** Comgate recurring integration, subscription lifecycle state machine, renewal job, dunning flow, grace period enforcement, plan upgrade/downgrade UI, proration on upgrade, subscription invoice PDF (Czech-compliant), payment history page, cancellation flow with "pause" option for seasonal businesses.

**Pitfalls to avoid:** Contact Comgate before sprint starts (Pitfall 3); implement `subscription_events` idempotency table + `SELECT FOR UPDATE` for webhook race condition (Pitfall 4); use PostgreSQL SEQUENCE for invoice numbering (Risk Area 2); soft-disable on downgrade, never delete (Risk Area 5); update `companies.subscription_plan` CHECK constraint if plan names change (Minor 4).

**Research flag:** MEDIUM confidence on exact Comgate REST API parameter names — inferred from PHP SDK (`setInitRecurring` → `initRecurring=true`). Verify in Comgate sandbox against live REST endpoint before building the renewal job. If sandbox does not support recurring, test in production with a real card.

**Duration estimate:** 5-7 days (3-4 DB/API, 2-3 frontend)

---

### Phase 2: Usage Limits and Tier Enforcement

**Rationale:** Billing must exist first so upgrade prompts have a real destination. This phase closes the upgrade loop — users hit a limit, see a contextual upgrade modal, and can actually pay. Without billing, limits are enforced but no upgrade path exists.

**Delivers:** All plan tier limits enforced server-side via inline POST handler checks. Free users see a usage meter in the dashboard sidebar and contextual upgrade prompts at 80% and 100% thresholds. API returns HTTP 402 with `{ error: "PLAN_LIMIT_EXCEEDED", code: "BOOKING_LIMIT_REACHED", details: { current, limit, plan, upgrade_url } }`. Frontend `UpgradeModal` catches 402 and shows plan comparison with usage context. AI features gated on Growth+ plan. Redis INCR as fast counter with 32-day TTL; PostgreSQL as nightly reconciliation source.

**Features addressed:** Server-side entitlement check, booking count metering, staff count limit, location count limit, AI feature gating, upgrade modal with contextual copy, usage visible to user, 80% threshold warning banner.

**Pitfalls to avoid:** Retroactive limits blocking existing users — add `billing_period_start` to `companies` and enforce grace period (Pitfall 5); inline checks in POST handlers not in Next.js middleware (Anti-pattern 3); Redis INCR not DB COUNT on the booking creation hot path (Anti-pattern 4); feature-flag UI must sync via React Query (stale time 5 min, invalidate on billing action), not just Zustand auth state (Risk Area 3).

**Research flag:** Standard patterns. No additional research needed.

**Duration estimate:** 2-3 days

---

### Phase 3: Multi-Location Organizations

**Rationale:** Architecturally independent of billing but highly complex. Required before cross-location analytics can be built. Critical for Enterprise/AI-Powered tier upsell ("upgrade to manage up to 50 locations"). Placed after billing so the subscription plan can gate how many locations a company can create.

**Delivers:** `organizations` and `organization_members` tables with Drizzle migration. Nullable `organization_id` FK on `companies` (NULL = standalone business, existing companies unaffected). Location switcher dropdown in app nav. `POST /api/v1/auth/switch-location` JWT context exchange endpoint. Central admin (`org_owner`) and location manager (`location_manager`) RBAC roles (location managers cannot see other locations' data — RLS enforced via single company_id JWT). Per-location working hours, staff assignment, service price overrides. Location creation wizard with public booking URL `/book/[company-slug]/[location-slug]`.

**Features addressed:** Location entity, location switcher UI, per-location working hours/staff/services, central admin role, location manager role, aggregated analytics preparation, customer unified profile (`master_customer_id` nullable FK for cross-location deduplication).

**Pitfalls to avoid:** Never add `parent_company_id` to `companies` (Pitfalls 1 and 2 — breaks RLS and all 127 routes); JWT context-switch must validate org membership before issuing new token — cross-tenant access is a critical security boundary; multi-location customer deduplication requires `master_customer_id` FK to avoid inflated CRM counts (Risk Area 4); all new tables need RLS policies in `policies.sql` AND a dedicated `0002_v13_rls_policies.sql` migration (Risk Area 1).

**Research flag:** The JWT context-switch security boundary has no documented precedent in this codebase. Write an integration test that verifies: (a) switching to a company owned by a different organization is rejected with 403, (b) after a valid switch, all queries are scoped to the new company_id only.

**Duration estimate:** 5-7 days (highest complexity in v1.3)

---

### Phase 4: Analytics Dashboards

**Rationale:** Depends on subscription billing (for platform admin MRR/ARR metrics) and benefits from the multi-location org model (for cross-location aggregations). Analytics justify premium tier price points and surface AI model value tangibly.

**Delivers:** Owner business dashboard with 4 KPI cards (revenue, bookings count, new customers, no-show rate), revenue-over-time chart with period comparison, top services/staff tables, peak hours heatmap, occupancy rate (booked/available slots), date range filter, CSV export. Platform admin dashboard with MRR/ARR, new MRR, churned MRR, plan distribution, active companies. Cross-location aggregate view for franchise owners (using `db_service_role` connection). Materialized view `mv_daily_booking_summary` with hourly BullMQ refresh. `revenue_snapshots` table populated by monthly BullMQ job for fast historical trend queries.

**Features addressed:** Revenue over time, bookings/cancellation rate, no-show rate, top services/staff, new vs returning customer ratio, peak hours heatmap, occupancy rate, MRR/ARR tracking, plan distribution, multi-location comparison.

**Deferred from this phase:** Customer cohort retention analysis (needs data history), AI prediction overlay on revenue chart (needs trained forecasting model, already built in Phase 23).

**Pitfalls to avoid:** All analytics reads should route to a PostgreSQL read replica if available — if not, rely on materialized views with strict 90-day max query range (Pitfall 6); franchise aggregation must use `db_service_role` connection, never the RLS-scoped `db` client (Pitfall 7 / Risk Area 7); always use `REFRESH MATERIALIZED VIEW CONCURRENTLY` — requires unique index on view from day 1 (Minor 2); Drizzle Kit does not support materialized view schema pushes — must use raw SQL migration file (Drizzle issue #1787).

**Research flag:** Occupancy rate is HIGH complexity — requires computing total available slots from working hours minus blocked time. May need to simplify to an approximation for v1.3 and deliver exact calculation in v1.4. Needs product decision before implementation starts.

**Duration estimate:** 3-4 days

---

### Phase 5: Frontend Polish and Design System

**Rationale:** Polish should happen last, on pages built in Phases 1-4. Polishing a billing settings page that doesn't exist yet wastes effort. The highest-impact areas are the pages subscription/billing build touched — they justify the CZK 2,990/month price point and must feel premium.

**Delivers:** Consistent loading states on all async actions (no double-submit). Skeleton loaders replacing spinner patterns on main list pages. Empty states with action CTAs on all previously-blank views. Error states with inline explanatory text (not just red borders) on all forms. Dark mode via Tailwind CSS variable flip + system preference detection. Design token additions for plan tier colors (free/essential/growth/ai-powered) and semantic states (warning, success). Typography/spacing consistency audit. Button state completeness (default/hover/active/disabled/loading). Mobile calendar responsiveness at 375px and 768px (tablet-first). `shadcn chart` component scaffolded via CLI.

**Highest-impact polish areas (in priority order):** (1) Dashboard — first screen owners see daily, must be scannable in 5 seconds. (2) Booking creation flow — primary value entry point, zero friction tolerance. (3) Settings/Plan page — where subscription decisions happen, must feel premium and trustworthy. (4) Public booking widget — customer-facing, embeds on owner sites. (5) Mobile calendar view — salon owners check their schedule on mobile constantly.

**Pitfalls to avoid:** shadcn `toast` vs `sonner` conflict — audit before adding new components (Minor 3); all new pages need Czech/Slovak/English translation keys added to message files before merge — never ship a feature with hardcoded English strings in a Czech UI (Risk Area 6); React Query stale time for subscription status should be 5 minutes, invalidated on billing action, not 0 (Minor 5); update next-intl middleware matcher when adding new route segments.

**Research flag:** Standard patterns. No additional research needed.

**Duration estimate:** 3-4 days (highest ROI when run concurrently on pages being touched by other phases)

---

### Phase Ordering Rationale

- Phase 1 before Phase 2: upgrade prompts require an active billing flow as their destination
- Phase 1 before Phase 4 (admin dashboard): MRR/ARR metrics require subscription records to exist
- Phase 3 before Phase 4 (cross-location analytics): organization model must be live before cross-location aggregations
- Phase 3 after Phase 1 is stabilized: avoids concurrent schema migrations across two complex feature areas
- Phase 5 runs concurrently with other phases on touched pages, but settings/plan polish gates on Phase 1 being complete

### Research Flags

**Needs careful verification before building:**

- **Phase 1 (Comgate recurring API):** MEDIUM confidence on REST parameter names — inferred from PHP SDK. Verify exact field names (`initRecurring` vs `recurrence=ON` vs another variant) in Comgate sandbox or by asking Comgate support directly. Build the renewal job only after confirming parameter names from a live API response.
- **Phase 3 (JWT context-switch security):** No documented precedent in this codebase. Write an integration test for cross-org access rejection before merging any multi-location code to main.
- **Phase 4 (occupancy rate calculation):** HIGH complexity — requires working hours minus blocked time divided by average service duration. Scope this explicitly in the phase plan and be prepared to ship an approximation.

**Standard patterns (skip additional research):**

- **Phase 2 (usage limits):** Redis INCR counter pattern is well-documented; existing `ioredis` client is already configured.
- **Phase 4 (materialized views):** Drizzle Kit caveat (manual SQL migration) is a known constraint. `CONCURRENTLY` + unique index pattern is standard.
- **Phase 5 (dark mode):** Tailwind CSS variable flip + shadcn `class="dark"` is fully documented and already partially supported.

---

## Business Blockers

These are not technical decisions. They must be resolved before implementation begins.

| Blocker | Owner | Impact | Action |
|---------|-------|--------|--------|
| **Comgate recurring activation** | Business team contacts Comgate support | Blocks Phase 1 entirely | Contact Comgate immediately for merchant 498621. Ask about sandbox support for recurring. Get timeline in writing. |
| **Subscription plan name canonicalization** | Product | Blocks Phase 1 schema migration | DB has `free/starter/professional/enterprise`; docs reference `free/essential/growth/ai_powered`. The CHECK constraint on `companies.subscription_plan` must be updated before any subscription records are created. Decide canonical names before Phase 1 migration runs. |
| **Existing user limits grace period** | Business/product | Blocks Phase 2 deployment | Decide: do existing free users get grandfather period, or immediate enforcement from `billing_period_start`? Research recommends 30-day announced grace period. Must be confirmed before Phase 2 ships. |
| **Czech VAT registration status** | Business/legal | Affects invoice templates | Slovak companies pay 20% VAT (not 21%). Invoice VAT rate must be configurable per company country. Legal must confirm the approach for mixed CZ/SK customer base. |
| **GDPR vs 10-year invoice retention conflict** | Legal | Affects subscription data deletion flow | User right-to-erasure conflicts with Czech 10-year invoice retention law. Need legal guidance on what can be anonymized vs. what must be retained before implementing subscription cancellation data cleanup. |

---

## Open Questions

Questions that must be answered before or during implementation to avoid rework.

| Question | Phase | How to Resolve |
|----------|-------|----------------|
| What are the exact Comgate recurring REST API parameter names? | Phase 1 | Test in Comgate sandbox. PHP SDK: `setInitRecurring(true)` → REST likely `initRecurring=true`. Verify before coding renewal job. |
| Does the Comgate sandbox support recurring payments for testing? | Phase 1 | Ask Comgate support when requesting activation. If sandbox does not support it, plan for production testing with a real card. |
| What canonical plan names does the business want? | Phase 1 | Confirm before running schema migration. If renaming `starter` → `essential`, the CHECK constraint and all plan comparison logic must update atomically. |
| Are existing free users grandfathered or immediately limited? | Phase 2 | Business decision. Research strongly recommends `billing_period_start` anchor + 30-day grace period announcement. Must be confirmed before Phase 2 deploys. |
| How should cross-location customer deduplication work at launch? | Phase 3 | Research recommends `master_customer_id` nullable FK with email-based deduplication. The alternative (leaving duplicates) produces inflated CRM counts and broken loyalty points. Needs product decision. |
| Should occupancy rate ship in v1.3 or be deferred? | Phase 4 | Occupancy rate is HIGH complexity. If deferred, the 4 KPI cards become 3 (revenue, bookings count, no-show rate, new customers). Needs product decision before Phase 4 planning. |
| Is a PostgreSQL read replica available on Railway for analytics? | Phase 4 | Check Railway plan. If unavailable, analytics must rely entirely on materialized views + strict 90-day query limit. |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new packages. All additions are extensions of verified existing dependencies. Version matrix confirmed against npm registry. recharts 3.x migration notes apply if any v1.2 charts were built on 2.x patterns. |
| Features | MEDIUM-HIGH | SaaS billing patterns HIGH (Stripe/Chargebee docs, multiple authoritative sources). Comgate-specific flows MEDIUM (docs behind auth, PHP SDK inference). Czech invoice law HIGH (Eurofiscalis official source). CZ/SK market pricing psychology MEDIUM (competitor research). |
| Architecture | HIGH | All architectural constraints verified against live codebase: `tenant-scope.ts` (single company_id return), `policies.sql` (FORCE ROW LEVEL SECURITY), `jwt.ts` (single company_id in payload), `payments.ts` (booking_id NOT NULL confirms separate subscription_invoices needed), `views.ts` (current regular pgView). Multi-location option analysis is definitive. |
| Pitfalls | HIGH | Most pitfalls based on direct codebase inspection. RLS performance regression: PostgreSQL documentation + AWS blog. Webhook race condition: Stripe/billing documentation + existing webhook handler inspection. Invoice race condition: direct inspection of `createInvoiceForPayment` pattern. Comgate pitfalls: MEDIUM (SDK inference). |

**Overall confidence: HIGH**

### Gaps to Address

- **Comgate recurring REST parameter names:** Inferred from PHP SDK. Must be verified in sandbox before building the renewal job. If the REST field names differ from PHP SDK method names, only the `chargeComgateRecurring()` function body changes — the interface contract stays stable.
- **Railway read replica availability:** Determines analytics architecture. If unavailable, materialized views + 90-day query limit is the fallback. Check Railway plan before Phase 4 planning.
- **Plan name canonicalization:** DB has `starter/professional/enterprise`; research docs use `essential/growth/ai_powered`. This is a one-time migration decision — once subscription records exist with plan names in them, renaming becomes a multi-table migration. Must be resolved before any Phase 1 schema work.
- **GDPR retention conflict for cancelled subscriptions:** No technical solution until legal decides on anonymization vs. retention policy. Implement subscription cancellation with soft-delete only; defer data cleanup logic until legal guidance is received.

---

## Sources

### Primary (HIGH confidence)

- ScheduleBox codebase — `packages/database/src/rls/policies.sql` (direct inspection 2026-02-24)
- ScheduleBox codebase — `apps/web/lib/db/tenant-scope.ts` (direct inspection 2026-02-24)
- ScheduleBox codebase — `apps/web/app/api/v1/payments/comgate/client.ts` (direct inspection 2026-02-24)
- ScheduleBox codebase — `packages/database/src/schema/auth.ts`, `payments.ts`, `analytics.ts`, `views.ts` (direct inspection 2026-02-24)
- ScheduleBox codebase — `apps/web/lib/auth/jwt.ts` (direct inspection 2026-02-24)
- Comgate PHP SDK — github.com/comgate-payments/sdk-php (`setInitRecurring`, `initRecurringPayment` confirmed)
- recharts ^3.7.0 — https://www.npmjs.com/package/recharts
- shadcn/ui Chart component — https://ui.shadcn.com/docs/components/radix/chart
- BullMQ CronScheduler — https://docs.bullmq.io/guide/job-schedulers
- PostgreSQL materialized views — https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
- Drizzle ORM materialized view issue #1787 — confirmed Drizzle Kit does not support MV introspect
- Drizzle ORM views docs — https://orm.drizzle.team/docs/views (`pgMaterializedView()` API verified)
- Eurofiscalis Czech invoice requirements — https://www.eurofiscalis.com/en/invoicing-in-czech-republic/
- AWS multi-tenant RLS — https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/
- Billing webhook race condition — https://excessivecoding.com/blog/billing-webhook-race-condition-solution-guide
- @react-pdf/renderer App Router crash fix — github.com/diegomura/react-pdf/issues/2460

### Secondary (MEDIUM confidence)

- Comgate recurring payments help — https://help.comgate.cz/docs/en/recurring-payments (403 during research fetch; confirmed via search result snippets and PHP SDK)
- Comgate API docs — https://apidoc.comgate.cz/en/api/rest/ (content not directly accessible)
- Fresha multi-location — https://www.fresha.com/blog/easy-ways-to-manage-multiple-locations
- Pabau multi-location scheduling — https://pabau.com/blog/multi-location-scheduling-software/
- Stigg usage-based pricing guide — https://www.stigg.io/blog-posts/beyond-metering-the-only-guide-youll-ever-need-to-implement-usage-based-pricing
- Stripe subscription upgrade/downgrade — https://docs.stripe.com/billing/subscriptions/upgrade-downgrade
- Chargebee proration — https://www.chargebee.com/subscription-management/handle-prorations/
- Kinde dunning strategies — https://kinde.com/learn/billing/churn/dunning-strategies-for-saas-email-flows-and-retry-logic/
- SaaS KPI dashboard metrics — https://www.hubifi.com/blog/saas-kpi-dashboard-metrics
- PostgreSQL materialized view benchmark (28s → 180ms) — https://stormatics.tech/blogs/postgresql-materialized-views-when-caching-your-query-results-makes-sense

---

_Research completed: 2026-02-24_
_Ready for roadmap: yes_
