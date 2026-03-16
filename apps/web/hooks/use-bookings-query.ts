/**
 * Booking Query Hooks
 *
 * TanStack Query hooks for fetching bookings data.
 * Provides hooks for list view, calendar view, and single booking detail.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Booking, BookingListQuery } from '@schedulebox/shared/types';
import type { PaginatedResponse } from '@schedulebox/shared/types';
import type { EventInput } from '@fullcalendar/core';

// ============================================================================
// BOOKING LIST QUERY
// ============================================================================

/**
 * Hook for fetching paginated booking list with filters
 * Used in table view on /bookings page
 */
export function useBookingsQuery(params: BookingListQuery) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Booking>>(
        '/bookings',
        params as Record<string, unknown>,
      );
      return response;
    },
    staleTime: 30_000, // 30 seconds - bookings change frequently
  });
}

// ============================================================================
// CALENDAR BOOKINGS QUERY
// ============================================================================

/**
 * Hook for fetching bookings in date range for calendar view
 * Transforms bookings to FullCalendar EventInput format
 */
export function useBookingsForCalendar(dateFrom: string, dateTo: string, employeeIds?: number[]) {
  return useQuery({
    queryKey: ['bookings', 'calendar', dateFrom, dateTo, employeeIds],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        date_from: dateFrom,
        date_to: dateTo,
        limit: 100, // Max allowed by API schema
      };

      if (employeeIds && employeeIds.length > 0) {
        // API doesn't support array params directly, so we'll fetch all and filter client-side
        // OR we can make multiple requests - for MVP, fetch all and filter
      }

      const response = await apiClient.get<PaginatedResponse<Booking>>('/bookings', params);

      // Status → color mapping for calendar events
      const statusColors: Record<string, string> = {
        pending: '#F59E0B', // amber
        confirmed: '#3B82F6', // blue
        completed: '#10B981', // green
        cancelled: '#9CA3AF', // gray
        no_show: '#EF4444', // red
      };

      // Transform to FullCalendar EventInput format
      // Only pending/confirmed bookings can be dragged
      const draggableStatuses = ['pending', 'confirmed'];

      const events: EventInput[] = response.data.map((booking) => ({
        id: String(booking.id),
        title: `${booking.customer?.name ?? ''} — ${booking.service?.name ?? ''}${booking.employee?.name ? ` · ${booking.employee.name}` : ''}`,
        start: booking.startTime,
        end: booking.endTime,
        backgroundColor: statusColors[booking.status] ?? '#3B82F6',
        borderColor: 'transparent',
        editable: draggableStatuses.includes(booking.status),
        extendedProps: {
          booking,
        },
        resourceId: booking.employee ? String(booking.employee.id) : undefined,
      }));

      return events;
    },
    staleTime: 30_000, // 30 seconds
    placeholderData: keepPreviousData,
  });
}

// ============================================================================
// SINGLE BOOKING DETAIL
// ============================================================================

/**
 * Hook for fetching single booking detail
 * Disabled when bookingId is null
 */
export function useBookingDetail(bookingId: string | null) {
  return useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      // apiClient already unwraps { data: booking } → booking
      return apiClient.get<Booking>(`/bookings/${bookingId}`);
    },
    enabled: bookingId !== null,
    staleTime: 30_000,
  });
}
