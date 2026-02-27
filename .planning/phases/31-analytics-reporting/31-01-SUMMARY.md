---
phase: 31-analytics-reporting
plan: 01
subsystem: api
tags: [analytics, drizzle, sql, recharts, heatmap, pie-chart, bar-chart, retention]

# Dependency graph
requires:
  - phase: 01-15 (v1.0)
    provides: bookings, payments, customers, services tables with indexes
provides:
  - GET /api/v1/analytics/payment-methods — payment gateway breakdown (pie chart)
  - GET /api/v1/analytics/top-services — top 10 services by revenue (bar chart)
  - GET /api/v1/analytics/peak-hours — hour-by-day booking heatmap (7x24 matrix)
  - GET /api/v1/analytics/cancellations — daily cancel/no-show rates (line chart)
  - GET /api/v1/analytics/customer-retention — repeat rate, churn stats, CLV buckets
affects: [31-analytics-reporting frontend plans, dashboard components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'SQL EXTRACT(DOW/HOUR) for temporal heatmap aggregation'
    - 'SQL FILTER (WHERE ...) for conditional aggregation in single query'
    - 'CASE-based bucketing for CLV histogram distribution'

key-files:
  created:
    - apps/web/app/api/v1/analytics/payment-methods/route.ts
    - apps/web/app/api/v1/analytics/top-services/route.ts
    - apps/web/app/api/v1/analytics/peak-hours/route.ts
    - apps/web/app/api/v1/analytics/cancellations/route.ts
    - apps/web/app/api/v1/analytics/customer-retention/route.ts
  modified: []

key-decisions:
  - 'Customer retention uses CUSTOMERS_READ permission (not BOOKINGS_READ) since it queries customer table'
  - 'CLV buckets use CASE-based ranges (0-500, 500-2000, 2000-5000, 5000-10000, 10000+) matching CZK pricing tiers'
  - 'Peak hours returns sparse matrix — frontend fills gaps with zeros for 7x24 grid'
  - 'Cancellation rates computed as float with 4 decimal precision via SQL ROUND'

patterns-established:
  - 'Analytics route pattern: createRouteHandler + Zod days param + findCompanyId + raw SQL aggregation'
  - 'Chart-ready response shapes: arrays of objects with named fields for direct Recharts consumption'

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 31 Plan 01: Analytics API Routes Summary

**Five analytics API routes (payment-methods, top-services, peak-hours, cancellations, customer-retention) with Drizzle raw SQL aggregation for Recharts dashboard consumption**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T22:01:22Z
- **Completed:** 2026-02-24T22:04:50Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments

- Payment method breakdown endpoint with gateway pie chart data and percentage calculation
- Top 10 services by revenue endpoint with bookings JOIN services and discount-aware revenue
- Peak hours heatmap endpoint using EXTRACT(DOW/HOUR) for sparse 7x24 matrix
- Daily cancellation and no-show rate endpoint with conditional FILTER aggregation
- Customer retention endpoint combining repeat booking rate, churn segmentation (active/atRisk/churned), and CLV distribution buckets

## Task Commits

Each task was committed atomically:

1. **Task 1: Revenue detail analytics API routes (payment methods, top services)** - `49381bb` (feat)
2. **Task 2: Booking detail and customer retention API routes (peak hours, cancellations, retention)** - `3edc28d` (feat)

## Files Created/Modified

- `apps/web/app/api/v1/analytics/payment-methods/route.ts` - Payment gateway breakdown with percentage for pie chart
- `apps/web/app/api/v1/analytics/top-services/route.ts` - Top 10 services by revenue for bar chart
- `apps/web/app/api/v1/analytics/peak-hours/route.ts` - Hour-by-day sparse heatmap matrix
- `apps/web/app/api/v1/analytics/cancellations/route.ts` - Daily cancel/no-show rates for line chart
- `apps/web/app/api/v1/analytics/customer-retention/route.ts` - Repeat rate, churn stats, CLV histogram

## Decisions Made

- Customer retention endpoint uses CUSTOMERS_READ permission since it queries customer aggregate fields, not bookings
- CLV distribution uses 5 buckets (0-500, 500-2000, 2000-5000, 5000-10000, 10000+) matching CZK value ranges
- Peak hours returns sparse array — the frontend fills gaps with zeros to render full 7x24 heatmap
- Cancellation rates use SQL ROUND with 4 decimal places for precise float values
- Customer retention does not use a days param since it operates on pre-computed customer aggregate fields (totalBookings, lastVisitAt, clvPredicted)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused imports in customer-retention route**

- **Found during:** Task 2 (customer-retention route)
- **Issue:** `gt`, `lte`, `gte` imported from drizzle-orm but not used (churn logic uses raw SQL template literals with date parameters instead)
- **Fix:** Removed unused imports to pass ESLint pre-commit hook
- **Files modified:** apps/web/app/api/v1/analytics/customer-retention/route.ts
- **Verification:** ESLint passes, commit succeeds
- **Committed in:** 3edc28d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial import cleanup. No scope change.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 analytics API routes are live and ready for frontend dashboard components
- Response shapes are pre-formatted for Recharts (PieChart, BarChart, heatmap, LineChart)
- Ready for Phase 31 Plan 02 (frontend dashboard components)

---

## Self-Check: PASSED

All 5 created files verified on disk. Both task commits (49381bb, 3edc28d) verified in git log.

---

_Phase: 31-analytics-reporting_
_Completed: 2026-02-24_
