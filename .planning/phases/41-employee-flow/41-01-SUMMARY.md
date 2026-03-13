---
phase: 41-employee-flow
plan: "01"
subsystem: ui
tags: [react, tanstack-query, next-js, rbac, booking]

# Dependency graph
requires:
  - phase: 39-auth-session
    provides: JWT user.role available in useAuthStore
  - phase: 40-business-owner-flow
    provides: BookingDetailPanel with confirm/complete/no-show actions

provides:
  - GET /api/v1/employees/me/bookings endpoint (employee-scoped booking list)
  - useMyBookings TanStack Query hook
  - Bookings page conditionally shows employee's own bookings vs all company bookings based on role

affects:
  - 42-customer-portal
  - future booking access-control changes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "resolveEmployee(userUuid, companyId) pattern: look up users.id from uuid, then employees.id from userId + companyId — used in all /me/ employee endpoints"
    - "Dual-hook pattern: both hooks called unconditionally, result selected via isEmployee flag to satisfy React rules-of-hooks"

key-files:
  created:
    - apps/web/app/api/v1/employees/me/bookings/route.ts
    - apps/web/hooks/use-my-bookings.ts
  modified:
    - apps/web/app/[locale]/(dashboard)/bookings/page.tsx
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json

key-decisions:
  - "Both useMyBookings and useBookingsQuery called unconditionally (React hooks rules); result selected via ternary based on isEmployee"
  - "employee_id filter forced server-side in /employees/me/bookings — clients cannot escalate privileges via query params"
  - "Employee column hidden for employees (all bookings are theirs so column is redundant); New Booking button hidden"

patterns-established:
  - "resolveEmployee helper: reuse pattern from working-hours route for all /employees/me/* endpoints"
  - "Dual-hook + ternary selection: safe pattern for role-conditional data fetching without violating rules-of-hooks"

requirements-completed:
  - EMP-03
  - EMP-04

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 41 Plan 01: Employee Flow Summary

**Employee-scoped booking list via /api/v1/employees/me/bookings with server-enforced employee_id filter and role-aware bookings page**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-13T10:43:34Z
- **Completed:** 2026-03-13T10:47:14Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- New `GET /api/v1/employees/me/bookings` API endpoint that resolves the JWT user to their employee record and forces the `employee_id` filter — employees can never see other employees' bookings regardless of query params
- New `useMyBookings` hook with separate cache key `['me', 'bookings', params]` to keep employee cache isolated from owner cache
- Bookings page is now employee-aware: employees see "My Bookings" title, only their own bookings, with employee column and New Booking button hidden; owners retain full existing behavior (no regression)

## Task Commits

Each task was committed atomically:

1. **Task 1: Employee bookings API endpoint and frontend hook** - `e0f671a` (feat)
2. **Task 2: Bookings page employee-aware filtering + translations** - `01403ba` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/app/api/v1/employees/me/bookings/route.ts` - GET endpoint; resolves JWT user to employee record, forces employee_id filter, calls listBookings
- `apps/web/hooks/use-my-bookings.ts` - TanStack Query hook calling /employees/me/bookings with 30s stale time
- `apps/web/app/[locale]/(dashboard)/bookings/page.tsx` - Role-aware: isEmployee uses useMyBookings, hides New Booking button and Employee column
- `apps/web/messages/en.json` - Added `booking.list.myBookings: "My Bookings"`
- `apps/web/messages/cs.json` - Added `booking.list.myBookings: "Moje rezervace"`
- `apps/web/messages/sk.json` - Added `booking.list.myBookings: "Moje rezervácie"`

## Decisions Made

- Both `useMyBookings` and `useBookingsQuery` are called unconditionally (React's rules-of-hooks prohibit conditional hook calls); the active result is selected via `isEmployee ? employeeQuery : ownerQuery`. This is the idiomatic safe pattern.
- Server enforces `employee_id` filter — the client's `employee_id` query param is overwritten with the resolved employee ID. This prevents privilege escalation.
- Employee column hidden for employees (all returned bookings are already theirs, so the column is noise). New Booking button hidden (employees don't create bookings).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

TypeScript check from repository root (`npx tsc --noEmit`) reports pre-existing module resolution errors across all API routes (the `@/` alias is not resolvable from the root tsconfig). Running from `apps/web/` passes with zero errors. This is a known pre-existing issue unrelated to this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Employee booking list and status actions are fully functional
- Employees can open booking detail panel to confirm/complete/mark no-show (BookingDetailPanel uses BOOKINGS_UPDATE permission which employees already have from seed data)
- Ready for Phase 41 Plan 02 (employee schedule/working-hours page or next employee flow feature)

---
*Phase: 41-employee-flow*
*Completed: 2026-03-13*
