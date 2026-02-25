# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.4 Design Overhaul — Phase 34: Component Glass Variants — COMPLETE

## Current Position

- **Milestone:** v1.4 Design Overhaul (Phases 33-37)
- **Phase:** 34 of 37 (Component Glass Variants) — COMPLETE
- **Plan:** 2/2 complete (34-01 + 34-02)
- **Status:** Phase 34 verified (all COMP-01..06 requirements met)
- **Last activity:** 2026-02-25 — Phase 34 verified, 9/9 must-haves passed

Progress: [████░░░░░░] 40% (v1.4)

## What's Done

**v1.0 shipped** (15 phases, 101 plans — 2026-02-12)
**v1.1 shipped** (7 phases, 22 plans — 2026-02-21)
**v1.2 shipped** (5 phases, 20 plans — 2026-02-24)
**v1.3 shipped** (5 phases, 21 plans — 2026-02-25): subscription billing, usage limits, multi-location orgs, analytics, frontend polish

## Decisions

See `.planning/PROJECT.md` Key Decisions section (decisions 1-15 logged there).

**v1.4 design direction (Decision 16):** Glassmorphism + Behance blue #0057FF. Zero new npm packages — existing Tailwind 3.4.5, motion, CVA, next-themes, next/font/google are sufficient. Glass applied additively via `variant="glass"` CVA prop — never by mutating `--card` or other global shadcn tokens.

**v1.4 exclusions:** No glass on sidebar (legibility), data tables, calendar cells, chart canvases, form inputs, primary CTA buttons, or public booking widget. No animated backdrop-filter values. No 3D perspective tilt on glass cards. No backend changes.

**33-01 (Decision 17):** Glass tokens additive under --glass-* namespace; hardcoded pixel blur values throughout (Safari MDN#25914); gradient-mesh base class layout-only to prevent stacking context; position:relative baked into glass-surface classes via @supports guard.

**33-02 (Decision 18):** Hardcoded px blur values (16px/8px/24px) in glass-plugin.ts — never CSS variables; opaque rgba fallback outside @supports guard; Plus Jakarta Sans with latin-ext subset for Czech diacritics.

**34-01 (Decision 19):** CVA defaultVariants is the backward-compatibility mechanism for Card/Badge/Button glass variants — zero usage-site changes for 476+ Card instances. Dialog glass is default-on (no variant prop) since all instances benefit equally. Badge color tints use inline rgba values not CSS variables to keep --glass-* token namespace clean.

**34-02 (Decision 20):** GlassPanel uses forwardRef (interactive containers need ref access); GradientMesh is plain function component (decorative backgrounds never need ref). No overflow:hidden on GlassPanel (prevents stacking context that traps backdrop-filter). No style prop on GradientMesh (prevents caller-injected stacking context triggers).

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
Stopped at: Phase 34 complete, verified. Next: plan Phases 35 + 36 (can be planned in parallel).
Resume file: None
