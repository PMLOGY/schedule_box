---
phase: 11-ai-optimization
plan: 04
subsystem: api
tags: [next.js, api-routes, zod, circuit-breaker, rbac, ai-optimization]

# Dependency graph
requires:
  - phase: 11-01
    provides: Python AI optimization endpoints (upselling, pricing, capacity, reminder-timing)
  - phase: 11-02
    provides: Circuit breaker client functions and fallback functions for optimization
  - phase: 10-04
    provides: createRouteHandler pattern for AI API routes
provides:
  - 4 Next.js API routes under /api/v1/ai/optimization/
  - Zod validation schemas for all optimization request types
  - Authenticated, tenant-isolated optimization API surface
affects: [11-05, frontend-ai-dashboard, frontend-booking-wizard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Advisory 200 fallback: optimization routes return 200 with fallback (not 503)'
    - 'Shared Zod schemas imported from @schedulebox/shared'

key-files:
  created:
    - apps/web/app/api/v1/ai/optimization/upselling/route.ts
    - apps/web/app/api/v1/ai/optimization/pricing/route.ts
    - apps/web/app/api/v1/ai/optimization/capacity/route.ts
    - apps/web/app/api/v1/ai/optimization/reminder-timing/route.ts
    - packages/shared/src/schemas/ai-optimization.ts
  modified:
    - packages/shared/src/schemas/index.ts

key-decisions:
  - 'Optimization routes return 200 on AI failure (advisory, never blocking)'
  - 'RBAC mapped to existing permissions: BOOKINGS_READ, SERVICES_UPDATE, SETTINGS_MANAGE'
  - 'Schemas in @schedulebox/shared for cross-package reuse'

patterns-established:
  - 'Advisory AI routes: return successResponse(fallback) not 503'
  - 'DynamicPricing refine validation for cross-field constraints'

# Metrics
duration: 155s
completed: 2026-02-11
---

# Phase 11 Plan 04: Optimization API Routes Summary

**4 authenticated Next.js API routes for AI optimization with Zod validation, RBAC, circuit breaker fallback returning 200**

## Performance

- **Duration:** 155s (~2.5 min)
- **Started:** 2026-02-11T23:19:50Z
- **Completed:** 2026-02-11T23:22:25Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created Zod validation schemas for all 4 optimization endpoints with cross-field refinement on dynamic pricing
- Created 4 authenticated API routes with RBAC permissions and circuit breaker integration
- All optimization routes return 200 with fallback values when AI is unavailable (advisory pattern)
- Schemas exported from @schedulebox/shared for cross-package reuse

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zod validation schemas for optimization endpoints** - `6125df1` (feat)
2. **Task 2: Create Next.js API routes for all 4 optimization endpoints** - `bc72d61` (feat)

## Files Created/Modified

- `packages/shared/src/schemas/ai-optimization.ts` - Zod schemas for upselling, pricing, capacity, reminder-timing
- `packages/shared/src/schemas/index.ts` - Re-exports ai-optimization schemas
- `apps/web/app/api/v1/ai/optimization/upselling/route.ts` - POST endpoint with bookings.read permission
- `apps/web/app/api/v1/ai/optimization/pricing/route.ts` - POST endpoint with services.update permission
- `apps/web/app/api/v1/ai/optimization/capacity/route.ts` - POST endpoint with settings.manage permission
- `apps/web/app/api/v1/ai/optimization/reminder-timing/route.ts` - POST endpoint with settings.manage permission

## Decisions Made

- **Optimization routes return 200 on AI failure** (not 503 like prediction routes): optimization is advisory and should never block user actions (booking, pricing, etc.)
- **RBAC permission mapping**: Plan specified `bookings.read`, `services.write`, `settings.read` but RBAC system uses `BOOKINGS_READ` (bookings.read), `SERVICES_UPDATE` (services.update), and `SETTINGS_MANAGE` (settings.manage). Mapped to closest existing permissions (Rule 1 auto-fix).
- **Schemas in shared package**: Plan specified shared schemas for cross-package reuse, following existing Phase 5+ pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RBAC permission mapping to existing constants**

- **Found during:** Task 2 (API route creation)
- **Issue:** Plan specified `services.write` and `settings.read` permissions, but these do not exist in the RBAC system. Only `services.update` and `settings.manage` exist.
- **Fix:** Mapped to `PERMISSIONS.SERVICES_UPDATE` for pricing and `PERMISSIONS.SETTINGS_MANAGE` for capacity/reminder-timing. Same approach used in Phase 10-04.
- **Files modified:** All 4 route files
- **Verification:** grep confirms correct PERMISSIONS constants used
- **Committed in:** bc72d61 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential correction for RBAC correctness. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 optimization API routes ready for frontend integration
- Circuit breaker + fallback pattern ensures frontend gets 200 responses even when AI service is down
- Zod schemas available in @schedulebox/shared for frontend form validation

## Self-Check: PASSED

- [x] packages/shared/src/schemas/ai-optimization.ts - FOUND
- [x] apps/web/app/api/v1/ai/optimization/upselling/route.ts - FOUND
- [x] apps/web/app/api/v1/ai/optimization/pricing/route.ts - FOUND
- [x] apps/web/app/api/v1/ai/optimization/capacity/route.ts - FOUND
- [x] apps/web/app/api/v1/ai/optimization/reminder-timing/route.ts - FOUND
- [x] Commit 6125df1 - FOUND
- [x] Commit bc72d61 - FOUND

---

_Phase: 11-ai-optimization_
_Completed: 2026-02-11_
