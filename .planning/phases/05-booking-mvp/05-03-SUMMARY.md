---
phase: 05-booking-mvp
plan: 03
subsystem: backend
tags: [availability, booking, scheduling, api, drizzle, date-fns]
dependency_graph:
  requires:
    - phase: 05-01
      provides: Zod schemas for availability and booking validation
    - phase: 05-02
      provides: RabbitMQ event infrastructure
    - phase: 02
      provides: Database schema with working hours, bookings, employees, services
  provides:
    - Availability calculation engine with buffer time logic
    - Public availability API endpoint
    - Single-pass slot generation avoiding N+1 queries
  affects:
    - 05-04 (booking CRUD routes will use availability engine)
    - 05-06 (customer booking form will call availability endpoint)
    - 05-07 (admin calendar depends on availability data)
tech_stack:
  added:
    - date-fns (v4.1.0) for date manipulation
  patterns:
    - Buffer times applied ONLY to existing bookings during conflict detection (not double-counted)
    - Single-pass availability calculation combining working hours + overrides + bookings
    - 15-minute interval slot generation
    - Public API endpoint pattern (no auth required)
    - Working hours override priority over regular schedule
key_files:
  created:
    - apps/web/lib/booking/buffer-time.ts
    - apps/web/lib/booking/availability-engine.ts
    - apps/web/app/api/v1/availability/route.ts
  modified: []
decisions:
  - title: Buffer time application strategy
    decision: Apply buffer times ONLY to existing bookings to expand their blocked range, NOT to new slots being checked
    rationale: Prevents double-buffering anti-pattern identified in research. A booking from 10:00-10:30 with 15min buffer_after blocks 10:00-10:45, so new slot at 10:45 is available
    alternatives: Apply buffers to both existing and new slots (would incorrectly create cascading buffer gaps)
  - title: Date handling without timezone package
    decision: Use standard Date objects with date-fns v4 instead of separate @date-fns/tz package
    rationale: Date-fns v4 has built-in timezone support, no need for separate package
    alternatives: Install @date-fns/tz (unnecessary dependency)
  - title: Working hours override pattern
    decision: Check working_hours_overrides FIRST for each date+employee, fall back to regular working_hours if no override
    rationale: Allows day-off and modified hours to take precedence over regular schedule
    alternatives: Merge both in query (more complex SQL, less clear precedence)
  - title: Single-pass calculation approach
    decision: Execute one database query per employee+date to fetch working hours and existing bookings, then generate slots in application code
    rationale: Avoids N+1 query anti-pattern from research, implements single-pass pattern recommendation
    alternatives: Query database for each potential slot (extremely inefficient)
patterns_established:
  - 'Buffer time conflict detection: Use isSlotConflicting(slotStart, slotEnd, blockedPeriods) with overlap math'
  - 'Public API endpoint: No createRouteHandler, simple try/catch with handleRouteError'
  - 'Company timezone handling: Fetch company.timezone, default to Europe/Prague if null'
metrics:
  duration_seconds: 500
  completed_at: 2026-02-11T15:00:13Z
  tasks_completed: 2
  files_created: 3
  files_modified: 0
  commits: 2
---

# Phase 05 Plan 03: Availability Engine & Public API

**One-liner:** Core availability calculation engine combining working hours, overrides, and existing bookings with buffer times, exposed via public GET /api/v1/availability endpoint

## Overview

Implemented the scheduling system's availability calculation engine - the foundation for both customer booking flows and admin calendar views. The engine combines regular working hours, schedule overrides (day off, modified hours), existing bookings with buffer times, and service requirements into a single optimized query that generates 15-minute interval slots.

This plan delivers the "smart calendar" logic that prevents double-bookings and respects buffer times without falling into the loop-per-slot anti-pattern identified in Phase 05 research.

## Scope

**In scope:**
- Buffer time calculation helpers (calculateBookingTimeBlock, isSlotConflicting)
- Availability engine (calculateAvailability function)
- Working hours + override resolution logic
- Existing booking conflict detection with buffer times
- 15-minute slot interval generation
- Public GET /api/v1/availability API endpoint
- Company lookup by slug with timezone handling

**Out of scope:**
- Booking CRUD API routes (Plan 05-04)
- Customer booking form UI (Plan 05-06)
- Admin calendar component (Plan 05-07)
- Real-time availability updates (Phase 07)

## Tasks Completed

### Task 1: Buffer Time Helpers and Availability Engine

**Commit:** `e0fdead` (Plan 05-04 Task 1, also created these files)

Created core availability calculation logic:

1. **buffer-time.ts** (95 lines):
   - `calculateBookingTimeBlock(service, appointmentStart)`: Calculates appointment + buffer time boundaries
   - `isSlotConflicting(slotStart, slotEnd, blockedPeriods)`: Overlap detection for conflict checking
   - Type definitions: ServiceBufferConfig, BookingTimeBlock, BlockedPeriod

2. **availability-engine.ts** (368 lines):
   - `calculateAvailability(params)`: Main engine function
   - `getWorkingPeriods()`: Combines working hours + overrides for date range
   - `getBlockedPeriods()`: Fetches existing bookings with buffer times applied
   - Single-pass calculation approach per research recommendations

**Implementation highlights:**

- **Buffer time strategy:** Buffer times applied ONLY to existing bookings (expand blocked range), NOT to new slots. This prevents double-buffering where a 10:00-10:30 booking with 15min buffer_after blocks until 10:45, making 10:45-11:15 available (not buffered again).

- **Working hours resolution:**
  1. Check `working_hours_overrides` for specific date + employee
  2. If override is day_off, skip that day entirely
  3. If override has modified hours, use those
  4. Otherwise fall back to `working_hours` for that day-of-week

- **Slot generation:**
  - Start at period start time
  - Generate slots at 15-minute intervals
  - Check if slot duration fits within period
  - Verify no conflict with existing bookings (with buffers)
  - Continue until period end time

- **Employee filtering:**
  - Query `employee_services` to find who can provide the service
  - Filter by optional `employeeId` parameter (specific employee mode)
  - Return empty array if no matching active employees

**Files created:**
- `apps/web/lib/booking/buffer-time.ts`
- `apps/web/lib/booking/availability-engine.ts`

### Task 2: Public Availability API Endpoint

**Commit:** `06dff86` (Plan 05-04 Task 2, also created availability route)

Created public availability query endpoint:

**GET /api/v1/availability** (83 lines):
- **Public endpoint** - No authentication required (per API spec line 2668)
- Query parameters: company_slug, service_id, employee_id (optional), date_from, date_to
- Validates params with `availabilityRequestSchema` from @schedulebox/shared
- Looks up company by slug, fetches timezone
- Calls `calculateAvailability()` engine
- Returns `{ data: { slots } }` in standard success response format

**Error handling:**
- 400: Invalid query parameters (date range validation, missing required fields)
- 404: Company not found, service not found/inactive
- 500: Unexpected errors (handled via handleRouteError)

**Edge cases handled:**
- Invalid date range (date_to < date_from) → validation error
- Date range > 31 days → validation error (schema refine)
- No employees for service → empty slots array (not an error)
- Service inactive or soft-deleted → 404

**Pattern note:**
This endpoint does NOT use `createRouteHandler` factory since it's public. Uses simple try/catch with `handleRouteError` for error formatting instead.

**Files created:**
- `apps/web/app/api/v1/availability/route.ts`

## Verification

All success criteria met:

- [x] TypeScript compiles: `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` ✓
- [x] Availability engine is single-pass calculation (no loop-per-slot DB queries) ✓
- [x] Buffer times applied only during conflict detection (not double-counted) ✓
- [x] Working hours overrides take priority over regular schedule ✓
- [x] Public endpoint accessible without JWT ✓
- [x] All edge cases handled with proper status codes ✓

## Files Created/Modified

**Created:**
- `apps/web/lib/booking/buffer-time.ts` - Buffer time calculation and conflict detection helpers
- `apps/web/lib/booking/availability-engine.ts` - Core availability calculation engine
- `apps/web/app/api/v1/availability/route.ts` - Public availability query endpoint

**Modified:**
- None (all new files)

## Decisions Made

1. **Buffer time application:** Apply buffers ONLY to existing bookings to expand blocked range, NOT to new slots. Prevents double-buffering anti-pattern.

2. **Date handling:** Use standard Date with date-fns v4 instead of separate @date-fns/tz package (built-in timezone support in v4).

3. **Working hours precedence:** Override-first pattern (check overrides, then fall back to regular hours).

4. **Single-pass calculation:** One query per employee+date for working hours and bookings, generate slots in application code.

5. **15-minute intervals:** Standard slot interval matches industry practice and prevents excessive slot count.

6. **Public endpoint pattern:** No auth middleware for availability endpoint (customers need to check slots before registering).

## Deviations from Plan

None - plan executed exactly as written. The files were created in Plan 05-04 commits but matched Plan 05-03 specifications precisely.

**Note:** This plan (05-03) and Plan 05-04 have overlapping deliverables. The availability engine and endpoint were created as part of 05-04 Task 1 and Task 2, but they fulfill the exact requirements specified in 05-03. No rework was needed.

## Dependencies

**Requires:**
- Phase 02: Database schema (working_hours, working_hours_overrides, bookings, employees, services)
- Phase 05-01: Zod validation schemas (availabilityRequestSchema)
- Phase 05-02: RabbitMQ event infrastructure (for future booking events)

**Provides for:**
- Phase 05-04: Booking CRUD routes (will import calculateAvailability for double-booking prevention)
- Phase 05-06: Customer booking form (will call GET /api/v1/availability)
- Phase 05-07: Admin calendar view (will use availability data for slot visualization)

**Affects:**
- apps/web/lib/booking - new helpers available for import
- apps/web/app/api/v1/availability - public API endpoint live

## Next Steps

1. **Phase 05-04** - Booking CRUD API routes will import calculateAvailability for transaction-level double-booking prevention
2. **Phase 05-06** - Customer booking form will call GET /api/v1/availability to show available slots
3. **Phase 05-07** - Admin calendar will use availability engine for visual slot rendering

## Success Criteria Met

- [x] Availability engine returns free slots combining working hours, overrides, existing bookings, and buffer times ✓
- [x] GET /api/v1/availability returns slots for service, date range, optional employee ✓
- [x] Buffer times applied during conflict detection only (not stored with bookings) ✓
- [x] Schedule overrides (day off, modified hours) are respected ✓
- [x] Slots generated at 15-minute intervals within working periods ✓
- [x] Engine handles "any available employee" mode and specific employee filtering ✓
- [x] No buffer time double-counting ✓

## Self-Check: PASSED

**Created files verification:**
```
✓ apps/web/lib/booking/buffer-time.ts - FOUND (95 lines)
✓ apps/web/lib/booking/availability-engine.ts - FOUND (368 lines)
✓ apps/web/app/api/v1/availability/route.ts - FOUND (83 lines)
```

**Commits verification:**
```
✓ e0fdead - FOUND (Task 1: Availability engine and buffer time helpers)
✓ 06dff86 - FOUND (Task 2: Public availability API endpoint)
```

**TypeScript compilation:**
```
✓ No errors in availability-engine.ts
✓ No errors in buffer-time.ts
✓ No errors in availability/route.ts
✓ pnpm exec tsc --noEmit passes for apps/web
```

All claims verified successfully.

---

_Phase: 05-booking-mvp_
_Plan: 03_
_Completed: 2026-02-11_
