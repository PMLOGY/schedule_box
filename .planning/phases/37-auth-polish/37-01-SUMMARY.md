---
phase: 37-auth-polish
plan: 01
subsystem: ui
tags: [glassmorphism, auth, motion, select, dropdown, tooltip, radix]

# Dependency graph
requires:
  - phase: 34-glass-components
    provides: GlassPanel and GradientMesh components
  - phase: 33-token-foundation
    provides: Glass CSS tokens (glass-surface, glass-surface-subtle, glass-surface-heavy, border-glass, shadow-glass)
provides:
  - Glass auth layout with gradient mesh background and entrance animation
  - Glass-styled Select, DropdownMenu, and Tooltip portaled components
affects: [37-02-auth-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [client-layout-with-server-page-metadata, glass-on-radix-portals]

key-files:
  modified:
    - apps/web/app/[locale]/(auth)/layout.tsx
    - apps/web/components/ui/select.tsx
    - apps/web/components/ui/dropdown-menu.tsx
    - apps/web/components/ui/tooltip.tsx

key-decisions:
  - 'Auth layout converted to client component for Motion -- child page.tsx server components retain metadata exports (Next.js App Router supports this pattern)'
  - 'TooltipContent uses glass-surface-subtle (lighter frost) while Select/DropdownMenu use glass-surface (standard frost) for appropriate visual weight'

patterns-established:
  - 'Client layout + server page pattern: use client layout for animations while child pages keep server component metadata exports'
  - 'Radix Portal glass treatment: apply glass classes only to Content wrappers (SelectContent, DropdownMenuContent, TooltipContent), never to triggers or items'

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 37 Plan 01: Auth & Polish Summary

**Glass auth layout with gradient mesh background, motion entrance animation, and frosted glass treatment on Select/DropdownMenu/Tooltip portal components**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T20:46:48Z
- **Completed:** 2026-02-25T20:50:24Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Auth layout converted to premium glass card experience with GradientMesh preset="auth" background and GlassPanel intensity="heavy" card wrapper
- Motion entrance animation (opacity + y slide-up with custom easing) on auth card for polished page load experience
- Glass treatment applied to all Radix Portal-rendered popover components: SelectContent, DropdownMenuContent, DropdownMenuSubContent, and TooltipContent

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert auth layout to glass card with gradient mesh and entrance animation** - `0b628e6` (feat)
2. **Task 2: Apply glass treatment to Select, DropdownMenu, and Tooltip shadcn components** - `7b34e4a` (feat)

## Files Created/Modified

- `apps/web/app/[locale]/(auth)/layout.tsx` - Glass auth layout with GradientMesh, GlassPanel, and motion.div entrance animation
- `apps/web/components/ui/select.tsx` - SelectContent: glass-surface + border-glass + shadow-glass
- `apps/web/components/ui/dropdown-menu.tsx` - DropdownMenuContent + SubContent: glass-surface + border-glass + shadow-glass
- `apps/web/components/ui/tooltip.tsx` - TooltipContent: glass-surface-subtle + border-glass + shadow-glass

## Decisions Made

- Auth layout converted to client component (`'use client'`) for Motion library support. This is safe because child page.tsx files (login, register, forgot-password, reset-password) are server components that export `metadata` -- Next.js App Router extracts metadata from page.tsx at build time, not from the layout.
- TooltipContent uses `glass-surface-subtle` (8px blur) for a more delicate frosted effect appropriate for small tooltip popups, while Select and DropdownMenu use standard `glass-surface` (16px blur) for larger panel areas.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth pages fully glass-treated with entrance animation
- All Radix Portal-rendered popover components (Select, DropdownMenu, Tooltip) now have consistent glass styling across the entire app
- Ready for 37-02 plan (remaining polish tasks)

## Self-Check: PASSED

- All 4 modified files exist on disk
- Commits `0b628e6` and `7b34e4a` verified in git log
- GlassPanel (3), GradientMesh (2), motion.div (2) present in auth layout
- glass-surface count: select=1, dropdown-menu=2, tooltip=1 (all correct)

---

_Phase: 37-auth-polish_
_Completed: 2026-02-25_
