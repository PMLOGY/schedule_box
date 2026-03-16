/**
 * Booking Calendar Component
 *
 * react-big-calendar wrapper for displaying and managing bookings.
 * Uses React Query for data fetching and supports day/week/month views,
 * drag-drop rescheduling, and event click for details.
 *
 * Replaces FullCalendar (premium license required for resource-timeline).
 * react-big-calendar is MIT-licensed.
 */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, type CalendarProps } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
  addDays,
} from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import { sk } from 'date-fns/locale/sk';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useCalendarStore } from '@/stores/calendar.store';
import { useRescheduleBooking } from '@/hooks/use-reschedule-booking';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import type { Booking, PaginatedResponse } from '@schedulebox/shared/types';
import BookingDetailPanel from './BookingDetailPanel';
import '../../styles/calendar.css';

// date-fns locales mapped by next-intl locale code
const DATE_LOCALES: Record<string, Locale> = { cs, sk, en: enUS };

// react-big-calendar locales (needs at least one entry)
const locales = { cs, sk, en: enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

// Create DnD-enhanced Calendar with proper generic typing
const DnDCalendar = withDragAndDrop<CalendarEvent>(
  Calendar as unknown as React.ComponentType<CalendarProps<CalendarEvent>>,
);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: string;
  booking: Booking;
  isDraggable: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  completed: '#10B981',
  cancelled: '#9CA3AF',
  no_show: '#EF4444',
};

const DRAGGABLE_STATUSES = ['pending', 'confirmed'];

/**
 * Compute visible date range based on the current calendar view and selected date.
 */
function computeDateRange(view: string, selectedDate: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (view) {
    case 'day': {
      const dayStart = startOfDay(selectedDate);
      const dayEnd = addDays(dayStart, 1); // next day so API lt filter includes today
      return { dateFrom: toDateStr(dayStart), dateTo: toDateStr(dayEnd) };
    }
    case 'week': {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 7); // day after last day so API lt filter includes whole week
      return { dateFrom: toDateStr(weekStart), dateTo: toDateStr(weekEnd) };
    }
    case 'month': {
      // Add padding days for month view (shows days from adjacent months)
      const monthStart = subDays(startOfMonth(selectedDate), 7);
      const monthEnd = addDays(endOfMonth(selectedDate), 7);
      return { dateFrom: toDateStr(monthStart), dateTo: toDateStr(monthEnd) };
    }
    default: {
      // Agenda / fallback: show 30 days from selected date
      const agendaEnd = addDays(selectedDate, 30);
      return { dateFrom: toDateStr(selectedDate), dateTo: toDateStr(agendaEnd) };
    }
  }
}

export default function BookingCalendar() {
  const { view, selectedDate, selectedEmployeeIds, showCancelled } = useCalendarStore();
  const tStatus = useTranslations('booking.status');
  const locale = useLocale();
  const dateLocale = DATE_LOCALES[locale] ?? cs;

  const isEmployee = useAuthStore((s) => s.user?.role) === 'employee';

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const rescheduleMutation = useRescheduleBooking();

  // Compute visible date range based on view
  const { dateFrom, dateTo } = useMemo(
    () => computeDateRange(view, selectedDate),
    [view, selectedDate],
  );

  // Fetch bookings for the visible date range
  // Employees see only their own bookings via /employees/me/bookings
  const bookingsEndpoint = isEmployee ? '/employees/me/bookings' : '/bookings';
  const { data: bookingsData } = useQuery({
    queryKey: [bookingsEndpoint, 'calendar', dateFrom, dateTo],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Booking>>(bookingsEndpoint, {
        date_from: dateFrom,
        date_to: dateTo,
        limit: 100,
      }),
  });

  // Transform bookings into calendar events with client-side filtering
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    let bookingList = bookingsData?.data ?? [];

    // Filter cancelled bookings
    if (!showCancelled) {
      bookingList = bookingList.filter((b) => b.status !== 'cancelled');
    }

    // Filter by selected employees
    if (selectedEmployeeIds.length > 0) {
      bookingList = bookingList.filter(
        (b) => b.employee && selectedEmployeeIds.includes(String(b.employee.id)),
      );
    }

    return bookingList.map((booking) => ({
      id: String(booking.id),
      title: `${booking.customer?.name ?? ''} — ${booking.service?.name ?? ''}${booking.employee?.name ? ` · ${booking.employee.name}` : ''}`,
      start: new Date(booking.startTime),
      end: new Date(booking.endTime),
      resource: booking.employee ? String(booking.employee.id) : undefined,
      booking,
      isDraggable: DRAGGABLE_STATUSES.includes(booking.status),
    }));
  }, [bookingsData, showCancelled, selectedEmployeeIds]);

  // Handle drag-drop rescheduling
  const handleEventDrop = useCallback(
    ({ event, start }: { event: CalendarEvent; start: string | Date }) => {
      if (!event.isDraggable) return;

      const newStart = start instanceof Date ? start : new Date(start);
      rescheduleMutation.mutate({
        bookingId: event.id,
        startTime: newStart.toISOString(),
      });
    },
    [rescheduleMutation],
  );

  // Handle event click to open detail panel
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedBookingId(event.id);
    setDetailPanelOpen(true);
  }, []);

  // Event styling based on booking status
  const eventPropGetter = useCallback(
    (event: CalendarEvent) => ({
      style: {
        backgroundColor: STATUS_COLORS[event.booking.status] ?? '#3B82F6',
        borderRadius: '0.375rem',
        border: 'none',
        fontSize: '0.875rem',
        padding: '2px 4px',
      },
    }),
    [],
  );

  const handleCloseDetailPanel = () => {
    setDetailPanelOpen(false);
    setSelectedBookingId(null);
  };

  const statusLabels: Record<string, string> = {
    pending: tStatus('pending'),
    confirmed: tStatus('confirmed'),
    completed: tStatus('completed'),
    cancelled: tStatus('cancelled'),
    no_show: tStatus('no_show'),
  };

  // Custom event renderer — shows time + customer + service clearly
  const EventComponent = useCallback(
    ({ event }: { event: CalendarEvent }) => {
      const b = event.booking;
      const time = format(event.start, 'HH:mm');
      const customerName = b.customer?.name ?? '';
      const serviceName = b.service?.name ?? '';

      // Month view: show time, customer, and service
      if (view === 'month') {
        return (
          <span
            className="truncate text-[11px] leading-tight"
            title={`${time} ${customerName} — ${serviceName}${b.employee?.name ? ` · ${b.employee.name}` : ''}`}
          >
            <strong>{time}</strong> {customerName}{' '}
            <span className="opacity-75">— {serviceName}</span>
          </span>
        );
      }

      // Day/Week view: multi-line with full info
      return (
        <div className="leading-tight overflow-hidden">
          <div className="font-semibold text-[11px] opacity-90">{customerName}</div>
          <div className="text-[10px] opacity-80 truncate">{serviceName}</div>
          {b.employee?.name && (
            <div className="text-[10px] opacity-70 truncate">{b.employee.name}</div>
          )}
        </div>
      );
    },
    [view],
  );

  return (
    <>
      <div className="relative rounded-lg border bg-card p-4 space-y-3">
        {/* Status legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pb-2 border-b">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span>{statusLabels[status] ?? status}</span>
            </div>
          ))}
        </div>
        <DnDCalendar
          localizer={localizer}
          events={calendarEvents}
          view={view}
          date={selectedDate}
          onView={(newView) => useCalendarStore.getState().setView(newView as typeof view)}
          onNavigate={(date) => useCalendarStore.getState().setSelectedDate(date)}
          onEventDrop={handleEventDrop}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
          components={{
            event: EventComponent as never,
          }}
          tooltipAccessor={(event) => {
            const b = (event as CalendarEvent).booking;
            const time = `${format((event as CalendarEvent).start, 'HH:mm')} – ${format((event as CalendarEvent).end, 'HH:mm')}`;
            return `${time}\n${b.customer?.name ?? ''}\n${b.service?.name ?? ''}${b.employee?.name ? `\n${b.employee.name}` : ''}`;
          }}
          draggableAccessor={(event) => (event as CalendarEvent).isDraggable}
          min={new Date(0, 0, 0, 6, 0, 0)}
          max={new Date(0, 0, 0, 22, 0, 0)}
          step={30}
          timeslots={2}
          toolbar={false}
          culture={locale}
          style={{ minHeight: 600 }}
          formats={{
            timeGutterFormat: 'HH:mm',
            eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
              `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
            dayHeaderFormat: (date: Date) =>
              format(date, 'EEEE d. MMMM yyyy', { locale: dateLocale }),
            dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => {
              // react-big-calendar passes the first and last visible day
              const s = format(start, 'd. MMM', { locale: dateLocale });
              const e = format(end, 'd. MMM yyyy', { locale: dateLocale });
              return s === e ? s : `${s} – ${e}`;
            },
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
