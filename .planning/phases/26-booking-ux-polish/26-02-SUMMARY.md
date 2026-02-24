---
phase: 26-booking-ux-polish
plan: 02
subsystem: ui
tags: [react-big-calendar, drag-drop, calendar, shadcn, date-fns, react-dnd]

# Dependency graph
requires:
  - phase: 26-01
    provides: "Visual regression baseline for embed widget"
provides:
  - "react-big-calendar based BookingCalendar with DnD rescheduling"
  - "shadcn-themed .rbc-* CSS overrides for calendar"
  - "CalendarToolbar updated with react-big-calendar view names"
  - "Calendar store with day/week/month/agenda view types"
affects: [26-03, 26-04]

# Tech tracking
tech-stack:
  added: [react-big-calendar, react-dnd, react-dnd-html5-backend, "@types/react-big-calendar"]
  patterns: [dateFnsLocalizer for Czech locale, withDragAndDrop HOC with typed events, React Query calendar data fetching]

key-files:
  created: []
  modified:
    - apps/web/components/booking/BookingCalendar.tsx
    - apps/web/components/calendar/calendar-toolbar.tsx
    - apps/web/components/calendar/calendar-view.tsx
    - apps/web/stores/calendar.store.ts
    - apps/web/styles/calendar.css

key-decisions:
  - "react-big-calendar replaces FullCalendar to avoid premium license for commercial SaaS"
  - "CalendarView component (resource-timeline with mock data) replaced with placeholder -- dead code, not imported by any route"
  - "React Query replaces FullCalendar event source for data fetching -- reactive date range queries"
  - "withDragAndDrop<CalendarEvent> typed generic via cast -- Calendar base component requires intermediate cast"

patterns-established:
  - "Calendar event typing: CalendarEvent interface wraps Booking with isDraggable flag"
  - "Date range computation: computeDateRange() maps view to API date_from/date_to"
  - "CSS theme integration: .rbc-* selectors use hsl(var(--shadcn-variable)) pattern"

# Metrics
duration: 7min
completed: 2026-02-24
---

# Phase 26 Plan 02: Calendar Migration Summary

**Replaced FullCalendar with MIT-licensed react-big-calendar, preserving DnD rescheduling, event detail panel, employee filtering, and shadcn theme integration**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-24T15:05:37Z
- **Completed:** 2026-02-24T15:12:33Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- BookingCalendar.tsx fully rewritten with react-big-calendar + DnD addon (234 lines)
- Calendar CSS rewritten from .fc-* to .rbc-* selectors using shadcn CSS variables (109 lines)
- CalendarToolbar view toggle buttons updated to day/week/month names
- Dead CalendarView component (FullCalendar resource-timeline with fake GPL key) replaced with placeholder
- Calendar store updated from FullCalendar view names to react-big-calendar view names

## Task Commits

Each task was committed atomically:

1. **Task 1: Install react-big-calendar and rewrite BookingCalendar.tsx** - `5e34d58` (feat)
2. **Task 2: Update CalendarToolbar and calendar CSS for react-big-calendar + shadcn theme** - `d24daf3` (feat)

## Files Created/Modified

- `apps/web/components/booking/BookingCalendar.tsx` - Rewritten: react-big-calendar with DnD, React Query data fetching, Czech locale, status-colored events
- `apps/web/stores/calendar.store.ts` - Updated CalendarView type from FullCalendar to react-big-calendar view names
- `apps/web/components/calendar/calendar-toolbar.tsx` - Updated view toggle buttons and date navigation to use day/week/month
- `apps/web/styles/calendar.css` - Replaced .fc-* with .rbc-* selectors using shadcn CSS variables
- `apps/web/components/calendar/calendar-view.tsx` - Replaced dead FullCalendar resource-timeline component with placeholder

## Decisions Made

- **react-big-calendar over FullCalendar:** FullCalendar's resource-timeline plugin requires a premium license for commercial SaaS. react-big-calendar is MIT-licensed and was recommended in STACK.md research.
- **CalendarView component replaced with placeholder:** It was dead code (not imported by any route) using FullCalendar resource-timeline with mock data and a fake "GPL-My-Project-Is-Open-Source" license key. Replaced with a placeholder noting future migration for v1.3.
- **React Query replaces FullCalendar event source:** Switched from FullCalendar's callback-based event source to React Query with computed date ranges. This gives reactive caching and automatic refetch on filter changes.
- **Generic typing workaround:** `withDragAndDrop<CalendarEvent>(Calendar as unknown as React.ComponentType<CalendarProps<CalendarEvent>>)` needed because the Calendar base type defaults to `object`. This is a known pattern in react-big-calendar typings.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Calendar migration complete, ready for Plan 03 (booking confirmation UX) and Plan 04 (final polish)
- FullCalendar packages remain in package.json but are no longer imported by any active component (only the now-placeholder CalendarView referenced them)
- Consider removing FullCalendar packages in a future cleanup task

## Self-Check: PASSED

- All 5 modified files exist on disk
- Both task commits verified (5e34d58, d24daf3)
- BookingCalendar.tsx: 234 lines (min 100)
- calendar.css: 109 lines (min 30)
- useCalendarStore exported from calendar.store.ts
- tsc --noEmit: zero errors

---

_Phase: 26-booking-ux-polish_
_Completed: 2026-02-24_
