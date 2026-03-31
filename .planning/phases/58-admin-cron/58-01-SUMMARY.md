---
phase: 58-admin-cron
plan: 01
subsystem: admin-dashboard
tags: [admin, analytics, cohort, broadcast, maintenance]
dependency-graph:
  requires: []
  provides: [cohort-analysis-api, cohort-analysis-ui]
  affects: [admin-analytics-page]
tech-stack:
  added: []
  patterns: [raw-sql-cohort-pivot, heatmap-table-component]
key-files:
  created:
    - apps/web/app/api/v1/admin/cohort/route.ts
    - apps/web/components/analytics/cohort-analysis-panel.tsx
  modified:
    - apps/web/app/[locale]/(dashboard)/analytics/admin/page.tsx
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json
decisions:
  - Snapshot-based retention (current active status) since no per-month activity logs exist
  - Separate React Query for cohort data rather than extending existing useAdminAnalytics hook
metrics:
  duration: 3m 21s
  completed: 2026-03-31
---

# Phase 58 Plan 01: Admin Cohort Analysis + Verify Broadcast/Maintenance Summary

Cohort retention API and heatmap table for super-admin dashboard; verified broadcast and maintenance features are correctly wired.

## What Was Done

### Task 1: Cohort Retention API Endpoint (ADM-03)
- Created `GET /api/v1/admin/cohort` with admin role guard
- Raw SQL query groups companies by signup month (last 12 months)
- Calculates current retention as % of cohort still active (isActive=true, suspendedAt IS NULL)
- Returns cohort array with month, signups, retention percentages, plus months column headers
- Commit: cee125f

### Task 2: Cohort Analysis UI Component (ADM-03)
- Created `CohortAnalysisPanel` component with color-coded retention heatmap
  - Green (>=80%), Yellow (50-80%), Red (<50%) retention colors
  - Table with signup month, signup count, and retention columns
  - Dark mode support
- Wired into admin analytics page with separate useQuery for `/admin/cohort`
- Added translation keys to cs.json, en.json, sk.json under `admin.cohort` namespace
- Commit: cee125f

### Task 3: Verify Broadcast + Maintenance (ADM-01, ADM-02)
- **Broadcast (ADM-01):** Verified all components wired correctly:
  - `/admin/broadcast` page with create dialog, audience filter, confirmation count
  - `/api/v1/admin/broadcast` GET + POST handlers with admin auth
  - `/api/v1/cron/broadcast-dispatch` cron handler with CRON_SECRET auth
  - `BroadcastBanner` mounted in dashboard page, dismissible via localStorage
- **Maintenance (ADM-02):** Verified all components wired correctly:
  - `/admin/maintenance` page with toggle switch and custom message
  - `/api/v1/admin/maintenance` GET + PUT handlers with Redis
  - `middleware.ts` checks `maintenance:enabled` via Upstash HTTP, with bypass cookie logic
  - `/maintenance` branded page with ScheduleBox logo and animated dots
- All features compile with zero errors in our files

## Deviations from Plan

None - plan executed exactly as written.

## Verification

1. TypeScript compilation passes (only pre-existing error in unrelated `automation/execute/route.ts`)
2. GET /api/v1/admin/cohort endpoint exists with admin auth guard
3. CohortAnalysisPanel component exists and imported in admin analytics page
4. BroadcastBanner is mounted in dashboard page
5. Maintenance middleware redirect logic present in middleware.ts

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1-3 | All tasks | cee125f | cohort/route.ts, cohort-analysis-panel.tsx, admin/page.tsx, cs/en/sk.json |
