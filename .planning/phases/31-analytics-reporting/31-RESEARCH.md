# Phase 31: Analytics and Reporting — Research

## Codebase Findings

### 1. Existing Analytics Infrastructure (STRONG foundation)

**Already built:**
- `packages/database/src/schema/views.ts` — Two pgViews already exist:
  - `v_daily_booking_summary` — daily booking stats per company (total, completed, cancelled, no-shows, revenue)
  - `v_customer_metrics` — customer health/value metrics (total bookings, revenue, CLV, churn status)
- `apps/web/app/api/v1/analytics/` — Three existing API routes:
  - `GET /analytics/overview` — aggregated KPIs with period-over-period comparison
  - `GET /analytics/revenue` — time-series revenue data from v_daily_booking_summary
  - `GET /analytics/bookings` — time-series booking status breakdown
- `apps/web/app/[locale]/(dashboard)/analytics/page.tsx` — Existing analytics page with:
  - Period selector (7/30/90 days)
  - KPI comparison cards
  - Revenue line chart (Recharts)
  - Booking stats chart
  - Export toolbar (CSV + PDF)

**Existing hooks:** `use-analytics-query.ts`, `use-revenue-analytics.ts`, `use-booking-analytics.ts`

**Existing export infra:**
- `lib/export/csv-exporter.ts` — CSV download with BOM for Czech diacritics
- `lib/export/pdf-templates/revenue-report.tsx` — @react-pdf/renderer revenue PDF
- `lib/export/pdf-templates/booking-report.tsx` — @react-pdf/renderer booking PDF
- `GET /api/v1/reports/revenue/pdf` — server-side revenue PDF generation
- `GET /api/v1/reports/bookings/pdf` — server-side booking PDF generation

### 2. Chart Library: Recharts 3.7.0

Already in `package.json`. Existing components use LineChart, BarChart, PieChart patterns. Used in `revenue-chart.tsx` and `booking-stats-chart.tsx`.

For new requirements: BarChart (employee utilization), PieChart (payment method breakdown), heatmap (will need custom grid using Recharts primitives or simple div-based grid).

### 3. Database Schema (relevant tables)

- `bookings` — has `companyId`, `serviceId`, `employeeId`, `startTime`, `endTime`, `status`, `price`, `source`
- `payments` — has `companyId`, `gateway` (comgate/qrcomat/cash/bank_transfer/gift_card), `amount`, `status`
- `employees` — has `companyId`, `name`, `isActive`
- `customers` — has `companyId`, `totalBookings`, `totalSpent`, `lastVisitAt`, `createdAt`
- `services` — has `companyId`, `name`, `durationMinutes`, `price`
- `working_hours` — has `companyId`, `employeeId`, `dayOfWeek`, `startTime`, `endTime`, `isActive`
- `working_hours_overrides` — has `companyId`, `employeeId`, `date`, `isDayOff`
- `subscriptions` — has `companyId`, `plan`, `status`, `priceAmount`, `billingCycle`, `createdAt`
- `organizations` — has `id`, `ownerUserId`, `isActive`
- `organization_members` — has `organizationId`, `userId`, `companyId`, `role`
- `companies` — has `subscriptionPlan`, `organizationId`, `createdAt`, `isActive`

### 4. Auth & RBAC Pattern

- `createRouteHandler({ requiresAuth: true, requiredPermissions: [PERMISSIONS.X] })`
- JWT payload has: `sub` (user UUID), `company_id`, `role` (admin/owner/employee/customer), `permissions[]`
- Tenant isolation: `findCompanyId(userSub)` resolves user UUID to companyId
- Admin role = superadmin (role === 'admin'), sees all companies
- Owner role = business owner, sees own company data
- PERMISSIONS includes: `REPORTS_READ`, `BOOKINGS_READ`, `PAYMENTS_READ`
- Navigation in `lib/navigation.ts` — analytics visible to owner only; admin sees all

### 5. BullMQ Job Pattern (from billing-scheduler.ts)

- Uses `Queue` + `Worker` from 'bullmq'
- `upsertJobScheduler` for cron patterns (BullMQ 5.16+)
- Scheduler started from `services/notification-worker/src/schedulers/index.ts`
- SchedulerResources interface tracks queue + worker for graceful shutdown
- Pattern: create queue, upsert scheduler with cron pattern, create worker with handler

### 6. Organizations Schema (Phase 30)

- `organizations` table exists at `packages/database/src/schema/organizations.ts`
- `organization_members` with `role` ('franchise_owner' | 'location_manager')
- `companies.organizationId` FK exists
- Cross-location query pattern: join organizations -> organization_members -> companies, filter by org

### 7. Subscription Schema (Phase 28)

- `subscriptions` table with `plan`, `status`, `priceAmount`, `billingCycle`, `createdAt`
- `subscription_events` for lifecycle audit
- `PLAN_CONFIG` in `packages/shared/src/types/billing.ts` for plan names/pricing
- MRR calculation: SUM of active subscription priceAmount where billingCycle = 'monthly', + annual/12

### 8. PDF/Export Pattern

- Server-side: `@react-pdf/renderer` with `renderToBuffer()` -> NextResponse with Content-Type: application/pdf
- Client-side CSV: `react-papaparse` jsonToCSV with BOM prefix
- Font registration: `registerFonts()` from `pdf-config.ts` for Czech diacritics
- Existing PDF templates follow React component pattern with `@react-pdf/renderer` primitives

## Occupancy Rate Decision

**Research flag from ROADMAP:** "Occupancy rate calculation is HIGH complexity (requires working hours minus blocked time divided by average service duration)."

**Decision: Ship V1 approximation.**

The precise formula would require:
1. For each employee per day: sum working_hours (handling overrides, days off)
2. Subtract blocked time slots (bookings with status != 'cancelled')
3. Convert to available minutes
4. Calculate: booked_minutes / available_minutes = occupancy %

This is genuinely complex because:
- Working hours vary by employee and day of week
- Overrides (holidays, sick days) change the baseline
- Multi-capacity services complicate slot math
- Buffer times between bookings affect capacity

**V1 Approximation:** `bookings_count / (employees * working_days_in_period * avg_slots_per_day)` where `avg_slots_per_day` is estimated from average service duration vs. average working day length (8 hours = 480 min / avg_duration). This gives a reasonable "booking fill rate" without needing the full override calculation.

For cross-location analytics (ANLYT-05), use the same approximation per location.

## Materialized View Strategy (ANLYT-07)

**Requirement:** Pre-aggregated analytics data refreshed hourly.

**Decision:** Instead of PostgreSQL MATERIALIZED VIEW (which requires raw SQL migration and cannot be expressed in Drizzle ORM pgView), use a **pre-computed analytics_snapshots table** that a BullMQ hourly job populates. This matches the codebase pattern (BullMQ scheduler in notification-worker) and gives us full Drizzle schema control.

The existing `v_daily_booking_summary` view already handles basic aggregation. For extended metrics (payment breakdown, employee stats, peak hours), we add new API routes that query directly but use indexed columns. The BullMQ job refreshes a `revenue_snapshots` table for dashboard KPIs.

For 90-day date ranges, the existing indexes on `(companyId, startTime)` and `(companyId, status)` make direct queries performant enough (<2s). The v_daily_booking_summary view already pre-aggregates per-day. We only need a snapshot table for the most expensive computations (cross-location aggregates, platform-wide MRR).

## Plan Architecture

Given existing infrastructure, the work breaks down as:

1. **Plan 01 — Revenue & Booking Analytics API** (extend existing)
   - Add payment method breakdown, top services by revenue, peak hours heatmap API routes
   - Add customer retention metrics API route
   - These query bookings/payments directly (indexed, performant for 90-day ranges)

2. **Plan 02 — Employee Utilization & Analytics Snapshot**
   - Employee utilization API (bookings per employee, revenue per employee, occupancy approximation)
   - BullMQ analytics snapshot scheduler (hourly refresh of revenue_snapshots table)
   - Analytics snapshot DB table + schema

3. **Plan 03 — Platform Admin Dashboard & Cross-Location Analytics**
   - Platform admin API: MRR, churn, plan distribution, active companies, signup trends
   - Cross-location aggregate API: org-level totals with per-location drill-down
   - Admin guard pattern (role === 'admin' check)

4. **Plan 04 — Analytics UI Enhancement**
   - Extend analytics page with new chart components (payment pie chart, peak hours heatmap, top services, employee utilization)
   - Add customer retention tab/section
   - Cross-location analytics page for franchise owners
   - Platform admin dashboard page
   - Extend export toolbar with customer report CSV/PDF

## Key Libraries Already Available

- `recharts` 3.7.0 — charts
- `@react-pdf/renderer` — PDF generation
- `react-papaparse` / `papaparse` — CSV export
- `date-fns` with Czech locale — date formatting
- `bullmq` — job scheduling (via notification-worker)
- `drizzle-orm` — all DB queries
