---
phase: 48-marketplace-ux
plan: "03"
subsystem: booking-management
tags: [ux, polling, animation, booking-detail-panel]
dependency_graph:
  requires: []
  provides: [auto-refresh-booking-list, last-updated-indicator, new-booking-glow, panel-status-actions]
  affects: [apps/web/hooks/use-bookings-query.ts, apps/web/app/[locale]/(dashboard)/bookings/page.tsx, apps/web/components/booking/BookingDetailPanel.tsx]
tech_stack:
  added: []
  patterns: [tanstack-query-polling, date-fns-formatDistanceToNow, css-keyframe-animation, query-invalidation]
key_files:
  created: []
  modified:
    - apps/web/hooks/use-bookings-query.ts
    - apps/web/app/[locale]/(dashboard)/bookings/page.tsx
    - apps/web/components/booking/BookingDetailPanel.tsx
    - apps/web/app/globals.css
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json
decisions:
  - "refetchInterval: 30_000 matches staleTime to avoid redundant window-focus refetches"
  - "glow detection uses Set diff on prevIdsRef — only fires after first load (prevIdsRef.size > 0)"
  - "BookingDetailPanel keeps panel open after action — invalidates detail + list queries, no onClose()"
  - "animate-glow-blue uses CSS @keyframes (not framer-motion) — simpler, no JS dependency"
metrics:
  duration: "~10min"
  completed: "2026-03-18T17:38:24Z"
  tasks: 2
  files_modified: 7
---

# Phase 48 Plan 03: Booking UX Polish Summary

Auto-refreshing booking list with 30s TanStack Query polling, last-updated indicator, new-booking glow animation, and BookingDetailPanel staying open with updated status after actions.

## What Was Built

### Task 1: 30s Auto-refresh (commit afa4ed4)

Added `refetchInterval: 30_000` to `useBookingsQuery`. Booking list now polls every 30 seconds automatically. `useBookingDetail` unchanged — detail is fetched on-demand when panel opens.

### Task 2: Last-updated indicator, glow animation, panel polish (commit f47cf50)

**bookings/page.tsx:**
- `lastUpdated` state + `useEffect` on data to track when data last changed
- 1-second `setTick` interval keeps `formatDistanceToNow` display fresh
- "Updated X seconds/minutes ago" displayed in top-right of page header using `date-fns/formatDistanceToNow` with correct locale
- `prevIdsRef` tracks previous booking IDs; detects new IDs on each data refresh
- New booking IDs stored in `newBookingIds` Set, cleared after 4000ms timeout
- `animate-glow-blue` CSS class applied to newly appeared TableRow elements

**globals.css:**
- `@keyframes glow-blue` animation: `box-shadow 0 0 12px rgba(0,87,255,0.55)` fading to `0 0 0px` over 4s ease-out
- `.animate-glow-blue` class with `forwards` fill to clean up after animation
- `@media (prefers-reduced-motion: reduce)` guard disables animation for accessibility

**BookingDetailPanel.tsx:**
- Removed `onClose()` call from `onSuccess` callback
- Now invalidates `['bookings', bookingId]` (detail) and `['bookings']` (list) on success
- Panel stays open showing updated status; user closes manually with close button

**Translations (en/cs/sk):**
- Added `booking.list.lastUpdated` key: "Updated" / "Aktualizováno" / "Aktualizované"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing ESLint non-null assertion errors blocked commit**

- **Found during:** Task 2 commit attempt
- **Issue:** `listing.rating!.toFixed(1)` in marketplace/page.tsx and `lng!/lat!` in company_slug/page.tsx triggered `@typescript-eslint/no-non-null-assertion` errors
- **Fix:** marketplace/page.tsx — replaced `!` with optional chaining `?.`; company_slug/page.tsx — linter auto-refactored to pre-compute `mapSrc` with null-checked arithmetic
- **Files modified:** `apps/web/app/[locale]/(dashboard)/marketplace/page.tsx`, `apps/web/app/[locale]/[company_slug]/page.tsx`
- **Commit:** f47cf50 (included in Task 2 commit)

## Self-Check: PASSED

- FOUND: apps/web/hooks/use-bookings-query.ts
- FOUND: apps/web/app/globals.css
- FOUND: apps/web/components/booking/BookingDetailPanel.tsx
- FOUND: commit afa4ed4 (Task 1)
- FOUND: commit f47cf50 (Task 2)
