---
phase: 31-analytics-reporting
plan: 05
subsystem: ui
tags: [next.js, recharts, react-pdf, analytics, admin-dashboard, organization, export]

# Dependency graph
requires:
  - phase: 31-03
    provides: Admin SaaS health metrics API and cross-location org analytics API
provides:
  - Admin dashboard page with MRR, churn, plan distribution, signup trend charts
  - Organization analytics page with per-location breakdown and occupancy
  - Customer report PDF/CSV export (retention metrics, churn, CLV distribution)
  - Extended export toolbar with 6 export buttons (revenue/bookings/customers x CSV/PDF)
affects: [32-frontend-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [dynamic chart imports with SSR disabled, admin role guard pattern, flattened retention data prop passing]

key-files:
  created:
    - apps/web/app/[locale]/(dashboard)/analytics/admin/page.tsx
    - apps/web/app/[locale]/(dashboard)/analytics/organization/page.tsx
    - apps/web/components/analytics/admin-dashboard.tsx
    - apps/web/components/analytics/admin-plan-distribution-chart.tsx
    - apps/web/components/analytics/admin-signup-trend-chart.tsx
    - apps/web/components/analytics/admin-mrr-by-plan-chart.tsx
    - apps/web/components/analytics/org-analytics-dashboard.tsx
    - apps/web/hooks/use-admin-analytics.ts
    - apps/web/hooks/use-org-analytics.ts
    - apps/web/app/api/v1/reports/customers/pdf/route.ts
    - apps/web/lib/export/pdf-templates/customer-report.tsx
  modified:
    - apps/web/lib/navigation.ts
    - apps/web/components/analytics/export-toolbar.tsx
    - apps/web/app/[locale]/(dashboard)/analytics/page.tsx
    - apps/web/lib/export/pdf-templates/pdf-config.ts
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json

key-decisions:
  - 'Admin dashboard uses direct role check (user.role !== admin) with Access Denied card for non-admin users'
  - 'Three separate chart sub-components for admin dashboard (PieChart, LineChart, BarChart) with dynamic imports'
  - 'Customer retention data flattened from nested API response before passing to export toolbar'
  - 'Customer PDF reuses same DB queries as customer-retention analytics API endpoint'

patterns-established:
  - 'Admin-only page guard: useAuthStore role check with Access Denied card and redirect link'
  - 'Organization analytics: franchise_owner access with 403 fallback UI'

# Metrics
duration: 13min
completed: 2026-02-24
---

# Phase 31 Plan 05: Analytics Dashboard Pages & Customer Export Summary

**Admin dashboard with MRR/churn/plan charts, organization analytics with per-location breakdown, and customer retention PDF/CSV export with 6-button toolbar**

## Performance

- **Duration:** 13 min
- **Started:** 2026-02-24T22:10:56Z
- **Completed:** 2026-02-24T22:24:20Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- Admin dashboard page at /analytics/admin with MRR, ARR, churn rate KPI cards, plan distribution PieChart, signup trend LineChart, and MRR-by-plan BarChart (admin-only gated)
- Organization analytics page at /analytics/organization with aggregate KPI cards and per-location card grid with occupancy progress bars
- Customer retention PDF export API with repeat booking rate, churn breakdown, and CLV distribution table
- Export toolbar extended from 4 to 6 buttons covering revenue, bookings, and customer reports in both CSV and PDF formats
- Navigation updated with adminAnalytics link visible only to admin users

## Task Commits

Each task was committed atomically:

1. **Task 1: Platform admin dashboard and organization analytics pages** - `3d37778` (feat)
2. **Task 2: Customer report PDF export and extended export toolbar** - `ecf1318` (feat)

## Files Created/Modified

- `apps/web/app/[locale]/(dashboard)/analytics/admin/page.tsx` - Admin dashboard page with role guard
- `apps/web/app/[locale]/(dashboard)/analytics/organization/page.tsx` - Organization analytics page with 403 fallback
- `apps/web/components/analytics/admin-dashboard.tsx` - Admin dashboard component with KPI cards and chart layout
- `apps/web/components/analytics/admin-plan-distribution-chart.tsx` - Recharts PieChart for plan distribution
- `apps/web/components/analytics/admin-signup-trend-chart.tsx` - Recharts LineChart for signup trends
- `apps/web/components/analytics/admin-mrr-by-plan-chart.tsx` - Recharts BarChart for MRR by plan
- `apps/web/components/analytics/org-analytics-dashboard.tsx` - Organization dashboard with per-location cards
- `apps/web/hooks/use-admin-analytics.ts` - React Query hook for GET /admin/analytics
- `apps/web/hooks/use-org-analytics.ts` - React Query hook for GET /analytics/organization
- `apps/web/app/api/v1/reports/customers/pdf/route.ts` - Customer retention PDF export API
- `apps/web/lib/export/pdf-templates/customer-report.tsx` - React-PDF template for customer reports
- `apps/web/lib/export/pdf-templates/pdf-config.ts` - Added customer report translations (cs/sk/en)
- `apps/web/components/analytics/export-toolbar.tsx` - Extended with customerCSV/customerPDF buttons
- `apps/web/app/[locale]/(dashboard)/analytics/page.tsx` - Wires customer retention data to export toolbar
- `apps/web/lib/navigation.ts` - Added adminAnalytics nav item for admin role
- `apps/web/messages/cs.json` - Added customerCSV/customerPDF translation keys
- `apps/web/messages/en.json` - Added customerCSV/customerPDF translation keys
- `apps/web/messages/sk.json` - Added customerCSV/customerPDF translation keys

## Decisions Made

- Admin dashboard uses direct role check (`user.role !== 'admin'`) consistent with admin API route pattern (no RBAC permission for admin)
- Three separate chart sub-components for admin dashboard to enable dynamic imports with SSR disabled (prevents Recharts hydration issues)
- Customer retention data flattened from nested API response (`repeatBooking.repeatRate` -> `repeatRate`) before passing to export toolbar for cleaner component interface
- Customer PDF route reuses same DB queries as the customer-retention analytics API (repeat rate, churn thresholds, CLV buckets) for consistency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Recharts TypeScript type errors for Tooltip formatter and Pie label**

- **Found during:** Task 1 (Chart components)
- **Issue:** Recharts PieLabelRenderProps does not have generic Record index signature; Tooltip formatter expects optional value parameter
- **Fix:** Used inline typed destructuring `{ name?: string; percentage?: number }` for Pie label, and removed explicit type annotation from Tooltip formatter
- **Files modified:** admin-plan-distribution-chart.tsx, admin-mrr-by-plan-chart.tsx
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 3d37778 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added customer export translation keys to all locales**

- **Found during:** Task 2 (Export toolbar extension)
- **Issue:** New customerCSV/customerPDF buttons require translation keys that did not exist in cs/en/sk message files
- **Fix:** Added customerCSV and customerPDF keys to analytics.export section in all three locale files
- **Files modified:** cs.json, en.json, sk.json
- **Verification:** Buttons render correct localized text
- **Committed in:** ecf1318 (Task 2 commit)

**3. [Rule 2 - Missing Critical] Wired customer retention data to analytics page export toolbar**

- **Found during:** Task 2 (Export toolbar extension)
- **Issue:** Export toolbar's new customer buttons would be permanently disabled without customerRetentionData prop
- **Fix:** Updated analytics page.tsx to pass flattened retention data from useCustomerRetention hook to ExportToolbar
- **Files modified:** apps/web/app/[locale]/(dashboard)/analytics/page.tsx
- **Verification:** TypeScript compiles, retention data flows to toolbar
- **Committed in:** ecf1318 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 missing critical)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All analytics UI pages complete (main analytics, admin dashboard, organization analytics)
- All three report types exportable as PDF and CSV
- Ready for Phase 31 completion or Phase 32 frontend polish

## Self-Check: PASSED

All 10 key files verified on disk. Both task commits (3d37778, ecf1318) found in git log.

---

_Phase: 31-analytics-reporting_
_Completed: 2026-02-24_
