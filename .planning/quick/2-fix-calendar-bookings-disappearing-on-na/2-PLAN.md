---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/hooks/use-bookings-query.ts
  - apps/web/components/booking/BookingCalendar.tsx
autonomous: true
must_haves:
  truths:
    - "Bookings remain visible on calendar while navigating between days/weeks/months"
    - "A subtle loading indicator appears during data fetching without hiding events"
    - "Previously loaded events stay on screen until new events arrive"
  artifacts:
    - path: "apps/web/hooks/use-bookings-query.ts"
      provides: "Calendar query with keepPreviousData for seamless transitions"
      contains: "placeholderData"
    - path: "apps/web/components/booking/BookingCalendar.tsx"
      provides: "Calendar component that never unmounts during loading"
      contains: "isPlaceholderData"
  key_links:
    - from: "apps/web/hooks/use-bookings-query.ts"
      to: "apps/web/components/booking/BookingCalendar.tsx"
      via: "useBookingsForCalendar returns isPlaceholderData flag"
      pattern: "isPlaceholderData"
---

<objective>
Fix the bug where calendar bookings disappear when navigating between days/weeks/months.

Purpose: When users navigate the calendar via the toolbar, changing `selectedDate` creates a new TanStack Query key. Without `keepPreviousData`, the `data` (events array) becomes `undefined` while the new query loads, causing all events to vanish from the FullCalendar until the response arrives. This creates a jarring flash-to-empty experience.

Output: Calendar that retains previous events during navigation transitions, with a subtle visual indicator for stale data.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/hooks/use-bookings-query.ts
@apps/web/components/booking/BookingCalendar.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add keepPreviousData to calendar query hook</name>
  <files>apps/web/hooks/use-bookings-query.ts</files>
  <action>
In `useBookingsForCalendar`, add `placeholderData: keepPreviousData` to the useQuery options.

1. Import `keepPreviousData` from `@tanstack/react-query` (add to the existing import on line 8)
2. Add `placeholderData: keepPreviousData` to the useQuery config object in `useBookingsForCalendar` (after the `staleTime` line)

This ensures that when the query key changes (new date range), TanStack Query keeps serving the previous data while the new fetch is in progress. The `isPlaceholderData` flag from the query result will be `true` during this period, allowing the UI to indicate stale data.

Do NOT change the query key structure, staleTime, or any other existing config. Only add the import and the single `placeholderData` option.
  </action>
  <verify>
Run `npx tsc --noEmit --project apps/web/tsconfig.json` to verify no type errors. Confirm `keepPreviousData` is properly imported and used.
  </verify>
  <done>
`useBookingsForCalendar` returns previous events while a new date range query is in flight. The `isPlaceholderData` property is available on the query result.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update BookingCalendar to show stale-data indicator and clean up unused isLoading</name>
  <files>apps/web/components/booking/BookingCalendar.tsx</files>
  <action>
Update the BookingCalendar component to leverage `isPlaceholderData` for a smooth navigation experience.

1. Destructure `isPlaceholderData` from the `useBookingsForCalendar` call (line 54). Remove `isLoading` from destructuring since it is unused in the current code. The line should become:
   ```tsx
   const { data: events, isFetching, isPlaceholderData } = useBookingsForCalendar(
   ```

2. Update the existing `isFetching` indicator (lines 133-136) to also convey stale-data state. Replace the current indicator block with:
   ```tsx
   {isFetching && (
     <div className="absolute top-2 right-2 z-10 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1">
       <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
       {isPlaceholderData && (
         <span className="text-xs text-muted-foreground">Updating...</span>
       )}
     </div>
   )}
   ```

3. Add a subtle opacity reduction to the calendar container when showing placeholder (stale) data. Update the outer div (line 132) to include conditional opacity:
   ```tsx
   <div className={`relative rounded-lg border bg-card p-4 ${isPlaceholderData ? 'opacity-75' : ''}`}>
   ```
   This gives a visual hint that the displayed events are from a previous date range while new data loads, without the jarring full-unmount behavior.

Do NOT add any loading guard that would unmount the FullCalendar component. The calendar must always remain mounted. The `Loader2` import already exists (line 18), no new imports needed.
  </action>
  <verify>
Run `npx tsc --noEmit --project apps/web/tsconfig.json` to verify no type errors. Visually inspect the component logic to confirm:
- No `if (isLoading) return <spinner>` pattern exists
- FullCalendar is always rendered regardless of loading state
- `isPlaceholderData` is used for the subtle indicator
  </verify>
  <done>
Calendar never unmounts during navigation. Previous events remain visible with a subtle opacity reduction and "Updating..." label while new data loads. Once new data arrives, the calendar updates seamlessly in place.
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit --project apps/web/tsconfig.json`
2. Code review: `BookingCalendar.tsx` has NO conditional return that unmounts FullCalendar
3. Code review: `use-bookings-query.ts` includes `placeholderData: keepPreviousData` in calendar hook
4. Grep confirmation: `grep -n "isLoading" apps/web/components/booking/BookingCalendar.tsx` returns zero matches (unused import removed)
5. Grep confirmation: `grep -n "keepPreviousData" apps/web/hooks/use-bookings-query.ts` returns a match
</verification>

<success_criteria>
- Navigating between days/weeks/months in the calendar retains previous events until new data arrives
- A subtle loading indicator ("Updating..." with spinner) appears during transitions
- The calendar opacity reduces slightly during placeholder data display
- FullCalendar component is never unmounted during data fetching
- No TypeScript compilation errors
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-calendar-bookings-disappearing-on-na/2-SUMMARY.md`
</output>
