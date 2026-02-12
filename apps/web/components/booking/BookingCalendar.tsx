/**
 * Booking Calendar Component
 *
 * FullCalendar wrapper for displaying and managing bookings.
 * Uses FullCalendar's event source function for reliable event loading
 * during date navigation. Supports day/week/month views, drag-drop
 * rescheduling, and event click for details.
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import csLocale from '@fullcalendar/core/locales/cs';
import type { EventDropArg, EventClickArg, EventInput } from '@fullcalendar/core';
import { useCalendarStore } from '@/stores/calendar.store';
import { useRescheduleBooking } from '@/hooks/use-reschedule-booking';
import { apiClient } from '@/lib/api-client';
import type { Booking } from '@schedulebox/shared/types';
import type { PaginatedResponse } from '@schedulebox/shared/types';
import BookingDetailPanel from './BookingDetailPanel';
import '../../styles/calendar.css';

/**
 * Map calendar store view to FullCalendar view names
 * Note: Resource timeline views require premium license, using standard views for MVP
 */
const VIEW_MAP = {
  resourceTimelineDay: 'timeGridDay',
  resourceTimelineWeek: 'timeGridWeek',
  dayGridMonth: 'dayGridMonth',
} as const;

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  completed: '#10B981',
  cancelled: '#9CA3AF',
  no_show: '#EF4444',
};

const DRAGGABLE_STATUSES = ['pending', 'confirmed'];

export default function BookingCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const { view, selectedDate, selectedEmployeeIds, showCancelled } = useCalendarStore();

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const rescheduleMutation = useRescheduleBooking();

  // Use refs for values accessed inside the event source callback
  // so the callback itself stays stable (no dependency changes)
  const showCancelledRef = useRef(showCancelled);
  showCancelledRef.current = showCancelled;

  /**
   * FullCalendar event source function.
   * Called by FullCalendar whenever the visible date range changes
   * (including after gotoDate/changeView). FullCalendar handles caching
   * via lazyFetching (default: true) — old events stay visible while
   * new ones load, preventing the "disappearing events" issue.
   */
  const fetchEvents = useCallback(
    (
      fetchInfo: { start: Date; end: Date },
      successCallback: (events: EventInput[]) => void,
      failureCallback: (error: Error) => void,
    ) => {
      // Format dates in local timezone (YYYY-MM-DD) to match server expectations
      const pad = (n: number) => String(n).padStart(2, '0');
      const s = fetchInfo.start;
      const e = fetchInfo.end;
      const dateFrom = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
      const dateTo = `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}`;

      apiClient
        .get<PaginatedResponse<Booking>>('/bookings', {
          date_from: dateFrom,
          date_to: dateTo,
          limit: 100,
        })
        .then((response) => {
          let bookingList = response.data;

          // Filter cancelled bookings client-side
          if (!showCancelledRef.current) {
            bookingList = bookingList.filter((b) => b.status !== 'cancelled');
          }

          const events: EventInput[] = bookingList.map((booking) => ({
            id: String(booking.uuid),
            title: `${booking.customer?.name ?? ''} - ${booking.service?.name ?? ''}`,
            start: booking.startTime,
            end: booking.endTime,
            backgroundColor: STATUS_COLORS[booking.status] ?? '#3B82F6',
            borderColor: 'transparent',
            editable: DRAGGABLE_STATUSES.includes(booking.status),
            extendedProps: { booking },
            resourceId: booking.employee ? String(booking.employee.id) : undefined,
          }));

          successCallback(events);
        })
        .catch((err) => {
          failureCallback(err instanceof Error ? err : new Error(String(err)));
        });
    },
    [],
  );

  // Refetch events when filter state changes (cancelled toggle, employee filter)
  useEffect(() => {
    calendarRef.current?.getApi()?.refetchEvents();
  }, [showCancelled, selectedEmployeeIds]);

  // Sync calendar view with store and force refetch to clear stale cache
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    const fullCalendarView = VIEW_MAP[view];
    if (calendarApi.view.type !== fullCalendarView) {
      calendarApi.changeView(fullCalendarView);
      calendarApi.refetchEvents();
    }
  }, [view]);

  // Sync calendar date with store and force refetch to clear stale cache
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;
    calendarApi.gotoDate(selectedDate);
    calendarApi.refetchEvents();
  }, [selectedDate]);

  // Handle drag-drop rescheduling
  const handleEventDrop = (info: EventDropArg) => {
    const bookingId = info.event.id;
    const newStartTime = info.event.start?.toISOString();

    if (!newStartTime || !bookingId) {
      info.revert();
      return;
    }

    rescheduleMutation.mutate({
      bookingId,
      startTime: newStartTime,
      revertFn: info.revert,
    });
  };

  // Handle event resize (duration change)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventResize = (info: any) => {
    info.revert();
  };

  // Handle event click to open detail panel
  const handleEventClick = (info: EventClickArg) => {
    const bookingId = info.event.id;
    setSelectedBookingId(bookingId);
    setDetailPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setDetailPanelOpen(false);
    setSelectedBookingId(null);
  };

  return (
    <>
      <div className="relative rounded-lg border bg-card p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={VIEW_MAP[view]}
          initialDate={selectedDate}
          events={fetchEvents}
          headerToolbar={false}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          editable={true}
          selectable={true}
          lazyFetching={true}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={handleEventClick}
          height="auto"
          locales={[csLocale]}
          locale="cs"
          allDaySlot={false}
          nowIndicator={true}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
        />
      </div>

      <BookingDetailPanel
        bookingId={selectedBookingId}
        open={detailPanelOpen}
        onClose={handleCloseDetailPanel}
      />
    </>
  );
}
