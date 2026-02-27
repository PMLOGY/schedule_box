---
phase: 36-marketing-glass
plan: 01
subsystem: ui
tags: [glassmorphism, animation, css, next-intl, tailwind, radix-ui]

# Dependency graph
requires:
  - phase: 33-glass-tokens
    provides: glass-surface-subtle CSS utility class and glass token system
  - phase: 34-component-glass-variants
    provides: GradientMesh component with preset=marketing

provides:
  - Aurora CSS animation (@keyframes aurora + .aurora-bg class) with dark mode and reduced-motion support
  - GradientMesh preset=marketing in marketing layout (gradient mesh background on all marketing pages)
  - Glass navbar (glass-surface-subtle token, not ad-hoc inline glass) with MobileNav Sheet slide-over
  - Hero section gradient text h1 (blue-to-indigo) and aurora animation div

affects:
  - 36-marketing-glass (subsequent plans building on marketing visual foundation)
  - 35-dashboard-glass (may reference aurora pattern for dashboard hero)
  - 37-auth-polish (auth layout may adopt similar gradient mesh + glass nav pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Aurora animation via CSS keyframes + background-size 300% 300% shift — no JS required
    - MobileNav as 'use client' component co-located in same file as parent component
    - useTranslations hook replaces getTranslations when entire navbar component needs client boundary
    - Glass token on sticky header: glass-surface-subtle replaces ad-hoc backdrop-blur/bg-background classes

key-files:
  created: []
  modified:
    - apps/web/app/globals.css
    - apps/web/app/[locale]/(marketing)/layout.tsx
    - apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx
    - apps/web/app/[locale]/(marketing)/_components/hero-section.tsx

key-decisions:
  - 'MarketingNavbar converted from async server component to use client component — useTranslations + Sheet require client boundary; no architectural change, translations work identically'
  - 'MobileNav co-located in marketing-navbar.tsx (not extracted to separate file) — avoids extra file for small component; exported via same module'
  - 'Aurora opacity set to 60% light / 30% dark — subtle enough for text legibility without sacrificing visual impact'

patterns-established:
  - 'Aurora pattern: @keyframes + background-size 300% 300% + animation for living gradient backgrounds'
  - 'Glass navbar: sticky top-0 z-50 border-b border-glass glass-surface-subtle — standard glass header class order'
  - 'MobileNav: co-located use client component in same file as parent, receives translated labels as string props'

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 36 Plan 01: Marketing Glass Foundation Summary

**Gradient mesh background, glass navbar with mobile Sheet slide-over, and aurora hero animation built using Phase 33 glass-surface-subtle token system**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-25T19:41:18Z
- **Completed:** 2026-02-25T19:45:00Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments

- Added `@keyframes aurora` and `.aurora-bg` CSS class to globals.css with dark mode variant and `prefers-reduced-motion` support
- Added `GradientMesh preset="marketing"` as first child in marketing layout — provides colored gradient mesh background for all marketing pages
- Replaced ad-hoc glass header (`bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`) with Phase 33 token `glass-surface-subtle` on navbar
- Added `MobileNav` client component with Radix Sheet slide-over (hamburger button, nav links, LocaleSwitcher, CTAs) visible below md breakpoint
- Applied blue-to-indigo gradient text to hero h1 and added aurora animation div behind hero content

## Task Commits

Each task was committed atomically:

1. **Task 1: Aurora CSS, GradientMesh layout, glass navbar with mobile menu** - `c54e116` (feat)
2. **Task 2: Gradient text and aurora animation in hero section** - `8d09df3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/app/globals.css` - Added @keyframes aurora, .aurora-bg, .dark .aurora-bg, @media prefers-reduced-motion block
- `apps/web/app/[locale]/(marketing)/layout.tsx` - Added GradientMesh import and `<GradientMesh preset="marketing" />` as first child
- `apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx` - Full rewrite: 'use client', useTranslations, glass-surface-subtle header, MobileNav Sheet
- `apps/web/app/[locale]/(marketing)/_components/hero-section.tsx` - Added relative positioning, aurora-bg div, relative content wrapper, gradient text h1

## Decisions Made

- **MarketingNavbar client boundary:** The original plan described `MarketingNavbar` as an async server component calling `getTranslations`, with `MobileNav` as a separate `'use client'` component in the same file. However, when both components share a file, the `'use client'` directive at the top of the file makes the entire module a client component. Switching `MarketingNavbar` to use `useTranslations` (client hook) is identical in behavior and avoids the need for two separate files. This is a code organization choice, not a behavior change.

- **Aurora opacity values (60% light / 30% dark):** Chosen to keep the aurora subtle enough that it never competes with text legibility. The gradient mesh background already provides color; the aurora adds motion without overwhelming.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MarketingNavbar converted to client component**

- **Found during:** Task 1 (marketing-navbar.tsx rewrite)
- **Issue:** Plan specified an async server component with a `MobileNav` 'use client' sub-component in the same file. When `MobileNav` has `'use client'` at the top of a shared file, the entire file becomes client-side. Having `MarketingNavbar` call `getTranslations` (server-only) in a client file would cause a runtime error.
- **Fix:** Added `'use client'` to top of file, replaced `getTranslations` (server) with `useTranslations` (client). Behavior is identical — translations load correctly in both patterns.
- **Files modified:** `apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx`
- **Verification:** `npx tsc --noEmit` passes; no server/client boundary violations
- **Committed in:** `c54e116` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — prevented server/client boundary bug)
**Impact on plan:** Fix was necessary for correctness. Navbar behavior is identical to plan intent — translations work, mobile Sheet works, glass-surface-subtle applied.

## Issues Encountered

None beyond the server/client boundary deviation documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Marketing visual foundation complete: gradient mesh background + glass navbar + aurora hero all in place
- Ready for Phase 36 Plan 02 (features section glass cards, social proof section, pricing section)
- The `.aurora-bg` CSS class is available globally via globals.css — any other section can use it

---

_Phase: 36-marketing-glass_
_Completed: 2026-02-25_

## Self-Check: PASSED

- FOUND: `apps/web/app/globals.css`
- FOUND: `apps/web/app/[locale]/(marketing)/layout.tsx`
- FOUND: `apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx`
- FOUND: `apps/web/app/[locale]/(marketing)/_components/hero-section.tsx`
- FOUND: `.planning/phases/36-marketing-glass/36-01-SUMMARY.md`
- FOUND commit: `c54e116` (Task 1)
- FOUND commit: `8d09df3` (Task 2)
- TypeScript: zero errors (`npx tsc --noEmit` passed twice)
