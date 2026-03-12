---
phase: 38-glass-polish-gaps
plan: 01
subsystem: ui
tags: [glassmorphism, tailwind, cva, skeleton, pricing]

# Dependency graph
requires:
  - phase: 37-auth-polish
    provides: GlassShimmer component and Card CVA glass variant
  - phase: 34-components
    provides: glass-plugin.ts, GlassShimmer, Card CVA variant="glass"
provides:
  - GlassShimmer used consistently in all large-block PageSkeleton variants (cards, form, detail)
  - PricingTable uses Card variant="glass" with hover:shadow-glass-hover transition
  - Button CVA has exactly 6 variants (no orphaned glass code)
  - Tailwind config has no orphaned backdropBlur extensions
affects: [any future component using PageSkeleton, pricing page, button usage audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GlassShimmer replaces Skeleton for large rectangular block placeholders in glass-context pages"
    - "Card variant=glass replaces raw glass-surface className strings for glass cards"
    - "CVA orphan cleanup: dead variants removed before any usage audit"

key-files:
  created: []
  modified:
    - apps/web/components/shared/page-skeleton.tsx
    - apps/web/app/[locale]/(marketing)/_components/pricing-table.tsx
    - apps/web/components/ui/button.tsx
    - apps/web/tailwind.config.ts

key-decisions:
  - "PricingTable uses single Card variant=glass for all tiers; featured tier gets ring-2 ring-primary/70 via cn() — Decision 23 intensity differentiation replaced by CVA consistency per audit requirement"
  - "FormVariant label skeletons (h-4 w-24) stay as base Skeleton — only large block placeholders (h-10 inputs) use GlassShimmer"
  - "GlassShimmer already includes rounded-xl so rounded-xl dropped from replaced DetailVariant/CardsVariant classNames"

patterns-established:
  - "Large block placeholder (>=h-10 full-width, >=h-[120px]) in glass context: GlassShimmer"
  - "Small inline placeholder (text height, narrow width): base Skeleton"

requirements-completed: [COMP-02, POLSH-02]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 38 Plan 01: Glass Polish Gaps Summary

**GlassShimmer extended to CardsVariant/FormVariant/DetailVariant, PricingTable migrated to Card CVA glass variant, orphaned Button glass-secondary/glass-ghost variants removed, and Tailwind backdropBlur extension block deleted — zero orphaned glass code remains**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T17:54:26Z
- **Completed:** 2026-03-12T17:56:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- PageSkeleton CardsVariant, FormVariant (inputs), and DetailVariant now all render GlassShimmer for large block placeholders — POLSH-02 fully satisfied
- PricingTable Card rendering migrated from raw `glass-surface`/`glass-surface-subtle` classNames to `variant="glass"` CVA prop, gaining `hover:shadow-glass-hover` transition automatically
- Button component trimmed to exactly 6 variants (default, destructive, outline, secondary, ghost, link) — COMP-02 resolved
- Tailwind config `backdropBlur` extension block removed (was generating `backdrop-blur-glass-{sm,md,lg}` utilities with zero consumers; glass-plugin.ts handles blur with hardcoded px values per Decision 17/18)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend GlassShimmer to all PageSkeleton variants and fix PricingTable CVA** - `fc95e4f` (feat)
2. **Task 2: Remove orphaned Button glass variants and Tailwind backdropBlur extensions** - `6035ed2` (refactor)

## Files Created/Modified
- `apps/web/components/shared/page-skeleton.tsx` - CardsVariant, FormVariant, DetailVariant now use GlassShimmer for large blocks
- `apps/web/app/[locale]/(marketing)/_components/pricing-table.tsx` - Card uses variant="glass" with isFeatured ring via cn()
- `apps/web/components/ui/button.tsx` - Removed glass-secondary and glass-ghost CVA variants (zero consumers)
- `apps/web/tailwind.config.ts` - Removed backdropBlur extension block (5 lines deleted)

## Decisions Made
- PricingTable migrated to single `variant="glass"` for all tiers per audit requirement; featured Pro tier continues to get `ring-2 ring-primary/70` via cn() className. The subtle/standard intensity distinction from Decision 23 is superseded by the CVA consistency requirement from the audit.
- FormVariant label skeletons (`h-4 w-24`) remain as base `Skeleton` since they are small inline text placeholders, not glass-context blocks. Only `h-10 w-full` input placeholders use GlassShimmer.
- `rounded-xl` dropped from DetailVariant and CardsVariant GlassShimmer calls since GlassShimmer already applies `rounded-xl` in its own className.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four audit gaps from v1.4-MILESTONE-AUDIT.md (POLSH-02, COMP-02, PricingTable integration, backdropBlur orphan) are now closed
- Glass design system has zero orphaned code and consistent CVA variant usage throughout
- Ready for remaining 38-glass-polish-gaps plans

---
*Phase: 38-glass-polish-gaps*
*Completed: 2026-03-12*
