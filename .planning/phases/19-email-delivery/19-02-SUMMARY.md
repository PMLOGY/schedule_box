---
phase: 19-email-delivery
plan: "02"
subsystem: backend
tags: [handlebars, email-templates, notification-worker, drizzle-orm, multi-tenancy]

# Dependency graph
requires:
  - phase: 19-email-delivery
    provides: email infrastructure (booking-consumer, reminder-scheduler, template-renderer, layout.hbs)

provides:
  - booking-cancellation.hbs Handlebars template with Czech content
  - layout.hbs without broken unsubscribe_url placeholder
  - booking-consumer.ts with real company name DB lookup (confirmation + cancellation handlers)
  - reminder-scheduler.ts with real company name DB lookup per booking
  - cancellation emails rendered from template file (not inline HTML)

affects: [email-delivery, smtp-configuration, notification-worker, multi-tenant-emails]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Tenant company name always fetched from companies table with ScheduleBox fallback
    - Cancellation emails use renderTemplateFile (synchronous) matching confirmation/reminder pattern
    - Transactional emails use static footer note instead of broken unsubscribe link

key-files:
  created:
    - services/notification-worker/src/templates/email/booking-cancellation.hbs
  modified:
    - services/notification-worker/src/templates/email/layout.hbs
    - services/notification-worker/src/consumers/booking-consumer.ts
    - services/notification-worker/src/schedulers/reminder-scheduler.ts

key-decisions:
  - 'Transactional emails do not need unsubscribe links under Czech law: replaced {{unsubscribe_url}} with static note'
  - 'renderTemplateFile is synchronous: no await used in new cancellation template call'
  - 'Company name fallback is ScheduleBox string: prevents empty sender name if DB lookup fails'

patterns-established:
  - 'DB company name lookup pattern: const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1); const companyName = company?.name || ScheduleBox;'

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 19 Plan 02: Email Template Fixes Summary

**Booking cancellation emails now use a proper Handlebars template, all tenant emails show the real company name from the DB, and the broken unsubscribe link placeholder is removed from layout.hbs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T18:41:42Z
- **Completed:** 2026-02-20T18:44:30Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Created `booking-cancellation.hbs` with full Czech content matching the visual style of confirmation and reminder templates
- Replaced broken `{{unsubscribe_url}}` anchor in `layout.hbs` footer with a static transactional note (removes spam filter flag)
- Fixed both `handleBookingCreated` and `handleBookingCancelled` in `booking-consumer.ts` to fetch real company name from the `companies` DB table
- Fixed `reminder-scheduler.ts` to fetch real company name per booking instead of hardcoding 'ScheduleBox'
- Wired `handleBookingCancelled` to use `renderTemplateFile('booking-cancellation')` instead of inline HTML string

## Task Commits

Each task was committed atomically:

1. **Task 1: Create booking cancellation template and fix layout unsubscribe placeholder** - `a7c3359` (feat)
2. **Task 2: Fix hardcoded company name and wire cancellation template** - `a7ac1ba` (fix)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `services/notification-worker/src/templates/email/booking-cancellation.hbs` - New Czech cancellation email template with customer_name, service_name, booking_date, reason (optional), company_name
- `services/notification-worker/src/templates/email/layout.hbs` - Replaced broken {{unsubscribe_url}} anchor with static transactional note
- `services/notification-worker/src/consumers/booking-consumer.ts` - Added companies import, DB lookup in handleBookingCreated and handleBookingCancelled, renderTemplateFile call for cancellation
- `services/notification-worker/src/schedulers/reminder-scheduler.ts` - Added companies import, DB lookup per booking in scanWindow

## Decisions Made

- `{{unsubscribe_url}}` removed rather than conditionally rendered: transactional booking emails never populate it, and Czech law does not require unsubscribe links for transactional messages
- `renderTemplateFile` called without `await`: function is synchronous (uses `readFileSync` internally)
- Company name fallback to string `'ScheduleBox'`: prevents empty sender name in edge case where company row is missing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Stale `.git/index.lock` file after first commit attempt caused `fatal: Unable to create index.lock` on Task 2 commit; resolved by retrying (lock was already gone by then — likely a transient pre-commit hook race condition).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three email code gaps are fixed; notification worker is ready for SMTP configuration (Phase 19 Plan 03)
- `booking-cancellation.hbs` follows the same layout pattern as confirmation and reminder — consistent visual style across all booking email types
- TypeScript compiles clean with no errors after all changes

---

_Phase: 19-email-delivery_
_Completed: 2026-02-20_

## Self-Check: PASSED

All files exist and all task commits verified on disk.
