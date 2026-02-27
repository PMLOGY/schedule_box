---
phase: 29-usage-limits
plan: 01
subsystem: api
tags: [redis, usage-limits, subscription, drizzle, atomic-counter]

# Dependency graph
requires:
  - phase: 28-subscription-billing
    provides: PLAN_CONFIG with tier limits, SubscriptionPlan type, companies.subscriptionPlan column
provides:
  - usage-service.ts with incrementBookingCounter, getBookingCount, getEmployeeCount, getServiceCount, checkBookingLimit, checkEmployeeLimit, checkServiceLimit, getUsageSummary
  - plan-limits.ts with getLimitsForPlan helper and PlanLimits interface
  - GET /api/v1/usage endpoint returning usage summary
affects: [29-02-limit-enforcement, 29-03-usage-dashboard-widget]

# Tech tracking
tech-stack:
  added: []
  patterns: [Redis atomic counters with TTL auto-expiry, fail-open on Redis errors with DB fallback, usage percentage calculation with warning thresholds]

key-files:
  created:
    - apps/web/lib/usage/plan-limits.ts
    - apps/web/lib/usage/usage-service.ts
    - apps/web/app/api/v1/usage/route.ts
  modified: []

key-decisions:
  - 'Fail-open on Redis errors: booking counts fall back to DB COUNT query rather than blocking bookings'
  - 'percentUsed capped at 100 with warning flag at >= 80% threshold'
  - 'Redis key TTL set on first increment to auto-expire at end of billing month'
  - 'Removed unused PlanLimits type import from usage-service to satisfy ESLint no-unused-vars'

patterns-established:
  - 'Usage counter pattern: Redis INCR for high-frequency counters (bookings), DB COUNT for low-frequency totals (employees, services)'
  - 'Limit check pattern: getCompanyPlan -> getLimitsForPlan -> isUnlimited check -> count check -> throw AppError 402'
  - 'Usage API response shape: { plan, period, items: [{ resource, current, limit, unlimited, percentUsed, warning }] }'

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 29 Plan 01: Usage Counting Infrastructure Summary

**Redis-backed atomic booking counters, DB employee/service counts, plan-limits adapter from PLAN_CONFIG, and GET /api/v1/usage endpoint with percentage and warning flags**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T21:04:42Z
- **Completed:** 2026-02-24T21:09:17Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Redis atomic booking counter with auto-expiring TTL per billing month and fail-open DB fallback
- DB-based employee and service counts against non-deleted records using Drizzle ORM
- Plan-aware limit check functions (checkBookingLimit, checkEmployeeLimit, checkServiceLimit) that throw AppError 402 with PLAN_LIMIT_EXCEEDED code
- GET /api/v1/usage endpoint returning structured usage summary for dashboard widget consumption

## Task Commits

Each task was committed atomically:

1. **Task 1: Create plan-limits helper and usage-service with Redis counters** - `9a1a8eb` (feat)
2. **Task 2: Create GET /api/v1/usage endpoint** - `cb78ddb` (feat)

## Files Created/Modified

- `apps/web/lib/usage/plan-limits.ts` - Reads PLAN_CONFIG from @schedulebox/shared, exports getLimitsForPlan, isUnlimited, PlanLimits
- `apps/web/lib/usage/usage-service.ts` - All usage counting (Redis + DB), limit checks (throw 402), and getUsageSummary aggregator
- `apps/web/app/api/v1/usage/route.ts` - Authenticated GET endpoint returning usage summary via createRouteHandler

## Decisions Made

- **Fail-open on Redis errors:** If Redis is unavailable, getBookingCount falls back to a DB COUNT query against the bookings table. incrementBookingCounter returns 0. This prevents Redis outages from blocking booking creation.
- **percentUsed capped at 100:** Math.min(100, ...) prevents display artifacts when usage exceeds limits during race conditions.
- **Warning threshold at 80%:** Matches common SaaS UX patterns for approaching-limit alerts.
- **Removed unused PlanLimits type import:** ESLint no-unused-vars flagged the import in usage-service.ts; only getLimitsForPlan and isUnlimited are needed there.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused PlanLimits type import from usage-service.ts**

- **Found during:** Task 1 (commit attempt)
- **Issue:** ESLint no-unused-vars error: `PlanLimits` was imported as a type but never referenced in usage-service.ts
- **Fix:** Removed `type PlanLimits` from the import statement
- **Files modified:** apps/web/lib/usage/usage-service.ts
- **Verification:** ESLint passed, commit succeeded
- **Committed in:** 9a1a8eb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor lint fix, no scope change.

## Issues Encountered

- Commit scope format: commitlint requires scope from allowed list (web, database, backend, etc.), not phase identifiers like `29-01`. Used `web` scope for all commits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Usage service is ready for Plan 29-02 (limit enforcement middleware integration)
- getUsageSummary is ready for Plan 29-03 (dashboard usage widget)
- All 8 exported functions available: incrementBookingCounter, getBookingCount, getEmployeeCount, getServiceCount, checkBookingLimit, checkEmployeeLimit, checkServiceLimit, getUsageSummary

---

## Self-Check: PASSED

- All 3 created files verified on disk
- Both task commits (9a1a8eb, cb78ddb) verified in git history
- TypeScript type-check passes clean

---

_Phase: 29-usage-limits_
_Completed: 2026-02-24_
