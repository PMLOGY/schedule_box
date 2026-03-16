/**
 * Employee self-service bookings hook
 *
 * Fetches only the bookings assigned to the authenticated employee via
 * GET /api/v1/employees/me/bookings. The server enforces the employee_id
 * filter — clients cannot see other employees' bookings.
 *
 * Use this hook instead of useBookingsQuery when the logged-in user is
 * an employee (role === 'employee').
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BookingListQuery } from '@schedulebox/shared';
import type { PaginatedResponse, Booking } from '@schedulebox/shared/types';

/**
 * Fetches the current employee's own bookings.
 * Accepts the same filter params as useBookingsQuery (page, limit, status, etc.)
 * but ignores any employee_id the caller might pass — the server forces its own.
 */
export function useMyBookings(
  params: Partial<BookingListQuery> = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['me', 'bookings', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Booking>>(
        '/employees/me/bookings',
        params as Record<string, unknown>,
      );
      return response;
    },
    staleTime: 30_000, // 30 seconds — same as regular bookings
    enabled: options?.enabled ?? true,
  });
}
