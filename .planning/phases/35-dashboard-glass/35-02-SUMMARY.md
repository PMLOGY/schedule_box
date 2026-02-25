---
phase: 35-dashboard-glass
plan: 02
subsystem: ui
tags: [glassmorphism, tailwind, nextjs, card, dashboard, analytics, billing, settings, organization]

# Dependency graph
requires:
  - phase: 33-glass-token-foundation
    provides: glass CSS tokens (glass-surface, border-glass, shadow-glass-hover)
  - phase: 34-component-glass-variants
    provides: Card variant="glass" CVA prop in card.tsx

provides:
  - Glass KPI stat cards (StatCard uses Card variant=glass)
  - Gradient blue-to-indigo dashboard welcome heading
  - Glass card wrappers on all 7 dashboard sub-pages (bookings, calendar, analytics, customers, settings, billing, organization)
  - All 8 analytics chart Cards using variant=glass
  - Settings CompanyProfileCard and WorkingHoursCard using variant=glass
  - Billing CurrentSubscriptionCard, PlanComparisonGrid, InvoiceHistoryTable using variant=glass
  - Organization stat cards and location cards using variant=glass

affects:
  - 35-dashboard-glass (DASH-02, DASH-04 requirements satisfied)
  - 36-marketing-glass (consistent glass-split pattern established)
  - 37-auth-polish (same split-container pattern for auth pages)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Split-container glass pattern: glass Card wraps title/controls/filters; data tables and calendar stay in opaque bg-card containers
    - variant="glass" additively on all Card instances that wrap non-data-dense content
    - Gradient text via bg-gradient-to-r + bg-clip-text + text-transparent on primary dashboard heading
    - Skeleton loading Cards use same variant="glass" as their loaded counterparts for visual consistency

key-files:
  created: []
  modified:
    - apps/web/components/dashboard/stat-card.tsx
    - apps/web/app/[locale]/(dashboard)/dashboard/page.tsx
    - apps/web/components/analytics/kpi-comparison-cards.tsx
    - apps/web/app/[locale]/(dashboard)/bookings/page.tsx
    - apps/web/app/[locale]/(dashboard)/calendar/page.tsx
    - apps/web/app/[locale]/(dashboard)/analytics/page.tsx
    - apps/web/app/[locale]/(dashboard)/customers/page.tsx
    - apps/web/app/[locale]/(dashboard)/settings/page.tsx
    - apps/web/app/[locale]/(dashboard)/settings/billing/page.tsx
    - apps/web/app/[locale]/(dashboard)/organization/page.tsx

key-decisions:
  - 'BookingCalendar NOT wrapped in glass: FullCalendar event popovers use absolute positioning outside Portal, wrapping would trap them in a stacking context'
  - 'Data tables (bookings, customers) remain in opaque rounded-lg border bg-card containers: dense tabular data is harder to read on semi-transparent glass backgrounds'
  - 'DemoDataCard and OnboardingChecklist remain opaque: onboarding UI should visually anchor, not float'
  - 'Task 1 was already committed in 244d738 from a previous execution attempt; Task 2 was new work'

patterns-established:
  - 'Split-container: glass Card(title+filters) above opaque div(table) for all list pages'
  - 'All card states (loading/empty/main) in a component must uniformly use the same variant'
  - 'Plan grid Cards can have both variant=glass and existing conditional className (cn() merges correctly)'

# Metrics
duration: 11min
completed: 2026-02-25
---

# Phase 35 Plan 02: Dashboard Glass Application Summary

**Glass KPI stat cards, blue-to-indigo gradient heading, and glass card wrappers across all 7 dashboard sub-pages using split-container pattern (glass header/controls, opaque data tables)**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-02-25T19:41:19Z
- **Completed:** 2026-02-25T19:52:23Z
- **Tasks:** 2 (Task 1 pre-committed, Task 2 new)
- **Files modified:** 10

## Accomplishments

- StatCard now uses `Card variant="glass"` with the glass hover shadow (removed conflicting shadow-sm)
- Dashboard welcome heading replaced PageHeader with an `<h1>` using `bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`
- KpiComparisonCards and their loading skeletons use `variant="glass"` on all 4 cards
- All 7 dashboard sub-pages follow the split-container pattern: glass card wraps title/controls, opaque container holds tables/calendar
- Analytics: 8 chart Cards all use `variant="glass"`, plus the header card and 4 skeleton KPI cards (10 total)
- Settings: CompanyProfileCard (3 states) and WorkingHoursCard (2 states) use `variant="glass"`
- Billing: CurrentSubscriptionCard, PlanComparisonGrid loading + plan map, InvoiceHistoryTable all use `variant="glass"` (7 Card instances)
- Organization: no-org CTA card, 3 stat cards, all location cards use `variant="glass"` (5 instances)

## Task Commits

Each task was committed atomically:

1. **Task 1: Glass KPI stat cards and gradient welcome heading** - `244d738` (feat) — pre-committed in previous execution attempt combined with header.tsx change
2. **Task 2: Glass card wrappers on all dashboard sub-pages** - `457f913` (feat)

**Plan metadata:** TBD (docs commit below)

## Files Created/Modified

- `apps/web/components/dashboard/stat-card.tsx` - Changed from shadow-sm Card to variant="glass"; removed PageHeader import no longer needed
- `apps/web/app/[locale]/(dashboard)/dashboard/page.tsx` - Replaced `<PageHeader title>` with gradient `<h1>`, removed unused import
- `apps/web/components/analytics/kpi-comparison-cards.tsx` - Added variant="glass" to all 4 KPI cards in map
- `apps/web/app/[locale]/(dashboard)/bookings/page.tsx` - Added Card import; wrapped title+filters in glass Card; table stays opaque
- `apps/web/app/[locale]/(dashboard)/calendar/page.tsx` - Added Card import; wrapped title+CalendarToolbar in glass Card; BookingCalendar outside
- `apps/web/app/[locale]/(dashboard)/analytics/page.tsx` - Wrapped header+controls in glass Card; all 8 chart Cards + 4 skeleton Cards use variant="glass"
- `apps/web/app/[locale]/(dashboard)/customers/page.tsx` - Added Card import; wrapped title+search in glass Card; table stays opaque
- `apps/web/app/[locale]/(dashboard)/settings/page.tsx` - All 5 Card instances (3+2 across two components) use variant="glass"
- `apps/web/app/[locale]/(dashboard)/settings/billing/page.tsx` - All 7 Card instances across 3 components use variant="glass"
- `apps/web/app/[locale]/(dashboard)/organization/page.tsx` - All 5 Card instances (no-org + 3 stats + location map) use variant="glass"

## Decisions Made

- BookingCalendar is NOT wrapped in glass: FullCalendar renders event popovers using absolute positioning relative to the calendar container, not a Portal. A glass card creates a new stacking context (transform/filter on ::before), which would trap the popovers and clip them.
- Data tables (bookings, customers) remain in opaque `rounded-lg border bg-card` containers. Dense operational tables (20+ rows of booking/customer data) are harder to scan on semi-transparent surfaces.
- DemoDataCard and OnboardingChecklist remain at default Card variant — onboarding elements are intentionally "grounded" rather than "floating".
- InvoiceHistoryTable Card uses glass even though it contains a Table; the invoice table is small (5-10 rows max) and semantic rather than operational data density.

## Deviations from Plan

None - plan executed exactly as written. Task 1 was found to be pre-committed from a previous execution attempt (commit 244d738 included stat-card.tsx, dashboard/page.tsx, and kpi-comparison-cards.tsx alongside header.tsx changes). Task 2 was executed fresh.

## Issues Encountered

- Pre-commit hook (lint-staged) reformatted files on first Task 1 commit attempt, causing "empty commit" failure. Diagnosis revealed Task 1 changes were already in HEAD from a prior execution that bundled them with header.tsx changes in `244d738`. Proceeded directly to Task 2.
- Production build `pnpm --filter @schedulebox/web build` reports EPERM symlink errors during standalone output phase — this is a pre-existing Windows filesystem permission issue unrelated to code changes. Next.js compiled successfully (`Compiled successfully in 17.7s`) and generated all 224 static pages.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DASH-02 (KPI cards + gradient heading) and DASH-04 (sub-page glass wrappers) requirements are fully met
- Phase 35-03 (if planned) or Phase 36 marketing glass application can proceed
- The split-container glass pattern (glass header card / opaque data container) is established and reusable

---

_Phase: 35-dashboard-glass_
_Completed: 2026-02-25_
