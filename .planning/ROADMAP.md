# ScheduleBox — Roadmap

## Milestones

- **v1.0 ScheduleBox Platform** — Phases 1-15 (shipped 2026-02-12)
- **v1.1 Production Hardening** — Phases 16-22 (shipped 2026-02-21)
- **v1.2 Product Readiness** — Phases 23-27 (shipped 2026-02-24)
- **v1.3 Revenue & Growth** — Phases 28-32 (in progress)

## Phases

<details>
<summary>v1.0 ScheduleBox Platform (Phases 1-15) — SHIPPED 2026-02-12</summary>

### Milestone 1: Foundation & MVP
- [x] Phase 1: Project Setup & Infrastructure (7/10 plans) — completed 2026-02-10
- [x] Phase 2: Database Foundation (9/9 plans) — completed 2026-02-10
- [x] Phase 3: Auth & Core Services (8/8 plans) — completed 2026-02-10
- [x] Phase 4: Frontend Shell (8/8 plans) — completed 2026-02-11
- [x] Phase 5: Booking MVP (8/9 plans) — completed 2026-02-11
- [x] Phase 6: Payment Integration (7/7 plans) — completed 2026-02-11

### Milestone 2: Business Features
- [x] Phase 7: Notifications & Automation (7/7 plans) — completed 2026-02-11
- [x] Phase 8: CRM & Marketing (3/3 plans) — completed 2026-02-11
- [x] Phase 9: Loyalty Program (8/8 plans) — completed 2026-02-11

### Milestone 3: AI & Advanced
- [x] Phase 10: AI Phase 1 — Predictions (4/4 plans) — completed 2026-02-11
- [x] Phase 11: AI Phase 2 — Optimization (5/5 plans) — completed 2026-02-11
- [x] Phase 12: Advanced Features (8/8 plans) — completed 2026-02-12

### Milestone 4: Polish & Launch
- [x] Phase 13: Polish (4/4 plans) — completed 2026-02-12
- [x] Phase 14: AI Phase 3 — Voice & Intelligence (5/5 plans) — completed 2026-02-12
- [x] Phase 15: DevOps & Launch (6/6 plans) — completed 2026-02-12

</details>

<details>
<summary>v1.1 Production Hardening (Phases 16-22) — SHIPPED 2026-02-21</summary>

- [x] Phase 16: Testing Foundation (4/4 plans) — completed 2026-02-20
- [x] Phase 17: Integration Testing (3/3 plans) — completed 2026-02-20
- [x] Phase 18: E2E Testing (3/3 plans) — completed 2026-02-20
- [x] Phase 19: Email Delivery (4/4 plans) — completed 2026-02-20
- [x] Phase 20: SMS Delivery (3/3 plans) — completed 2026-02-24
- [x] Phase 21: Payment Processing (3/3 plans) — completed 2026-02-24
- [x] Phase 22: Monitoring & Alerts (2/2 plans) — completed 2026-02-20

**Note:** Twilio (Phase 20-03) and Comgate (Phase 21-03) credentials configured 2026-02-24. All plans complete.

</details>

<details>
<summary>v1.2 Product Readiness (Phases 23-27) — SHIPPED 2026-02-24</summary>

- [x] Phase 23: AI Service Training Pipeline (5/5 plans) — completed 2026-02-24
- [x] Phase 24: AI-Powered UI Surfaces (2/2 plans) — completed 2026-02-24
- [x] Phase 25: Landing Page & Czech Legal (4/4 plans) — completed 2026-02-21
- [x] Phase 26: Booking UX Polish (4/4 plans) — completed 2026-02-24
- [x] Phase 27: Onboarding Wizard (5/5 plans, incl. gap closure) — completed 2026-02-24

**34 requirements delivered with 100% coverage.** Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

---

## v1.3 Revenue & Growth (Phases 28-32)

**Milestone goal:** Enable ScheduleBox to generate recurring revenue through subscription billing, enforce plan tiers, support franchise businesses with multi-location management, and deliver analytics dashboards and frontend polish that justify paid tier pricing.

**Requirements:** 32 total (BILL-01..07, LIMIT-01..05, ORG-01..06, ANLYT-01..08, UI-01..06)

**Build order rationale:** Billing infrastructure is the unlock for all other features. Usage limits need billing as their upgrade destination. Multi-location is architecturally independent but must precede cross-location analytics. Analytics depends on subscription records (MRR) and the org model (cross-location). Frontend polish runs last on pages built in earlier phases.

**Business blocker:** Comgate recurring payments require manual activation by contacting Comgate support for merchant account 498621. This must be initiated before Phase 28 implementation begins. Timeline is unknown (days to weeks).

---

### Phase 28: Subscription Billing Infrastructure

**Goal:** Companies can subscribe to a paid plan, pay via Comgate recurring, auto-renew monthly, and receive compliant invoice PDFs.

**Dependencies:** None (first phase). Prerequisite: Comgate recurring activation confirmed on merchant 498621.

**Requirements:** BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06, BILL-07

**Plans:** 5 plans

Plans:
- [x] 28-01-PLAN.md — DB schema (subscriptions, subscription_invoices, subscription_events) + CHECK constraint migration + Comgate recurring client + billing types
- [x] 28-02-PLAN.md — Billing API endpoints (plans, subscribe, subscription, upgrade, downgrade, status, webhook) + subscription service layer
- [x] 28-03-PLAN.md — BullMQ renewal scheduler + dunning automation + Czech email templates
- [x] 28-04-PLAN.md — Billing portal UI (plan comparison, subscription management, invoice history)
- [x] 28-05-PLAN.md — Invoice PDF generation (SEQUENCE numbering, Czech VAT compliance) + invoice API routes

**Success Criteria:**

1. A company owner can select a paid plan, complete the first Comgate payment with `initRecurring=true`, and see their account immediately reflect the new plan with a next renewal date.
2. On each billing cycle date, the BullMQ renewal job automatically charges the company via Comgate recurring without any owner action; the subscription state transitions from `active` to `active` with an updated period.
3. When a Comgate payment fails, the subscription transitions to `past_due` and the owner receives a dunning email; after 14 days without successful payment, the account downgrades to Free automatically.
4. An owner can upgrade or downgrade their plan from the billing portal; upgrades take effect immediately with prorated charge for the remaining period; downgrades take effect at end of current period.
5. After each billing cycle, the owner receives a PDF invoice by email and can download all past invoices from the billing portal; invoices comply with Czech VAT requirements (ICO, DIC, sequential numbering, correct VAT rate).

**Research flag:** MEDIUM confidence on Comgate recurring REST parameter names — verify `initRecurring` field name in sandbox before building the renewal job. Contact Comgate support for merchant 498621 recurring activation before implementation starts.

---

### Phase 29: Usage Limits and Tier Enforcement

**Goal:** Plan tier limits are enforced server-side on every booking, employee, and service creation, with visible usage meters and contextual upgrade prompts.

**Dependencies:** Phase 28 (billing must exist so upgrade prompts have a real destination and plan state is readable).

**Requirements:** LIMIT-01, LIMIT-02, LIMIT-03, LIMIT-04, LIMIT-05

**Plans:** 3 plans

Plans:
- [ ] 29-01-PLAN.md — Redis booking counter infrastructure + plan-limits helper + GET /api/v1/usage endpoint
- [ ] 29-02-PLAN.md — Server-side limit enforcement in POST handlers (bookings, employees, services) with 402 responses
- [ ] 29-03-PLAN.md — Usage dashboard widget with progress bars + upgrade modal + Czech/English translations

**Success Criteria:**

1. A Free plan company that has reached 50 bookings in the current billing period receives an HTTP 402 response when attempting to create booking 51; the frontend shows an upgrade modal with plan comparison rather than a generic error.
2. A Free plan company that tries to add a 4th employee or a 6th service is blocked with an upgrade prompt; the block is enforced at the API level and cannot be bypassed by removing the frontend check.
3. An owner on any plan can see a usage widget in the dashboard showing current bookings consumed vs. their tier limit with a visual progress bar; the widget shows a warning banner when consumption reaches 80% of the limit.
4. Plan limits match documented tier values: Free 50 bookings/month, Essential 500, Growth 2,000, AI-Powered unlimited; these values are defined in a single configuration file and not scattered across multiple check locations.

---

### Phase 30: Multi-Location Organizations

**Goal:** Franchise owners can manage multiple business locations under one organization, switch location context in the dashboard, and assign location-level managers.

**Dependencies:** Phase 28 (subscription plan gates how many locations a company can create).

**Requirements:** ORG-01, ORG-02, ORG-03, ORG-04, ORG-05, ORG-06

**Plans:** 5 plans

Plans:
- [ ] 30-01-PLAN.md — DB schema (organizations + organization_members tables, companies.organization_id FK) + shared types + Drizzle relations + migration
- [ ] 30-02-PLAN.md — JWT context-switch endpoint (POST /auth/switch-location) + org-scope helpers + Zod schemas + integration test for cross-org 403 rejection
- [ ] 30-03-PLAN.md — Organization CRUD API (create org, add/edit/deactivate locations, add/remove members) with plan-gated location limits
- [ ] 30-04-PLAN.md — Location switcher UI in header + organization settings page (location + member management) + navigation update
- [ ] 30-05-PLAN.md — Organization dashboard (per-location metrics) + cross-location customer search (email-based dedup)

**Success Criteria:**

1. A franchise owner can create an organization, add multiple company locations to it, and switch between locations using a dropdown in the dashboard header; after switching, all data shown (bookings, customers, revenue) is scoped exclusively to the selected location.
2. A user with `franchise_owner` role can see all locations in the organization dashboard with key metrics (bookings, revenue, occupancy) per location on a single screen without switching context.
3. A `location_manager` assigned to a single location can log in and manage that location's bookings, staff, and services but cannot see any data from other locations in the organization.
4. A franchise owner can add a new location, edit existing location details, and deactivate a location from the organization settings page; deactivating a location soft-disables it without deleting any historical data.
5. Customers who have visited multiple locations within an organization appear as a single customer record when searched from organization-level views, preventing inflated CRM counts.

**Research flag:** JWT context-switch security boundary has no documented precedent in this codebase. An integration test must verify that switching to a company owned by a different organization is rejected with 403 before merging any multi-location code to main.

---

### Phase 31: Analytics and Reporting

**Goal:** Business owners can view revenue and booking analytics across configurable date ranges, franchise owners see cross-location aggregates, and platform admins monitor SaaS health metrics.

**Dependencies:** Phase 28 (MRR/ARR platform admin metrics require subscription records). Phase 30 (cross-location analytics requires the organization model to be live).

**Requirements:** ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04, ANLYT-05, ANLYT-06, ANLYT-07, ANLYT-08

**Plans:** 5 plans

Plans:
- [ ] 31-01-PLAN.md — Revenue & booking analytics API routes (payment methods, top services, peak hours, cancellations, customer retention)
- [ ] 31-02-PLAN.md — Employee utilization API + analytics_snapshots schema + BullMQ hourly refresh scheduler
- [ ] 31-03-PLAN.md — Platform admin dashboard API (MRR, churn, plan distribution) + cross-location organization analytics API
- [ ] 31-04-PLAN.md — Analytics UI enhancement (6 new chart components, extended analytics page with all sections)
- [ ] 31-05-PLAN.md — Admin dashboard page + organization analytics page + customer report PDF/CSV export + navigation update

**Success Criteria:**

1. A business owner can open the analytics dashboard and see daily/weekly/monthly revenue charts, payment method breakdown, top services by revenue, booking volume trends, and peak hours heatmap — all updating when the date range filter is changed.
2. A business owner can see employee utilization: bookings per employee, utilization percentage, and revenue attributed to each employee on a bar chart.
3. A franchise owner can view an aggregate analytics screen showing organization-level totals for revenue, bookings, and occupancy, with a drill-down to per-location breakdown.
4. A platform admin can access an admin dashboard showing MRR, churn rate, plan distribution across all companies, active company count, and new signup trends — without this data being accessible to regular business owners.
5. An owner can export their revenue, bookings, or customer report as a PDF or CSV file from the analytics page.
6. Analytics queries complete in under 2 seconds for standard date ranges (up to 90 days) because data is served from a materialized view that is refreshed hourly by a BullMQ job, not computed live on every request.

**Occupancy rate decision:** V1 ships a booking fill rate approximation (bookings * avgDuration / employees * workingDays * 480min) instead of the full working-hours-minus-blocked-time calculation. Precise occupancy deferred to v1.4.

---

### Phase 32: Frontend Polish and Design System

**Goal:** The dashboard, billing, and analytics pages feel professional and responsive across all devices, with consistent loading states, dark mode support, and a harmonized design system.

**Dependencies:** Phases 28-31 (polishes pages built in earlier phases; billing portal and analytics pages must exist before their states can be audited).

**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06

**Plans:** 3 plans

Plans:
- [ ] 32-01-PLAN.md — Dark mode infrastructure (next-themes, ThemeProvider, toggle) + design system token harmonization (shadows, success/warning colors) + hardcoded color fixes
- [ ] 32-02-PLAN.md — Loading/empty/error states audit (16 loading.tsx skeletons, shared PageSkeleton/TableSkeleton, dashboard error.tsx)
- [ ] 32-03-PLAN.md — Dashboard redesign (KPI row, revenue chart, recent bookings) + landing page testimonials + responsive audit + human verification

**Success Criteria:**

1. Every data-fetching page in the dashboard shows a skeleton loader while loading and a descriptive empty state with an action CTA when no data exists; no page shows a blank white area or spinner-only state.
2. The dashboard has a professional grid layout with a KPI summary row (revenue, bookings, customers, no-show rate), data visualization cards, and quick action buttons visible without scrolling on a 1280px desktop screen.
3. Dark mode is available via a manual toggle and respects the user's system preference on first load; all dashboard, settings, and analytics pages are correctly styled in both light and dark themes.
4. All dashboard and marketing pages pass a responsive design review at 375px (mobile), 768px (tablet), and 1280px (desktop) breakpoints without horizontal scroll or overlapping elements.
5. The design system is consistent across all pages: spacing, typography, color palette, border radii, and shadow system follow a single token set with no one-off overrides.

---

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Project Setup | v1.0 | 7/10 | Complete | 2026-02-10 |
| 2. Database Foundation | v1.0 | 9/9 | Complete | 2026-02-10 |
| 3. Auth & Core | v1.0 | 8/8 | Complete | 2026-02-10 |
| 4. Frontend Shell | v1.0 | 8/8 | Complete | 2026-02-11 |
| 5. Booking MVP | v1.0 | 8/9 | Complete | 2026-02-11 |
| 6. Payments | v1.0 | 7/7 | Complete | 2026-02-11 |
| 7. Notifications | v1.0 | 7/7 | Complete | 2026-02-11 |
| 8. CRM & Marketing | v1.0 | 3/3 | Complete | 2026-02-11 |
| 9. Loyalty | v1.0 | 8/8 | Complete | 2026-02-11 |
| 10. AI Predictions | v1.0 | 4/4 | Complete | 2026-02-11 |
| 11. AI Optimization | v1.0 | 5/5 | Complete | 2026-02-11 |
| 12. Advanced | v1.0 | 8/8 | Complete | 2026-02-12 |
| 13. Polish | v1.0 | 4/4 | Complete | 2026-02-12 |
| 14. AI Voice | v1.0 | 5/5 | Complete | 2026-02-12 |
| 15. DevOps & Launch | v1.0 | 6/6 | Complete | 2026-02-12 |
| 16. Testing Foundation | v1.1 | 4/4 | Complete | 2026-02-20 |
| 17. Integration Testing | v1.1 | 3/3 | Complete | 2026-02-20 |
| 18. E2E Testing | v1.1 | 3/3 | Complete | 2026-02-20 |
| 19. Email Delivery | v1.1 | 4/4 | Complete | 2026-02-20 |
| 20. SMS Delivery | v1.1 | 3/3 | Complete | 2026-02-24 |
| 21. Payment Processing | v1.1 | 3/3 | Complete | 2026-02-24 |
| 22. Monitoring & Alerts | v1.1 | 2/2 | Complete | 2026-02-20 |
| 23. AI Service | v1.2 | 5/5 | Complete | 2026-02-24 |
| 24. AI-Powered UI | v1.2 | 2/2 | Complete | 2026-02-24 |
| 25. Landing Page | v1.2 | 4/4 | Complete | 2026-02-21 |
| 26. Booking UX Polish | v1.2 | 4/4 | Complete | 2026-02-24 |
| 27. Onboarding Wizard | v1.2 | 5/5 | Complete | 2026-02-24 |
| 28. Subscription Billing | v1.3 | 5/5 | Complete | 2026-02-24 |
| 29. Usage Limits | v1.3 | 0/3 | Planned | — |
| 30. Multi-Location Orgs | v1.3 | 0/5 | Planned | — |
| 31. Analytics | v1.3 | 0/5 | Planned | — |
| 32. Frontend Polish | v1.3 | 0/3 | Planned | — |

---
*Roadmap created: 2026-02-10*
*v1.0 shipped: 2026-02-12*
*v1.1 shipped: 2026-02-21*
*v1.2 shipped: 2026-02-24*
*v1.3 roadmap created: 2026-02-24*
*Phase 28 planned: 2026-02-24*
*Phase 29 planned: 2026-02-24*
*Phase 30 planned: 2026-02-24*
*Phase 31 planned: 2026-02-24*
*Phase 32 planned: 2026-02-24*
