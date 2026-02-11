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
  bookingId: string;
  startTime: string;
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
    { code?: string; message?: string; statusCode?: number },
    RescheduleParams & { revertFn?: () => void },
    RescheduleContext
  >({
    mutationFn: async ({ bookingId, startTime }) => {
      const response = await apiClient.post<ApiResponse<Booking>>(
        `/bookings/${bookingId}/reschedule`,
        {
          start_time: startTime,
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

    // On error: rollback optimistic update and show Czech error toast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any, _variables, context) => {
      // Rollback calendar to previous state
      if (context?.previousEvents) {
        queryClient.setQueryData(['bookings', 'calendar'], context.previousEvents);
      }

      // Call FullCalendar's revert function if provided
      if (context?.revertFn) {
        context.revertFn();
      }

      // Map error codes/status to Czech messages
      const code = error?.code ?? '';
      const status = error?.statusCode ?? 0;
      let title: string;
      let description: string;

      if (code === 'SLOT_TAKEN' || status === 409) {
        title = 'Časový slot je obsazený';
        description = 'Jiná rezervace již zabírá tento čas. Zvolte jiný čas.';
      } else if (status === 422) {
        title = 'Nelze přesunout';
        description = 'Přesouvat lze pouze čekající nebo potvrzené rezervace.';
      } else if (status === 404) {
        title = 'Rezervace nenalezena';
        description = 'Rezervace již neexistuje.';
      } else {
        title = 'Přesunutí selhalo';
        description = 'Zkuste to prosím znovu.';
      }

      toast.error(title, { description });
      console.error('[Calendar] Reschedule error:', JSON.stringify(error));
    },

    // On success: show success toast
    onSuccess: () => {
      toast.success('Rezervace přesunuta');
    },

    // Always refetch to ensure data is in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
