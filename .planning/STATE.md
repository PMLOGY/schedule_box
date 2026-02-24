# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.2 Product Readiness — Phase 26 in progress (Plan 03 complete)

## Current Position

- **Milestone:** v1.2 Product Readiness
- **Phase:** 26 of 27 (Booking UX Polish) **IN PROGRESS**
- **Plan:** 3 of 4 in current phase — Plan 03 complete
- **Status:** Phase 26 Plan 03 complete — ready for Plan 04
- **Last activity:** 2026-02-24 — Phase 26 Plan 03 executed (mobile UX polish: 44px tap targets, time-of-day grouping)

Progress: [███████░░░] 74% (v1.2: 14/19 plans)

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

**Phase 26 in progress** (2026-02-24) — Booking UX Polish:
- Plan 01: Visual regression test infrastructure for booking embed (Playwright, CI)
- Plan 03: StepIndicator 44px tap targets, mobile "Step X of Y" label, AvailabilityGrid Morning/Afternoon/Evening grouping, layout-matching skeleton loaders, i18n cs/en/sk

## Decisions

See `.planning/PROJECT.md` Key Decisions section.

**Recent decisions:**
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
| v1.2 (23-27) | 14/19 | - | - |
| 26-03 | 1 | 5min | 5min |

---
*Last updated: 2026-02-24 after Phase 26 Plan 03 complete (mobile UX polish: 44px tap targets, time-of-day grouping, skeleton loaders)*
