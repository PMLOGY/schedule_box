---
phase: 27-onboarding-wizard
plan: 02
subsystem: ui
tags: [react, tanstack-query, next-intl, shadcn-ui, empty-states, onboarding, checklist]

# Dependency graph
requires:
  - phase: 27-01-onboarding-wizard
    provides: Onboarding wizard page route and localStorage completion flag (gracefully handled as not yet executed)
  - phase: 24-ai-powered-ui
    provides: Dashboard page structure, AiInsightsPanel, existing hooks and query patterns
provides:
  - Dashboard onboarding checklist widget with 5 setup items and progress bar
  - useOnboardingChecklist hook tracking company profile, first service, working hours, first booking, notifications
  - 6 action-oriented empty states for bookings, customers, services, employees, analytics, calendar
  - Enhanced shared EmptyState component with illustration and secondaryAction support
  - cs/en/sk i18n for onboarding.checklist and emptyStates namespaces
affects:
  - 27-03-onboarding-wizard
  - 27-04-onboarding-wizard

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Section-specific empty state components in components/onboarding/empty-states/
    - useOnboardingChecklist hook pattern for multi-query completion tracking
    - localStorage dismissal with mounted hydration guard for SSR safety
    - Checklist items as button elements for accessible navigation without href type issues

key-files:
  created:
    - apps/web/hooks/use-onboarding-checklist.ts
    - apps/web/components/onboarding/onboarding-checklist.tsx
    - apps/web/components/onboarding/empty-states/bookings-empty.tsx
    - apps/web/components/onboarding/empty-states/customers-empty.tsx
    - apps/web/components/onboarding/empty-states/services-empty.tsx
    - apps/web/components/onboarding/empty-states/employees-empty.tsx
    - apps/web/components/onboarding/empty-states/analytics-empty.tsx
    - apps/web/components/onboarding/empty-states/calendar-empty.tsx
  modified:
    - apps/web/components/shared/empty-state.tsx
    - apps/web/app/[locale]/(dashboard)/page.tsx
    - apps/web/app/[locale]/(dashboard)/bookings/page.tsx
    - apps/web/app/[locale]/(dashboard)/customers/page.tsx
    - apps/web/app/[locale]/(dashboard)/services/page.tsx
    - apps/web/app/[locale]/(dashboard)/employees/page.tsx
    - apps/web/app/[locale]/(dashboard)/analytics/page.tsx
    - apps/web/app/[locale]/(dashboard)/calendar/page.tsx
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json

key-decisions:
  - 'Checklist uses router.push() via button elements instead of Link href to avoid next-intl typed route constraints'
  - 'localStorage dismissal key prefixed with company UUID to support multi-tenant scenarios'
  - 'Calendar empty state uses separate useBookingsQuery({limit:1}) in page rather than modifying BookingCalendar internals'
  - 'onboarding namespace keys merged into existing onboarding namespace (from plan 27-01 pre-execution) rather than replacing'
  - 'Customers/Services/Employees empty states accept onAdd callback props to trigger existing dialog open handlers'
  - 'emptyStates rendered inside TableCell with p-0 to avoid double padding in table context'

patterns-established:
  - 'Empty state pattern: section-specific component wraps shared EmptyState with translation keys + action callbacks'
  - 'Checklist completion: multi-query hook returns array of ChecklistItem with href and completed boolean'
  - 'Hydration guard: useState(false) + useEffect for localStorage access to prevent SSR mismatch'

# Metrics
duration: 11min
completed: 2026-02-24
---

# Phase 27 Plan 02: Onboarding Checklist and Empty States Summary

**Dashboard checklist widget tracking 5 setup items with React Query + 6 action-oriented empty states replacing blank screens across all data sections**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-24T15:07:38Z
- **Completed:** 2026-02-24T15:18:31Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments

- Created `useOnboardingChecklist` hook that queries 4 API endpoints in parallel to determine completion of 5 setup items (company profile, first service, working hours, first booking, notifications)
- Created `OnboardingChecklist` component — Card with Progress bar, 5 tracked items with check icons, per-UUID localStorage dismissal, hydration-safe mounting guard
- Enhanced shared `EmptyState` component with `illustration` prop (React.ReactNode), `secondaryAction` prop, and gradient background styling
- Created 6 section-specific empty state components for bookings (clipboard action), customers (open add dialog), services (open add dialog), employees (open add dialog), analytics (share link), calendar (create booking / set hours)
- Integrated each empty state into its dashboard page for the zero-data case, preserving all existing functionality
- Added `onboarding.checklist` and `emptyStates` i18n keys to cs/en/sk locale files, merged into existing `onboarding` namespace without breaking plan 27-01 wizard keys

## Task Commits

Each task was committed atomically:

1. **Task 1: Create onboarding checklist widget and hook** - `920fa03` (feat)
2. **Task 2: Create action-oriented empty states for all dashboard data sections** - `46374f2` (feat)

**Plan metadata:** (included in task commits)

## Files Created/Modified

- `apps/web/hooks/use-onboarding-checklist.ts` - React Query hook returning 5 ChecklistItem objects with completion status
- `apps/web/components/onboarding/onboarding-checklist.tsx` - Dashboard widget with Progress bar, checklist rows, dismiss button
- `apps/web/components/shared/empty-state.tsx` - Enhanced with illustration, secondaryAction, gradient background
- `apps/web/components/onboarding/empty-states/bookings-empty.tsx` - CalendarPlus icon, clipboard copy of booking URL
- `apps/web/components/onboarding/empty-states/customers-empty.tsx` - Users icon, callback to open add-customer dialog
- `apps/web/components/onboarding/empty-states/services-empty.tsx` - Briefcase icon, callback to open add-service dialog
- `apps/web/components/onboarding/empty-states/employees-empty.tsx` - UserPlus icon, callback to open add-employee dialog
- `apps/web/components/onboarding/empty-states/analytics-empty.tsx` - BarChart3 icon, clipboard copy of booking URL
- `apps/web/components/onboarding/empty-states/calendar-empty.tsx` - Calendar icon, links to /bookings/new and /settings
- `apps/web/app/[locale]/(dashboard)/page.tsx` - Renders OnboardingChecklist above DashboardGrid
- `apps/web/app/[locale]/(dashboard)/bookings/page.tsx` - BookingsEmptyState when data.data.length === 0
- `apps/web/app/[locale]/(dashboard)/customers/page.tsx` - CustomersEmptyState with onAddCustomer callback
- `apps/web/app/[locale]/(dashboard)/services/page.tsx` - ServicesEmptyState with onAddService callback
- `apps/web/app/[locale]/(dashboard)/employees/page.tsx` - EmployeesEmptyState with onAddEmployee callback
- `apps/web/app/[locale]/(dashboard)/analytics/page.tsx` - AnalyticsEmptyState when no overview data
- `apps/web/app/[locale]/(dashboard)/calendar/page.tsx` - CalendarEmptyState via lightweight bookings check
- `apps/web/messages/cs.json` - Added onboarding.checklist, onboarding.welcomeBanner, emptyStates
- `apps/web/messages/en.json` - Added onboarding.checklist, onboarding.welcomeBanner, emptyStates
- `apps/web/messages/sk.json` - Added onboarding.checklist, onboarding.welcomeBanner, emptyStates

## Decisions Made

- **Checklist navigation uses `router.push()` via button elements** instead of `<Link>` to avoid next-intl typed route constraint (href must be a known route path literal)
- **localStorage dismissal keyed by company UUID** (`sb_checklist_dismissed_{uuid}`) to support multi-tenant accounts sharing a browser
- **Calendar empty state detects bookings at page level** via a separate `useBookingsQuery({limit:1})` rather than modifying `BookingCalendar` internals — cleaner separation of concerns
- **onboarding namespace keys merged** into the existing namespace that plan 27-01 pre-populated (wizard steps/forms), preserving both sets of keys
- **Empty states inside TableCell with `p-0`** to avoid double-padding when rendered in a table's empty row

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Merged checklist keys into existing onboarding namespace**

- **Found during:** Task 1 (i18n messages update)
- **Issue:** A linter/prior-plan auto-applied plan 27-01's wizard `onboarding` namespace to locale files, replacing the checklist keys I added with wizard-only keys
- **Fix:** Used Node.js to merge both sets of keys into the `onboarding` namespace without replacing either
- **Files modified:** apps/web/messages/cs.json, en.json, sk.json
- **Verification:** Both wizard keys and checklist keys present in all three locale files
- **Committed in:** `46374f2` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (locale namespace merge conflict)
**Impact on plan:** Necessary to preserve plan 27-01's wizard content while adding plan 27-02's checklist content. No scope creep.

## Issues Encountered

- Plan 27-01 (onboarding wizard) had been partially pre-executed — onboarding namespace already populated in locale files and some component files untracked. Plan 27-02 ran independently without breaking 27-01's work.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Onboarding checklist widget ready for plan 27-03 (booking link sharing / viral loop)
- Empty states are independent and complete — functional on any fresh account
- All empty state components accept optional callback props for integration with dialog open handlers

---

_Phase: 27-onboarding-wizard_
_Completed: 2026-02-24_
