# ScheduleBox — Project Context

## What
ScheduleBox is an all-in-one AI-powered business platform for service-based businesses (salons, fitness, medical, auto service, etc.). It combines booking, payments, CRM, loyalty, automation, and 7 AI models into one platform.

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
- **16 shadcn/ui components** + booking wizard + calendar + automation builder
- **7 AI/ML models** (no-show, CLV, health, upselling, pricing, capacity, voice)

## Current Milestone: v1.2 Product Readiness

**Goal:** Make ScheduleBox a polished, demo-ready product with working AI models, professional UI, smooth workflows, and a landing page — so the sales team can confidently present it to SMB customers.

**Target features:**
- Python AI microservice with real ML models (no-show, CLV, health, upselling, pricing, capacity)
- UI/UX polish across all pages — professional look, consistent design, responsive
- Core workflow improvements — booking, scheduling, customer management feel smooth
- Landing page and onboarding flow for new business signups
- Admin dashboard improvements — analytics, reporting, daily operations

## Current State
- **v1.0 shipped:** 2026-02-12, deployed to Railway 2026-02-15
- **v1.1 shipped:** 2026-02-21, all code complete (Twilio + Comgate credentials deferred)
- **Codebase:** ~62,000 LOC (50k TypeScript, 6k Python, 5k YAML/JSON)
- **Tests:** 243 unit + 31 integration + 10 E2E, 80% CI coverage gate
- **Deployed:** Railway (web + notification worker + PostgreSQL + Redis + RabbitMQ)

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

### Active
See `.planning/REQUIREMENTS.md` for v1.2 requirements.

### Out of Scope
- Mobile native app — web-first approach, PWA works well
- Video chat integration — uses external providers (Zoom/Meet/Teams)
- Offline mode — real-time booking is core value
- Multi-language AI models — Czech/Slovak only for v1
- Mobile native app — deferred, PWA covers mobile use cases

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

## Team
- Multi-agent development with Claude Code
- 4 parallel segments: Database, Backend, Frontend, DevOps

---

_Last updated: 2026-02-21 after v1.2 milestone start_
