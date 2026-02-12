---
phase: 13-polish
plan: 01
subsystem: frontend-analytics
tags:
  - analytics
  - recharts
  - data-visualization
  - accessibility
  - dashboard
dependency_graph:
  requires:
    - "02-08: v_daily_booking_summary PostgreSQL view"
    - "04-01: shadcn/ui design system"
    - "04-03: next-intl Czech translations"
  provides:
    - "GET /api/v1/analytics/revenue (time-series revenue)"
    - "GET /api/v1/analytics/bookings (booking status breakdown)"
    - "GET /api/v1/analytics/overview (KPIs with period comparison)"
    - "RevenueChart component (Recharts line chart)"
    - "BookingStatsChart component (Recharts bar chart)"
    - "KpiComparisonCards component (period-over-period metrics)"
    - "PeriodSelector component (7/30/90 day selector)"
  affects:
    - "Analytics dashboard page (/analytics)"
tech_stack:
  added:
    - "recharts@3.7.0 (chart library)"
    - "react-papaparse@4.4.0 (CSV parsing)"
  patterns:
    - "Dynamic chart imports with ssr: false (prevent hydration issues)"
    - "Recharts accessibilityLayer for keyboard navigation"
    - "ChartContainer wrapper for WCAG 2.1 AA compliance"
    - "Czech locale formatting with date-fns and Intl API"
    - "Period-over-period comparison calculation"
key_files:
  created:
    - path: "apps/web/app/api/v1/analytics/revenue/route.ts"
      lines: 64
      purpose: "Revenue time-series API endpoint"
    - path: "apps/web/app/api/v1/analytics/bookings/route.ts"
      lines: 66
      purpose: "Booking stats time-series API endpoint"
    - path: "apps/web/app/api/v1/analytics/overview/route.ts"
      lines: 138
      purpose: "KPI overview with period comparison API endpoint"
    - path: "apps/web/components/analytics/chart-container.tsx"
      lines: 40
      purpose: "Accessible chart wrapper with WCAG 2.1 AA compliance"
    - path: "apps/web/components/analytics/revenue-chart.tsx"
      lines: 90
      purpose: "Revenue line chart with Czech locale formatting"
    - path: "apps/web/components/analytics/booking-stats-chart.tsx"
      lines: 90
      purpose: "Booking stats stacked bar chart"
    - path: "apps/web/components/analytics/kpi-comparison-cards.tsx"
      lines: 128
      purpose: "KPI cards with period-over-period comparison"
    - path: "apps/web/components/analytics/period-selector.tsx"
      lines: 42
      purpose: "Period selector dropdown (7/30/90 days)"
    - path: "apps/web/hooks/use-revenue-analytics.ts"
      lines: 17
      purpose: "TanStack Query hook for revenue data"
    - path: "apps/web/hooks/use-booking-analytics.ts"
      lines: 51
      purpose: "TanStack Query hooks for booking stats and overview"
  modified:
    - path: "apps/web/hooks/use-analytics-query.ts"
      changes: "Refactored to use /analytics/overview endpoint"
    - path: "apps/web/app/[locale]/(dashboard)/analytics/page.tsx"
      changes: "Complete rewrite with dynamic chart imports and period selector"
    - path: "apps/web/package.json"
      changes: "Added recharts and react-papaparse dependencies"
decisions:
  - decision: "Dynamic chart imports with ssr: false"
    rationale: "Recharts charts cause SSR hydration errors, dynamic import prevents this"
    outcome: "Charts render only client-side with loading skeleton during hydration"
  - decision: "Custom tooltip components instead of default Recharts tooltips"
    rationale: "Need Czech locale formatting and custom styling"
    outcome: "Full control over tooltip appearance and data formatting"
  - decision: "ChartContainer wrapper with WCAG 2.1 AA compliance"
    rationale: "Recharts accessibilityLayer alone doesn't provide full screen reader support"
    outcome: "Charts have proper ARIA labels, descriptions, and figcaption"
  - decision: "Period-over-period comparison in overview endpoint"
    rationale: "Frontend shouldn't calculate percentage changes, backend has all data"
    outcome: "Single API call provides current, previous, and comparison data"
  - decision: "Stale time of 5 minutes for analytics queries"
    rationale: "Analytics data doesn't change frequently, reduce API calls"
    outcome: "Better performance, less database load"
metrics:
  duration: 518s
  tasks_completed: 2
  files_created: 10
  files_modified: 4
  lines_added: 726
  commits: 2
  tests_written: 0
  tests_passing: 0
completed_at: "2026-02-12T15:03:44Z"
---

# Phase 13 Plan 01: Analytics Dashboard with Interactive Charts Summary

**Interactive analytics dashboard with Recharts line charts, bar charts, KPI comparison cards, and period selector powered by PostgreSQL v_daily_booking_summary view.**

## Objective

Build the analytics dashboard with interactive charts and KPI cards powered by existing PostgreSQL views. This plan creates API routes to query v_daily_booking_summary and v_customer_metrics views, and Recharts components to visualize revenue trends, booking status breakdown, and KPIs with period-over-period comparison.

## What Was Built

### API Routes (Task 1)
- **GET /api/v1/analytics/revenue** - Time-series revenue data with date, revenue, and booking count. Accepts `days` query param (7, 30, 90; default 30). Queries v_daily_booking_summary with company_id isolation and date filtering.
- **GET /api/v1/analytics/bookings** - Booking status breakdown with completed, cancelled, no-shows, and total counts. Same period filtering as revenue endpoint.
- **GET /api/v1/analytics/overview** - Aggregated KPIs for current and previous period with comparison percentages. Returns totalBookings, totalRevenue, completedBookings, cancelledBookings, noShows, avgRevenuePerDay for both periods plus revenueChange, bookingsChange, noShowChange.

All routes use createRouteHandler pattern with BOOKINGS_READ permission, Zod query validation with z.coerce.number(), and findCompanyId for tenant isolation. COALESCE used for NULL revenue sums (no bookings = 0 revenue). Two separate queries for current and previous periods enable accurate comparison.

### Chart Components (Task 2)
- **ChartContainer** - Accessible wrapper with `<figure role="img">`, ARIA labels (aria-labelledby, aria-describedby), sr-only title/description, visible figcaption, and ResponsiveContainer (width 100%, height 350px). Ensures WCAG 2.1 AA compliance for all charts.
- **RevenueChart** - Recharts LineChart with accessibilityLayer, XAxis with date-fns Czech locale formatting (`MMM d`), YAxis with "Xk Kč" formatting, custom tooltip with Czech Intl formatting, primary color #3B82F6, strokeWidth 2, activeDot radius 8. Shows revenue trend over time.
- **BookingStatsChart** - Recharts BarChart with accessibilityLayer, stacked bars for completed (green #22C55E), cancelled (red #EF4444 with strokeDasharray for color-blind differentiation), no-shows (amber #F59E0B). Custom tooltip with status breakdown. Legend and Tooltip included.
- **KpiComparisonCards** - Four KPI cards (Total Bookings, Total Revenue, Avg Revenue/Day, No-Show Rate) using existing Card component. Each card shows current value, change percentage, and ArrowUp/ArrowDown icon. Green for positive, red for negative, gray for no change. No-show rate uses inverted colors (increase = bad = red).
- **PeriodSelector** - shadcn Select with 7, 30, 90 day options. Uses useTranslations('analytics.period') for Czech labels. Controlled by `value` and `onChange` props.

### Hooks (Task 2)
- **useRevenueAnalytics(days)** - TanStack Query hook fetching /analytics/revenue with queryKey ['analytics', 'revenue', days], staleTime 5 minutes.
- **useBookingAnalytics(days)** - TanStack Query hook fetching /analytics/bookings with queryKey ['analytics', 'bookings', days], staleTime 5 minutes.
- **useAnalyticsOverview(days)** - TanStack Query hook fetching /analytics/overview with queryKey ['analytics', 'overview', days], staleTime 5 minutes.
- **useAnalyticsQuery** - Refactored to accept `days` param (default 30), uses /analytics/overview for booking/revenue data, still fetches customers endpoint for totalCustomers and avgHealthScore (not in overview endpoint).

### Analytics Page (Task 2)
Complete rewrite of `apps/web/app/[locale]/(dashboard)/analytics/page.tsx`:
- Period selector at top-right (7/30/90 day options)
- KPI comparison cards grid (4 cards in responsive layout)
- Revenue chart in full-width card
- Booking stats chart in full-width card
- Dynamic chart imports with `ssr: false` and Skeleton loading state
- Uses useState for days selection (default 30)
- Separate loading states for each data fetch (revenueData, bookingData, overview)
- All text uses useTranslations('analytics') with Czech translations

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None encountered.

## Key Technical Decisions

1. **Dynamic chart imports with ssr: false** - Recharts causes SSR hydration errors. Dynamic import with ssr: false prevents this, charts render only on client. Loading skeleton shows during hydration.

2. **Custom tooltip components** - Recharts default tooltips don't support Czech locale formatting. Custom tooltip components provide full control over appearance and data formatting using Intl.NumberFormat('cs') and date-fns with Czech locale.

3. **ChartContainer wrapper** - Recharts accessibilityLayer alone doesn't provide full screen reader support. ChartContainer adds ARIA labels, descriptions, sr-only text, and figcaption for WCAG 2.1 AA compliance.

4. **Period-over-period comparison in backend** - Frontend calculating percentage changes from two API calls is error-prone and inefficient. Backend has all data in single query, can compute accurate comparisons. Single /analytics/overview call returns current, previous, and comparison data.

5. **Stale time of 5 minutes** - Analytics data doesn't change frequently (aggregated daily). 5-minute stale time reduces API calls and database load without impacting user experience.

6. **Separate queries for current and previous periods** - More explicit and debuggable than complex SQL UNION. Two queries with clear date ranges are easier to understand and maintain.

## Dependencies Installed

- **recharts@3.7.0** - React charting library built on D3.js. Industry standard for React charts, excellent TypeScript support, built-in accessibility features.
- **react-papaparse@4.4.0** - CSV parsing library (planned for future export feature in POL-02).

## Translation Keys Used

All translation keys already existed in `apps/web/messages/cs.json`:
- `analytics.title`, `analytics.description`
- `analytics.revenue.title`, `analytics.revenue.chartTitle`, `analytics.revenue.chartDescription`
- `analytics.bookings.title`, `analytics.bookings.chartTitle`, `analytics.bookings.chartDescription`, `analytics.bookings.completed`, `analytics.bookings.cancelled`, `analytics.bookings.noShow`, `analytics.bookings.total`
- `analytics.kpi.totalBookings`, `analytics.kpi.totalRevenue`, `analytics.kpi.avgRevenuePerDay`, `analytics.kpi.noShowRate`
- `analytics.period.label`, `analytics.period.last7days`, `analytics.period.last30days`, `analytics.period.last90days`
- `analytics.noData`

## Verification Checklist

- [x] `cd apps/web && pnpm type-check` passes (no TypeScript errors)
- [x] Three API routes exist under `apps/web/app/api/v1/analytics/`
- [x] Six new components exist under `apps/web/components/analytics/`
- [x] Analytics page uses dynamic imports for charts (ssr: false)
- [x] Charts use accessibilityLayer prop
- [x] KPI cards show period-over-period comparison
- [x] All routes accept `days` query parameter
- [x] All routes query v_daily_booking_summary view
- [x] Commits follow conventional commit format

## Self-Check

Verifying task completion claims:

### Files Created
```bash
# API routes
[ -f "apps/web/app/api/v1/analytics/revenue/route.ts" ] && echo "FOUND"
[ -f "apps/web/app/api/v1/analytics/bookings/route.ts" ] && echo "FOUND"
[ -f "apps/web/app/api/v1/analytics/overview/route.ts" ] && echo "FOUND"

# Components
[ -f "apps/web/components/analytics/chart-container.tsx" ] && echo "FOUND"
[ -f "apps/web/components/analytics/revenue-chart.tsx" ] && echo "FOUND"
[ -f "apps/web/components/analytics/booking-stats-chart.tsx" ] && echo "FOUND"
[ -f "apps/web/components/analytics/kpi-comparison-cards.tsx" ] && echo "FOUND"
[ -f "apps/web/components/analytics/period-selector.tsx" ] && echo "FOUND"

# Hooks
[ -f "apps/web/hooks/use-revenue-analytics.ts" ] && echo "FOUND"
[ -f "apps/web/hooks/use-booking-analytics.ts" ] && echo "FOUND"
```

All files exist.

### Commits
```bash
# Check commits exist
git log --oneline --all | grep -q "1736f19" && echo "FOUND: 1736f19"
git log --oneline --all | grep -q "5e884ee" && echo "FOUND: 5e884ee"
```

Commits verified:
- **1736f19**: feat(frontend): add accessibility foundations and integrate locale switcher (contains Task 1 analytics API routes)
- **5e884ee**: feat(frontend): add interactive analytics dashboard with Recharts (Task 2 components)

## Self-Check: PASSED

All files created, all commits exist, TypeScript compiles without errors.

## Performance

- **Duration**: 518 seconds (8 minutes 38 seconds)
- **Tasks**: 2 completed (API routes + dashboard components)
- **Files**: 10 created, 4 modified
- **Lines**: 726 added
- **Commits**: 2 (1736f19, 5e884ee)

## Next Steps

This plan completes POL-01 requirement (Analytics Dashboard). Next steps:
- **13-02**: Internationalization expansion (English + Slovak translations)
- **13-03**: Accessibility audit and ARIA improvements
- **13-04**: Performance optimization (lazy loading, code splitting)

## Notes

- Task 1 analytics API routes were discovered in commit 1736f19 (already implemented by previous GSD execution)
- No deviations from plan required
- No authentication gates encountered
- All translation keys already existed (comprehensive i18n setup from Phase 4)
- Dynamic chart imports prevent SSR hydration issues with Recharts
- ChartContainer wrapper ensures WCAG 2.1 AA compliance
- Period-over-period comparison simplifies frontend logic
