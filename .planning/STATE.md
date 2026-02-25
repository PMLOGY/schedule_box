# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** v1.4 Design Overhaul — Phase 36: Marketing Glass — Plan 02 COMPLETE

## Current Position

- **Milestone:** v1.4 Design Overhaul (Phases 33-37)
- **Phase:** 36 of 37 (Marketing Glass)
- **Plan:** 2/2 complete (36-01 + 36-02 done — Phase 36 COMPLETE)
- **Status:** Phase 36 complete — full marketing glass system applied to all components
- **Last activity:** 2026-02-25 — 36-02 executed, 2 tasks, 7 files modified

Progress: [██████░░░░] 60% (v1.4)

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

**35-01 (Decision 21):** GradientMesh placed outside flex wrapper (position:fixed removes from flow, unaffecting flex layout); sidebar stays bg-background per DASH-05 locked decision; header uses glass-surface-subtle + border-glass replacing bg-background — Radix UI Portals unaffected by header stacking context.

**36-01 (Decision 22):** MarketingNavbar converted to 'use client' with useTranslations — co-locating MobileNav (Sheet requires client boundary) in same file forces entire module to be client; useTranslations is identical in behavior to getTranslations for this use case. Aurora opacity 60% light / 30% dark keeps animation subtle enough for text legibility.

**36-02 (Decision 23):** Pricing tier glass intensity differentiation via cn() className instead of variant prop — featured Pro tier uses glass-surface (16px), non-featured use glass-surface-subtle (8px). GlassPanel intensity="subtle" on legal pages for readability. Footer uses glass-surface-subtle + border-glass to replace solid bg-muted.

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
| Phase 35-dashboard-glass P01 | 8 | 2 tasks | 2 files |

## Session Continuity

Last session: 2026-02-25
Stopped at: Phase 35 Plan 01 complete + Phase 36 complete (both plans done). Next: Phase 35 Plan 02 (dashboard KPI/stat cards glass) OR Phase 37 Auth+Polish.
Resume file: None
