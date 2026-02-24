# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.2 Product Readiness — Phase 27 Plan 03 complete, ready for Plan 04

## Current Position

- **Milestone:** v1.2 Product Readiness
- **Phase:** 27 of 27 (Onboarding Wizard) **IN PROGRESS**
- **Plan:** 3 of 4 in current phase — Plan 03 complete
- **Status:** Phase 27 Plan 03 complete — ready for Plan 04 (booking link sharing / viral loop)
- **Last activity:** 2026-02-24 — Phase 27 Plan 03 executed (demo data seeder + Driver.js tour)

Progress: [█████████░] 97% (v1.2: 19/19 plans)

## What's Done

**v1.0 shipped** (103 requirements, 15 phases, 101 plans). Deployed to Railway 2026-02-15.

**v1.1 shipped** (33 requirements, 7 phases, 20 plans). All code complete 2026-02-20. Twilio + Comgate human checkpoints deferred.

**v1.2 roadmap created** (2026-02-21):
- 5 phases mapped (23-27): AI Service, AI UI, Landing Page, Booking UX, Onboarding
- 34 requirements with 100% coverage
- 19 plans estimated across all phases
- Research complete: SUMMARY.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, STACK.md

**Phase 23 complete** (2026-02-21, verified 2026-02-24) — AI Service Training Pipeline:
- Plan 01: 6 internal training API routes + auth middleware (Next.js)
- Plan 02: Fixed training scripts (removed deprecated XGBoost param, Prophet JSON serialization, .meta.json sidecars)
- Plan 03: Redis pricing state persistence + model version validation at startup
- Plan 04: Railway config, Prophet warmup, ThreadPoolExecutor for ML inference
- Plan 05: Weekly retraining GitHub Actions workflow + Dockerfile scripts directory
- Verification: 13/13 must-haves passed, 4 human verification items (runtime-dependent)

**Phase 25 complete** (2026-02-21) — Landing Page and Czech Legal Compliance:
- Plan 01: Marketing route group with layout, navbar (sticky, logo, nav, CTA), footer (ICO/DIC/address), i18n landing namespace (cs/en/sk), Motion installed, root layout static rendering fix
- Plan 02: Home page with hero section (CSS animations, live widget iframe), feature grid (Motion stagger, 6 cards), trust badges (4 badges)
- Plan 03: Pricing page with 3-tier cards (Free/299/699 CZK), annual toggle, social proof section (3 placeholder testimonials)
- Plan 04: Privacy policy page (8 GDPR sections), terms of service page (8 commercial sections), cookie consent banner (Czech ECA 2022 compliant, strict opt-in)

**Phase 24 complete** (2026-02-24, verified 2026-02-24) — AI-Powered UI:
- Plan 01: NoShowRiskBadge + NoShowRiskDetail components, 7-column booking table, i18n cs/en/sk
- Plan 02: AI insights API route (GET /api/v1/ai/insights), useAiInsightsQuery hook, AiInsightsPanel, AiOnboardingState, dashboard integration, i18n cs/en/sk
- Verification: 8/8 must-haves passed, 4 human verification items (visual/interactive)

**Phase 26 complete** (2026-02-24) — Booking UX Polish:
- Plan 01: Visual regression test infrastructure for booking embed (Playwright, CI)
- Plan 02: Replaced FullCalendar with react-big-calendar (MIT), DnD rescheduling, shadcn CSS theme, CalendarToolbar view names updated
- Plan 03: StepIndicator 44px tap targets, mobile "Step X of Y" label, AvailabilityGrid Morning/Afternoon/Evening grouping, layout-matching skeleton loaders, i18n cs/en/sk
- Plan 04: RFC 5545 ICS calendar export endpoint, Motion fade-in + scale confirmation animation, add-to-calendar button, i18n cs/en/sk

**Phase 27 in progress** (2026-02-24) — Onboarding Wizard:
- Plan 01: 4-step setup wizard (company details, first service, working hours, share link), QR code generation, industry defaults, onboarding_completed flag
- Plan 02: Dashboard onboarding checklist widget (5 items + progress bar + dismissal), 6 action-oriented empty states (bookings/customers/services/employees/analytics/calendar)
- Plan 03: Demo data seeder (Beauty Studio Praha: 3 services, 5 customers, 10 bookings), DemoDataCard dashboard widget, Driver.js 3-step contextual tour with localStorage persistence

## Decisions

See `.planning/PROJECT.md` Key Decisions section.

**Recent decisions:**
- Phase 27-03: Demo data tagged in company.settings JSONB (demo_data + demo_data_ids with ID arrays) — no extra table needed for transient demo content
- Phase 27-03: DashboardTour in layout (not page) — persists across sub-routes without re-mounting; tour localStorage key prefixed with company UUID for multi-tenant sessions
- Phase 27-03: driver.js onDestroyed + onCloseClick both set localStorage — handles natural completion and early close
- Phase 27-02: Checklist uses router.push() via button elements — avoids next-intl typed route constraints on Link href
- Phase 27-02: localStorage dismissal key prefixed with company UUID for multi-tenant browser sessions
- Phase 27-02: Calendar empty state uses separate useBookingsQuery({limit:1}) in page — no BookingCalendar internals modified
- Phase 27-02: onboarding namespace keys merged into existing namespace (plan 27-01 pre-populated) without replacing wizard keys
- Phase 27-02: Empty states in TableCell with p-0 — avoids double padding in table context
- Phase 27-01: Switch (radix-ui/react-switch) used instead of Checkbox for working hours day toggles — radix-ui/react-checkbox not installed
- Phase 27-01: Each step component calls its own API endpoint directly (fetch) — self-contained, matches booking-wizard pattern
- Phase 27-01: Industry template pre-fills as static constant map (20 types) — no API round-trip for template data
- Phase 27-01: WorkingHoursStep initializes from industry-specific defaults (beauty/fitness/medical/default groups)
- Phase 26-04: ICS generated without external library -- pure string templating for RFC 5545 (avoids dependency for ~100 LOC)
- Phase 26-04: Calendar endpoint public (no JWT) -- booking UUID (122-bit entropy) as unguessable auth token
- Phase 26-04: Manual SQL joins in calendar route for precise field selection over Drizzle relational syntax
- Phase 26-02: react-big-calendar replaces FullCalendar (MIT vs premium license for commercial SaaS)
- Phase 26-02: CalendarView component (resource-timeline mock data) replaced with placeholder -- dead code
- Phase 26-02: React Query replaces FullCalendar event source for calendar data fetching
- Phase 26-03: Lucide icons (Sun/CloudSun/Moon) for time-of-day headers instead of emoji (per project no-emoji rule)
- Phase 26-03: Mobile step indicator shows consolidated "Step X of Y - Step Name" line (md:hidden) while desktop keeps individual step labels
- Phase 26-03: Time periods: Morning <12:00, Afternoon 12:00-16:59, Evening 17:00+ (standard Czech business convention)
- Phase 26-03: useMemo for slot filtering, employee counting, and time grouping to prevent unnecessary recalculations
- Phase 24-02: drizzle-orm db.execute<T> requires T extends Record<string, unknown> — row interfaces use extends pattern
- Phase 24-02: AiInsightsPanel degrades to null on error (non-critical), Skeleton on loading — no error boundary needed
- Phase 24-02: Server-side suggestions generated from booking counts; no client-side computation
- Phase 24-01: NoShowRiskBadge shows raw % in badge text + full label in tooltip; TooltipProvider scoped per-badge; NoShowRiskDetail includes own Separator for encapsulation
- Phase 24-01: Risk column added as 7th column in booking table (between Status and Price); colSpan updated 6->7
- v1.2 phase ordering: AI first (unblocks UI), Landing Page before Booking UX (drives traffic), Onboarding last (layers on everything)
- Capacity optimizer uses GradientBoostingRegressor (not LSTM) for v1.2 — 80% accuracy at 10% complexity
- Models baked into Docker image for v1.2 (not R2); migrate to R2 if deploys exceed 5 minutes
- Landing page as (marketing) route group in existing Next.js app (not separate service)
- UI components stay in apps/web/components/ (not migrated to packages/ui) — no second consumer exists
- Motion 12.34 for animations (not GSAP — commercial license), driver.js 1.4 for onboarding (not react-joyride — unresolved bugs)
- has_payment feature uses payments table JOIN (not bookings.payment_status which doesn't exist)
- healthcheckTimeout=45s (not 30s from AI-07) to accommodate Prophet Stan JIT warmup
- Hero section uses CSS animations (not Motion) to keep client JS off critical path for Lighthouse >90
- Cookie consent uses localStorage with mounted guard (not server-side) for hydration safety
- Visual regression projects have no setup/auth dependency — embed widget is public (26-01)
- 1% maxDiffPixelRatio tolerance for Playwright visual regression to handle anti-aliasing (26-01)
- EMBED_TEST_SLUG env var with test-company default allows CI override without code changes (26-01)

## Blockers

- Real testimonials needed for landing page social proof — business team must secure (placeholder content in place)

## Performance Metrics

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 (1-15) | 101 | ~12h | ~7min |
| v1.1 (16-22) | 20 | ~1.8h | ~5.5min |
| v1.2 (23-27) | 18/19 | - | - |
| 26-02 | 1 | 7min | 7min |
| 26-03 | 1 | 5min | 5min |
| 26-04 | 1 | 7min | 7min |
| 27-01 | 1 | 9min | 9min |
| 27-02 | 1 | 11min | 11min |
| 27-03 | 1 | 7min | 7min |

---
*Last updated: 2026-02-24 after Phase 27 Plan 03 complete (demo data seeder + Driver.js dashboard tour)*
