---
phase: 39-auth-session
plan: 01
subsystem: auth
tags: [zustand, jwt, cookies, session, hydration, refresh-token]

# Dependency graph
requires:
  - phase: 37-auth-polish
    provides: Auth store foundation (Zustand persist), use-auth hook, login/logout flow
provides:
  - Zustand hydration guard (_hasHydrated) preventing false logout on page reload
  - Background token refresh interval (12 min) that auto-resumes after page reload
  - Admin/customer user token refresh support (companyId null no longer blocked)
  - Consistent cookie path (/api/v1/auth) between login and refresh endpoints
  - API client refresh works for all roles including admin
affects: [40-booking-flow, 41-portal, 42-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand onRehydrateStorage: set _hasHydrated flag, resume background refresh"
    - "Module-level setInterval (not in state) for background token refresh"
    - "useAuth waits for _hasHydrated before any redirect — prevents flash-to-login"
    - "companyId ?? 0 pattern for admin/customer users in generateTokenPair"

key-files:
  created: []
  modified:
    - apps/web/stores/auth.store.ts
    - apps/web/hooks/use-auth.ts
    - apps/web/app/api/v1/auth/login/route.ts
    - apps/web/lib/auth/jwt.ts
    - apps/web/lib/api-client.ts

key-decisions:
  - "Store background refresh interval ID at module level (not in Zustand state) to avoid serialization issues"
  - "Cookie path set to /api/v1/auth (not /api/v1/auth/refresh) so cookie reaches all auth sub-endpoints"
  - "Remove companyId null guard in rotateRefreshToken — admin and customer users have null companyId by design"
  - "Remove isAdminUser skip in api-client.ts now that jwt.ts admin refresh is fixed"

patterns-established:
  - "Hydration pattern: _hasHydrated flag + onRehydrateStorage callback for SSR-safe auth guards"
  - "Background refresh: module-level setInterval, started on login and resumed on rehydration"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 39 Plan 01: Auth Session Summary

**Zustand hydration guard + 12-min background refresh + admin token fix eliminate false logouts and post-15min 401 errors for all user roles**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-13T13:39:22Z
- **Completed:** 2026-03-13T13:42:24Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Auth store tracks hydration state via `_hasHydrated` — `useAuth` hook no longer redirects to `/login` during page reload before Zustand rehydrates from localStorage
- Background refresh interval fires every 12 minutes when authenticated; resumes automatically after page reload via `onRehydrateStorage`
- Admin and customer users (companyId null) can now refresh tokens — removed the `!user.companyId` guard that was blocking them
- Cookie path aligned to `/api/v1/auth` on both login and refresh endpoints — refresh token cookie now reaches the refresh endpoint correctly
- Authenticated users landing on public routes (login/register) are redirected to their role home

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix auth store hydration + add background token refresh** - `deb5665` (feat)
2. **Task 2: Fix cookie path mismatch, admin refresh, and API client refresh race** - `855229a` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/stores/auth.store.ts` - Added `_hasHydrated`, `setHasHydrated`, `startBackgroundRefresh`, `stopBackgroundRefresh`; `onRehydrateStorage` marks hydration and resumes interval; login/logout integrated with refresh lifecycle
- `apps/web/hooks/use-auth.ts` - Added `_hasHydrated` guard; useEffect returns early until hydrated; authenticated users on public routes redirect to role home
- `apps/web/app/api/v1/auth/login/route.ts` - Cookie path changed from `/api/v1/auth/refresh` to `/api/v1/auth`
- `apps/web/lib/auth/jwt.ts` - `rotateRefreshToken`: removed `!user.companyId` guard, added `companyId ?? 0` (same as generateTokenPair callers)
- `apps/web/lib/api-client.ts` - Removed `isAdminUser` guard that skipped refresh for admin users; refresh lock (`isRefreshing`/`refreshPromise`) now resets in catch block

## Decisions Made
- Module-level `backgroundRefreshIntervalId` variable (not in Zustand state) avoids serialization issues and persists across hot reloads in development
- Cookie path `/api/v1/auth` covers all auth sub-routes including `/api/v1/auth/refresh`, `/api/v1/auth/logout`, and `/api/v1/auth/switch-location`
- `_hasHydrated` is not persisted (not in `partialize`) — it starts false on every page load and is set true by `onRehydrateStorage`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth session is now production-stable: browser refresh preserves session, 12-min background renewal prevents token expiry mid-session, all four roles (admin, owner/manager/employee, customer) can refresh tokens
- Ready to proceed to Phase 39 Plan 02 (next auth session plan) or Phase 40 (booking flow)

## Self-Check: PASSED

- FOUND: apps/web/stores/auth.store.ts
- FOUND: apps/web/hooks/use-auth.ts
- FOUND: apps/web/lib/auth/jwt.ts
- FOUND: apps/web/lib/api-client.ts
- FOUND: apps/web/app/api/v1/auth/login/route.ts
- FOUND: .planning/phases/39-auth-session/39-01-SUMMARY.md
- FOUND commit: deb5665 (Task 1)
- FOUND commit: 855229a (Task 2)
- FOUND commit: d412a0d (metadata)

---
*Phase: 39-auth-session*
*Completed: 2026-03-13*
