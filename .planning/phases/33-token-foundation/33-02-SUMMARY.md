---
phase: 33-token-foundation
plan: 02
subsystem: frontend
tags: [tailwind, glassmorphism, typography, plugin, font]
dependency_graph:
  requires:
    - 33-01 (glass CSS tokens in globals.css — var(--glass-bg-light), var(--glass-border-light), var(--glass-shadow-light))
  provides:
    - glass-surface, glass-surface-subtle, glass-surface-heavy Tailwind utility classes
    - bg-glass, shadow-glass, border-glass, backdrop-blur-glass-sm/md/lg Tailwind utilities
    - Plus Jakarta Sans font via --font-plus-jakarta-sans CSS variable
  affects:
    - All components using font-sans (now Plus Jakarta Sans)
    - Any component applying glass-surface class
tech_stack:
  added: []
  patterns:
    - Tailwind plugin CSS-in-JS for @supports progressive enhancement
    - Hardcoded px blur values to avoid Safari -webkit-backdrop-filter MDN#25914 bug
    - next/font/google with variable mode for CSS-variable-based font injection
key_files:
  created:
    - apps/web/lib/plugins/glass-plugin.ts
  modified:
    - apps/web/tailwind.config.ts
    - apps/web/app/layout.tsx
decisions:
  - Used hardcoded pixel blur values (16px/8px/24px) not CSS variables — Safari does not support blur(var(--x)) in -webkit-backdrop-filter
  - Opaque rgba fallback outside @supports guard — degrades gracefully on browsers without backdrop-filter
  - Plus Jakarta Sans loaded with latin-ext subset for full Czech diacritic support
metrics:
  duration: 5 minutes
  completed: 2026-02-25
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 33 Plan 02: Glass Plugin and Font Foundation Summary

Tailwind glass plugin with three frosted-glass utilities (16px/8px/24px blur), glass theme
extensions in tailwind.config.ts, and Plus Jakarta Sans replacing Inter for premium typography.

## Tasks Completed

### Task 1: Create glass-plugin.ts Tailwind Plugin

Created `apps/web/lib/plugins/glass-plugin.ts` registering three utility classes via Tailwind's
`plugin()` API:

- `.glass-surface` — 16px blur, rgba(255,255,255,0.85) fallback
- `.glass-surface-subtle` — 8px blur, rgba(255,255,255,0.90) fallback
- `.glass-surface-heavy` — 24px blur, rgba(255,255,255,0.75) fallback

Each class follows the pattern:

1. Opaque `background` outside `@supports` (fallback for Firefox ESR, older browsers)
2. `@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))` guard
3. Inside guard: `backdrop-filter` + `-webkit-backdrop-filter` with hardcoded px values
4. CSS variable references for `background`, `border`, `box-shadow` — safe to use (resolve at runtime)

**Commit:** f0e0deb

### Task 2: Extend tailwind.config.ts and Swap Font in layout.tsx

Modified `apps/web/tailwind.config.ts`:

- Added `import glassPlugin from './lib/plugins/glass-plugin'`
- Added `backdropBlur: { glass-sm: 8px, glass-md: 16px, glass-lg: 24px }`
- Added `backgroundColor: { glass, glass-subtle, glass-heavy }` referencing CSS vars
- Added `boxShadow: { glass: var(--glass-shadow-light) }`
- Added `borderColor: { glass: var(--glass-border-light) }`
- Changed `fontFamily.sans` from `['Inter', 'sans-serif']` to `['var(--font-plus-jakarta-sans)', 'sans-serif']`
- Added `glassPlugin` to `plugins` array

Modified `apps/web/app/layout.tsx`:

- Replaced `import { Inter } from 'next/font/google'` with `import { Plus_Jakarta_Sans }`
- Font config: `variable: '--font-plus-jakarta-sans'`, `subsets: ['latin', 'latin-ext']`,
  `weight: ['300', '400', '500', '600', '700']`, `display: 'swap'`
- Body class updated from `${inter.variable}` to `${plusJakartaSans.variable}`
- Inter fully removed — no references remain

**Commit:** 965412e (captured in 33-01 summary commit via lint-staged)

## Verification Results

All plan verification checks passed:

| Check | Result |
|-------|--------|
| glass-plugin.ts exists | PASS |
| backdrop-filter in all 3 glass variants | PASS (11 occurrences) |
| -webkit-backdrop-filter in all 3 variants | PASS (7 occurrences) |
| No CSS variables in blur values | PASS (0 occurrences) |
| glassPlugin in import + plugins array | PASS |
| font-plus-jakarta-sans in fontFamily.sans | PASS |
| Plus_Jakarta_Sans import in layout.tsx | PASS |
| latin-ext subset present | PASS |
| No Inter reference in layout.tsx | PASS |
| backgroundColor glass entries present | PASS |
| TypeScript type check (`tsc --noEmit`) | PASS (0 errors) |
| Next.js build compile + page generation | PASS (224/224 pages, 0 type errors) |

## Deviations from Plan

None — plan executed exactly as written.

Note: Build output showed Windows EPERM symlink warnings in `.next/standalone` file trace step.
These are pre-existing Windows filesystem permission issues unrelated to these changes. TypeScript
compilation and all 224 static pages generated successfully with zero errors.

## Self-Check: PASSED

- `apps/web/lib/plugins/glass-plugin.ts` — EXISTS
- `apps/web/tailwind.config.ts` — glassPlugin import, glass extensions, Plus Jakarta Sans variable
- `apps/web/app/layout.tsx` — Plus_Jakarta_Sans, latin-ext, no Inter
- Commits f0e0deb and 965412e — EXIST in git log
