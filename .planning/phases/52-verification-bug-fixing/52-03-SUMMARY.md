---
phase: 52-verification-bug-fixing
plan: 03
subsystem: api
tags: [booking, notifications, email, sms, availability, public-api, nodemailer]

# Dependency graph
requires:
  - phase: 52-01
    provides: Dev server boot, smoke test baseline
provides:
  - Verified end-to-end public booking flow (service list, availability, booking creation)
  - Booking confirmation notifications wired into public booking endpoint
  - Status change notifications verified (confirm, cancel, complete)
affects: [52-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [fire-and-forget notification with DB status tracking, graceful email degradation]

key-files:
  created: []
  modified:
    - apps/web/app/api/v1/public/company/[slug]/bookings/route.ts
    - apps/web/lib/booking/booking-service.ts

key-decisions:
  - 'Public booking notification uses same fireBookingCreatedNotifications as internal booking service'
  - 'Email failures recorded as notification status=failed with error message, never block booking response'

patterns-established:
  - 'Notification records always created in DB regardless of email delivery success'

requirements-completed: [VER-03, VER-06]

# Metrics
duration: 7min
completed: 2026-03-29
---

# Phase 52 Plan 03: Booking Flow & Notification Pipeline Summary

**Public booking wizard verified end-to-end with notification gap fixed: confirmation emails and SMS reminders now fire on public bookings, status change emails work for confirm/cancel/complete**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-29T10:33:58Z
- **Completed:** 2026-03-29T10:41:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Public booking page loads (307 redirect to locale, resolves to 200)
- Services endpoint returns 7 active services for salon-krasa seed company
- Availability endpoint returns time slots with employee assignment for any valid date
- Booking creation via public API returns 201 with full booking details
- Double-booking prevention works (returns 409 SLOT_TAKEN on conflict)
- Booking appears in owner dashboard via authenticated bookings list
- Notification records created in DB for booking confirmation (email + SMS reminder)
- Status change notifications created for confirm, cancel, and complete transitions
- Email delivery gracefully degrades to status=failed when SMTP target rejects

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify public booking wizard end-to-end** - No code changes needed (all endpoints working correctly)
2. **Task 2: Verify notification pipeline + fix missing trigger** - `6a01c3e` (fix)

## Files Created/Modified

- `apps/web/app/api/v1/public/company/[slug]/bookings/route.ts` - Added fireBookingCreatedNotifications call after public booking creation
- `apps/web/lib/booking/booking-service.ts` - Exported fireBookingCreatedNotifications for use by public booking route

## Decisions Made

- Reused existing `fireBookingCreatedNotifications` from booking-service.ts rather than duplicating notification logic in the public route
- Email delivery failures are recorded in the notifications table with status=failed and the error message, never blocking the booking response

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Public booking endpoint missing notification trigger**

- **Found during:** Task 2 (Verify notification pipeline)
- **Issue:** Public booking creation at `/api/v1/public/company/[slug]/bookings` published a no-op domain event but never called `fireBookingCreatedNotifications`, so no notification records were created in the DB for public bookings
- **Fix:** Exported `fireBookingCreatedNotifications` from booking-service.ts, imported and called it (fire-and-forget) in the public booking route after successful booking creation
- **Files modified:** apps/web/app/api/v1/public/company/[slug]/bookings/route.ts, apps/web/lib/booking/booking-service.ts
- **Verification:** Created test booking via public API, confirmed email notification (status=failed due to invalid test domain) and SMS reminder (status=pending) records exist in notifications table
- **Committed in:** 6a01c3e

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Critical fix -- without it, public bookings would never generate any notifications. No scope creep.

## Issues Encountered

- Admin super-user (admin@schedulebox.cz) cannot view company notifications because admin is not assigned to a company -- this is by design (super-admin is system-level, not company-scoped). Owners view their own notifications via /api/v1/notifications.

## User Setup Required

None - no external service configuration required. SMTP credentials needed for actual email delivery but notifications are logged regardless.

## Next Phase Readiness

- Booking flow fully verified and working end-to-end
- Notification pipeline operational with graceful degradation
- Ready for Phase 52-04 (remaining verification tasks)

## Self-Check: PASSED

- FOUND: apps/web/app/api/v1/public/company/[slug]/bookings/route.ts
- FOUND: apps/web/lib/booking/booking-service.ts
- FOUND: .planning/phases/52-verification-bug-fixing/52-03-SUMMARY.md
- FOUND: commit 6a01c3e

---

_Phase: 52-verification-bug-fixing_
_Completed: 2026-03-29_
