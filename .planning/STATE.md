# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.3 Revenue & Growth — Phase 30 in progress (Plans 01-03 complete)

## Current Position

- **Milestone:** v1.3 Revenue & Growth
- **Phase:** 30 — Multi-Location Organizations
- **Plan:** 03 complete, 04+ pending
- **Status:** Plan 03 complete (organization CRUD API)
- **Last activity:** 2026-02-24 — Plan 30-03 complete (org CRUD API, location management, member management)

Progress: [###-------] 30% (3/? plans)

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

**v1.3 Phase 30 in progress:**
- Plan 01 complete: Organization schema (organizations + organization_members tables, companies.organizationId FK, shared TypeScript types, Drizzle relations, migration 0002)
- Plan 03 complete: Organization CRUD API (GET/POST orgs, GET/PUT org detail, location CRUD with plan limits, member management with role gating, PaymentRequiredError 402)

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
- PaymentRequiredError (402) added to shared errors for subscription plan gating (free/essential blocked from org creation)
- Subscription plan determines max locations: growth=3, ai_powered=10
- Location slug uniqueness enforced globally across all companies
- DELETE on locations = soft-deactivate (isActive=false), preserving all historical data

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
| Phase 30 Plan 03 | 3 tasks | 7 files | 8 min |

---
*Last updated: 2026-02-24 — Phase 30 Plan 03 complete (organization CRUD API). Plans 01+03 done, Plan 02 in parallel.*
