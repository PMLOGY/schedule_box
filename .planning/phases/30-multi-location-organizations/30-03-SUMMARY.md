---
phase: 30-multi-location-organizations
plan: 03
subsystem: backend
tags: [api, organizations, multi-location, crud, drizzle, rbac]

# Dependency graph
requires:
  - phase: 30-01
    provides: organizations and organization_members tables, shared TypeScript types
  - phase: 01-foundation
    provides: companies and users tables, auth middleware, route handler pattern
provides:
  - GET/POST /api/v1/organizations (list user org, create with plan gating)
  - GET/PUT /api/v1/organizations/[id] (detail view, update name)
  - GET/POST /api/v1/organizations/[id]/locations (list, add with plan limit)
  - PUT/DELETE /api/v1/organizations/[id]/locations/[locationId] (edit, soft-deactivate)
  - GET/POST/DELETE /api/v1/organizations/[id]/members (list, add, remove)
  - PaymentRequiredError (402) class in shared package
affects: [30-04 org-dashboard-ui, 30-05 org-settings-page]

# Tech tracking
tech-stack:
  added: [nanoid (slug generation)]
  patterns: [org membership verification pattern, franchise_owner role gating, soft-deactivation for data preservation]

key-files:
  created:
    - apps/web/app/api/v1/organizations/route.ts
    - apps/web/app/api/v1/organizations/[id]/route.ts
    - apps/web/app/api/v1/organizations/[id]/locations/route.ts
    - apps/web/app/api/v1/organizations/[id]/locations/[locationId]/route.ts
    - apps/web/app/api/v1/organizations/[id]/members/route.ts
  modified:
    - packages/shared/src/errors/app-error.ts
    - packages/shared/src/errors/index.ts
    - apps/web/validations/organization.ts

key-decisions:
  - 'PaymentRequiredError (402) added to shared errors for subscription plan enforcement across org and location creation'
  - 'Subscription plan gating: free/essential cannot create orgs, growth=3 locations max, ai_powered=10 locations max'
  - 'Slug uniqueness for locations enforced globally across all companies (not just within org)'
  - 'DELETE on locations sets isActive=false (soft-deactivate) preserving all historical data'
  - 'Organization member removal prevents removing the org owner (ownerUserId check)'

patterns-established:
  - 'Org membership verification: getUserInternalId + getOrgAndVerifyMembership helper pair for all org-scoped endpoints'
  - 'Franchise owner gating: membership.role check after org verification for write operations'
  - 'Soft-deactivation: DELETE endpoint sets isActive=false rather than removing records'

# Metrics
duration: 8min
completed: 2026-02-24
---

# Phase 30 Plan 03: Organization CRUD API Summary

**Full organization lifecycle API: create org with plan gating, CRUD locations with limit enforcement, and member management with franchise_owner role authorization**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-24T21:14:48Z
- **Completed:** 2026-02-24T21:23:14Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Built 5 API route files covering complete organization management lifecycle
- Subscription plan gating enforces multi-location access (Growth/AI-Powered only) and location count limits
- Franchise owner role authorization on all write operations (create location, manage members)
- Soft-deactivation for locations preserves all historical bookings, customers, and payment data
- Member management with location_manager scoping to specific companies

## Task Commits

Each task was committed atomically:

1. **Task 1: Create organization and list endpoints** - `9724b94` (feat)
2. **Task 2: Location CRUD endpoints (add, edit, deactivate)** - `1436bf4` (feat)
3. **Task 3: Organization member management endpoint** - `3a1b889` (feat)

## Files Created/Modified

- `apps/web/app/api/v1/organizations/route.ts` - GET (list user org) + POST (create org with plan gating)
- `apps/web/app/api/v1/organizations/[id]/route.ts` - GET (org detail with locations) + PUT (update name)
- `apps/web/app/api/v1/organizations/[id]/locations/route.ts` - GET (list locations) + POST (add with limit check)
- `apps/web/app/api/v1/organizations/[id]/locations/[locationId]/route.ts` - PUT (update) + DELETE (soft-deactivate)
- `apps/web/app/api/v1/organizations/[id]/members/route.ts` - GET (list) + POST (add) + DELETE (remove)
- `packages/shared/src/errors/app-error.ts` - Added PaymentRequiredError (402) class
- `packages/shared/src/errors/index.ts` - Added PAYMENT_REQUIRED to ERROR_CODES

## Decisions Made

- **PaymentRequiredError for plan enforcement:** Created a new 402 error class rather than reusing ForbiddenError (403) because subscription plan limitations are billing-related, not authorization-related. This gives frontend clear signal to show upgrade UI.
- **Global slug uniqueness:** Location slugs are checked globally across all companies (not just within the org) because slugs are used in public-facing URLs and must be unique system-wide.
- **Soft-deactivation pattern:** DELETE on locations sets `isActive=false` instead of deleting records. This preserves historical bookings, customer data, and payment records per business requirements.
- **Owner removal prevention:** DELETE members endpoint checks against `org.ownerUserId` to prevent franchise owners from accidentally removing themselves.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added PaymentRequiredError to shared package**

- **Found during:** Task 1 (Create organization endpoint)
- **Issue:** Plan referenced PaymentRequiredError but it didn't exist in the shared errors package
- **Fix:** Added PaymentRequiredError class (402 status) to app-error.ts and PAYMENT_REQUIRED to ERROR_CODES
- **Files modified:** packages/shared/src/errors/app-error.ts, packages/shared/src/errors/index.ts
- **Verification:** TypeScript compiles, import works in route files
- **Committed in:** 9724b94 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed slug conflict error type**

- **Found during:** Task 2 (Location creation endpoint)
- **Issue:** Initially used PaymentRequiredError (402) for duplicate slug conflict; should be ConflictError (409) since it's a resource conflict, not a billing issue
- **Fix:** Changed to ConflictError for slug uniqueness violation
- **Files modified:** apps/web/app/api/v1/organizations/[id]/locations/route.ts
- **Verification:** Correct HTTP status code (409) for duplicate slug
- **Committed in:** 1436bf4 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- **Commit scope validation:** Initial commit attempts used `30-03` scope which is not in the commitlint allowed list. Resolved by using `backend` scope for API route commits.
- **Lint-staged stash conflict:** First commit attempt passed lint but failed commitlint, causing a stash conflict that required cleanup. Resolved by re-staging and committing with correct scope.

## User Setup Required

None - no external service configuration required. All endpoints use existing auth middleware and database.

## Next Phase Readiness

- Organization CRUD API complete and ready for frontend integration (Plan 04 org settings page)
- All endpoints follow existing route handler pattern with auth, RBAC, and validation
- PaymentRequiredError available for other subscription-gated features

## Self-Check: PASSED

- All 5 created route files verified on disk
- All 2 modified shared error files verified on disk
- All 3 task commits (9724b94, 1436bf4, 3a1b889) found in git log
- TypeScript compiles cleanly for apps/web

---

_Phase: 30-multi-location-organizations_
_Completed: 2026-02-24_
