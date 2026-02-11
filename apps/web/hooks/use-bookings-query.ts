/**
 * Booking Query Hooks
 *
 * TanStack Query hooks for fetching bookings data.
 * Provides hooks for list view, calendar view, and single booking detail.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Booking, BookingListQuery } from '@schedulebox/shared/types';
import type { PaginatedResponse, ApiResponse } from '@schedulebox/shared/types';
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
        limit: 500, // Calendar shows limited range
      };

      if (employeeIds && employeeIds.length > 0) {
        // API doesn't support array params directly, so we'll fetch all and filter client-side
        // OR we can make multiple requests - for MVP, fetch all and filter
      }

      const response = await apiClient.get<PaginatedResponse<Booking>>('/bookings', params);

      // Transform to FullCalendar EventInput format
      const events: EventInput[] = response.data.map((booking: Booking) => ({
        id: String(booking.id),
        title: `${booking.customer.name} - ${booking.service.name}`,
        start: booking.startTime,
        end: booking.endTime,
        backgroundColor: booking.service.color || booking.employee?.color || '#3B82F6',
        borderColor: 'transparent',
        extendedProps: {
          booking,
        },
        resourceId: booking.employee ? String(booking.employee.id) : undefined,
      }));

      return events;
    },
    staleTime: 30_000, // 30 seconds
  });
}

// ============================================================================
// SINGLE BOOKING DETAIL
// ============================================================================

/**
 * Hook for fetching single booking detail
 * Disabled when bookingId is null
 */
export function useBookingDetail(bookingId: number | null) {
  return useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const response = await apiClient.get<ApiResponse<Booking>>(`/bookings/${bookingId}`);
      return response.data;
    },
    enabled: bookingId !== null,
    staleTime: 30_000,
  });
}
