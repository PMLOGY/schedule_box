---
phase: 43-admin-platform
plan: 01
subsystem: api, ui
tags: [admin, companies, toggle, login, drizzle, react-query, tanstack-query, i18n]

# Dependency graph
requires:
  - phase: 43-admin-platform
    provides: Admin platform scaffold (pages, sidebar, hooks, stats API)
provides:
  - PUT /api/v1/admin/companies — toggle company isActive by UUID
  - Login blocks users from deactivated companies with 401
  - Companies table with Activate/Deactivate button per row
  - useToggleCompanyActive mutation hook
  - Translation keys for company toggle in en/cs/sk
affects: [auth, admin-companies, login-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin PUT toggle: createRouteHandler + bodySchema with z.object({uuid, is_active})"
    - "Mutation hook pattern: mutationFn + onSuccess invalidateQueries for related query keys"
    - "Company deactivation gate in login: check companyIsActive after userIsActive check"

key-files:
  created: []
  modified:
    - apps/web/app/api/v1/admin/companies/route.ts
    - apps/web/app/api/v1/auth/login/route.ts
    - apps/web/hooks/use-admin-queries.ts
    - "apps/web/app/[locale]/(admin)/admin/companies/page.tsx"
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json

key-decisions:
  - "Company deactivation check in login uses companyIsActive === false (not !companyIsActive) to safely handle NULL from LEFT JOIN for admin users"
  - "Admin role bypass: check is gated on userRecord.companyId AND roleName !== 'admin' — admins have no company so they are never blocked"
  - "useToggleCompanyActive invalidates both ['admin','companies'] and ['admin','stats'] since company activation state affects platform stats KPIs"

patterns-established:
  - "PUT admin toggle pattern: PUT handler follows identical shape to users PUT (schema + createRouteHandler + admin check + find-by-UUID + update + successResponse)"
  - "Company toggle UI mirrors users toggle UI: handleToggleActive with try/catch, mutateAsync, toast success/error"

requirements-completed: [ADMIN-01, ADMIN-02, ADMIN-03]

# Metrics
duration: 10min
completed: 2026-03-13
---

# Phase 43 Plan 01: Admin Platform Wire-Up Summary

**Company activate/deactivate via PUT /api/v1/admin/companies, login gate blocking deactivated company users, and companies table toggle button with i18n across en/cs/sk**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-13T14:26:03Z
- **Completed:** 2026-03-13T14:36:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added PUT /api/v1/admin/companies handler to activate/deactivate companies by UUID (identical pattern to users PUT)
- Added `companyIsActive` field to login query and added check that blocks owner/employee login for deactivated companies
- Added `useToggleCompanyActive` hook that invalidates both companies and stats queries on success
- Updated companies page with Actions column, Activate/Deactivate button, colSpan 9
- Added 5 translation keys (activate/deactivate/activated/deactivated/toggleError) to en, cs, and sk locale files

## Task Commits

Each task was committed atomically:

1. **Task 1: Add company toggle API + enforce deactivated company login block** - `c48eed7` (feat)
2. **Task 2: Add company toggle UI + translations + hook** - included in `92e97cd` (lint-staged applied prettier during commit, merged with pre-existing commit)

## Files Created/Modified
- `apps/web/app/api/v1/admin/companies/route.ts` - Added PUT handler with z validation, admin check, find-by-UUID, update isActive
- `apps/web/app/api/v1/auth/login/route.ts` - Added companyIsActive to SELECT, added deactivated company login block
- `apps/web/hooks/use-admin-queries.ts` - Added useToggleCompanyActive mutation hook
- `apps/web/app/[locale]/(admin)/admin/companies/page.tsx` - Added toggle button, Actions column, handleToggleActive, colSpan 9
- `apps/web/messages/en.json` - Added activate/deactivate/activated/deactivated/toggleError keys
- `apps/web/messages/cs.json` - Added Czech translations for company toggle
- `apps/web/messages/sk.json` - Added Slovak translations for company toggle

## Decisions Made
- Company deactivation check uses `companyIsActive === false` (strict comparison) so NULL from LEFT JOIN (admin users) never triggers the block
- Admin role explicitly excluded from check: `roleName !== 'admin'` (they have no company but belt-and-suspenders)
- `useToggleCompanyActive` also invalidates `['admin','stats']` to keep KPI dashboard fresh after company state changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `bookings` import in companies route**
- **Found during:** Task 1 (ESLint pre-commit hook)
- **Issue:** Original companies GET imported `bookings` from @schedulebox/database but only used correlated SQL subqueries, making the import unused
- **Fix:** Removed `bookings` from import destructuring
- **Files modified:** apps/web/app/api/v1/admin/companies/route.ts
- **Verification:** ESLint passed on second commit attempt
- **Committed in:** c48eed7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 unused import bug)
**Impact on plan:** Minor cleanup required by ESLint. No scope creep.

## Issues Encountered
- lint-staged stash backup failure on second commit: lint-staged processed files correctly (prettier ran, ESLint passed) but the stash cleanup step failed with "automatic backup missing". Files were correctly included in git history via a pre-existing commit (92e97cd). All changes confirmed present in HEAD.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Admin platform fully functional: live stats, company toggle with login enforcement, user management
- Requirements ADMIN-01, ADMIN-02, ADMIN-03 complete
- Phase 43 plan 02 can proceed (if any further admin plans exist)

---
*Phase: 43-admin-platform*
*Completed: 2026-03-13*
