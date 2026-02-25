---
phase: 34-component-glass-variants
plan: 01
subsystem: ui
tags: [glassmorphism, cva, shadcn, tailwind, card, button, dialog, badge, booking]

# Dependency graph
requires:
  - phase: 33-token-foundation
    provides: glass CSS tokens (--glass-*, glass-surface, glass-surface-heavy, glass-plugin.ts)
provides:
  - CVA glass variant on Card component (variant="glass")
  - CVA glass-secondary and glass-ghost variants on Button
  - Default-on glass treatment for Dialog (overlay + content)
  - CVA glass + 5 color-tinted glass variants on Badge
  - shadow-glass-hover token (globals.css + tailwind.config.ts)
  - BookingStatusBadge using typed glass-* badge variants
affects:
  - 35-dashboard-glass (consumes Card/Dialog/Badge glass variants)
  - 36-marketing-glass (consumes Card/Badge glass variants)
  - 37-auth-polish (consumes Dialog/Card glass variants)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CVA defaultVariants as backward-compatibility safety mechanism for high-usage components
    - Additive glass variants never mutate shadcn base classes or global CSS tokens
    - relative class on CardHeader/CardContent/CardFooter for ::before scrim z-index safety
    - Default-on glass for Dialog (overlay + content) requires no usage-site changes
    - Typed STATUS_VARIANTS record eliminates loose className color strings from domain components

key-files:
  created: []
  modified:
    - apps/web/app/globals.css
    - apps/web/tailwind.config.ts
    - apps/web/components/ui/card.tsx
    - apps/web/components/ui/button.tsx
    - apps/web/components/ui/dialog.tsx
    - apps/web/components/ui/badge.tsx
    - apps/web/components/booking/BookingStatusBadge.tsx

key-decisions:
  - 'Card/Badge/Button glass variants are opt-in via CVA variant prop; defaultVariants ensures all existing usages remain unchanged without any prop edits'
  - 'Dialog glass treatment is default-on (no variant prop) — all 178+ existing Dialog usages automatically get glass overlay and glass-surface-heavy content panel'
  - 'DialogClose button gets relative z-10 to render above the ::before pseudo-element scrim created by glass-surface-heavy'
  - 'Primary CTA Button variant remains solid per Decision 16 — glass-secondary and glass-ghost are the only glass button variants'
  - 'Badge color-tinted glass variants use inline rgba+opacity rather than CSS variables to avoid token proliferation for semantic color families'

patterns-established:
  - 'CVA additive pattern: keep default variant classes unchanged, add glass variant alongside — never modify base'
  - 'relative class on container sub-components (CardHeader, CardContent, CardFooter) prevents ::before scrim from trapping content'
  - 'STATUS_VARIANTS typed record pattern: maps domain enum to CVA variant strings for compile-time safety'

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 34 Plan 01: Glass Component Variants Summary

**CVA glass variants added to Card, Button, Dialog, Badge with shadow-glass-hover token; BookingStatusBadge migrated to typed glass-* variants — all 476+ Card usages backward compatible via defaultVariants**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T18:35:46Z
- **Completed:** 2026-02-25T18:39:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- COMP-01: Card refactored to CVA with `variant="glass"` (glass-surface + border-glass + hover:shadow-glass-hover); all 476+ existing Card usages unchanged via `defaultVariants: { variant: 'default' }`
- COMP-02: Button gains `glass-secondary` and `glass-ghost` variants using glass-surface-subtle; primary CTA variant untouched per Decision 16
- COMP-03: Dialog overlay updated to `bg-black/40 backdrop-blur-sm` and content to `glass-surface-heavy`; close button gets `relative z-10`; zero usage-site changes required
- COMP-04: Badge gains 6 glass variants (glass, glass-blue, glass-gray, glass-red, glass-amber, glass-green); BookingStatusBadge migrated from loose className color overrides to typed `STATUS_VARIANTS` record
- Token gap closed: `--glass-shadow-hover-light` CSS variable added in both `:root` and `.dark` blocks; `shadow-glass-hover` token registered in tailwind.config.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add shadow-glass-hover token and refactor Card + Dialog + Button with glass variants** - `ad62854` (feat)
2. **Task 2: Add glass badge variants and update BookingStatusBadge** - `6b6b23b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/app/globals.css` - Added `--glass-shadow-hover-light` variable in `:root` and `.dark` blocks
- `apps/web/tailwind.config.ts` - Added `shadow-glass-hover: var(--glass-shadow-hover-light)` to boxShadow extension
- `apps/web/components/ui/card.tsx` - Refactored with CVA `cardVariants`; `default` and `glass` variants; `relative` added to CardHeader/CardContent/CardFooter
- `apps/web/components/ui/button.tsx` - Added `glass-secondary` and `glass-ghost` variants to `buttonVariants`
- `apps/web/components/ui/dialog.tsx` - DialogOverlay changed to `bg-black/40 backdrop-blur-sm`; DialogContent changed to `glass-surface-heavy`; DialogClose gets `relative z-10`
- `apps/web/components/ui/badge.tsx` - Added 6 glass variants: `glass`, `glass-blue`, `glass-gray`, `glass-red`, `glass-amber`, `glass-green`
- `apps/web/components/booking/BookingStatusBadge.tsx` - Migrated from `STATUS_COLORS` + `className` overrides to `STATUS_VARIANTS` typed record with CVA variant prop

## Decisions Made

- CVA `defaultVariants` is the primary backward-compatibility mechanism — all existing component usage sites require zero prop changes
- Dialog glass is applied as a default-on change (no variant prop required) since all Dialog instances benefit from glass treatment equally
- Badge color tints use inline `bg-blue-100/60` style instead of CSS variables to keep token namespace clean; these are semantic colors, not design system tokens
- Primary CTA buttons remain solid per the locked Decision 16 from STATE.md ("No glass on primary CTA buttons")

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Task 1 changes were already committed in a prior agent run (`ad62854` — GradientMesh commit that bundled these changes). Task 2 was not yet done. Executed Task 2 fresh, both tasks now complete with separate commits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All glass component primitives (Card, Button, Dialog, Badge) are ready for consumption by Phase 35-37 pages
- `variant="glass"` on Card, `glass-secondary`/`glass-ghost` on Button, and `glass-*` on Badge are all available as typed CVA props
- Dialog glass is already active for all 178+ existing usages — no dashboard page changes needed for Dialog
- BookingStatusBadge glass treatment live for all booking status displays

---

_Phase: 34-component-glass-variants_
_Completed: 2026-02-25_
