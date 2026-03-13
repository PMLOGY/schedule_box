---
phase: 40-business-owner-flow
plan: 02
subsystem: ui
tags: [react, tanstack-query, bookings, calendar, dashboard, react-big-calendar]

# Dependency graph
requires:
  - phase: 40-business-owner-flow
    provides: booking list, calendar, and dashboard pages built in plan 01
provides:
  - Booking detail panel correctly receives UUID for API action calls (confirm/cancel/complete/no-show)
  - Calendar events use booking.uuid as event id and display employee names in titles
  - All dashboard sub-pages confirmed to use real React Query API hooks (no mock data)
affects: [future booking management, calendar features, dashboard enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Always use booking.uuid (not booking.id) when passing booking identifier to API endpoints"
    - "Calendar event titles include employee name: 'Customer - Service (Employee)'"

key-files:
  created: []
  modified:
    - apps/web/app/[locale]/(dashboard)/bookings/page.tsx
    - apps/web/components/booking/BookingCalendar.tsx
    - apps/web/hooks/use-bookings-query.ts

key-decisions:
  - "UUID-based booking identification confirmed as the correct approach for all API calls; numeric id was a bug"
  - "RevenueMiniChart synthetic daily distribution from analytics totals is acceptable — daily endpoint out of scope"

patterns-established:
  - "UUID vs numeric ID: booking.uuid for public API routes, booking.id for internal DB keys only"

requirements-completed:
  - OWNER-04
  - OWNER-05
  - OWNER-06

# Metrics
duration: 13min
completed: 2026-03-13
---

# Phase 40 Plan 02: Business Owner Flow — Booking Actions & Dashboard Data Summary

**Booking UUID bug fixed end-to-end: list click, calendar click, and action mutations all now use booking.uuid; dashboard confirmed 100% real API data**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-13T13:57:23Z
- **Completed:** 2026-03-13T14:10:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Fixed critical bug: bookings list page was passing `String(booking.id)` (numeric) to `handleRowClick`, which caused `BookingDetailPanel` and all action mutations to call API with wrong ID format (404s). Changed to `booking.uuid`.
- Fixed BookingCalendar: calendar event `id` was using `booking.id` (numeric); changed to `booking.uuid` so `handleSelectEvent` → `BookingDetailPanel` receives correct UUID.
- Calendar events now show employee name in title: `Customer - Service (Employee)` format for both `BookingCalendar.tsx` and `useBookingsForCalendar` hook.
- Verified all dashboard sub-pages use real React Query hooks: DashboardGrid/RevenueMiniChart → `useAnalyticsQuery`, RecentBookings → `useBookingsQuery`, Settings → `useCompanySettingsQuery`/`useWorkingHoursQuery`, Payments → `usePaymentsQuery`, Customers → `useCustomersQuery`, Reviews → `useReviewsQuery`, Loyalty → real hooks, Analytics → `useBookingAnalytics`/`useAnalyticsOverview`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit and fix booking actions and calendar data flow** - `92e97cd` (fix: use booking UUID, add employee name to calendar event titles)
2. **Task 2: Verify all dashboard sub-pages load real data** - No code changes needed — all pages confirmed to already use real API hooks

**Plan metadata:** pending docs commit

## Files Created/Modified

- `apps/web/app/[locale]/(dashboard)/bookings/page.tsx` — Changed `handleRowClick(String(booking.id))` to `handleRowClick(booking.uuid)`
- `apps/web/components/booking/BookingCalendar.tsx` — Event id uses `booking.uuid`, title includes employee name
- `apps/web/hooks/use-bookings-query.ts` — `useBookingsForCalendar` titles include employee name

## Decisions Made

- UUID-based booking identification is the correct approach for all API routes; the numeric `booking.id` is only for internal DB references. This pattern must be maintained in all future booking-related features.
- `RevenueMiniChart` generates a synthetic daily distribution from the analytics total revenue. This is acceptable for the MVP dashboard — a dedicated daily-revenue endpoint is out of scope for v2.0.

## Deviations from Plan

None — plan executed exactly as written. Task 1 fixes were already partially committed in `92e97cd` (the previous plan's final commit), confirming they were correctly identified and applied.

## Issues Encountered

- The Task 1 fixes (UUID bug, calendar event id, employee name in titles) were already present in `92e97cd` which was committed as the tail of plan 40-01. The changes were properly applied; no re-work was needed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Booking action flow (confirm/cancel/complete/no-show) is now end-to-end correct with UUID routing.
- Calendar displays real bookings with employee names visible in event tiles.
- All dashboard sub-pages confirmed real-data — ready for Phase 41 (Employee & Resource Management or next business owner flow phase).

---
*Phase: 40-business-owner-flow*
*Completed: 2026-03-13*
