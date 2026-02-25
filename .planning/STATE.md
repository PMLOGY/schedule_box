# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.4 Design Overhaul — Phase 33: Token Foundation and Background System

## Current Position

- **Milestone:** v1.4 Design Overhaul (Phases 33-37)
- **Phase:** 33 of 37 (Token Foundation and Background System)
- **Plan:** 0 of TBD — ready to plan
- **Status:** Ready to plan
- **Last activity:** 2026-02-25 — v1.4 roadmap created, Phase 33 ready

Progress: [░░░░░░░░░░] 0% (v1.4)

## What's Done

**v1.0 shipped** (15 phases, 101 plans — 2026-02-12)
**v1.1 shipped** (7 phases, 22 plans — 2026-02-21)
**v1.2 shipped** (5 phases, 20 plans — 2026-02-24)
**v1.3 shipped** (5 phases, 21 plans — 2026-02-25): subscription billing, usage limits, multi-location orgs, analytics, frontend polish

## Decisions

See `.planning/PROJECT.md` Key Decisions section (decisions 1-15 logged there).

**v1.4 design direction (Decision 16):** Glassmorphism + Behance blue #0057FF. Zero new npm packages — existing Tailwind 3.4.5, motion, CVA, next-themes, next/font/google are sufficient. Glass applied additively via `variant="glass"` CVA prop — never by mutating `--card` or other global shadcn tokens.

**v1.4 exclusions:** No glass on sidebar (legibility), data tables, calendar cells, chart canvases, form inputs, primary CTA buttons, or public booking widget. No animated backdrop-filter values. No 3D perspective tilt on glass cards. No backend changes.

## Blockers

- Real testimonials needed for landing page social proof — placeholder content in place (pre-existing, not v1.4 scope)
- **[DEFERRED]** Comgate recurring activation — code complete (Phase 28), live recurring requires contacting Comgate support for merchant 498621

## Performance Metrics

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 15 | 101 | 2 days |
| v1.1 | 7 | 22 | 5 days |
| v1.2 | 5 | 20 | 4 days |
| v1.3 | 5 | 21 | 1 day |
| v1.4 | 5 | TBD | In progress |

## Session Continuity

Last session: 2026-02-25
Stopped at: v1.4 roadmap created. Phase 33 is next — run `/gsd:plan-phase 33`.
Resume file: None
