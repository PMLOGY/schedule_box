# ScheduleBox — Roadmap

## Milestones

- ✅ **v1.0 ScheduleBox Platform** — Phases 1-15 (shipped 2026-02-12)
- ✅ **v1.1 Production Hardening** — Phases 16-22 (shipped 2026-02-21)
- ✅ **v1.2 Product Readiness** — Phases 23-27 (shipped 2026-02-24)
- ✅ **v1.3 Revenue & Growth** — Phases 28-32 (shipped 2026-02-25)
- ✅ **v1.4 Design Overhaul** — Phases 33-38 (shipped 2026-03-12)
- 🚧 **v2.0 Full Functionality & Production Readiness** — Phases 39-44 (in progress)

## Phases

<details>
<summary>✅ v1.0 ScheduleBox Platform (Phases 1-15) — SHIPPED 2026-02-12</summary>

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
<summary>✅ v1.1 Production Hardening (Phases 16-22) — SHIPPED 2026-02-21</summary>

- [x] Phase 16: Testing Foundation (4/4 plans) — completed 2026-02-20
- [x] Phase 17: Integration Testing (3/3 plans) — completed 2026-02-20
- [x] Phase 18: E2E Testing (3/3 plans) — completed 2026-02-20
- [x] Phase 19: Email Delivery (4/4 plans) — completed 2026-02-20
- [x] Phase 20: SMS Delivery (3/3 plans) — completed 2026-02-24
- [x] Phase 21: Payment Processing (3/3 plans) — completed 2026-02-24
- [x] Phase 22: Monitoring & Alerts (2/2 plans) — completed 2026-02-20

</details>

<details>
<summary>✅ v1.2 Product Readiness (Phases 23-27) — SHIPPED 2026-02-24</summary>

- [x] Phase 23: AI Service Training Pipeline (5/5 plans) — completed 2026-02-24
- [x] Phase 24: AI-Powered UI Surfaces (2/2 plans) — completed 2026-02-24
- [x] Phase 25: Landing Page & Czech Legal (4/4 plans) — completed 2026-02-21
- [x] Phase 26: Booking UX Polish (4/4 plans) — completed 2026-02-24
- [x] Phase 27: Onboarding Wizard (5/5 plans) — completed 2026-02-24

</details>

<details>
<summary>✅ v1.3 Revenue & Growth (Phases 28-32) — SHIPPED 2026-02-25</summary>

- [x] Phase 28: Subscription Billing Infrastructure (5/5 plans) — completed 2026-02-24
- [x] Phase 29: Usage Limits and Tier Enforcement (3/3 plans) — completed 2026-02-24
- [x] Phase 30: Multi-Location Organizations (5/5 plans) — completed 2026-02-24
- [x] Phase 31: Analytics and Reporting (5/5 plans) — completed 2026-02-25
- [x] Phase 32: Frontend Polish and Design System (3/3 plans) — completed 2026-02-25

</details>

<details>
<summary>✅ v1.4 Design Overhaul (Phases 33-38) — SHIPPED 2026-03-12</summary>

**31 requirements delivered (DSYS-01..07, COMP-01..06, DASH-01..05, MKTG-01..05, AUTH-01..03, POLSH-01..06)**
**Frontend-only milestone — zero backend/API/database changes**

- [x] Phase 33: Token Foundation (2/2 plans) — completed 2026-02-25
- [x] Phase 34: Component Glass Variants (2/2 plans) — completed 2026-02-25
- [x] Phase 35: Dashboard Glass (2/2 plans) — completed 2026-02-25
- [x] Phase 36: Marketing Glass (2/2 plans) — completed 2026-02-25
- [x] Phase 37: Auth and Polish (2/2 plans) — completed 2026-03-12
- [x] Phase 38: Glass Polish Gaps (1/1 plan) — completed 2026-03-12

Full archive: `.planning/milestones/v1.4-ROADMAP.md`

</details>

### v2.0 Full Functionality & Production Readiness (In Progress)

**Milestone Goal:** Every feature works end-to-end across all 4 user views (Admin, Business Owner, Employee, End Customer). Auth is stable, the complete booking chain is functional, and the app is deployable to production via Docker Compose.

- [x] **Phase 39: Auth & Session** - Session persistence, silent token refresh, role-based routing, employee invite (completed 2026-03-13)
- [ ] **Phase 40: Business Owner Flow** - Public booking URL, service/employee CRUD, booking management, dashboard with real data
- [ ] **Phase 41: Employee Flow** - Working hours, time-off requests, personal booking view and status actions
- [ ] **Phase 42: End Customer Booking** - End-to-end public booking wizard, confirmation tracking, reviews, loyalty points
- [ ] **Phase 43: Admin Platform** - Platform-wide stats dashboard, company management, user management
- [ ] **Phase 44: Production Deployment** - Docker Compose, production build, environment variable validation

## Phase Details

### Phase 39: Auth & Session
**Goal**: Users stay logged in, tokens refresh silently, and each role lands on the correct page after login — including owners who can create employee accounts
**Depends on**: Nothing (foundational — all other phases depend on this)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Refreshing the browser does not log the user out — session survives page reload
  2. After 15+ minutes of inactivity, the session auto-renews in the background without a login prompt
  3. Logging in as admin routes to `/admin`, as owner routes to `/dashboard`, as employee routes to `/dashboard`, as customer routes to the customer portal — each without manual redirect
  4. Owner can create a new employee account (email + password or invite link), and the employee can log in with those credentials
**Plans**: TBD

### Phase 40: Business Owner Flow
**Goal**: Business owners have a fully operational dashboard — they can manage their services and employees, see and act on real bookings, and share their public booking link with customers
**Depends on**: Phase 39
**Requirements**: OWNER-01, OWNER-02, OWNER-03, OWNER-04, OWNER-05, OWNER-06
**Success Criteria** (what must be TRUE):
  1. Owner can copy their unique public booking URL directly from the dashboard (one click, no hunting)
  2. Owner can create, edit, and delete a service — all fields (name, duration, price, category) persist after save and reload
  3. Owner can create, edit, and deactivate an employee — service assignments persist correctly
  4. Owner can see incoming bookings and use confirm, cancel, complete, and no-show actions — each action changes the booking status immediately
  5. Dashboard calendar displays real bookings at correct times with correct employee names
  6. All dashboard sub-pages (Settings, Payments, Customers, Reviews, Loyalty, Analytics) load real data rather than empty states or mock data
**Plans**: 2 plans
Plans:
- [ ] 40-01-PLAN.md — Public booking URL card + delete service + employee CRUD verification
- [ ] 40-02-PLAN.md — Booking actions fix + calendar + dashboard data audit

### Phase 41: Employee Flow
**Goal**: Employees can configure their own availability and manage the bookings assigned to them
**Depends on**: Phase 40 (owner must have set up employees and services first)
**Requirements**: EMP-01, EMP-02, EMP-03, EMP-04
**Success Criteria** (what must be TRUE):
  1. Employee can set working hours for each day of the week (start time, end time, or day off) and the schedule saves and persists
  2. Employee can submit a time-off request with a reason and date range — request appears as pending for owner review
  3. Employee's booking list shows only bookings assigned to them — no bookings from other employees are visible
  4. Employee can mark a booking as confirmed, completed, or no-show — status updates immediately and is visible to the owner
**Plans**: TBD

### Phase 42: End Customer Booking
**Goal**: A customer with only a public booking URL can complete a booking end-to-end, track it, leave a review, and accumulate loyalty points
**Depends on**: Phase 40 (services and employees must be set up), Phase 41 (employee availability must be configured)
**Requirements**: CUST-01, CUST-02, CUST-03, CUST-04
**Success Criteria** (what must be TRUE):
  1. Customer visiting the public booking URL can select a service, pick an available time slot, enter their name/email/phone, and submit — a booking record is created in the database
  2. After booking, customer receives a confirmation page with a booking ID and a shareable URL they can return to later to check the status
  3. After a booking is marked completed, customer receives a link to leave a review — review appears on the business's profile
  4. Loyalty points are awarded to returning customers (matched by email) after a completed booking, and a discount coupon from the loyalty program applies during the next booking checkout
**Plans**: TBD

### Phase 43: Admin Platform
**Goal**: Platform administrators can monitor real activity across all companies and manage company and user accounts
**Depends on**: Phase 39 (admin login must route correctly)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03
**Success Criteria** (what must be TRUE):
  1. Admin dashboard displays live counts of total companies, registered users, bookings, and platform revenue — numbers match the actual database state
  2. Admin can view the full list of company accounts, see their status, and toggle a company between active and deactivated — deactivated companies cannot log in
  3. Admin can search and view all users across all companies, see their role and associated company, and disable individual user accounts
**Plans**: 1 plan
Plans:
- [ ] 43-01-PLAN.md — Company toggle API + login enforcement + UI toggle button + translations

### Phase 44: Production Deployment
**Goal**: The application can be built and deployed to a VPS using Docker Compose with a documented, validated environment configuration
**Depends on**: Phase 39, Phase 40, Phase 41, Phase 42, Phase 43 (all features complete before packaging)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. Running `docker compose up` with the production compose file starts Next.js, PostgreSQL, and Redis — the app is reachable in a browser with no manual intervention beyond supplying env vars
  2. Running `pnpm build` (or the Docker build) completes with zero TypeScript errors, zero ESLint errors, and zero missing environment variable warnings
  3. A documented `.env.example` file lists every required variable with descriptions — the app validates presence of required vars on startup and logs a clear error (not a silent crash) for any missing ones
**Plans**: TBD

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
| 29. Usage Limits | v1.3 | 3/3 | Complete | 2026-02-24 |
| 30. Multi-Location Orgs | v1.3 | 5/5 | Complete | 2026-02-24 |
| 31. Analytics | v1.3 | 5/5 | Complete | 2026-02-25 |
| 32. Frontend Polish | v1.3 | 3/3 | Complete | 2026-02-25 |
| 33. Token Foundation | v1.4 | 2/2 | Complete | 2026-02-25 |
| 34. Component Glass Variants | v1.4 | 2/2 | Complete | 2026-02-25 |
| 35. Dashboard Glass | v1.4 | 2/2 | Complete | 2026-02-25 |
| 36. Marketing Glass | v1.4 | 2/2 | Complete | 2026-02-25 |
| 37. Auth and Polish | v1.4 | 2/2 | Complete | 2026-03-12 |
| 38. Glass Polish Gaps | v1.4 | 1/1 | Complete | 2026-03-12 |
| 39. Auth & Session | v2.0 | 2/2 | Complete | 2026-03-13 |
| 40. Business Owner Flow | v2.0 | 0/2 | In progress | - |
| 41. Employee Flow | v2.0 | TBD | Not started | - |
| 42. End Customer Booking | v2.0 | TBD | Not started | - |
| 43. Admin Platform | v2.0 | 0/1 | Not started | - |
| 44. Production Deployment | v2.0 | TBD | Not started | - |

---
*Roadmap created: 2026-02-10*
*v1.0 shipped: 2026-02-12*
*v1.1 shipped: 2026-02-21*
*v1.2 shipped: 2026-02-24*
*v1.3 shipped: 2026-02-25*
*v1.4 shipped: 2026-03-12*
*v2.0 roadmap created: 2026-03-13*
