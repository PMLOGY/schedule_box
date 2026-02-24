# Milestones

## v1.0 ScheduleBox Platform (Shipped: 2026-02-12)

**Phases completed:** 15 phases, 101 plans, 87 tasks

**Key accomplishments:**
- Full-stack monorepo with 49 PostgreSQL tables, Row Level Security, and Drizzle ORM migrations
- JWT/RBAC auth with ~94 API endpoints across booking, payment, CRM, loyalty, notifications, and AI
- Next.js 14 frontend with shadcn/ui, calendar, booking wizard, automation builder, analytics dashboard
- 7 AI/ML models: no-show/CLV/health predictions, upselling/pricing/capacity optimization, voice booking
- Marketplace, embeddable widget, video conferencing, i18n (cs/sk/en), WCAG accessibility
- Production Kubernetes with Helm charts, Prometheus/Grafana monitoring, OpenTelemetry tracing, k6 load testing, OWASP ZAP security

**Stats:**
- 322 commits over 2 days (2026-02-10 → 2026-02-12)
- ~62,000 LOC (50k TypeScript, 6k Python, 5k YAML/JSON, 750 JS)
- Git range: 19362b8..f6930ee

---

## v1.1 Production Hardening (Shipped: 2026-02-21)

**Phases completed:** 7 phases, 22 plans

**Key accomplishments:**
- Testing foundation: Vitest unit tests (80%+ coverage), Testcontainers integration tests, Playwright E2E tests
- Email delivery via SMTP with SPF/DKIM, SMS delivery via Twilio Messaging Service with Alpha Sender ID
- Comgate payment processing with production credentials and webhook verification
- Monitoring: email bounce rates, SMS cost alerts, payment webhook failure logging, CI coverage gates

**Stats:**
- Phases 16-22 (2026-02-20 → 2026-02-24)
- Twilio + Comgate credentials configured 2026-02-24

---

## v1.2 Product Readiness (Shipped: 2026-02-24)

**Phases completed:** 5 phases (23-27), 20 plans, 41 tasks

**Key accomplishments:**
- Complete AI training pipeline: 6 feature extraction endpoints, Prophet/XGBoost/scikit-learn models, Redis state persistence, Railway deployment with weekly retraining CI
- AI-powered UI surfaces: no-show risk badges on booking list, AI insights dashboard panel, onboarding state progress indicator for new companies
- Czech marketing landing page with live widget demo, 3-tier pricing, privacy/terms pages, ECA 2022 cookie consent
- Booking UX polish: react-big-calendar migration (MIT), mobile 44px tap targets, Morning/Afternoon/Evening slot grouping, RFC 5545 ICS export, Motion confirmation animations
- Complete onboarding flow: 4-step business setup wizard, 8 industry templates with Czech service names, demo data seeder, Driver.js contextual tour, dashboard checklist widget

**Stats:**
- 47 commits over 4 days (2026-02-21 → 2026-02-24)
- 34 requirements delivered with 100% coverage
- All 5 phases verified with zero critical deviations

---
