# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.2 Product Readiness — Phase 23 complete, ready for Phase 24

## Current Position

- **Milestone:** v1.2 Product Readiness
- **Phase:** 23 of 27 (AI Service — Training Pipeline and Model Deployment) **COMPLETE**
- **Plan:** 5 of 5 in current phase
- **Status:** Phase 23 complete — ready for Phase 24
- **Last activity:** 2026-02-21 — Phase 23 executed (5 plans, all committed)

Progress: [██░░░░░░░░] 26% (v1.2: 5/19 plans)

## What's Done

**v1.0 shipped** (103 requirements, 15 phases, 101 plans). Deployed to Railway 2026-02-15.

**v1.1 shipped** (33 requirements, 7 phases, 20 plans). All code complete 2026-02-20. Twilio + Comgate human checkpoints deferred.

**v1.2 roadmap created** (2026-02-21):
- 5 phases mapped (23-27): AI Service, AI UI, Landing Page, Booking UX, Onboarding
- 34 requirements with 100% coverage
- 19 plans estimated across all phases
- Research complete: SUMMARY.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, STACK.md

**Phase 23 complete** (2026-02-21) — AI Service Training Pipeline:
- Plan 01: 6 internal training API routes + auth middleware (Next.js)
- Plan 02: Fixed training scripts (removed deprecated XGBoost param, Prophet JSON serialization, .meta.json sidecars)
- Plan 03: Redis pricing state persistence + model version validation at startup
- Plan 04: Railway config, Prophet warmup, ThreadPoolExecutor for ML inference
- Plan 05: Weekly retraining GitHub Actions workflow + Dockerfile scripts directory

## Decisions

See `.planning/PROJECT.md` Key Decisions section.

**Recent decisions:**
- v1.2 phase ordering: AI first (unblocks UI), Landing Page before Booking UX (drives traffic), Onboarding last (layers on everything)
- Capacity optimizer uses GradientBoostingRegressor (not LSTM) for v1.2 — 80% accuracy at 10% complexity
- Models baked into Docker image for v1.2 (not R2); migrate to R2 if deploys exceed 5 minutes
- Landing page as (marketing) route group in existing Next.js app (not separate service)
- UI components stay in apps/web/components/ (not migrated to packages/ui) — no second consumer exists
- Motion 12.34 for animations (not GSAP — commercial license), driver.js 1.4 for onboarding (not react-joyride — unresolved bugs)
- has_payment feature uses payments table JOIN (not bookings.payment_status which doesn't exist)
- healthcheckTimeout=45s (not 30s from AI-07) to accommodate Prophet Stan JIT warmup

## Blockers

- Czech legal content (privacy policy, terms, ICO/DIC) is a business dependency for Phase 25 — not a technical blocker
- Real testimonials needed for landing page social proof — business team must secure before Phase 25

## Performance Metrics

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 (1-15) | 101 | ~12h | ~7min |
| v1.1 (16-22) | 20 | ~1.8h | ~5.5min |
| v1.2 (23-27) | 5/19 | - | - |

---
*Last updated: 2026-02-21 after Phase 23 execution complete*
