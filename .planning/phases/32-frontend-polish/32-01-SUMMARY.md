---
phase: 32-frontend-polish
plan: 01
subsystem: ui
tags: [next-themes, dark-mode, css-variables, tailwind, design-tokens]

# Dependency graph
requires:
  - phase: 25-marketing-landing
    provides: Marketing pages (navbar, footer, feature grid)
  - phase: 27-onboarding-wizard
    provides: DemoDataCard component
provides:
  - Dark mode toggle (ThemeToggle component)
  - ThemeProvider wrapping entire app
  - Shadow system CSS variables (light + dark)
  - Success/warning semantic color tokens
  - All hardcoded light-only colors replaced with semantic tokens
affects: [32-02, 32-03, frontend-components]

# Tech tracking
tech-stack:
  added: [next-themes 0.4.6]
  patterns: [CSS variable shadow system, mounted-state hydration guard, semantic color tokens]

key-files:
  created:
    - apps/web/components/ui/theme-toggle.tsx
  modified:
    - apps/web/app/providers.tsx
    - apps/web/app/globals.css
    - apps/web/tailwind.config.ts
    - apps/web/components/layout/header.tsx
    - apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx
    - apps/web/app/[locale]/(marketing)/_components/marketing-footer.tsx
    - apps/web/app/[locale]/(marketing)/_components/feature-grid.tsx
    - apps/web/components/dashboard/stat-card.tsx
    - apps/web/components/onboarding/demo-data-card.tsx
    - apps/web/components/loyalty/WalletButtons.tsx

key-decisions:
  - 'ThemeProvider wraps QueryClientProvider (outermost provider after html/body)'
  - 'ThemeToggle uses mounted-state pattern to avoid hydration mismatch'
  - 'Shadow CSS variables (not Tailwind arbitrary values) for dark mode shadow adaptation'
  - 'Stat card green trend uses dark:text-green-400 variant instead of text-success for visual consistency'

patterns-established:
  - 'Mounted-state pattern: useState(false) + useEffect for client-only rendering in theme-dependent components'
  - 'Semantic color usage: bg-background instead of bg-white, bg-muted instead of bg-gray-50'

# Metrics
duration: 8min
completed: 2026-02-24
---

# Phase 32 Plan 01: Dark Mode & Design Tokens Summary

**next-themes dark mode with ThemeProvider, ThemeToggle in header/navbar, shadow/color CSS tokens, all hardcoded light-only colors replaced with semantic tokens**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-24T22:29:25Z
- **Completed:** 2026-02-24T22:37:51Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Installed next-themes and wrapped entire app with ThemeProvider (attribute=class, defaultTheme=system)
- Created ThemeToggle component with sun/moon icons and hydration-safe mounted pattern
- Added shadow system CSS variables (4 levels) with distinct light/dark values
- Added success/warning semantic color tokens in both :root and .dark
- Extended Tailwind config with success/warning colors and CSS-variable-based boxShadow
- Replaced all hardcoded bg-white, bg-gray-50, text-gray-* in dashboard header, marketing navbar/footer, feature grid, stat card, demo data card, and WalletButtons with semantic tokens
- Added ThemeToggle to both dashboard header and marketing navbar

## Task Commits

Each task was committed atomically:

1. **Task 1: Install next-themes, create ThemeProvider + toggle, extend design tokens** - `80c7290` (feat)
2. **Task 2: Fix hardcoded colors and add theme toggle to header/navbar** - `4439733` (feat)

## Files Created/Modified

- `apps/web/components/ui/theme-toggle.tsx` - Dark mode toggle button with mounted-state hydration guard
- `apps/web/app/providers.tsx` - Added ThemeProvider from next-themes wrapping QueryClientProvider
- `apps/web/app/globals.css` - Shadow system + success/warning tokens in :root and .dark
- `apps/web/tailwind.config.ts` - success/warning color extensions + boxShadow variable entries
- `apps/web/components/layout/header.tsx` - bg-white -> bg-background, added ThemeToggle
- `apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx` - bg-white -> bg-background, added ThemeToggle
- `apps/web/app/[locale]/(marketing)/_components/marketing-footer.tsx` - bg-gray-50 -> bg-muted
- `apps/web/app/[locale]/(marketing)/_components/feature-grid.tsx` - bg-gray-50/50 -> bg-muted/50
- `apps/web/components/dashboard/stat-card.tsx` - trend colors dark mode safe
- `apps/web/components/onboarding/demo-data-card.tsx` - hardcoded grays -> semantic tokens
- `apps/web/components/loyalty/WalletButtons.tsx` - Google button colors -> semantic tokens

## Decisions Made

- ThemeProvider wraps QueryClientProvider (outermost provider after html/body) for consistent theme context
- ThemeToggle uses mounted-state pattern (useState + useEffect) to avoid hydration mismatch
- Shadow CSS variables used instead of Tailwind arbitrary values for automatic dark mode shadow adaptation
- Stat card green trend uses `dark:text-green-400` variant instead of `text-success` for visual consistency with standard Tailwind green

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed invisible text in demo-data-card dark mode**

- **Found during:** Task 2 (demo-data-card.tsx)
- **Issue:** text-gray-900, text-gray-500, text-gray-400 would be invisible on dark backgrounds
- **Fix:** Replaced with text-foreground, text-muted-foreground, text-muted-foreground/70
- **Files modified:** apps/web/components/onboarding/demo-data-card.tsx
- **Verification:** TypeScript compiles, semantic tokens adapt to dark theme
- **Committed in:** 4439733 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential for dark mode correctness. No scope creep.

## Issues Encountered

None - TypeScript compilation clean, all verification checks pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dark mode infrastructure complete, ready for Plan 02 (responsive layout / component polish)
- ThemeToggle available in both dashboard and marketing contexts
- Shadow and semantic color tokens ready for use in subsequent plans

---

## Self-Check: PASSED

All key files exist on disk. All commit hashes found in git log.

---

_Phase: 32-frontend-polish_
_Completed: 2026-02-24_
