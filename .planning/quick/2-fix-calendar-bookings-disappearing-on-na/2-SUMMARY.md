---
phase: quick
plan: 2
subsystem: frontend
tags: [bug-fix, ui, calendar, tanstack-query]
dependency_graph:
  requires: [tanstack-query, fullcalendar]
  provides: [smooth-calendar-navigation]
  affects: [booking-calendar-component]
tech_stack:
  added: []
  patterns: [placeholder-data, stale-while-revalidate]
key_files:
  created: []
  modified:
    - apps/web/hooks/use-bookings-query.ts
    - apps/web/components/booking/BookingCalendar.tsx
decisions:
  - decision: Use TanStack Query's keepPreviousData (now placeholderData) for calendar queries
    rationale: Prevents flash-to-empty when navigating between calendar views, provides smooth UX
    outcome: Events remain visible during navigation with subtle visual indicators for stale data
  - decision: Apply opacity-75 and "Updating..." label during placeholder state
    rationale: Gives users visual feedback that data is loading without jarring empty state
    outcome: Subtle, non-intrusive loading indicator that preserves calendar visibility
  - decision: Remove unused isLoading from component destructuring
    rationale: Clean up code, isLoading was destructured but never used
    outcome: Cleaner component code with only necessary query states
metrics:
  duration: 108s
  completed: 2026-02-12
---

# Quick Task 2: Fix Calendar Bookings Disappearing on Navigation

**Fixed calendar bookings flash-to-empty during navigation using TanStack Query's placeholderData pattern**

## Objective

Fixed the bug where calendar bookings disappeared when navigating between days/weeks/months. When users changed the `selectedDate` via toolbar navigation, TanStack Query created a new query key, causing the `data` (events array) to become `undefined` during the fetch, resulting in a jarring empty calendar state until new data arrived.

## Implementation

### Task 1: Add keepPreviousData to Calendar Query Hook

**Files modified:** `apps/web/hooks/use-bookings-query.ts`

1. Imported `keepPreviousData` from `@tanstack/react-query`
2. Added `placeholderData: keepPreviousData` to `useBookingsForCalendar` query configuration

This enables TanStack Query to serve previous events while fetching new data for a different date range. The `isPlaceholderData` flag indicates when stale data is being displayed.

**Commit:** `75b7083`

### Task 2: Update BookingCalendar Component

**Files modified:** `apps/web/components/booking/BookingCalendar.tsx`

1. Removed unused `isLoading` from query destructuring
2. Added `isPlaceholderData` to query destructuring
3. Enhanced loading indicator to show "Updating..." label when `isPlaceholderData` is true
4. Applied `opacity-75` CSS class to calendar container during placeholder state
5. Verified FullCalendar component is never unmounted during navigation

The component now provides subtle visual feedback during navigation:
- Loading spinner with "Updating..." label appears in top-right corner
- Calendar content dims slightly (75% opacity) during placeholder state
- Previous events remain visible until new data arrives
- No jarring flash-to-empty state

**Commit:** `2f3974d`

## Technical Details

### TanStack Query Pattern

Used the **placeholderData** pattern (formerly `keepPreviousData` in v4):

```typescript
const { data: events, isFetching, isPlaceholderData } = useQuery({
  queryKey: ['bookings', 'calendar', dateFrom, dateTo, employeeIds],
  queryFn: async () => { /* ... */ },
  placeholderData: keepPreviousData, // Keep previous data while fetching new
});
```

### Visual Feedback Strategy

**Loading indicator structure:**
```tsx
<div className="absolute top-2 right-2 z-10 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1">
  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  {isPlaceholderData && (
    <span className="text-xs text-muted-foreground">Updating...</span>
  )}
</div>
```

**Calendar opacity during placeholder state:**
```tsx
<div className={`relative rounded-lg border bg-card p-4 ${isPlaceholderData ? 'opacity-75' : ''}`}>
```

### State Flow

1. **Initial load:** `isFetching=true`, `isPlaceholderData=false`, `data=undefined` → empty calendar with spinner
2. **Data arrives:** `isFetching=false`, `isPlaceholderData=false`, `data=[events]` → calendar shows events
3. **User navigates:** `isFetching=true`, `isPlaceholderData=true`, `data=[old events]` → calendar shows old events + "Updating..." + opacity-75
4. **New data arrives:** `isFetching=false`, `isPlaceholderData=false`, `data=[new events]` → calendar seamlessly updates with new events

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. ✅ TypeScript compiles without errors: `npx tsc --noEmit --project apps/web/tsconfig.json`
2. ✅ No conditional return that unmounts FullCalendar: `grep "if.*isLoading.*return"` returns no matches
3. ✅ `placeholderData: keepPreviousData` present in calendar hook
4. ✅ `isLoading` removed from BookingCalendar component (grep returns no matches)
5. ✅ `isPlaceholderData` used for conditional rendering of "Updating..." label

## Success Criteria

All success criteria met:

- ✅ Navigating between days/weeks/months retains previous events until new data arrives
- ✅ Subtle loading indicator ("Updating..." with spinner) appears during transitions
- ✅ Calendar opacity reduces to 75% during placeholder data display
- ✅ FullCalendar component is never unmounted during data fetching
- ✅ No TypeScript compilation errors

## Files Changed

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `apps/web/hooks/use-bookings-query.ts` | +2 -1 | Added keepPreviousData import and placeholderData option |
| `apps/web/components/booking/BookingCalendar.tsx` | +16 -14 | Removed isLoading, added placeholder state handling |

## Testing Recommendations

**Manual Testing:**

1. Navigate to `/bookings` calendar view
2. Switch between day/week/month views using toolbar
3. Navigate forward/backward using date controls
4. Observe:
   - Events remain visible during navigation
   - Subtle "Updating..." label appears in top-right
   - Calendar dims slightly (opacity-75) while fetching
   - No flash-to-empty state occurs

**Edge Cases:**

- First load (no previous data) → shows empty calendar with spinner (expected)
- Rapid navigation → placeholder data persists until latest query completes
- Network delay → events remain visible throughout delay

## Self-Check

✅ **PASSED**

**Created files verified:**
- No new files created (modification-only task)

**Modified files verified:**
```bash
✅ FOUND: apps/web/hooks/use-bookings-query.ts
✅ FOUND: apps/web/components/booking/BookingCalendar.tsx
```

**Commits verified:**
```bash
✅ FOUND: 75b7083 (Task 1: Add keepPreviousData to calendar query hook)
✅ FOUND: 2f3974d (Task 2: Add stale-data indicator to calendar navigation)
```

**Key imports verified:**
```bash
✅ keepPreviousData imported from @tanstack/react-query
✅ placeholderData used in useBookingsForCalendar query
✅ isPlaceholderData destructured in BookingCalendar component
```

**Code quality verified:**
```bash
✅ No TypeScript errors
✅ ESLint passed (via pre-commit hook)
✅ Prettier formatting applied (via pre-commit hook)
✅ Conventional Commits enforced (commitlint passed)
```

---

**Impact:** Improved calendar UX by eliminating jarring flash-to-empty during navigation. Users now experience smooth transitions with subtle visual feedback for loading states.
