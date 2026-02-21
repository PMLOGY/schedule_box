# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.2 Product Readiness — Phase 23: AI Service Training Pipeline and Model Deployment

## Current Position

- **Milestone:** v1.2 Product Readiness
- **Phase:** 23 of 27 (AI Service — Training Pipeline and Model Deployment)
- **Plan:** 0 of 5 in current phase
- **Status:** Ready to plan
- **Last activity:** 2026-02-21 — v1.2 roadmap created (5 phases, 34 requirements, 19 plans)

Progress: [░░░░░░░░░░] 0% (v1.2: 0/19 plans)

## What's Done

**v1.0 shipped** (103 requirements, 15 phases, 101 plans). Deployed to Railway 2026-02-15.

**v1.1 shipped** (33 requirements, 7 phases, 20 plans). All code complete 2026-02-20. Twilio + Comgate human checkpoints deferred.

**v1.2 roadmap created** (2026-02-21):
- 5 phases mapped (23-27): AI Service, AI UI, Landing Page, Booking UX, Onboarding
- 34 requirements with 100% coverage
- 19 plans estimated across all phases
- Research complete: SUMMARY.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, STACK.md

## Decisions

See `.planning/PROJECT.md` Key Decisions section.

**Recent decisions:**
- v1.2 phase ordering: AI first (unblocks UI), Landing Page before Booking UX (drives traffic), Onboarding last (layers on everything)
- Capacity optimizer uses GradientBoostingRegressor (not LSTM) for v1.2 — 80% accuracy at 10% complexity
- Models baked into Docker image for v1.2 (not R2); migrate to R2 if deploys exceed 5 minutes
- Landing page as (marketing) route group in existing Next.js app (not separate service)
- UI components stay in apps/web/components/ (not migrated to packages/ui) — no second consumer exists
- Motion 12.34 for animations (not GSAP — commercial license), driver.js 1.4 for onboarding (not react-joyride — unresolved bugs)

## Blockers

- Czech legal content (privacy policy, terms, ICO/DIC) is a business dependency for Phase 25 — not a technical blocker
- Real testimonials needed for landing page social proof — business team must secure before Phase 25

## Performance Metrics

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 (1-15) | 101 | ~12h | ~7min |
| v1.1 (16-22) | 20 | ~1.8h | ~5.5min |
| v1.2 (23-27) | 0/19 | - | - |

---
*Last updated: 2026-02-21 after v1.2 roadmap creation*
