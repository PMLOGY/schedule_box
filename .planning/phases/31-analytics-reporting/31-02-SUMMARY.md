---
phase: 31-analytics-reporting
plan: 02
subsystem: api, database, scheduler
tags: [analytics, bullmq, drizzle, employee-utilization, cron, snapshots]

# Dependency graph
requires:
  - phase: 31-01
    provides: existing analytics API routes and revenue/booking endpoints
provides:
  - Employee utilization API (GET /api/v1/analytics/employees)
  - analytics_snapshots table for pre-computed daily KPIs
  - BullMQ hourly analytics snapshot scheduler
affects: [31-04-analytics-ui, dashboard-performance]

# Tech tracking
tech-stack:
  added: []
  patterns: [hourly-snapshot-refresh, occupancy-approximation, onConflictDoUpdate-upsert]

key-files:
  created:
    - apps/web/app/api/v1/analytics/employees/route.ts
    - services/notification-worker/src/schedulers/analytics-scheduler.ts
  modified:
    - packages/database/src/schema/analytics.ts
    - services/notification-worker/src/schedulers/index.ts

key-decisions:
  - 'V1 occupancy approximation: (bookingCount * avgDuration) / (workingDays * 480min), capped at 100%'
  - 'analytics_snapshots as Drizzle table with BullMQ refresh (not PostgreSQL MATERIALIZED VIEW)'
  - 'Hourly cron (0 * * * *) with concurrency 1 and 2 attempts / exponential 30s backoff'

patterns-established:
  - 'Occupancy approximation pattern: business days = days * 5/7, 480 min/day working capacity'
  - 'Analytics scheduler pattern: no email queue dependency, standalone queue/worker pair'

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 31 Plan 02: Employee Utilization & Analytics Snapshot Summary

**Per-employee utilization API with occupancy approximation and BullMQ hourly analytics snapshot scheduler writing pre-computed KPIs to analytics_snapshots table**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-24T22:01:44Z
- **Completed:** 2026-02-24T22:07:38Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Employee utilization API returning bookingCount, totalRevenue, and occupancyPercent per employee with LEFT JOIN ensuring zero-booking employees are included
- analytics_snapshots table with UNIQUE(companyId, snapshotDate) constraint for idempotent hourly upserts and three indexes for fast dashboard queries
- BullMQ hourly scheduler computing daily snapshots (total/completed/cancelled/no-show bookings, revenue, unique/new customers, top service) for all active companies
- Scheduler orchestrator updated to start analytics scheduler alongside billing and reminder schedulers

## Task Commits

Each task was committed atomically:

1. **Task 1: Employee utilization API route and analytics_snapshots schema** - `2de7747` (feat)
2. **Task 2: BullMQ analytics snapshot scheduler (hourly refresh)** - `baec304` (feat)

## Files Created/Modified

- `apps/web/app/api/v1/analytics/employees/route.ts` - GET endpoint returning per-employee booking stats with occupancy approximation
- `packages/database/src/schema/analytics.ts` - Added analyticsSnapshots table definition with unique constraint and indexes
- `services/notification-worker/src/schedulers/analytics-scheduler.ts` - BullMQ hourly job computing and upserting daily analytics snapshots
- `services/notification-worker/src/schedulers/index.ts` - Updated orchestrator to import and start analytics scheduler

## Decisions Made

- **V1 occupancy approximation**: Uses (bookingCount * avgServiceDuration) / (workingDays * 480min) capped at 100%. Full precise calculation deferred (requires working hours + overrides per employee per day).
- **analytics_snapshots as Drizzle table**: Chose Drizzle pgTable with BullMQ refresh over PostgreSQL MATERIALIZED VIEW for full ORM control and codebase pattern consistency.
- **Hourly refresh cadence**: Cron `0 * * * *` balances freshness vs. DB load. Worker concurrency 1 prevents parallel snapshot computations. 2 attempts with exponential 30s backoff for resilience.
- **Analytics scheduler is standalone**: Unlike billing scheduler, analytics does not need emailQueue (no emails sent). Accepts only redisConnection parameter.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Git HEAD lock race condition during Task 1 commit due to parallel agent committing simultaneously. Task 1 files were committed by the parallel agent in commit `2de7747`. No data loss, all code verified present.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Employee utilization API ready for frontend chart integration in Plan 04
- analytics_snapshots table ready for dashboard KPI queries
- Scheduler will begin populating data on next deployment with Redis connection
- Ready for Plan 03 (platform admin dashboard and cross-location analytics)

## Self-Check: PASSED

- All 4 key files verified on disk
- Commit 2de7747 found (Task 1)
- Commit baec304 found (Task 2)

---

_Phase: 31-analytics-reporting_
_Completed: 2026-02-24_
