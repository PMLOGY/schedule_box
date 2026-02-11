/**
 * Booking Reschedule Mutation Hook
 *
 * TanStack Query mutation for drag-drop rescheduling with optimistic updates.
 * Implements Pattern 4 from research: optimistic UI with automatic rollback on failure.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Booking } from '@schedulebox/shared/types';
import type { ApiResponse } from '@schedulebox/shared/types';
import { toast } from 'sonner';

interface RescheduleParams {
  bookingId: number;
  startTime: string;
  employeeId?: number;
}

interface RescheduleContext {
  previousEvents?: unknown;
  revertFn?: () => void;
}

/**
 * Hook for rescheduling bookings with optimistic updates
 *
 * Usage:
 * ```typescript
 * const reschedule = useRescheduleBooking();
 * reschedule.mutate({
 *   bookingId: 123,
 *   startTime: '2024-01-15T10:00:00Z',
 *   employeeId: 5,
 *   revertFn: info.revert, // FullCalendar's revert function
 * });
 * ```
 */
export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<Booking>,
    Error,
    RescheduleParams & { revertFn?: () => void },
    RescheduleContext
  >({
    mutationFn: async ({ bookingId, startTime, employeeId }) => {
      const response = await apiClient.post<ApiResponse<Booking>>(
        `/bookings/${bookingId}/reschedule`,
        {
          start_time: startTime,
          employee_id: employeeId,
        },
      );
      return response;
    },

    // Optimistic update: cancel outgoing queries and snapshot current data
    onMutate: async ({ revertFn }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['bookings'] });

      // Snapshot previous value for rollback
      const previousEvents = queryClient.getQueryData(['bookings', 'calendar']);

      // Store revert function for rollback
      return { previousEvents, revertFn };
    },

    // On error: rollback optimistic update and show error toast
    onError: (error, _variables, context) => {
      // Rollback calendar to previous state
      if (context?.previousEvents) {
        queryClient.setQueryData(['bookings', 'calendar'], context.previousEvents);
      }

      // Call FullCalendar's revert function if provided
      if (context?.revertFn) {
        context.revertFn();
      }

      // Show error toast
      toast.error('Failed to reschedule booking', {
        description: 'The time slot may already be taken. Please try another time.',
      });

      console.error('Reschedule error:', error);
    },

    // On success: show success toast
    onSuccess: () => {
      toast.success('Booking rescheduled successfully');
    },

    // Always refetch to ensure data is in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
