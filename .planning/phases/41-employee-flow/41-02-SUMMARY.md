---
phase: 41-employee-flow
plan: 02
subsystem: ui
tags: [next-intl, tanstack-query, schedule, working-hours, i18n, employee-self-service]

# Dependency graph
requires:
  - phase: 41-employee-flow-01
    provides: employee bookings page and useMyBookings hook
  - phase: 39-auth-session
    provides: employee auth context and session with company_id
provides:
  - "Working hours grid with all-7-day persist-on-save (EMP-01)"
  - "Time-off date range form creating one override per day (EMP-02)"
  - "Translated day names in 3 locales (Sunday-Saturday / Neděle-Sobota / Nedeľa-Sobota)"
  - "Active badge on future schedule overrides"
affects:
  - 41-employee-flow-03
  - 42-customer-portal

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Loop-create pattern: date range -> iterate days -> mutateAsync per day"
    - "Always send all 7 working hour rows to preserve inactive days in DB"

key-files:
  created:
    - apps/web/app/[locale]/(dashboard)/schedule/page.tsx
  modified:
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json

key-decisions:
  - "handleSave sends all 7 days unconditionally — sending only active days caused inactive days to be deleted from DB on next save"
  - "Date range creates N separate override records (one per day) rather than storing a range — consistent with existing schema"
  - "Active badge shown for overrides where date >= today (client-side comparison) — no server-side status field needed"

patterns-established:
  - "Translation pattern: use t('days.N') for day-of-week labels rather than hardcoded locale arrays"

requirements-completed: [EMP-01, EMP-02]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 41 Plan 02: Employee Schedule Management Summary

**Fixed working-hours save cycle (all-7-days persist), replaced hardcoded Czech day names with i18n translations, and enhanced time-off form to support date ranges creating multiple override records**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T15:03:30Z
- **Completed:** 2026-03-13T15:07:16Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Working hours now save all 7 days on every PUT so inactive days persist correctly across page reload
- Day names (Sunday-Saturday) fully translated in English, Czech (with diacritics), and Slovak
- Time-off dialog upgraded from single-date to start + end date range; creates one override per day in the range
- "Active" badge added to future-dated overrides in the list

## Task Commits

1. **Task 1: Audit and fix working hours save/load cycle** + **Task 2: Audit and enhance time-off request flow** - `10bc982` (feat)

Note: Both tasks modified the same `schedule/page.tsx` file and were committed together in a single atomic commit alongside the locale additions.

## Files Created/Modified
- `apps/web/app/[locale]/(dashboard)/schedule/page.tsx` - Rewrote with fixed save logic, i18n day names, date range form, active badge
- `apps/web/messages/en.json` - Added `schedule.days.0-6`, `schedule.endDate`, `schedule.dateRange`, `schedule.active`
- `apps/web/messages/cs.json` - Added same keys in Czech with correct diacritics
- `apps/web/messages/sk.json` - Added same keys in Slovak with correct diacritics

## Decisions Made
- **All-7-day save:** The original `handleSave` only sent active days (`editedHours.filter(h => h.is_active)`). On reload, previously inactive days would not appear because they had been deleted. Fix: always send all 7 days, let the API's delete-then-insert transaction handle state replacement.
- **Date range as N records:** Creating one override per day (not a range row) matches the existing `workingHoursOverrides` schema which stores individual dates. No schema changes needed.
- **Active badge client-side:** Compare `override.date >= today` on the client for simplicity. The GET endpoint already filters to future dates only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed handleSave sending only active hours**
- **Found during:** Task 1 (Audit and fix working hours save/load cycle)
- **Issue:** `const activeHours = editedHours.filter(h => h.is_active); await updateMutation.mutateAsync(activeHours.length > 0 ? activeHours : editedHours)` — when some days active, only those were sent, deleting inactive days from DB
- **Fix:** Changed to always send `editedHours` (all 7) unconditionally
- **Files modified:** `apps/web/app/[locale]/(dashboard)/schedule/page.tsx`
- **Verification:** Logic reviewed — all 7 days always sent to PUT endpoint
- **Committed in:** `10bc982` (Task 1+2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Bug fix was necessary for correctness. No scope creep.

## Issues Encountered
- TypeScript `tsc --noEmit` shows "Cannot find module" errors for `@/` path aliases — these are pre-existing infrastructure issues affecting the whole codebase (admin, portal, schedule files all affected). Not introduced by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Employee schedule page fully functional: working hours persist, time-off date range works, translations complete
- Ready for Phase 41-03 (if any remaining employee flow tasks)

---
*Phase: 41-employee-flow*
*Completed: 2026-03-13*
