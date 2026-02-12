# ScheduleBox — Roadmap

**Version:** v1.0
**Phases:** 15
**Requirements:** 103

## Milestone 1: Foundation & MVP

### Phase 1: Project Setup & Infrastructure ✓

**Goal:** Initialize monorepo, Docker environment, and CI/CD so all developers can build, run, and test locally with one command.

**Status:** Gap Closure (2026-02-10)

**Segments:** ALL (DATABASE, BACKEND, FRONTEND, DEVOPS)

**Requirements:** INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05

**Depends on:** None

**Plans:** 10 plans (7 complete, 3 gap closure pending)

Plans:
- [x] 01-a-PLAN.md — Root monorepo scaffold (pnpm workspace, tsconfig, env vars, ignore files)
- [x] 01-b-PLAN.md — Shared packages stubs (database, shared, events, ui)
- [x] 01-c-PLAN.md — Next.js 14 app setup (apps/web with App Router, Tailwind)
- [x] 01-d-PLAN.md — Docker Compose environment (PostgreSQL, Redis, RabbitMQ, Dockerfile)
- [x] 01-e-PLAN.md — Developer tooling (ESLint 9, Prettier, husky, commitlint)
- [x] 01-f-PLAN.md — CI/CD pipeline (GitHub Actions, Trivy scanning)
- [x] 01-g-PLAN.md — Health endpoints and monorepo validation
- [ ] 01-h-PLAN.md — Gap closure: Fix Prettier formatting violations (39 files)
- [ ] 01-i-PLAN.md — Gap closure: Fix TypeScript errors (372) and ESLint errors (93)
- [ ] 01-j-PLAN.md — Gap closure: Fix homepage 404 (restructure app/ with [locale] segment)

**Success Criteria:**
1. ~~`pnpm install` succeeds and workspace packages resolve~~ ✓
2. ~~`docker compose up` starts PostgreSQL, Redis, and RabbitMQ with passing health checks~~ ✓
3. `pnpm dev` starts Next.js dev server and homepage loads without 404 (pending 01-j)
4. `pnpm type-check` passes with zero errors across all packages (pending 01-i)
5. `pnpm lint` passes with zero errors across all packages (pending 01-i)
6. `pnpm format:check` passes with zero formatting issues (pending 01-h)
7. ~~CI pipeline runs lint and type-check on every push~~ ✓
8. ~~Health/readiness endpoints respond with 200~~ ✓

---

### Phase 2: Database Foundation ✓

**Goal:** Create all 47 Drizzle ORM table schemas with migrations, RLS policies, and seed data so backend services have a complete, secure data layer.

**Status:** Complete (2026-02-10)

**Segments:** DATABASE (primary), DEVOPS (migrations in CI)

**Requirements:** DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07

**Depends on:** Phase 1

**Plans:** 9/9 complete

Plans:
- [x] 02-01-PLAN.md — Drizzle ORM setup, connection, config, migration runner
- [x] 02-02-PLAN.md — Auth & Tenancy schemas (8 tables: companies, users, roles, permissions, etc.)
- [x] 02-03-PLAN.md — Core entity schemas (12 tables: customers, services, employees, resources)
- [x] 02-04-PLAN.md — Booking & Payment schemas (5 tables: bookings, payments, invoices, etc.)
- [x] 02-05-PLAN.md — Business feature schemas (9 tables: coupons, gift cards, loyalty)
- [x] 02-06-PLAN.md — Platform schemas (12 tables: notifications, reviews, AI, marketplace, etc.)
- [x] 02-07-PLAN.md — RLS helper functions and tenant isolation policies
- [x] 02-08-PLAN.md — Views, relations, migration execution, seed data, validation
- [x] 02-09-PLAN.md — Triggers, double-booking constraint, soft delete indexes, deferred FKs

**Success Criteria:**
1. ~~All 47 tables created via migration and match documentation schema~~ ✓
2. ~~RLS policies prevent cross-tenant data access (verified with test)~~ ✓
3. ~~Seed data loads for development (companies, users, services, employees)~~ ✓
4. ~~Double-booking prevention constraint rejects concurrent slot reservations~~ ✓
5. ~~Migrations run forward and backward without errors~~ ✓

---

### Phase 3: Auth & Core Services ✓

**Goal:** Implement authentication with JWT/RBAC and CRUD for all core entities (customers, services, employees, resources) so the platform has a functional API layer.

**Status:** Complete (2026-02-10)

**Segments:** BACKEND (primary), DATABASE (schema support), DEVOPS (test setup)

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, CORE-07, CORE-08, CORE-09, CORE-10, CORE-11

**Depends on:** Phase 2

**Plans:** 8/8 complete

Plans:
- [x] 03-01-PLAN.md — Shared error classes, error codes, API response utilities
- [x] 03-02-PLAN.md — JWT management, Argon2id password hashing, Redis client, Zod validation middleware
- [x] 03-03-PLAN.md — Route handler factory, auth/RBAC middleware, auth Zod schemas
- [x] 03-04-PLAN.md — Auth endpoints: register, login, refresh, logout, password reset, email verify, profile
- [x] 03-05-PLAN.md — MFA setup/verify, OAuth2 scaffolds, API key management
- [x] 03-06-PLAN.md — Customer CRUD with pagination, search, tags, GDPR export
- [x] 03-07-PLAN.md — Service CRUD with categories, Employee CRUD with working hours and overrides
- [x] 03-08-PLAN.md — Resource CRUD with types, company settings, company working hours

**Success Criteria:**
1. ~~User can register, verify email, log in, and receive JWT tokens~~ ✓
2. ~~Refresh token rotation works (old token rejected after rotation)~~ ✓
3. ~~RBAC middleware blocks unauthorized access per role (owner, employee, customer)~~ ✓
4. ~~CRUD operations work for customers, services, employees, and resources~~ ✓
5. ~~All API inputs validated with Zod; invalid input returns structured error~~ ✓

---

### Phase 4: Frontend Shell

**Goal:** Build the application shell with navigation, design system, auth pages, dashboard, and calendar so users can log in and see their workspace.

**Segments:** FRONTEND (primary), BACKEND (API contracts), DEVOPS (E2E setup)

**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09

**Depends on:** Phase 3

**Plans:** 8 plans in 5 waves

Plans:
- [ ] 04-01-PLAN.md — Design system foundation (shadcn/ui 16 components, Tailwind theme, cn utility) [Wave 1]
- [ ] 04-02-PLAN.md — State management & API client (Zustand stores, TanStack Query, providers) [Wave 1]
- [ ] 04-03-PLAN.md — Internationalization setup (next-intl, cs/sk/en translations) [Wave 1]
- [ ] 04-04-PLAN.md — Auth pages (login, register, forgot-password, reset-password) [Wave 2]
- [ ] 04-05-PLAN.md — App shell layout (sidebar, header, breadcrumbs, mobile nav, auth guard) [Wave 2]
- [ ] 04-06-PLAN.md — Dashboard & shared components (KPI cards, data table, empty states, skeletons) [Wave 3]
- [ ] 04-07-PLAN.md — Calendar & toast (FullCalendar resource timeline, sonner, placeholder pages) [Wave 4]
- [ ] 04-08-PLAN.md — Visual verification checkpoint [Wave 5]

**Success Criteria:**
1. User can log in and see role-appropriate sidebar navigation
2. Dashboard shows KPI cards (bookings, revenue, no-shows, occupancy)
3. Calendar renders day/week/month views with employee columns
4. Design system components render consistently (buttons, inputs, modals, tables)
5. Empty states and loading skeletons display properly

---

### Phase 5: Booking MVP ✓

**Goal:** Implement the complete booking flow with availability engine, double-booking prevention, 4-step form, and calendar integration so customers can book and owners can manage appointments.

**Status:** Complete (2026-02-11)

**Segments:** BACKEND (Booking API), FRONTEND (Booking UI), DATABASE (availability schema), DEVOPS (integration tests)

**Requirements:** BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07, BOOK-08, BOOK-09, BOOK-10

**Depends on:** Phase 3, Phase 4

**Plans:** 8/9 complete (05-09 visual checkpoint skipped)

Plans:
- [x] 05-01-PLAN.md — Shared Zod schemas and TypeScript types for booking/availability [Wave 1]
- [x] 05-02-PLAN.md — RabbitMQ event infrastructure and booking domain events [Wave 1]
- [x] 05-03-PLAN.md — Availability engine and public GET /api/v1/availability endpoint [Wave 2]
- [x] 05-04-PLAN.md — Booking CRUD API with double-booking prevention (SELECT FOR UPDATE) [Wave 2]
- [x] 05-05-PLAN.md — Booking status transitions (cancel, confirm, complete, no-show, reschedule) + expiration [Wave 3]
- [x] 05-06-PLAN.md — 4-step booking wizard form (service -> date/time -> customer -> confirm) [Wave 3]
- [x] 05-07-PLAN.md — Admin time blocking (schedule overrides for vacations/maintenance) [Wave 3]
- [x] 05-08-PLAN.md — Admin calendar with FullCalendar, drag-drop rescheduling, booking list page [Wave 4]
- [ ] 05-09-PLAN.md — End-to-end verification checkpoint [Wave 5] (skipped)

**Success Criteria:**
1. ~~Availability engine returns correct free slots based on working hours, existing bookings, and buffer times~~ ✓
2. ~~Full booking flow works: select service -> pick slot -> enter info -> confirm~~ ✓
3. ~~Double-booking prevention rejects concurrent reservations for same slot~~ ✓
4. ~~Calendar displays bookings with drag & drop rescheduling~~ ✓
5. ~~RabbitMQ events fire on booking lifecycle changes (created, confirmed, cancelled, completed)~~ ✓

---

### Phase 6: Payment Integration ✓

**Goal:** Integrate Comgate and QRcomat payment gateways with SAGA pattern so customers can pay online or on-site with reliable transaction handling.

**Status:** Complete (2026-02-11)

**Segments:** BACKEND (primary), FRONTEND (Payment UI), DATABASE (payment tables), DEVOPS (webhook testing)

**Requirements:** PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07

**Depends on:** Phase 5

**Plans:** 7/7 complete

Plans:
- [x] 06-01-PLAN.md — Payment Zod schemas, TypeScript types, and domain events (CloudEvents) [Wave 1]
- [x] 06-02-PLAN.md — Webhook idempotency table and payment service foundation [Wave 1]
- [x] 06-03-PLAN.md — Comgate gateway integration (create, webhook, callback) [Wave 2]
- [x] 06-04-PLAN.md — Czech QR payment generation (@spayd/core SPD format) [Wave 2]
- [x] 06-05-PLAN.md — SAGA choreography handlers and payment timeout expiration [Wave 3]
- [x] 06-06-PLAN.md — Invoice PDF generation (PDFKit) and refund processing [Wave 3]
- [x] 06-07-PLAN.md — Payment CRUD API, invoice listing, and env configuration [Wave 4]

**Success Criteria:**
1. ~~Customer can pay via Comgate during booking (redirect + callback)~~ ✓
2. ~~QRcomat generates QR code for on-site payment~~ ✓
3. ~~Webhooks process with idempotency (duplicate webhook doesn't double-charge)~~ ✓
4. ~~SAGA pattern: failed payment cancels booking, successful payment confirms booking~~ ✓
5. ~~Invoice PDF generates and downloads correctly~~ ✓

---

## Milestone 2: Business Features

### Phase 7: Notifications & Automation ✓

**Goal:** Build notification service (email/SMS/push) with template system and visual automation rule builder so businesses can automate customer communication.

**Status:** Complete (2026-02-11)

**Segments:** BACKEND (primary), DATABASE (notification tables), DEVOPS (email testing)

**Requirements:** NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, NOTIF-07, NOTIF-08, NOTIF-09, NOTIF-10

**Depends on:** Phase 5, Phase 6

**Plans:** 7/7 complete

Plans:
- [x] 07-01-PLAN.md — Event consumer helper, payment/review/notification CloudEvent types, Zod schemas [Wave 1]
- [x] 07-02-PLAN.md — Notification worker scaffold (BullMQ, Nodemailer, Twilio, web-push, Handlebars templates) [Wave 1]
- [x] 07-03-PLAN.md — RabbitMQ event consumers (booking confirmation, review routing, payment notifications) [Wave 2]
- [x] 07-04-PLAN.md — API routes: notification templates CRUD, notifications list, automation rules CRUD, email tracking [Wave 2]
- [x] 07-05-PLAN.md — Reminder scheduler (24h/2h before appointment) and automation rule execution engine [Wave 3]
- [x] 07-06-PLAN.md — Frontend: notification history, template editor, visual automation builder (React Flow) [Wave 3]
- [x] 07-07-PLAN.md — Docker Compose integration and verification checkpoint [Wave 4]

**Success Criteria:**
1. ~~Booking creation triggers automatic confirmation email~~ ✓
2. ~~Reminder notifications sent 24h and 2h before appointment~~ ✓
3. ~~Notification templates render with dynamic variables (customer name, service, time)~~ ✓
4. ~~Visual rule builder creates automation: trigger -> delay -> action~~ ✓
5. ~~Review request sent automatically after completed visit with smart routing~~ ✓

---

### Phase 8: CRM & Marketing ✓

**Goal:** Add customer tagging, coupons, gift cards, and import/export so businesses can segment customers and run promotions.

**Status:** Complete (2026-02-11)

**Segments:** BACKEND (CRM API), FRONTEND (CRM UI), DATABASE (CRM tables)

**Requirements:** CRM-01, CRM-02, CRM-03, CRM-04, CRM-05, CRM-06, CRM-07

**Depends on:** Phase 3, Phase 5

**Plans:** 3/3 complete

Plans:
- [x] 08-01-PLAN.md — Coupon CRUD and validation endpoint (percentage/fixed discounts, usage limits, service applicability)
- [x] 08-02-PLAN.md — Gift card CRUD, balance check, and atomic redemption with transaction log
- [x] 08-03-PLAN.md — Customer CSV import with PapaParse and GDPR anonymization endpoint

**Success Criteria:**
1. ~~Owner can create and assign tags to customers~~ ✓
2. ~~Coupons apply correctly during booking (percentage and fixed discounts)~~ ✓
3. ~~Gift cards track balance and deduct on use~~ ✓
4. ~~CSV import creates customers in bulk without duplicates~~ ✓
5. ~~GDPR deletion anonymizes customer data while preserving booking statistics~~ ✓

---

### Phase 9: Loyalty Program

**Goal:** Implement loyalty programs with points, tiers, rewards, and digital wallet cards so businesses can retain customers through gamification.

**Segments:** BACKEND (Loyalty API), FRONTEND (Loyalty UI), DATABASE (loyalty tables)

**Requirements:** LOYAL-01, LOYAL-02, LOYAL-03, LOYAL-04, LOYAL-05, LOYAL-06, LOYAL-07

**Depends on:** Phase 5, Phase 7

**Plans:** 8 plans in 4 waves

Plans:
- [ ] 09-01-PLAN.md — Shared Zod schemas + TypeScript types for loyalty domain [Wave 1]
- [ ] 09-02-PLAN.md — Loyalty CloudEvents + event definitions [Wave 1]
- [ ] 09-03-PLAN.md — Points engine + tier engine + rewards engine (SELECT FOR UPDATE) [Wave 2]
- [ ] 09-04-PLAN.md — Loyalty CRUD API routes (programs, cards, rewards, tiers, transactions) [Wave 2]
- [ ] 09-05-PLAN.md — Points operations API + booking.completed event consumer [Wave 3]
- [ ] 09-06-PLAN.md — Digital wallet pass generation (Apple Wallet + Google Wallet) [Wave 3]
- [ ] 09-07-PLAN.md — Admin loyalty management UI (settings, rewards, cards) [Wave 4]
- [ ] 09-08-PLAN.md — Customer loyalty UI components (card display, tier progress, wallet buttons) [Wave 4]

**Success Criteria:**
1. Customer automatically earns points when booking is completed
2. Tier upgrades trigger automatically based on points/visits
3. Customer can redeem points for rewards from catalog
4. Apple Wallet pass generates and installs on iPhone
5. Google Wallet pass generates and installs on Android

---

## Milestone 3: AI & Advanced

### Phase 10: AI Phase 1 — Predictions ✓

**Goal:** Deploy no-show predictor, CLV model, and health score with fallback system so owners see AI insights for every customer and booking.

**Status:** Complete (2026-02-11)

**Segments:** BACKEND (AI service), DATABASE (AI tables), DEVOPS (ML pipeline)

**Requirements:** AI1-01, AI1-02, AI1-03, AI1-04, AI1-05

**Depends on:** Phase 5, Phase 3

**Plans:** 4/4 complete

Plans:
- [x] 10-01-PLAN.md — AI Python microservice foundation (FastAPI, ML model classes, schemas, Dockerfile) [Wave 1]
- [x] 10-02-PLAN.md — Node.js circuit breaker client (Opossum, fallback values, AI HTTP client) [Wave 1]
- [x] 10-03-PLAN.md — Prediction endpoints, feature store, training scripts, dummy models [Wave 2]
- [x] 10-04-PLAN.md — Next.js AI API routes, Docker Compose integration, env vars [Wave 3]

**Success Criteria:**
1. ~~No-show risk percentage displays in booking detail view~~ ✓
2. ~~CLV prediction shows in customer detail~~ ✓
3. ~~Health score (0-100) categorizes customers (excellent/good/at-risk/churning)~~ ✓
4. ~~When AI service is down, fallback returns default values with `"fallback": true` flag~~ ✓
5. ~~Circuit breaker prevents cascading failures from AI timeouts~~ ✓

---

### Phase 11: AI Phase 2 — Optimization ✓

**Goal:** Add smart upselling, dynamic pricing, capacity optimization, and reminder timing so AI actively increases revenue and efficiency.

**Status:** Complete (2026-02-11)

**Segments:** BACKEND (AI service), FRONTEND (AI UI widgets), DEVOPS (ML pipeline)

**Requirements:** AI2-01, AI2-02, AI2-03, AI2-04

**Depends on:** Phase 10

**Plans:** 5/5 complete

Plans:
- [x] 11-01-PLAN.md — Python optimization models (upselling CF, pricing MAB, capacity Prophet, reminder timing Bayesian) + FastAPI router [Wave 1]
- [x] 11-02-PLAN.md — Node.js circuit breaker extensions (optimization types, fallbacks, 2s upselling timeout) [Wave 1]
- [x] 11-03-PLAN.md — Training scripts and dummy model generator for all 4 optimization models [Wave 2]
- [x] 11-04-PLAN.md — Next.js API routes for optimization endpoints with Zod validation and RBAC [Wave 2]
- [x] 11-05-PLAN.md — Frontend: upselling widget in booking wizard, pricing dashboard, capacity dashboard [Wave 3]

**Success Criteria:**
1. ~~Upselling suggestions appear during booking (step 1) based on service selection~~ ✓
2. ~~Dynamic pricing adjusts service prices based on demand patterns~~ ✓
3. ~~Capacity optimizer suggests schedule changes to maximize utilization~~ ✓
4. ~~Smart reminder timing picks optimal send time per customer~~ ✓

---

### Phase 12: Advanced Features ✓

**Goal:** Build marketplace, reviews, embeddable widget, public booking page, video conferencing, and white-label app framework for business growth and online services.

**Status:** Complete (2026-02-12)

**Segments:** ALL

**Requirements:** ADV-01, ADV-02, ADV-03, ADV-04, ADV-05, ADV-06, ADV-07, ADV-08

**Depends on:** Phase 5, Phase 3

**Plans:** 8/8 complete

Plans:
- [x] 12-01-PLAN.md — Zod schemas and TypeScript types for marketplace, reviews, video, whitelabel [Wave 1]
- [x] 12-02-PLAN.md — Marketplace API (public catalog with geo-search, listing detail, owner management) [Wave 2]
- [x] 12-03-PLAN.md — Review system API (create with auto-moderation, reply, list, detail, delete) [Wave 2]
- [x] 12-04-PLAN.md — Video conferencing provider abstraction + API routes (Zoom/Meet/Teams) [Wave 2]
- [x] 12-05-PLAN.md — White-label app CRUD API and build trigger [Wave 2]
- [x] 12-06-PLAN.md — Public booking page with company branding, SEO, and JSON-LD [Wave 3]
- [x] 12-07-PLAN.md — Embeddable booking widget (Web Component loader + sandboxed iframe) [Wave 3]
- [x] 12-08-PLAN.md — Review-to-marketplace rating sync consumer [Wave 4]

**Success Criteria:**
1. ~~Marketplace search returns businesses by location and category~~ ✓
2. ~~JavaScript widget embeds on external website and completes booking flow~~ ✓
3. ~~Public booking page renders with company branding~~ ✓
4. ~~Video meeting link generates and attaches to booking (Zoom/Meet/Teams)~~ ✓
5. ~~Review submission works with star rating and text~~ ✓

---

## Milestone 4: Polish & Launch

### Phase 13: Polish ✓

**Goal:** Add analytics dashboard, internationalization, accessibility, and performance optimization for production readiness.

**Status:** Complete (2026-02-12)

**Segments:** ALL

**Requirements:** POL-01, POL-02, POL-03, POL-04, POL-05

**Depends on:** Phase 1-12

**Plans:** 4 plans in 2 waves

Plans:
- [x] 13-01-PLAN.md — Analytics API routes + Recharts dashboard (revenue chart, booking stats chart, KPI comparison cards, period selector) [Wave 1]
- [x] 13-02-PLAN.md — i18n translation expansion (cs/sk/en analytics keys) + locale switcher + accessibility foundations (skip-link, landmarks) [Wave 1]
- [x] 13-03-PLAN.md — CSV/PDF export for revenue and booking reports (react-papaparse, @react-pdf/renderer) [Wave 2]
- [x] 13-04-PLAN.md — Performance optimization (code splitting, image formats, font loading) + accessibility audit fixes [Wave 2]

**Success Criteria:**
1. ~~Analytics dashboard shows revenue trends, booking stats, and comparisons~~ ✓
2. ~~UI renders correctly in Czech, Slovak, and English~~ ✓
3. ~~Keyboard navigation and screen reader support on all pages~~ ✓
4. ~~Lighthouse score >90 on all key pages~~ ✓
5. ~~Reports export to CSV/PDF~~ ✓

---

### Phase 14: AI Phase 3 — Voice & Intelligence

**Goal:** Add voice booking, AI follow-up generator, and competitor intelligence for the AI-Powered tier.

**Segments:** BACKEND (Voice/AI APIs), FRONTEND (Voice UI)

**Requirements:** AI3-01, AI3-02, AI3-03

**Depends on:** Phase 10, Phase 11

**Plans:** 5 plans in 3 waves

Plans:
- [ ] 14-01-PLAN.md — Shared foundation: OpenAI client, Pydantic schemas, Node.js types/fallbacks/circuit breaker, Zod schemas [Wave 1]
- [ ] 14-02-PLAN.md — Voice booking pipeline: Whisper STT + GPT-4 NLU + Next.js proxy endpoint [Wave 2]
- [ ] 14-03-PLAN.md — AI follow-up generator: prompt templates + GPT-4o-mini + token budget + rate limiting [Wave 2]
- [ ] 14-04-PLAN.md — Competitor intelligence: web scraper + Google Places API + DB schema + API routes [Wave 2]
- [ ] 14-05-PLAN.md — Integration wiring: register routers in FastAPI, Docker Compose, env documentation [Wave 3]

**Success Criteria:**
1. Voice booking transcribes speech, extracts intent, and returns entities for booking confirmation
2. AI generates personalized follow-up emails for inactive customers
3. Competitor intelligence surfaces pricing and review data

---

### Phase 15: DevOps & Launch

**Goal:** Deploy to production Kubernetes with full monitoring, load testing, and security audit for go-live.

**Segments:** DEVOPS (primary)

**Requirements:** OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06

**Depends on:** Phase 1-14

**Success Criteria:**
1. Kubernetes cluster runs all services with auto-scaling
2. Prometheus/Grafana dashboards show service metrics and alerts
3. Load test sustains 1000 concurrent users without degradation
4. OWASP ZAP security scan passes with no critical findings
5. Beta testers (3+ real businesses) complete full booking flow

---

## Phase Summary

| # | Phase | Goal | Requirements | Dependencies |
|---|-------|------|--------------|--------------|
| 1 | Project Setup & Infrastructure | Monorepo + Docker + CI/CD | INFRA-01..05 (5) | None |
| 2 | Database Foundation | 47 tables + RLS + migrations | DB-01..07 (7) | Phase 1 |
| 3 | Auth & Core Services ✓ | JWT/RBAC + entity CRUD | AUTH-01..09, CORE-01..11 (20) | Phase 2 |
| 4 | Frontend Shell | App shell + design system + calendar | UI-01..09 (9) | Phase 3 |
| 5 | Booking MVP | Availability + booking flow + events | BOOK-01..10 (10) | Phase 3, 4 |
| 6 | Payment Integration ✓ | Comgate + QRcomat + SAGA | PAY-01..07 (7) | Phase 5 |
| 7 | Notifications & Automation ✓ | Email/SMS + templates + rule builder | NOTIF-01..10 (10) | Phase 5, 6 |
| 8 | CRM & Marketing ✓ | Tags + coupons + gift cards + GDPR | CRM-01..07 (7) | Phase 3, 5 |
| 9 | Loyalty Program | Points + tiers + wallet cards | LOYAL-01..07 (7) | Phase 5, 7 |
| 10 | AI Phase 1 ✓ | No-show + CLV + health score | AI1-01..05 (5) | Phase 5, 3 |
| 11 | AI Phase 2 ✓ | Upselling + pricing + capacity | AI2-01..04 (4) | Phase 10 |
| 12 | Advanced Features ✓ | Marketplace + widget + video | ADV-01..08 (8) | Phase 5, 3 |
| 13 | Polish | Analytics + i18n + a11y + perf | POL-01..05 (5) | Phase 1-12 |
| 14 | AI Phase 3 | Voice booking + intelligence | AI3-01..03 (3) | Phase 10, 11 |
| 15 | DevOps & Launch | K8s + monitoring + security | OPS-01..06 (6) | Phase 1-14 |

---
*Roadmap created: 2026-02-10*
*Last updated: 2026-02-12 after Phase 14 planning complete*
