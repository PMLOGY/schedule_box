---
phase: 47-notifications-super-admin
plan: "02"
subsystem: notifications
tags: [notifications, email, sms, cron, booking-lifecycle]
dependency_graph:
  requires: [47-01]
  provides: [booking-confirmation-email, booking-status-email, sms-reminder-cron]
  affects: [booking-service, booking-transitions, vercel-cron]
tech_stack:
  added: []
  patterns: [fire-and-forget-email, cron-batch-processing, notification-status-lifecycle]
key_files:
  created:
    - apps/web/app/api/v1/cron/sms-reminders/route.ts
    - vercel.json
  modified:
    - apps/web/lib/booking/booking-service.ts
    - apps/web/lib/booking/booking-transitions.ts
    - apps/web/app/api/v1/admin/feature-flags/route.ts
    - apps/web/app/api/v1/admin/feature-flags/[id]/route.ts
    - apps/web/app/api/v1/admin/feature-flags/[id]/overrides/route.ts
decisions:
  - "Fire-and-forget email pattern: email calls wrapped in .then/.catch outside DB transactions to ensure email failure never rolls back booking operations"
  - "SMS reminder row created at booking time with scheduledAt = startTime - 24h, picked up by cron rather than scheduled inline"
  - "Cron route uses 30-minute lookback window to catch reminders missed in prior cycle"
  - "CRON_SECRET Bearer token auth on cron endpoint — same pattern as existing env.ts config"
metrics:
  duration: 20min
  completed_date: "2026-03-18"
  tasks: 2
  files: 7
---

# Phase 47 Plan 02: Booking Notifications Wiring Summary

Wired transactional email and SMS notifications into booking lifecycle — confirmation email on create, status-change emails on confirm/cancel/complete, SMS reminder row created at booking time and delivered by Vercel Cron.

## What Was Built

### Task 1: Booking Email Wiring
- **booking-service.ts**: Added `fireBookingCreatedNotifications()` helper that fires after the booking transaction commits
  - Inserts `notifications` record (channel='email', status='pending') for the customer
  - Calls `sendBookingConfirmationEmail()` fire-and-forget with `.then(sent)` / `.catch(failed)` status update
  - Inserts SMS reminder `notifications` row (channel='sms', status='pending', scheduledAt = startTime - 24h) if customer has a phone number
- **booking-transitions.ts**: Added `fireStatusChangeEmail()` helper called after each status transition
  - `confirmBooking()` fires 'confirmed' email
  - `cancelBooking()` fires 'cancelled' email
  - `completeBooking()` fires 'completed' email
  - Inserts notification record with pending to sent/failed lifecycle tracking
  - All calls use `void fireStatusChangeEmail(...)` — never blocks booking return

### Task 2: SMS Cron Route + vercel.json
- **apps/web/app/api/v1/cron/sms-reminders/route.ts**: Vercel Cron GET handler
  - Validates `Authorization: Bearer ${CRON_SECRET}` header (401 on mismatch)
  - Queries `notifications` WHERE channel='sms' AND status='pending' AND scheduledAt BETWEEN (now-30min) AND now
  - Processes up to 50 reminders per invocation (Vercel timeout safe)
  - Calls `sendSMS(recipient, body)` per reminder, updates status to sent/failed
  - Returns `{ processed, sent, failed }` JSON
  - `export const runtime = 'nodejs'` and `maxDuration = 30` for Twilio SDK compatibility
- **vercel.json**: Created with `*/15 * * * *` cron schedule for `/api/v1/cron/sms-reminders`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed user.uuid/user.id references in admin feature-flag routes**

- **Found during:** Task 2 TypeScript verification
- **Issue:** Three admin feature-flag routes (route.ts, [id]/route.ts, [id]/overrides/route.ts) were using `user.uuid` and `user.id` which do not exist on `JWTPayload` (only `sub` for UUID is available). These files arrived via lint-staged stash restore from Phase 47-01 admin routes.
- **Fix:** Changed all three files to use `user.sub` as adminUuid and look up the internal user ID via `db.select({ id: users.id }).where(eq(users.uuid, user.sub))`
- **Files modified:** `apps/web/app/api/v1/admin/feature-flags/route.ts`, `apps/web/app/api/v1/admin/feature-flags/[id]/route.ts`, `apps/web/app/api/v1/admin/feature-flags/[id]/overrides/route.ts`

## Verification

- TypeScript compiles cleanly after all changes
- Booking creation route fires confirmation email (via booking-service.ts) and creates SMS reminder row
- Status transitions (confirm/cancel/complete) fire status change emails (via booking-transitions.ts)
- Cron route validates CRON_SECRET — returns 401 on missing/wrong Bearer token
- vercel.json has crons array with sms-reminders on */15 schedule
- Notification records inserted with correct status lifecycle (pending to sent/failed)
- Email failure never blocks booking operations (all calls are fire-and-forget with void)

## Commits

- `6e0fddd` feat(web): wire booking email notifications into create and status transitions
- `7576eaf` feat(web): add SMS reminder cron route and vercel.json cron schedule

## Self-Check: PASSED
