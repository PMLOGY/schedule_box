---
phase: 50-testing-hardening
plan: 03
subsystem: ui
tags: [storybook, vite, tailwind, glassmorphism, cva, next-intl, react-vite]

# Dependency graph
requires:
  - phase: 33-design-tokens
    provides: glass CSS variables and Tailwind plugin (glass-surface, glass-surface-heavy, etc.)
  - phase: 34-components
    provides: Button, Card, Dialog, Badge, DataTable with CVA glass variants
provides:
  - Storybook 8 visual catalog for glass design system
  - .storybook/main.ts and .storybook/preview.ts configuration
  - 5 CSF3 story files covering all CVA glass variants
  - pnpm storybook:build / pnpm storybook commands at root
affects: [future-design-work, qa-review, component-maintenance]

# Tech tracking
tech-stack:
  added:
    - storybook@8.6.18 (root devDependency)
    - '@storybook/react-vite@8.6.18' (root + apps/web devDependency)
    - '@storybook/addon-essentials@8.6.18'
    - '@storybook/react@8.6.18'
    - 'vite@5.4.21 (root, pinned — storybook builder-vite peer requires ^4 or ^5)'
  patterns:
    - Storybook viteFinal for @/* path alias resolution in monorepo
    - PostCSS/Tailwind wired via viteFinal.css.postcss pointing to apps/web/tailwind.config.ts
    - ESLint ignores .storybook/ directory (projectService incompatible with storybook config)
    - CSF3 satisfies Meta<typeof Component> pattern for type-safe stories
    - NextIntlClientProvider decorator for i18n-dependent components in Storybook

key-files:
  created:
    - .storybook/main.ts
    - .storybook/preview.ts
    - apps/web/components/ui/button.stories.tsx
    - apps/web/components/ui/card.stories.tsx
    - apps/web/components/ui/dialog.stories.tsx
    - apps/web/components/ui/badge.stories.tsx
    - apps/web/components/shared/data-table.stories.tsx
  modified:
    - package.json (root — storybook scripts + devDependencies)
    - apps/web/package.json (storybook scripts + devDependencies)
    - eslint.config.mjs (.storybook/ and storybook-static/ added to ignores)
    - pnpm-lock.yaml

key-decisions:
  - '@storybook/react-vite used instead of @storybook/nextjs — nextjs framework causes webpack5 tap() error with Next.js 15 bundled webpack (Cannot read properties of undefined (reading tap))'
  - 'Storybook installed at monorepo root — storybook/internal/preview/runtime resolution fails when storybook binary is only in apps/web and config-dir is at root'
  - 'vite pinned to ^5.4.0 — storybook builder-vite 8.x peer requires ^4 or ^5, vite 8 present in workspace would break build'
  - '.storybook/ excluded from ESLint projectService — typescript-eslint projectService requires files to be in a tsconfig; storybook config files are not part of any app tsconfig'
  - 'Dialog stories use open:true args — Storybook renders static snapshots, trigger-based Dialog would show nothing without user interaction'

patterns-established:
  - 'Storybook monorepo pattern: root .storybook/ config, stories glob ../apps/web/**/*.stories.@(ts|tsx)'
  - 'Tailwind in Storybook: viteFinal CSS PostCSS plugin with explicit tailwind.config.ts path'
  - 'next-intl in Storybook: NextIntlClientProvider decorator with inline mock messages object'

requirements-completed: [TEST-04]

# Metrics
duration: 20min
completed: 2026-03-18
---

# Phase 50 Plan 03: Storybook Component Catalog Summary

**Storybook 8 with Vite builder renders all 5 glass CVA components with Tailwind glassmorphism, DataTable wrapped in NextIntlClientProvider mock, builds in 11 seconds**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-18T21:13:56Z
- **Completed:** 2026-03-18T21:33:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Storybook 8 installed at monorepo root with `@storybook/react-vite` (Vite builder), bypassing the Next.js 15 webpack5 conflict
- `.storybook/main.ts` configures viteFinal with `@/*` alias resolution and Tailwind PostCSS pointing at apps/web/tailwind.config.ts
- `.storybook/preview.ts` imports globals.css (all CSS variables + glass utilities) and sets gradient background for glass preview
- 5 CSF3 story files: Button (12 stories), Card (5), Dialog (4), Badge (11), DataTable (5) — all using `satisfies Meta<>` for type safety
- `storybook build` succeeds in 11s with zero errors; all 5 story assets compiled in storybook-static/

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Storybook 8 and configure** - `25ec884` (chore)
2. **Task 2: Create component stories for all 5 required components** - `1b2bf6f` (feat)

**Plan metadata:** (to be added with SUMMARY commit)

## Files Created/Modified

- `.storybook/main.ts` - Storybook config: react-vite framework, stories glob, viteFinal alias + Tailwind PostCSS
- `.storybook/preview.ts` - globals.css import, gradient background parameters
- `apps/web/components/ui/button.stories.tsx` - 12 stories: all 8 CVA variants + 3 sizes + loading + disabled
- `apps/web/components/ui/card.stories.tsx` - 5 stories: default, glass, withHeader, glassWithHeader, fullComposition
- `apps/web/components/ui/dialog.stories.tsx` - 4 stories: default, withForm, glassOverlay, destructive (all open:true)
- `apps/web/components/ui/badge.stories.tsx` - 11 stories: all 10 CVA variants + allVariants combined
- `apps/web/components/shared/data-table.stories.tsx` - 5 stories with NextIntlClientProvider decorator, Czech mock translations
- `package.json` - Added storybook/storybook:build scripts + storybook devDependencies at root
- `apps/web/package.json` - Added storybook/storybook:build scripts + storybook devDependencies
- `eslint.config.mjs` - Added .storybook/** and storybook-static/** to ESLint ignores

## Decisions Made

- **@storybook/react-vite over @storybook/nextjs:** The nextjs framework uses Next.js's bundled webpack5 which throws `Cannot read properties of undefined (reading 'tap')` on shutdown. The Vite builder is a clean alternative for a component catalog that doesn't need SSR.
- **Storybook at monorepo root:** Installing only in apps/web meant storybook CLI couldn't resolve `storybook/internal/preview/runtime` from the root .storybook config. Placing storybook in root devDependencies fixes the resolution path.
- **vite pinned to ^5.4.0:** workspace already had vite 8 (from @vitejs/plugin-react); builder-vite 8.x peer requires ^4 or ^5. Forced vite@5 to satisfy the constraint.
- **Dialog stories use `open: true`:** Storybook renders a static frame; trigger-based open/close would show an empty canvas. Forcing open ensures the glass overlay is always visible for review.
- **ESLint: .storybook/ excluded:** `typescript-eslint` projectService mode requires every TS file to be referenced by a tsconfig. The .storybook/ files are standalone config, not part of any Next.js or root tsconfig. Exclusion is the correct fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Switched from @storybook/nextjs to @storybook/react-vite**

- **Found during:** Task 1 (Install Storybook 8 and configure)
- **Issue:** `@storybook/nextjs` with Next.js 15 throws webpack5 `tap()` error: `Cannot read properties of undefined (reading 'tap')`. The framework tries to tap into Next.js's bundled webpack, which is incompatible with Storybook's webpack5 builder hooks.
- **Fix:** Installed `@storybook/react-vite` + `vite@5` and updated `.storybook/main.ts` framework to `@storybook/react-vite`
- **Files modified:** `.storybook/main.ts`, `package.json`, `apps/web/package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm storybook:build` succeeds in 11s with zero errors
- **Committed in:** `25ec884` (Task 1 commit)

**2. [Rule 3 - Blocking] Moved storybook packages to monorepo root devDependencies**

- **Found during:** Task 1 verification
- **Issue:** When storybook CLI only existed in `apps/web/node_modules`, Rollup could not resolve `storybook/internal/preview/runtime` because the config dir (`.storybook/`) is at the repo root, not inside `apps/web/`
- **Fix:** Added storybook + @storybook/react-vite + addons to root `devDependencies` via `pnpm add -D -w`
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Verification:** `storybook build` from root resolves all storybook internal imports
- **Committed in:** `25ec884` (Task 1 commit)

**3. [Rule 3 - Blocking] Added .storybook/ to ESLint ignores**

- **Found during:** Task 1 commit (pre-commit hook)
- **Issue:** `eslint --fix` in lint-staged failed because `.storybook/main.ts` and `.storybook/preview.ts` were not part of any tsconfig `include`, causing `typescript-eslint` projectService to reject them with "was not found by the project service"
- **Fix:** Added `.storybook/**` and `storybook-static/**` to `ignores` array in `eslint.config.mjs`
- **Files modified:** `eslint.config.mjs`
- **Verification:** Commit passes pre-commit hook successfully
- **Committed in:** `25ec884` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for build and commit success. Vite builder is a superior approach for this use case (no SSR needed in component catalog). No scope creep.

## Issues Encountered

- `@storybook/nextjs` is incompatible with Next.js 15's bundled webpack — documented as key decision, Vite builder used instead
- `use client` directive warnings in Vite build output — these are informational warnings from radix-ui/next-intl packages, not errors; Vite correctly processes client-only components in browser context

## User Setup Required

None - no external service configuration required. `pnpm storybook` at repo root starts the dev server on port 6006.

## Next Phase Readiness

- Storybook catalog ready for TEST-04 requirement verification
- All 5 glass components visually documented with CVA variant stories
- DataTable story demonstrates next-intl integration pattern usable for future components

---

_Phase: 50-testing-hardening_
_Completed: 2026-03-18_
