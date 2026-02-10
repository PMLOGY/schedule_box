---
phase: 03-auth-core-services
plan: 03
subsystem: backend
tags: [jwt, rbac, middleware, zod, validation, route-handler, tenant-scope]

# Dependency graph
requires:
  - phase: 03-01
    provides: Error classes, response utilities, handleRouteError
  - phase: 03-02
    provides: JWT verification, JWTPayload type, validateBody/Params/Query
provides:
  - createRouteHandler factory (composable pattern for all API endpoints)
  - authenticateRequest middleware (JWT from Bearer header)
  - checkPermissions RBAC middleware (23 permissions)
  - findCompanyId tenant-scope helper (user UUID to company ID)
  - 10 Zod schemas for auth endpoints with inferred types
affects: [03-04, 03-05, all-crud-endpoints, all-wave-3-plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Route handler factory with composable auth/RBAC/validation/error handling'
    - 'PERMISSIONS constant defining all 23 system permissions'
    - 'Tenant-scope resolution via findCompanyId for multi-tenancy'
    - 'Password complexity regex: min 12 chars + uppercase + lowercase + number + special'

key-files:
  created:
    - apps/web/lib/middleware/auth.ts
    - apps/web/lib/middleware/rbac.ts
    - apps/web/lib/middleware/route-handler.ts
    - apps/web/lib/db/tenant-scope.ts
    - apps/web/validations/auth.ts
  modified: []

key-decisions:
  - 'createRouteHandler is THE single pattern for all protected endpoints'
  - 'Next.js 14 App Router params are Promise<Record<string, string>>'
  - 'Password complexity enforced at validation layer via Zod regex'
  - 'findCompanyId throws UnauthorizedError if user has no company'

patterns-established:
  - 'Pattern 1: Route handlers use createRouteHandler({ bodySchema, requiredPermissions, handler })'
  - 'Pattern 2: RBAC checks reference PERMISSIONS constant for type safety'
  - 'Pattern 3: Tenant-scoped queries call findCompanyId(user.sub) first'
  - 'Pattern 4: Auth validation schemas use passwordSchema helper for consistency'

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 03 Plan 03: Auth Middleware & Validation Summary

**Route handler factory with composable auth/RBAC/validation, 23-permission RBAC system, and 10 Zod schemas for auth endpoints**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T20:01:13Z
- **Completed:** 2026-02-10T20:04:53Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- createRouteHandler factory composing auth, RBAC, validation, and error handling for all API endpoints
- RBAC middleware with all 23 system permissions matching documentation
- Tenant-scope helper resolving user UUID to company internal ID for multi-tenant queries
- 10 Zod validation schemas for auth endpoints with password complexity enforcement

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth middleware, RBAC middleware, route handler factory, tenant-scope helper** - `5ce693c` (feat)
   - apps/web/lib/middleware/auth.ts
   - apps/web/lib/middleware/rbac.ts
   - apps/web/lib/middleware/route-handler.ts
   - apps/web/lib/db/tenant-scope.ts

2. **Task 2: Zod validation schemas for auth endpoints** - `6bb13e4` (feat)
   - apps/web/validations/auth.ts

## Files Created/Modified

- `apps/web/lib/middleware/auth.ts` - Extracts and verifies JWT from Authorization Bearer header
- `apps/web/lib/middleware/rbac.ts` - PERMISSIONS constant with 23 entries, checkPermissions function
- `apps/web/lib/middleware/route-handler.ts` - createRouteHandler factory composing auth, RBAC, validation, error handling
- `apps/web/lib/db/tenant-scope.ts` - findCompanyId resolves user UUID to company internal ID and UUID
- `apps/web/validations/auth.ts` - 10 Zod schemas (register, login, refresh, forgot/reset password, verify email, change password, MFA setup/verify, user update)

## Decisions Made

**createRouteHandler as universal pattern**
- Decided this is THE single composable pattern for all protected API endpoints
- Chains: try/catch → auth → RBAC → validation → handler
- Simplifies endpoint creation and ensures consistent security checks

**Next.js 14 App Router params handling**
- Params are now `Promise<Record<string, string>>` in route handlers
- createRouteHandler awaits params before validation
- Fixed TypeScript strict mode error by specifying Record type

**Password complexity at validation layer**
- Enforced via Zod regex: min 12 chars + uppercase + lowercase + number + special char
- Reusable passwordSchema helper prevents duplication across auth schemas
- Matches documentation section 24.1 requirements

**Tenant-scope error handling**
- findCompanyId throws UnauthorizedError if user has no associated company
- Ensures all CRUD operations have valid company context
- Prevents orphaned users from accessing system

## Deviations from Plan

**1. [Rule 3 - Blocking] Fixed TypeScript ESLint no-explicit-any error**

- **Found during:** Task 1 (createRouteHandler implementation)
- **Issue:** `params: Promise<any>` triggered ESLint error in strict mode
- **Fix:** Changed to `Promise<Record<string, string>>` for Next.js 14 App Router params
- **Files modified:** apps/web/lib/middleware/route-handler.ts
- **Verification:** `pnpm tsc --noEmit` passes, pre-commit hook passes
- **Committed in:** 5ce693c (Task 1 commit after pre-commit hook failure)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** TypeScript strict compliance required for pre-commit hook. No scope creep.

## Issues Encountered

**Pre-commit hook rejection on `any` type**
- Pre-commit hook rejected initial commit due to ESLint @typescript-eslint/no-explicit-any
- Fixed by typing params as `Record<string, string>` matching Next.js 14 route params structure
- Aligns with Next.js App Router TypeScript expectations

**Commitlint body line length limit**
- Initial Task 2 commit message had line exceeding 100 chars
- Wrapped commit message body lines to comply with conventional commits spec
- No functional impact

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Wave 3 (Auth Endpoints):**
- createRouteHandler factory ready for use in all endpoint implementations
- Validation schemas defined for all auth endpoints
- RBAC permissions mapped for authorization checks
- Tenant-scope helper ready for multi-tenant query isolation

**Wave 3 endpoints (Plans 03-04, 03-05) can now:**
- Use createRouteHandler for composable endpoint structure
- Import auth schemas for request validation
- Reference PERMISSIONS for RBAC checks
- Call findCompanyId for tenant-scoped queries

## Self-Check: PASSED

All claimed files verified:
- FOUND: apps/web/lib/middleware/auth.ts
- FOUND: apps/web/lib/middleware/rbac.ts
- FOUND: apps/web/lib/middleware/route-handler.ts
- FOUND: apps/web/lib/db/tenant-scope.ts
- FOUND: apps/web/validations/auth.ts

All claimed commits verified:
- FOUND: 5ce693c
- FOUND: 6bb13e4

---

_Phase: 03-auth-core-services_
_Completed: 2026-02-10_
