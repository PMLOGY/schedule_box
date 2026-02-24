---
phase: 24-ai-powered-ui
plan: 01
subsystem: ui
tags: [react, next-intl, tailwind, lucide-react, shadcn-ui, ai-ui, no-show-prediction]

# Dependency graph
requires:
  - phase: 23-ai-service
    provides: noShowProbability stored on Booking records from AI training pipeline
provides:
  - NoShowRiskBadge component: color-coded badge (red/amber/green/gray) for booking list rows
  - NoShowRiskDetail component: probability % with actionable label for booking detail panel
  - Risk column in booking management table
  - i18n keys for ai.riskBadge and ai.riskDetail in cs/en/sk
affects:
  - 26-booking-ux-polish: table column ordering, BookingDetailPanel layout
  - future AI UI phases: pattern for displaying AI predictions in booking context

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Risk level derived from noShowProbability thresholds (>= 0.50 high, >= 0.30 medium, < 0.30 low)
    - NoShowRiskBadge follows BookingStatusBadge pattern (Badge variant=outline + bg-*/text-* classes)
    - TooltipProvider wraps each badge for exact percentage on hover
    - NoShowRiskDetail renders Separator + section inline (no separate section wrapper needed)

key-files:
  created:
    - apps/web/components/ai/NoShowRiskBadge.tsx
    - apps/web/components/ai/NoShowRiskDetail.tsx
  modified:
    - apps/web/app/[locale]/(dashboard)/bookings/page.tsx
    - apps/web/components/booking/BookingDetailPanel.tsx
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json

key-decisions:
  - 'NoShowRiskBadge shows raw percentage (e.g., "47%") in badge text for compactness, with risk label in tooltip'
  - 'NoShowRiskDetail uses Separator from component itself (not from parent) to maintain encapsulation'
  - 'colSpan updated from 6 to 7 for loading/empty rows to match new 7-column table layout'
  - 'TooltipProvider scoped per-badge (not lifted to page) to avoid cross-component tooltip conflicts'

patterns-established:
  - 'AI risk display pattern: badge in list + detail section in panel, both reading from stored booking field'
  - 'ai/ component directory established under apps/web/components/ for AI-specific UI components'

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 24 Plan 01: AI-Powered UI No-Show Risk Display Summary

**Color-coded no-show risk badges (red/amber/green/gray) in booking list rows and actionable probability display in the booking detail panel, reading from stored noShowProbability without extra API calls**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T14:22:21Z
- **Completed:** 2026-02-24T14:26:22Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created `NoShowRiskBadge`: compact color-coded badge (red >= 50%, amber 30-49%, green < 30%, gray = null) with tooltip showing exact percentage
- Created `NoShowRiskDetail`: detail section with probability percentage, colored risk dot, actionable label ("High risk -- consider sending an SMS reminder"), optional confidence and fallback warning
- Integrated Risk column as 7th column in booking management table (between Status and Price)
- Integrated `NoShowRiskDetail` section in `BookingDetailPanel` between Metadata and Action Buttons
- Added i18n keys for `ai.riskBadge` and `ai.riskDetail` in Czech, English, and Slovak
- Added `booking.list.columns.risk` translation key in all 3 locales

## Task Commits

Each task was committed atomically:

1. **Task 1: Create NoShowRiskBadge and NoShowRiskDetail components** - `ae2fa7c` (feat)
2. **Task 2: Integrate into booking list and detail panel** - `fcd0971` (feat)

**Plan metadata:** see final commit below

## Files Created/Modified

- `apps/web/components/ai/NoShowRiskBadge.tsx` - Color-coded risk badge with tooltip for booking list rows
- `apps/web/components/ai/NoShowRiskDetail.tsx` - Risk detail section with probability % and actionable label for booking detail panel
- `apps/web/app/[locale]/(dashboard)/bookings/page.tsx` - Added Risk column header, NoShowRiskBadge in rows, colSpan 6->7
- `apps/web/components/booking/BookingDetailPanel.tsx` - Added NoShowRiskDetail section before Action Buttons
- `apps/web/messages/cs.json` - Added ai.riskBadge, ai.riskDetail, booking.list.columns.risk (Czech)
- `apps/web/messages/en.json` - Added ai.riskBadge, ai.riskDetail, booking.list.columns.risk (English)
- `apps/web/messages/sk.json` - Added ai.riskBadge, ai.riskDetail, booking.list.columns.risk (Slovak)

## Decisions Made

- Badge displays raw percentage in text (e.g., "47%") for maximum information density in table cells; full label in tooltip
- `NoShowRiskDetail` includes its own `<Separator />` for self-contained rendering in the panel
- `TooltipProvider` scoped per-badge instance (not hoisted to page level) to avoid state conflicts
- No `confidence` or `fallback` props passed from `BookingDetailPanel` — only `probability` is stored on booking records; the component handles `undefined` gracefully

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Commitlint rejected scope `24-01`: used allowed scope `frontend` instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 24 Plan 01 complete: AI no-show risk is now visible and actionable for business owners in both list and detail views
- Plan 02 can build on this foundation (additional AI UI features if planned)
- The `apps/web/components/ai/` directory is established as the home for all AI-specific UI components

## Self-Check

- [x] `apps/web/components/ai/NoShowRiskBadge.tsx` exists
- [x] `apps/web/components/ai/NoShowRiskDetail.tsx` exists
- [x] `ae2fa7c` commit exists (Task 1)
- [x] `fcd0971` commit exists (Task 2)
- [x] TypeScript compiles: `npx tsc --noEmit` passes with no errors
- [x] All 3 locale JSON files valid and contain ai.riskBadge, ai.riskDetail, booking.list.columns.risk keys

## Self-Check: PASSED

---

_Phase: 24-ai-powered-ui_
_Completed: 2026-02-24_
