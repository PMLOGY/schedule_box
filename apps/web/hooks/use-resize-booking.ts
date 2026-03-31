/**
 * Booking Resize Mutation Hook
 *
 * TanStack Query mutation for drag-to-resize with optimistic updates.
 * Follows the same pattern as use-reschedule-booking.ts.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Booking } from '@schedulebox/shared/types';
import type { ApiResponse } from '@schedulebox/shared/types';
import { toast } from 'sonner';

interface ResizeParams {
  bookingId: string;
  endTime: string;
}

interface ResizeContext {
  previousEvents?: unknown;
}

/**
 * Hook for resizing bookings (changing end time) with optimistic updates.
 *
 * Usage:
 * ```typescript
 * const resize = useResizeBooking();
 * resize.mutate({
 *   bookingId: '...',
 *   endTime: '2024-01-15T11:00:00Z',
 * });
 * ```
 */
export function useResizeBooking() {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<Booking>,
    { code?: string; message?: string; statusCode?: number },
    ResizeParams,
    ResizeContext
  >({
    mutationFn: async ({ bookingId, endTime }) => {
      const response = await apiClient.patch<ApiResponse<Booking>>(
        `/bookings/${bookingId}/resize`,
        {
          end_time: endTime,
        },
      );
      return response;
    },

    // Optimistic update: cancel outgoing queries and snapshot current data
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['bookings'] });
      const previousEvents = queryClient.getQueryData(['bookings', 'calendar']);
      return { previousEvents };
    },

    // On error: rollback optimistic update and show error toast
    onError: (error, _variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(['bookings', 'calendar'], context.previousEvents);
      }

      const status = error?.statusCode ?? 0;
      let title: string;
      let description: string;

      if (status === 422) {
        title = 'Nelze upravit';
        description = 'Upravovat lze pouze cekajici nebo potvrzene rezervace.';
      } else if (status === 404) {
        title = 'Rezervace nenalezena';
        description = 'Rezervace jiz neexistuje.';
      } else {
        title = 'Zmena delky selhala';
        description = 'Zkuste to prosim znovu.';
      }

      toast.error(title, { description });
      console.error('[Calendar] Resize error:', JSON.stringify(error));
    },

    // On success: show success toast
    onSuccess: () => {
      toast.success('Delka rezervace upravena');
    },

    // Always refetch to ensure data is in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
