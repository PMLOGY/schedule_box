# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.3 Revenue & Growth — Phase 28, roadmap created

## Current Position

- **Milestone:** v1.3 Revenue & Growth
- **Phase:** 28 — Subscription Billing Infrastructure
- **Plan:** — (not started)
- **Status:** Roadmap created, ready for Phase 28 planning
- **Last activity:** 2026-02-24 — v1.3 roadmap created (5 phases, 32 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## What's Done

**v1.0 shipped** (103 requirements, 15 phases, 101 plans). Deployed to Railway 2026-02-15.

**v1.1 shipped** (33 requirements, 7 phases, 22 plans). All complete 2026-02-20, Twilio + Comgate credentials configured 2026-02-24.

**v1.2 shipped** (34 requirements, 5 phases, 20 plans). Completed 2026-02-24:
- Phase 23: AI training pipeline
- Phase 24: AI-powered UI
- Phase 25: Czech marketing landing page
- Phase 26: Booking UX polish
- Phase 27: Onboarding wizard

**v1.3 roadmap created** (32 requirements, 5 phases: 28-32). Phases defined 2026-02-24.

## Decisions

See `.planning/PROJECT.md` Key Decisions section.

## Blockers

- Real testimonials needed for landing page social proof — business team must secure (placeholder content in place)
- **[NEW] Comgate recurring activation** — must contact Comgate support for merchant 498621 before Phase 28 implementation begins. Recurring is not auto-enabled; timeline is unknown (days to weeks). This blocks Phase 28 entirely.
- **[NEW] Subscription plan name canonicalization** — DB has `free/starter/professional/enterprise`; v1.3 targets `free/essential/growth/ai_powered`. The CHECK constraint on `companies.subscription_plan` must be resolved before Phase 28 schema migration runs.

## Performance Metrics

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 15 | 101 | 2 days (2026-02-10 → 2026-02-12) |
| v1.1 | 7 | 22 | 5 days (2026-02-15 → 2026-02-21) |
| v1.2 | 5 | 20 | 4 days (2026-02-21 → 2026-02-24) |

---
*Last updated: 2026-02-24 — v1.3 roadmap created, Phase 28 ready to plan*
