# Milestones

## v1.4 Design Overhaul (Shipped: 2026-03-12)

**Phases completed:** 6 phases (33-38), 11 plans

**Key accomplishments:**
- Glass CSS token system with --glass-* primitives, gradient mesh backgrounds (dashboard/marketing/auth presets), @supports progressive enhancement, prefers-reduced-transparency fallbacks, and WCAG 4.5:1 contrast scrim
- Tailwind glass plugin (glass-surface/subtle/heavy utilities), shadow-glass/border-glass tokens, Plus Jakarta Sans font swap replacing Inter
- CVA glass variants on Card, Button, Dialog, Badge — zero breaking changes to 476+ existing Card instances; GlassPanel and GradientMesh primitive components
- Full dashboard glass treatment: frosted header bar, glass KPI stat cards with Motion stagger animation, 7 sub-pages wrapped in glass cards (data tables/calendar/charts remain opaque)
- Marketing pages: aurora CSS animation on hero, glass navbar, glass pricing/feature/testimonial cards, gradient text headings, GlassPanel-wrapped legal pages
- Auth glass card with Motion entrance animation, glass-styled Select/DropdownMenu/Tooltip portaled components, GlassShimmer skeleton replacement
- Dark mode QA (white-based rgba at 0.12/0.08/0.18 opacity), responsive QA at 375/768/1280px with mobile blur degradation

**Stats:**
- 51 commits over 16 days (2026-02-25 → 2026-03-12)
- 85 files modified, +8,293 / -790 lines (frontend only, zero backend changes)
- 31 requirements delivered with 100% coverage
- Git range: a300d0c..9f58a61

---


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

## v1.3 Revenue & Growth (Shipped: 2026-02-25)

**Phases completed:** 5 phases (28-32), 21 plans

**Key accomplishments:**
- Subscription billing: Comgate recurring payments, subscription state machine, plan upgrade/downgrade, Czech VAT invoice PDFs, BullMQ renewal scheduler with dunning
- Usage limits: Redis booking counters, server-side limit enforcement (402 responses), usage dashboard widget with upgrade modal
- Multi-location organizations: organization schema, JWT context switching, location CRUD, location switcher UI, cross-location customer dedup
- Analytics: 5 analytics API routes, employee utilization, admin SaaS health metrics, 6 chart components, PDF/CSV export
- Frontend polish: next-themes dark mode, 16 loading.tsx skeletons, dashboard KPI redesign, landing page testimonials

**Stats:**
- 5 phases over 1 day (2026-02-24 → 2026-02-25)
- 32 requirements delivered with 100% coverage
- All 5 phases verified

---


