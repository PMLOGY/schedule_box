---
phase: 30-multi-location-organizations
plan: 04
subsystem: frontend
tags: [react, next.js, multi-location, organization, location-switcher, dashboard, shadcn-ui, tanstack-query, zustand, i18n]

# Dependency graph
requires:
  - phase: 30-02
    provides: POST /api/v1/auth/switch-location endpoint for JWT context switching
  - phase: 30-03
    provides: Organization CRUD API (orgs, locations, members endpoints)
provides:
  - LocationSwitcher dropdown component in dashboard header for switching between locations
  - Organization overview page with location cards and create-org CTA
  - Organization settings page with location CRUD (add/edit/deactivate) and member management (add/remove)
  - Organization nav item in sidebar navigation for owners
  - switchLocation action in auth store for JWT token update on location switch
  - Organization translations for cs/en/sk locales
affects: [30-05 advanced-org-features, frontend-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [location switcher with React Query org fetch and auth store integration, full-page reload after location switch for clean TanStack Query cache, DELETE-with-body via direct fetch for member removal]

key-files:
  created:
    - apps/web/components/layout/location-switcher.tsx
    - apps/web/app/[locale]/(dashboard)/organization/page.tsx
    - apps/web/app/[locale]/(dashboard)/organization/settings/page.tsx
  modified:
    - apps/web/stores/auth.store.ts
    - apps/web/components/layout/header.tsx
    - apps/web/lib/navigation.ts
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json

key-decisions:
  - 'Full page reload after location switch (window.location.reload) instead of selective TanStack Query invalidation for clean company-scoped cache reset'
  - 'LocationSwitcher renders null when org has 0-1 locations (switcher only useful with multiple locations)'
  - 'Organization nav item placed before Settings in sidebar, visible only to owners'
  - 'DELETE member uses direct fetch() instead of apiClient.delete because the endpoint requires a request body which standard DELETE helpers do not support'
  - 'common.actions translation key added to all locales for reuse across table headers'

patterns-established:
  - 'Organization query pattern: useQuery with key ["organization"] and 5-min staleTime for org data that rarely changes'
  - 'Location switcher visibility: component self-hides when user has no org or single location'
  - 'Confirmation dialog pattern: separate Dialog state + selected entity state for destructive actions'

# Metrics
duration: 7min
completed: 2026-02-24
---

# Phase 30 Plan 04: Organization UI & Location Switcher Summary

**Location switcher dropdown in dashboard header with full organization settings page for location CRUD and member management across cs/en/sk locales**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-24T21:27:04Z
- **Completed:** 2026-02-24T21:34:54Z
- **Tasks:** 2 auto-completed, 1 checkpoint pending
- **Files modified:** 9

## Accomplishments

- Built LocationSwitcher dropdown component that fetches user's organization, displays all locations with active/inactive status, and switches JWT context via auth store
- Created organization overview page with stats cards (locations, members, usage) and clickable location cards for quick switching
- Created organization settings page with full location management (add with slug/email/phone/address, edit details, soft-deactivate with confirmation) and member management (add with role/location selection, remove with confirmation)
- Added Organization nav item to sidebar navigation visible to owners
- Added switchLocation action to Zustand auth store with null-safe user check
- Added comprehensive i18n translations for organization UI across Czech, English, and Slovak locales

## Task Commits

Each task was committed atomically:

1. **Task 1: Location switcher component and auth store updates** - `d9d4fd5` (feat)
2. **Task 2: Organization settings page with location and member management** - `463960c` (feat)
3. **Task 3: Visual verification** - checkpoint (human-verify, pending)

## Files Created/Modified

- `apps/web/components/layout/location-switcher.tsx` - LocationSwitcher dropdown with React Query org fetch, location list, and switch-location action
- `apps/web/app/[locale]/(dashboard)/organization/page.tsx` - Organization overview page with location cards, stats, create-org dialog
- `apps/web/app/[locale]/(dashboard)/organization/settings/page.tsx` - Full settings page with location CRUD table and member management table
- `apps/web/stores/auth.store.ts` - Added organizationId to User, SwitchLocationResponse type, switchLocation action
- `apps/web/components/layout/header.tsx` - Integrated LocationSwitcher between Breadcrumbs and right-side controls
- `apps/web/lib/navigation.ts` - Added Building2 icon import and organization nav item for owners
- `apps/web/messages/en.json` - Added organization nav key and full organization translation section + common.actions
- `apps/web/messages/cs.json` - Czech translations for organization section + common.actions
- `apps/web/messages/sk.json` - Slovak translations for organization section + common.actions

## Decisions Made

- **Full page reload after switch:** Using `window.location.reload()` after location switch rather than selective TanStack Query invalidation. The entire dashboard cache is company-scoped, so a full reload is cleaner and simpler than tracking which queries to invalidate.
- **Switcher visibility threshold:** LocationSwitcher returns null when user has no org or only one location. There's no point showing a switcher with one option.
- **DELETE-with-body workaround:** The member removal endpoint (DELETE /organizations/:id/members) requires a body with user_uuid. Since `apiClient.delete()` does not support bodies, used direct `fetch()` with DELETE method and JSON body.
- **common.actions key:** Added "Actions" translation to the common section in all 3 locales so table headers can use `tCommon('actions')` consistently.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ESLint non-null assertion in auth store**

- **Found during:** Task 1 (switchLocation implementation)
- **Issue:** `get().user!` (non-null assertion) triggers `@typescript-eslint/no-non-null-assertion` ESLint rule
- **Fix:** Added null check `const currentUser = get().user; if (!currentUser) return;` before accessing user properties
- **Files modified:** apps/web/stores/auth.store.ts
- **Verification:** ESLint passes, commit succeeds
- **Committed in:** d9d4fd5 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added common.actions translation key**

- **Found during:** Task 2 (settings page table headers)
- **Issue:** Organization settings page needs `tCommon('actions')` for table action column headers, but this key did not exist in the common translations section
- **Fix:** Added `"actions": "Actions"` / `"Akce"` / `"Akcie"` to common section in en/cs/sk locale files
- **Files modified:** apps/web/messages/en.json, cs.json, sk.json
- **Verification:** TypeScript compiles, no missing translation warnings
- **Committed in:** 463960c (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- **Lint-staged stash with pre-existing changes:** The working tree had uncommitted changes from Phase 29 (query-client.ts mutation cache). Lint-staged handled stash/restore correctly, and the pre-existing changes were included in Task 1 commit via lint-staged's stash mechanism. This is a known lint-staged behavior.

## User Setup Required

None - no external service configuration required. All components use existing auth middleware and API routes.

## Next Phase Readiness

- Location switcher and organization pages ready for visual verification (Task 3 checkpoint)
- All organization CRUD operations integrated with Plan 03 API routes
- Organization nav item visible to owners in sidebar
- i18n complete for all 3 supported locales

## Self-Check: PASSED

- All 3 created files verified on disk (location-switcher.tsx, organization/page.tsx, organization/settings/page.tsx)
- All 3 modified files verified on disk (auth.store.ts, header.tsx, navigation.ts)
- Task 1 commit (d9d4fd5) found in git log
- Task 2 commit (463960c) found in git log
- TypeScript compiles cleanly for apps/web

---

_Phase: 30-multi-location-organizations_
_Completed: 2026-02-24 (pending checkpoint)_
