---
phase: 48-marketplace-ux
plan: 04
subsystem: settings, email, database
tags: [video-meetings, settings, email, booking-confirmation, schema]
dependency_graph:
  requires: []
  provides: [custom-meeting-url-settings, video-link-in-emails]
  affects: [booking-service, booking-emails, navigation, companies-schema]
tech_stack:
  added: []
  patterns: [tanstack-query-mutation, drizzle-orm-update, zod-refine-custom]
key_files:
  created:
    - apps/web/app/api/v1/settings/video-meeting-url/route.ts
    - apps/web/app/[locale]/(dashboard)/settings/video-meetings/page.tsx
  modified:
    - packages/database/src/schema/auth.ts
    - apps/web/lib/navigation.ts
    - apps/web/lib/email/booking-emails.ts
    - apps/web/lib/booking/booking-service.ts
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json
decisions:
  - key: custom-meeting-url-column
    summary: "Added custom_meeting_url VARCHAR(500) to companies table instead of video_meetings table — avoids CHECK constraint on provider field"
  - key: zod-refine-url-or-empty
    summary: "URL validated as valid URL or empty string (to allow clearing); empty string coerced to NULL in DB"
  - key: fire-and-forget-email
    summary: "meetingUrl passed through existing fire-and-forget booking confirmation email pattern"
metrics:
  duration_minutes: 7
  tasks_completed: 1
  files_modified: 9
  completed_date: "2026-03-18"
---

# Phase 48 Plan 04: Video Meetings Settings Summary

**One-liner:** Custom video meeting URL (Zoom/Teams/Meet) stored on company, shown in Settings page, automatically included in booking confirmation emails.

## What Was Built

### Task 1: Video Meetings settings page + API + nav + email wiring

All five deliverables implemented as a single atomic task:

1. **DB schema** — `custom_meeting_url VARCHAR(500)` column added to `companies` table. Migration applied directly via postgres.js (drizzle-kit push has a pre-existing webhook-config circular ref error unrelated to this plan).

2. **API endpoint** — `GET/PATCH /api/v1/settings/video-meeting-url` at `apps/web/app/api/v1/settings/video-meeting-url/route.ts`. Uses `createRouteHandler` + `PERMISSIONS.SETTINGS_MANAGE`. PATCH accepts valid URL or empty string; empty string clears the URL (stored as NULL).

3. **Settings page** — `apps/web/app/[locale]/(dashboard)/settings/video-meetings/page.tsx` with:
   - TanStack Query (`useQuery` + `useMutation`) for data fetching and optimistic save
   - URL input with save and clear buttons
   - Saved URL display with copy-to-clipboard + external link
   - Info card explaining how the feature works
   - Glass Card styling matching other settings pages
   - Sonner toast on success/error

4. **Navigation** — `Video` icon + `videoMeetings` nav item added to `NAV_ITEMS` in `apps/web/lib/navigation.ts` linking to `/settings/video-meetings` for owner role.

5. **Email wiring** — `BookingEmailData.meetingUrl?: string | null` added; `buildDetailsTable()` renders a "Video schůzka" row with clickable link when set; `buildDetailsText()` includes plain text fallback. `fireBookingCreatedNotifications()` in `booking-service.ts` now selects `companies.customMeetingUrl` and passes it as `meetingUrl`.

6. **i18n** — `videoMeetings` namespace + `nav.videoMeetings` key added to cs/en/sk message files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] drizzle-kit push fails due to pre-existing circular ref**

- **Found during:** Task 1 (DB migration step)
- **Issue:** `packages/database/src/schema/webhook-config.ts` has a circular reference at load time causing drizzle-kit push to crash with `TypeError: Cannot read properties of undefined (reading 'id')`
- **Fix:** Applied migration directly via `postgres.js` inline Node script: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom_meeting_url VARCHAR(500)`
- **Files modified:** None (runtime fix)
- **Commit:** Not applicable — DB migration applied outside version control

**2. [Rule 3 - Blocking] lint-staged "empty commit" prevention**

- **Found during:** Commit step
- **Issue:** lint-staged formatted files then detected no diff after formatting (pre-commit hook blocked empty commit)
- **Resolution:** All changes were already present in prior commits (`5dc13a4`, `b9dcf79`) from the previous plan's agent run
- **Impact:** None — task is fully complete

## Self-Check

Verified all deliverables present in git HEAD:

- `packages/database/src/schema/auth.ts` — `customMeetingUrl` column present
- `apps/web/app/api/v1/settings/video-meeting-url/route.ts` — GET/PATCH exports present
- `apps/web/app/[locale]/(dashboard)/settings/video-meetings/page.tsx` — 185+ lines
- `apps/web/lib/navigation.ts` — `Video` import + `videoMeetings` nav item present
- `apps/web/lib/email/booking-emails.ts` — `meetingUrl` field + `meetingRow` rendering present
- `apps/web/lib/booking/booking-service.ts` — `customMeetingUrl` selected + passed to email
- TypeScript: `npx tsc --noEmit` passes with 0 errors

## Self-Check: PASSED
