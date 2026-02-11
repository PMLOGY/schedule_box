/**
 * Booking Calendar Component
 *
 * FullCalendar wrapper for displaying and managing bookings.
 * Supports day/week/month views, drag-drop rescheduling, and event click for details.
 */

'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventDropArg, EventClickArg } from '@fullcalendar/core';
import { format, subDays, addDays } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useCalendarStore } from '@/stores/calendar.store';
import { useBookingsForCalendar } from '@/hooks/use-bookings-query';
import { useRescheduleBooking } from '@/hooks/use-reschedule-booking';
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

export default function BookingCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const { view, selectedDate, selectedEmployeeIds, showCancelled } = useCalendarStore();

  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Calculate date range for fetching bookings (visible range +/- 7 days for performance)
  const dateRange = useMemo(() => {
    const from = format(subDays(selectedDate, 7), 'yyyy-MM-dd');
    const to = format(addDays(selectedDate, 7), 'yyyy-MM-dd');
    return { from, to };
  }, [selectedDate]);

  // Fetch bookings for calendar view
  const employeeFilter =
    selectedEmployeeIds.length > 0 ? selectedEmployeeIds.map(Number) : undefined;

  const { data: events, isLoading } = useBookingsForCalendar(
    dateRange.from,
    dateRange.to,
    employeeFilter,
  );

  // Filter out cancelled bookings if showCancelled is false
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (showCancelled) return events;
    return events.filter((event) => {
      const booking = event.extendedProps?.booking;
      return booking && booking.status !== 'cancelled';
    });
  }, [events, showCancelled]);

  const rescheduleMutation = useRescheduleBooking();

  // Sync calendar view with store
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    const fullCalendarView = VIEW_MAP[view];
    if (calendarApi.view.type !== fullCalendarView) {
      calendarApi.changeView(fullCalendarView);
    }
  }, [view]);

  // Sync calendar date with store
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;
    calendarApi.gotoDate(selectedDate);
  }, [selectedDate]);

  // Handle drag-drop rescheduling
  const handleEventDrop = (info: EventDropArg) => {
    const bookingId = Number(info.event.id);
    const newStartTime = info.event.start?.toISOString();
    const employeeId = info.event.extendedProps?.booking?.employee?.id;

    if (!newStartTime) {
      info.revert();
      return;
    }

    rescheduleMutation.mutate({
      bookingId,
      startTime: newStartTime,
      employeeId,
      revertFn: info.revert,
    });
  };

  // Handle event resize (duration change)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventResize = (info: any) => {
    // For MVP, we don't support changing duration via resize
    // Revert the change and show a message
    info.revert();
    // Could show a toast here explaining that duration is fixed
  };

  // Handle event click to open detail panel
  const handleEventClick = (info: EventClickArg) => {
    const bookingId = Number(info.event.id);
    setSelectedBookingId(bookingId);
    setDetailPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setDetailPanelOpen(false);
    setSelectedBookingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px] rounded-lg border bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={VIEW_MAP[view]}
          initialDate={selectedDate}
          events={filteredEvents}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth',
          }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          editable={true}
          selectable={true}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={handleEventClick}
          height="auto"
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
