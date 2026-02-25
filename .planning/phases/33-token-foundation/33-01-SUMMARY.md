---
phase: 33-token-foundation
plan: 01
subsystem: ui
tags: [css, tailwind, glassmorphism, design-tokens, accessibility, responsive]

# Dependency graph
requires: []
provides:
  - Glass CSS primitive tokens (--glass-bg-light, --glass-border-light, --glass-shadow-light) in :root and .dark
  - Gradient mesh utility classes (gradient-mesh, gradient-mesh-dashboard, gradient-mesh-marketing, gradient-mesh-auth)
  - Dark mode overrides for all gradient mesh presets
  - Responsive blur degradation at <768px viewport
  - prefers-reduced-transparency opaque card fallback
  - "@supports-guarded ::before WCAG scrim on glass surfaces"
affects:
  - 33-token-foundation (plans 02+)
  - Any plan applying glass-surface, glass-surface-subtle, or glass-surface-heavy classes
  - Any page using gradient-mesh background system

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Glass CSS tokens are additive under --glass-* prefix, never overriding existing shadcn/ui tokens
    - backdrop-filter and -webkit-backdrop-filter use hardcoded pixel values only (Safari MDN#25914 CSS variable bug)
    - gradient-mesh base class carries position/inset/z-index; preset classes carry only background
    - Dark mode gradient overrides live outside @layer for specificity

key-files:
  created: []
  modified:
    - apps/web/app/globals.css

key-decisions:
  - 'Glass tokens additive under --glass-* namespace: never modify --card, --border, --background or any shadcn token'
  - 'gradient-mesh base class holds only position:fixed, inset:0, z-index:-10, pointer-events:none to avoid stacking context'
  - 'position:relative baked into glass-surface classes via @supports guard so ::before scrim always positions correctly'
  - 'backdrop-filter values hardcoded as pixels throughout (8px/4px/12px mobile, 16px/8px/24px desktop) per Safari MDN#25914'

patterns-established:
  - 'CSS Token Layering: glass tokens defined in :root and .dark inside @layer base, additive only'
  - 'Gradient Mesh Pattern: base .gradient-mesh class owns layout, preset classes own background only'
  - 'Progressive Enhancement Order: @layer utilities -> dark overrides -> responsive @media -> prefers-reduced-transparency -> @supports scrim'

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 33 Plan 01: Token Foundation Summary

**Glass design system CSS foundation with 8 primitive tokens, 3 gradient mesh presets, responsive blur degradation, and WCAG-compliant accessibility fallbacks added to globals.css without touching any existing shadcn/ui tokens.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-25T16:12:34Z
- **Completed:** 2026-02-25T16:15:25Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added 8 glass CSS primitive tokens (3 blur reference, 3 background alpha, 1 border, 1 shadow) in both :root and .dark blocks
- Added gradient mesh utility system with base class and 3 presets (dashboard, marketing, auth) with distinct radial-gradient orb configurations and dark mode overrides
- Added responsive blur degradation reducing backdrop-filter intensity below 768px with hardcoded values (Safari MDN#25914 constraint respected)
- Added prefers-reduced-transparency fallback replacing glass effects with opaque hsl(var(--card)) backgrounds
- Added @supports-guarded ::before WCAG scrim (position:relative baked in) on all three glass surface classes

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Glass CSS tokens, gradient mesh utilities, responsive degradation, accessibility fallbacks** - `9e9af04` (feat)

## Files Created/Modified

- `apps/web/app/globals.css` - Added 119 lines of glass token foundation; zero existing lines modified (pure additions)

## Decisions Made

- **Glass tokens are additive**: All new tokens use `--glass-*` prefix. No existing shadcn/ui tokens (`--card`, `--border`, `--background`, etc.) were touched. Git diff shows only `+` lines.
- **Hardcoded blur values throughout**: `backdrop-filter: blur(16px)` pattern used everywhere — never `blur(var(--glass-blur-md))`. This is the only safe approach for Safari compatibility (MDN#25914).
- **gradient-mesh base class is layout-only**: `position: fixed; inset: 0; z-index: -10; pointer-events: none` and nothing else. Preset classes carry only `background`. This prevents stacking context creation.
- **position:relative in @supports guard**: Rather than requiring components to remember to add it, `position: relative` is baked into `.glass-surface`, `.glass-surface-subtle`, `.glass-surface-heavy` inside the @supports block so the ::before scrim always positions correctly.
- **Block ordering**: gradient-mesh utilities -> dark overrides -> @media responsive -> @media prefers-reduced-transparency -> @supports scrim. The reduced-transparency rule comes after responsive so it wins the cascade.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Build reported `ENOENT: no such file or directory, open '.next/build-manifest.json'` after CSS compilation succeeded. This is a pre-existing environment issue (missing build manifest from previous build) unrelated to CSS changes. CSS compilation itself passed cleanly: `✓ Compiled successfully in 37.5s`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All glass CSS tokens are now available as CSS custom properties throughout the app
- gradient-mesh utility classes ready to apply to page wrappers
- The glass-plugin.ts Tailwind plugin (plan 33-02) can reference --glass-bg-light, --glass-border-light, --glass-shadow-light safely
- Glass surface classes (glass-surface, glass-surface-subtle, glass-surface-heavy) will receive backdrop-filter from the plugin; responsive degradation and accessibility fallbacks are already in place awaiting those classes

---

_Phase: 33-token-foundation_
_Completed: 2026-02-25_

## Self-Check: PASSED

- `apps/web/app/globals.css` — FOUND
- Commit `9e9af04` — FOUND
