---
phase: 31-analytics-reporting
plan: 03
subsystem: api
tags: [analytics, admin, mrr, churn, franchise, organization, drizzle]

requires:
  - phase: 28-subscription-billing
    provides: subscriptions table, subscription_events, plan pricing
  - phase: 30-multi-location
    provides: organizations, organization_members, companies.organizationId

provides:
  - Platform admin SaaS health metrics API (MRR, ARR, churn, plan distribution, signup trends)
  - Cross-location organization analytics API for franchise owners

affects: [31-analytics-reporting, frontend-admin-dashboard, frontend-org-analytics]

tech-stack:
  added: []
  patterns: [admin-only-role-check, cross-tenant-aggregation, franchise-owner-org-scoping, occupancy-v1-approximation]

key-files:
  created:
    - apps/web/app/api/v1/admin/analytics/route.ts
    - apps/web/app/api/v1/analytics/organization/route.ts
  modified: []

key-decisions:
  - 'Admin route uses direct role check (user.role === admin) instead of RBAC permissions - admin is a system role, not permission-based'
  - 'Churn rate approximation: (churned in period) / (current active + churned) as period-start estimate'
  - 'Occupancy V1 uses 60-min avg booking, 480-min workday, 5/7 working days per period'
  - 'Organization analytics deduplicates customers by customerId across locations (not by email)'

patterns-established:
  - 'Admin API pattern: createRouteHandler + manual role check + no findCompanyId (cross-tenant)'
  - 'Franchise owner scoping: resolve user UUID -> users.id -> organization_members -> org companies'

duration: 3 min
completed: 2026-02-24
---

# Phase 31 Plan 03: Admin & Organization Analytics Summary

**Platform admin SaaS health dashboard API (MRR/churn/plan distribution) and franchise owner cross-location analytics with per-location drill-down**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T22:01:51Z
- **Completed:** 2026-02-24T22:05:48Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- Admin-only API endpoint returning MRR, ARR, churn rate, active/total companies, plan distribution, signup trend, and MRR-by-plan
- Franchise owner organization analytics with org-level totals and per-location breakdown including occupancy approximation
- Both endpoints enforce strict authorization (admin role check and franchise_owner membership check)

## Task Commits

Each task was committed atomically:

1. **Task 1: Platform admin SaaS health metrics API** - `2de7747` (feat)
2. **Task 2: Cross-location organization analytics API** - `4278a09` (feat)

## Files Created/Modified

- `apps/web/app/api/v1/admin/analytics/route.ts` - Admin SaaS metrics endpoint (MRR, churn, plan distribution, signups)
- `apps/web/app/api/v1/analytics/organization/route.ts` - Cross-location franchise analytics with per-location drill-down

## Decisions Made

- **Admin route authorization:** Direct `user.role === 'admin'` check instead of RBAC permissions, since admin is a system role requiring explicit gating
- **Churn rate approximation:** Uses (churned count) / (current active + churned) as approximate period-start active count
- **MRR calculation:** Monthly subscriptions contribute full priceAmount; annual subscriptions contribute priceAmount/12
- **Occupancy V1 approximation:** Assumes 60-min avg booking duration, 480-min (8hr) workday, 5/7 working day ratio
- **Customer dedup:** Organization-level uniqueCustomers counts distinct customerId across all company bookings (same physical customer with different customerId at different locations counts separately)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Admin analytics API ready for frontend admin dashboard integration
- Organization analytics API ready for franchise owner UI
- Both endpoints follow established patterns (createRouteHandler, Zod validation, successResponse)

## Self-Check: PASSED

All 2 created files verified on disk. Both commit hashes (2de7747, 4278a09) found in git log.

---

_Phase: 31-analytics-reporting_
_Completed: 2026-02-24_
