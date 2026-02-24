# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.3 Revenue & Growth — Phase 31 in progress (Plan 01 complete)

## Current Position

- **Milestone:** v1.3 Revenue & Growth
- **Phase:** 31 — Analytics & Reporting
- **Plan:** 01 complete, 02+ pending
- **Status:** Plan 01 complete (5 analytics API routes)
- **Last activity:** 2026-02-24 — Plan 31-01 complete (payment-methods, top-services, peak-hours, cancellations, customer-retention APIs)

Progress: [#---------] 10% (1/? plans)

## What's Done

**v1.0 shipped** (103 requirements, 15 phases, 101 plans). Deployed to Railway 2026-02-15.

**v1.1 shipped** (33 requirements, 7 phases, 22 plans). All complete 2026-02-20, Twilio + Comgate credentials configured 2026-02-24.

**v1.2 shipped** (34 requirements, 5 phases, 20 plans). Completed 2026-02-24:
- Phase 23: AI training pipeline
- Phase 24: AI-powered UI
- Phase 25: Czech marketing landing page
- Phase 26: Booking UX polish
- Phase 27: Onboarding wizard

**v1.3 roadmap created** (32 requirements, 5 phases: 28-32). Phases defined 2026-02-24.

**v1.3 Phase 28 complete:**
- Plan 01 complete: Subscription schema (3 tables), Comgate recurring client, billing types/config
- Plan 02 complete: 7 billing API routes + subscription service layer with state machine
- Plan 05 complete: Subscription invoice service (SEQUENCE numbering, Czech VAT PDF, list/download API)
- Plan 04 complete: Billing portal UI (plan comparison grid, subscription management, invoice history, payment polling)
- Plan 03 complete: BullMQ billing scheduler (daily renewal, Comgate recurring, invoice creation, dunning workflow, 4 Czech email templates)

**v1.3 Phase 29 complete:**
- Plan 01 complete: Usage counting infrastructure (Redis booking counters, DB employee/service counts, plan-limits helper, GET /api/v1/usage endpoint)
- Plan 02 complete: Server-side limit enforcement on POST /api/v1/bookings, /employees, /services (402 PLAN_LIMIT_EXCEEDED + Redis counter increment)
- Plan 03 complete: Usage dashboard UI (UsageWidget with progress bars, UpgradeModal with plan comparison, useUsageQuery hook, cs/en/sk translations)
- Gap closure: Wired UpgradeModal globally via MutationCache 402 interceptor in providers.tsx
- Verified: 7/7 must-haves, 5 requirements (LIMIT-01..05)

**v1.3 Phase 30 complete:**
- Plan 01 complete: Organization schema (organizations + organization_members tables, companies.organizationId FK, shared TypeScript types, Drizzle relations, migration 0002)
- Plan 02 complete: JWT context switch endpoint (POST /api/v1/auth/switch-location, validateLocationAccess security gate, cross-org rejection integration tests, org-scope query helpers, Zod schemas)
- Plan 03 complete: Organization CRUD API (GET/POST orgs, GET/PUT org detail, location CRUD with plan limits, member management with role gating, PaymentRequiredError 402)
- Plan 04 complete: Location switcher dropdown in header, organization overview page with location cards, organization settings page with location/member CRUD, sidebar navigation update

**v1.3 Phase 31 in progress:**
- Plan 01 complete: 5 analytics API routes (payment-methods, top-services, peak-hours, cancellations, customer-retention) with Drizzle raw SQL aggregation

## Decisions

See `.planning/PROJECT.md` Key Decisions section.

**Phase 28 decisions:**
- Plan pricing from docs: Free 0, Essential 490, Growth 1490, AI-Powered 2990 CZK/month
- Annual = 10 months (2 months free): 4900/14900/29900 CZK
- Separate subscription_invoices table (existing invoices has NOT NULL bookingId FK)
- PostgreSQL SEQUENCE for globally unique subscription invoice numbering
- sellerSnapshot JSONB for Czech law invoice compliance
- Upgrade proration uses chargeRecurringPayment (server-side) for existing subscribers, initComgatePayment only for new
- Downgrade scheduled at period end (not immediate), stored in cancelAtPeriodEnd + event metadata
- Webhook idempotency via subscription_events table (separate from processed_webhooks)
- Plans endpoint is public (no auth), all other billing routes require SETTINGS_MANAGE permission
- Platform entity (ScheduleBox s.r.o.) is seller on subscription invoices, subscribing company is buyer
- sellerSnapshot freezes buyer company details at invoice creation per Czech accounting law
- Invoice PDF uses VAT rate from record (country-based), not hardcoded 21%
- Cancel subscription implemented as downgrade to free via existing downgrade API
- useBillingInvoices gracefully returns empty array on 404 (invoices API in Plan 05)
- Growth plan shown as "Most Popular" with Crown badge emphasis
- Inlined Comgate chargeRecurringPayment in billing scheduler to avoid cross-package coupling
- Direct DB invoice creation in worker (SEQUENCE + VAT + sellerSnapshot) instead of internal HTTP API
- Used upsertJobScheduler (BullMQ 5.16+) instead of deprecated Queue.add with repeat

**Phase 29 decisions:**
- Fail-open on Redis errors: booking counts fall back to DB COUNT query rather than blocking bookings
- percentUsed capped at 100 with warning flag at >= 80% threshold
- Redis key TTL set on first increment to auto-expire at end of billing month
- Fire-and-forget pattern for Redis booking counter increment (booking succeeds even if Redis is down)
- Limit check placed after auth+company resolution but before any DB writes (minimal wasted work)
- Usage translations added to flat cs/en/sk.json files under "usage" key (not separate message files)
- Static plan limits in upgrade modal to avoid importing server-side PLAN_CONFIG in client component

**Phase 30 decisions:**
- companies.organizationId defined as plain integer (no FK reference in Drizzle) to avoid circular import; FK enforced via migration SQL
- organization_members.companyId nullable: null = franchise_owner access to ALL locations, non-null = location_manager scoped to specific company
- Org roles (franchise_owner, location_manager) stored in org_members.role CHECK constraint, separate from system roles table
- validateLocationAccess is single security enforcement point for all location switching; throws ForbiddenError (403) for cross-org access
- Integration test re-implements validation logic using test DB to avoid coupling to app DB client singleton
- Old access token blacklisted in Redis after successful location switch to prevent reuse
- PaymentRequiredError (402) added to shared errors for subscription plan gating (free/essential blocked from org creation)
- Subscription plan determines max locations: growth=3, ai_powered=10
- Location slug uniqueness enforced globally across all companies
- DELETE on locations = soft-deactivate (isActive=false), preserving all historical data
- Full page reload after location switch (window.location.reload) for clean TanStack Query cache reset
- LocationSwitcher renders null when user has no org or only 1 location
- DELETE member endpoint uses direct fetch() because apiClient.delete doesn't support request body

**Phase 31 decisions:**
- Customer retention uses CUSTOMERS_READ permission (not BOOKINGS_READ) since it queries customer table
- CLV buckets: 0-500, 500-2000, 2000-5000, 5000-10000, 10000+ CZK ranges
- Peak hours returns sparse matrix — frontend fills gaps with zeros for 7x24 grid
- Customer retention omits days param — operates on pre-computed customer aggregate fields

## Blockers

- Real testimonials needed for landing page social proof — business team must secure (placeholder content in place)
- **[DEFERRED] Comgate recurring activation** — code complete (Phase 28), but live recurring payments require contacting Comgate support for merchant 498621. Can test in sandbox without activation.
- **[RESOLVED] Subscription plan name canonicalization** — CHECK constraint updated in schema + $type annotation. Custom SQL migration created for existing DB rows. Seed file updated.

## Performance Metrics

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 15 | 101 | 2 days (2026-02-10 → 2026-02-12) |
| v1.1 | 7 | 22 | 5 days (2026-02-15 → 2026-02-21) |
| v1.2 | 5 | 20 | 4 days (2026-02-21 → 2026-02-24) |

| Phase 28 Plan 01 | 2 tasks | 9 files | 5 min |
| Phase 28 Plan 02 | 2 tasks | 8 files | 7 min |
| Phase 28 Plan 05 | 2 tasks | 3 files | 4 min |
| Phase 28 Plan 04 | 3 tasks | 4 files | 6 min |
| Phase 28 Plan 03 | 2 tasks | 8 files | 5 min |
| Phase 29 Plan 01 | 2 tasks | 3 files | 4 min |
| Phase 29 Plan 02 | 2 tasks | 3 files | 3 min |
| Phase 29 Plan 03 | 2 tasks | 7 files | 4 min |
| Phase 30 Plan 01 | 3 tasks | 7 files | 7 min |
| Phase 30 Plan 02 | 3 tasks | 6 files | 8 min |
| Phase 30 Plan 03 | 3 tasks | 7 files | 8 min |
| Phase 30 Plan 04 | 2 tasks | 9 files | 7 min |
| Phase 31 Plan 01 | 2 tasks | 5 files | 3 min |

---
*Last updated: 2026-02-24 — Phase 31 Plan 01 complete (5 analytics API routes). Phase 31 in progress.*
