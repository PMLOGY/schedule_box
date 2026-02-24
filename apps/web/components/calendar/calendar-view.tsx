// TODO: This component used FullCalendar resource-timeline (premium license required for
// commercial SaaS). It was only using mock data and is not imported by any route.
// Migrate to react-big-calendar resource view or remove entirely in v1.3.
// See: BookingCalendar.tsx for the active calendar implementation.

'use client';

/**
 * CalendarView - Placeholder for future resource timeline view.
 *
 * Previously used FullCalendar's resource-timeline plugin with mock data.
 * The resource-timeline plugin requires a premium license for commercial use.
 * This component is currently not rendered by any route.
 *
 * When needed, implement using react-big-calendar with a custom resource
 * layout, grouping events by employee/resource in rows.
 */
export function CalendarView() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        Resource timeline view — coming in v1.3
      </div>
    </div>
  );
}
