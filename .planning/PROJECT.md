# ScheduleBox — Project Context

## What
ScheduleBox is an all-in-one AI-powered business platform for service-based businesses (salons, fitness, medical, auto service, etc.). It combines booking, payments, CRM, loyalty, automation, and 7 AI models into one platform — now with a premium glassmorphism visual identity.

## Why
Czech/Slovak SMB market lacks an integrated, AI-powered booking solution. Competitors (Reservio, Bookio, SuperSaaS) cover basics but miss AI optimization, integrated payments, and loyalty programs.

## For Whom
- **Primary:** SMB owners (1-50 employees) in CZ/SK
- **Secondary:** Expansion to PL, DE

## Business Model
Freemium with 4 tiers:
| Tier | Price | Key Features |
|---|---|---|
| Free | 0 Kc | 50 bookings/month |
| Essential | 490 Kc/mo | Comgate payments, basic booking |
| Growth | 1,490 Kc/mo | Multi-resource, automation, loyalty |
| AI-Powered | 2,990 Kc/mo | All AI, API access, white-label |

## Architecture
- **3 services** (Next.js web, Python AI, Node.js notification worker)
- **49 database tables** with Row Level Security (Drizzle ORM)
- **~94 API endpoints** (REST, Next.js API Routes)
- **16 shadcn/ui components** + booking wizard + calendar + automation builder + glass primitives (GlassPanel, GradientMesh, GlassShimmer)
- **7 AI/ML models** (no-show, CLV, health, upselling, pricing, capacity, voice)

## Current Milestone: v2.0 Full Functionality & Production Readiness

**Goal:** Make every feature work end-to-end across all 4 user views (Admin, Business Owner, Employee, End Customer), fix all broken flows, and prepare for production deployment.

**Target features:**
- Full audit and fix of all pages across 4 views
- Auth/session persistence fix (no random logouts)
- Business owner can share public booking link with customers
- End-to-end flow: owner setup → share link → customer books → employee sees booking → admin monitors
- Every page functional — not just scaffolded
- Production-ready Docker Compose deployment

## Current State

**v1.4 Design Overhaul shipped** (2026-03-12). All five milestones complete:
- **v1.0** (2026-02-12): Full-stack platform with 49 tables, ~94 API endpoints, 7 AI models
- **v1.1** (2026-02-21): Testing foundation (243 unit + 31 integration + 10 E2E), email/SMS delivery, Comgate payments, monitoring
- **v1.2** (2026-02-24): AI training pipeline, AI-powered UI, Czech landing page, booking UX polish, onboarding wizard
- **v1.3** (2026-02-25): Subscription billing, usage limits, multi-location orgs, analytics, frontend polish
- **v1.4** (2026-03-12): Full glassmorphism redesign — glass tokens, Tailwind plugin, CVA glass variants, gradient mesh backgrounds, aurora animation, Plus Jakarta Sans, dark mode QA, responsive QA

**Codebase:** ~73,000 LOC (60k TypeScript, 6k Python, 5k YAML/JSON)
**Tests:** 243 unit + 31 integration + 10 E2E, 80% CI coverage gate
**Deployed:** Railway (web + notification worker + PostgreSQL + Redis + RabbitMQ)
**Integrations:** Twilio SMS (Alpha Sender ID), Comgate payments (merchant 498621), SMTP email
**Design system:** Glassmorphism + Behance blue #0057FF, Plus Jakarta Sans, glass-surface/subtle/heavy utilities, gradient mesh backgrounds

## Requirements

### Validated
- ✓ INFRA-01..05 — Monorepo, Docker, CI/CD, tooling, health checks — v1.0
- ✓ DB-01..07 — 49 tables, migrations, RLS, seed data, double-booking, soft delete, audit logs — v1.0
- ✓ AUTH-01..09 — Registration, JWT, refresh rotation, password reset, email verify, MFA, OAuth2 scaffold, RBAC, API keys — v1.0
- ✓ CORE-01..11 — Customer, service, employee, resource CRUD, working hours, company settings — v1.0
- ✓ UI-01..09 — Design system, state management, i18n, auth pages, app shell, dashboard, calendar — v1.0
- ✓ BOOK-01..10 — Availability engine, booking flow, double-booking prevention, status transitions, calendar — v1.0
- ✓ PAY-01..07 — Comgate, QR payments, SAGA, invoice PDF, refunds — v1.0
- ✓ NOTIF-01..10 — Email/SMS/push, templates, automation builder, reminders — v1.0
- ✓ CRM-01..07 — Tags, coupons, gift cards, CSV import, GDPR — v1.0
- ✓ LOYAL-01..07 — Points, tiers, rewards, Apple/Google Wallet passes — v1.0
- ✓ AI1-01..05 — No-show predictor, CLV, health score, circuit breaker fallback — v1.0
- ✓ AI2-01..04 — Upselling, dynamic pricing, capacity optimization, smart reminders — v1.0
- ✓ ADV-01..08 — Marketplace, reviews, widget, public booking, video, white-label — v1.0
- ✓ POL-01..05 — Analytics, i18n, accessibility, performance, export — v1.0
- ✓ AI3-01..03 — Voice booking, follow-up generator, competitor intelligence — v1.0
- ✓ OPS-01..06 — Kubernetes, monitoring, tracing, load testing, security audit, beta playbook — v1.0
- ✓ TEST-01..04, ITEST-01..06, E2E-01..06 — Testing foundation, integration, E2E — v1.1
- ✓ EMAIL-01..05 — SMTP delivery with SPF/DKIM — v1.1
- ✓ SMS-01..04 — Twilio Messaging Service with Alpha Sender ID — v1.1
- ✓ PAY-01..04 — Comgate production credentials and webhook verification — v1.1
- ✓ MON-01..04 — Email/SMS/payment monitoring, CI coverage gates — v1.1
- ✓ AI-01..08 — AI training pipeline, models, Redis persistence, Railway deployment, retraining CI — v1.2
- ✓ AIUI-01..05 — No-show risk badges, AI insights panel, confidence transparency, onboarding state — v1.2
- ✓ LAND-01..07 — Marketing landing page, pricing, Czech legal compliance, cookie consent — v1.2
- ✓ BUX-01..07 — Visual regression, react-big-calendar, mobile UX, ICS export, animations — v1.2
- ✓ ONB-01..07 — Onboarding wizard, QR code, checklist, empty states, demo data, Driver.js, templates — v1.2
- ✓ BILL-01..07 — Subscription billing, Comgate recurring, invoices, dunning — v1.3
- ✓ LIMIT-01..05 — Usage limits, tier enforcement, upgrade prompts — v1.3
- ✓ ORG-01..06 — Multi-location organizations, context switching, location management — v1.3
- ✓ ANLYT-01..08 — Analytics, reporting, admin dashboard, exports — v1.3
- ✓ UI-01..06 — Dark mode, skeletons, dashboard KPIs, responsive polish — v1.3
- ✓ DSYS-01..07 — Glass CSS tokens, gradient mesh backgrounds, Tailwind glass plugin, Plus Jakarta Sans, responsive degradation, accessibility fallbacks — v1.4
- ✓ COMP-01..06 — Card/Button/Dialog/Badge glass CVA variants, GlassPanel, GradientMesh primitives — v1.4
- ✓ DASH-01..05 — Dashboard gradient mesh, glass KPI cards, frosted header, glass sub-pages, solid sidebar — v1.4
- ✓ MKTG-01..05 — Marketing gradient mesh, glass navbar, aurora hero, glass pricing/testimonial cards, glass footer — v1.4
- ✓ AUTH-01..03 — Auth glass card, opaque form inputs, Motion entrance animation — v1.4
- ✓ POLSH-01..06 — KPI stagger animation, GlassShimmer skeletons, glass dropdowns/tooltips, dark mode QA, responsive QA — v1.4

### Active
See `.planning/REQUIREMENTS.md` for v2.0 requirements.

### Out of Scope
- Mobile native app — web-first approach, PWA works well
- Video chat integration — uses external providers (Zoom/Meet/Teams)
- Offline mode — real-time booking is core value
- Multi-language AI models — Czech/Slovak only for v1
- Per-tenant AI models — SMBs have 50-500 bookings, need >10K for meaningful per-tenant training
- Voice/NL booking — 3+ months to build reliably, defer to v2.0
- Capacity forecast chart — Prophet needs real data, not synthetic, to be credible
- Glass on sidebar/data tables/calendar cells/chart canvases/form inputs/primary CTAs — readability and GPU performance constraints (v1.4 Decision 16)

## Key Decisions
1. Next.js 14 monorepo with standalone microservices for AI/notifications — ✓ Good
2. Drizzle ORM (not Prisma) — better SQL control, migration flexibility — ✓ Good
3. RabbitMQ (not Kafka) — simpler for our scale, sufficient throughput — ✓ Good
4. Cloudflare R2 (not AWS S3) — cost-effective, S3-compatible — Pending (not yet used)
5. PostgreSQL full-text search (not Elasticsearch) — simpler, sufficient for v1 — ✓ Good
6. Choreography SAGA pattern (not orchestration) — event-driven, decoupled — ✓ Good
7. prom-client custom registry — avoids global conflicts with other libraries — ✓ Good
8. Opossum circuit breaker — prevents cascading failures from AI timeouts — ✓ Good
9. Bitnami Helm charts for stateful services — production-grade defaults — ✓ Good
10. k6 over JMeter/Gatling — modern JS DSL, better CI integration — ✓ Good
11. react-big-calendar (not FullCalendar) — MIT license for commercial SaaS — ✓ Good (v1.2)
12. Motion (not GSAP) — MIT license, React-native integration — ✓ Good (v1.2)
13. Driver.js (not react-joyride) — smaller bundle, fewer bugs — ✓ Good (v1.2)
14. Twilio Messaging Service with Alpha Sender ID — no phone number needed, one-way SMS — ✓ Good (v1.1)
15. Models baked into Docker image (not R2) — simple for v1.2 scale — ⚠️ Revisit if deploys >5min
16. Glassmorphism + Behance blue #0057FF — zero new npm packages, CVA variant="glass" additive approach, no glass on sidebar/tables/inputs/CTAs — ✓ Good (v1.4)
17. Hardcoded px blur values (not CSS variables) — Safari -webkit-backdrop-filter MDN#25914 bug workaround — ✓ Good (v1.4)
18. Plus Jakarta Sans with latin-ext subset — proper Czech diacritics support — ✓ Good (v1.4)
19. CVA defaultVariants for backward compatibility — zero usage-site changes for 476+ Card instances — ✓ Good (v1.4)
20. GlassPanel forwardRef / GradientMesh plain function — interactive vs decorative use pattern — ✓ Good (v1.4)

## Team
- Multi-agent development with Claude Code
- 4 parallel segments: Database, Backend, Frontend, DevOps

---

_Last updated: 2026-03-13 after v2.0 milestone started_
