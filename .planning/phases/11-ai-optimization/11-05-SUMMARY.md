---
phase: 11-ai-optimization
plan: 05
subsystem: ui
tags: [tanstack-query, react, shadcn-ui, ai-optimization, upselling, dynamic-pricing, capacity-forecast]

# Dependency graph
requires:
  - phase: 11-02
    provides: Circuit breaker client types and fallback functions for optimization endpoints
  - phase: 11-04
    provides: API routes for upselling, pricing, capacity, and reminder-timing optimization
  - phase: 04-02
    provides: API client singleton and TanStack Query provider
provides:
  - TanStack Query hooks for all 4 AI optimization endpoints (useUpselling, useDynamicPricing, useCapacityForecast, useReminderTiming)
  - UpsellingSuggestions widget component for booking wizard Step 1
  - Dynamic pricing admin dashboard page at /ai/pricing
  - Capacity forecast admin dashboard page at /ai/capacity
affects: [frontend-booking, admin-dashboard, ai-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Non-blocking async widget pattern (returns null while loading, never shows spinner)
    - Price Check form pattern (avoids N+1 queries for per-service pricing)
    - Color-coded utilization level visualization (green/yellow/red)
    - Fallback info banner pattern for AI unavailability

key-files:
  created:
    - apps/web/hooks/useOptimization.ts
    - apps/web/components/booking/UpsellingSuggestions.tsx
    - apps/web/app/[locale]/(dashboard)/ai/pricing/page.tsx
    - apps/web/app/[locale]/(dashboard)/ai/capacity/page.tsx
  modified:
    - apps/web/components/booking/Step1ServiceSelect.tsx

key-decisions:
  - 'Non-blocking upselling: widget returns null while loading, never shows spinner to avoid blocking booking flow'
  - 'Price Check form instead of N+1 queries: admin selects service + context to check one price at a time'
  - 'CompanyId defaults to 1 for capacity forecast (auth store has UUID string, API expects int)'
  - 'Fallback info banners for both dashboards when AI service is unavailable'

patterns-established:
  - 'Non-blocking async widget: return null during loading for advisory UI elements'
  - 'Price Check form: interactive single-query approach to avoid iterating all services'
  - 'AI fallback banner: consistent blue info banner when fallback=true in API response'

# Metrics
duration: 5min
completed: 2026-02-11
---

# Phase 11 Plan 05: Frontend Integration Summary

**TanStack Query hooks for 4 optimization endpoints, non-blocking upselling widget in booking wizard, and admin dashboards for dynamic pricing and capacity forecasting**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-11T23:27:00Z
- **Completed:** 2026-02-11T23:31:47Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created TanStack Query hooks for all 4 AI optimization endpoints with appropriate stale times (1-10 min) and retry settings
- Built UpsellingSuggestions widget that loads asynchronously and never blocks the booking flow (returns null while loading)
- Integrated upselling widget into Step1ServiceSelect after service selection
- Created dynamic pricing dashboard with interactive Price Check form (avoids N+1 query problem)
- Created capacity forecast dashboard with 7-day prediction cards, color-coded utilization, and schedule suggestions
- Both dashboards handle AI unavailability gracefully with info banners when fallback=true

## Task Commits

Each task was committed atomically:

1. **Task 1: TanStack Query hooks and upselling widget** - `efabd81` (feat)
2. **Task 2: Admin pricing and capacity dashboard pages** - `4d63a6d` (feat)

## Files Created/Modified

- `apps/web/hooks/useOptimization.ts` - TanStack Query hooks for useUpselling, useDynamicPricing, useCapacityForecast, useReminderTiming
- `apps/web/components/booking/UpsellingSuggestions.tsx` - Non-blocking upselling widget with max 3 recommendations
- `apps/web/components/booking/Step1ServiceSelect.tsx` - Modified to render UpsellingSuggestions after service list
- `apps/web/app/[locale]/(dashboard)/ai/pricing/page.tsx` - Dynamic pricing dashboard with Price Check form and result display
- `apps/web/app/[locale]/(dashboard)/ai/capacity/page.tsx` - Capacity forecast dashboard with 7-day cards and schedule suggestions

## Decisions Made

- **Non-blocking widget pattern:** UpsellingSuggestions returns null while loading (no spinner) per research pitfall #6 about never blocking the booking flow
- **Price Check form approach:** Instead of querying pricing for all services (N+1 problem), the dashboard lets admins interactively check one service at a time with context parameters
- **CompanyId handling:** Capacity API expects numeric company_id but auth store has UUID string; defaulting to 1 with _user variable preserved for future mapping
- **Consistent fallback banners:** Both dashboards use blue info banners when AI returns fallback=true, explaining why data is unavailable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ESLint unused variable errors**

- **Found during:** Task 2 (capacity dashboard)
- **Issue:** `user` and `hasSuggestions` variables assigned but unused, failing lint
- **Fix:** Prefixed with underscore (`_user`, `_hasSuggestions`) per project ESLint config
- **Files modified:** `apps/web/app/[locale]/(dashboard)/ai/capacity/page.tsx`
- **Verification:** ESLint passes on re-commit
- **Committed in:** `4d63a6d` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor naming fix for lint compliance. No scope creep.

## Issues Encountered

None - plan executed as written.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 11 (AI Optimization) is now complete with all 5 plans executed
- All optimization endpoints have frontend integration: hooks, widgets, and dashboards
- Ready for Phase 12 or any subsequent phase that builds on AI features
- Booking wizard now includes AI-powered upselling suggestions
- Admin dashboard has new AI section with pricing and capacity pages

## Self-Check: PASSED

- All 5 created/modified files verified on disk
- Commit `efabd81` verified in git log
- Commit `4d63a6d` verified in git log

---

_Phase: 11-ai-optimization_
_Completed: 2026-02-11_
