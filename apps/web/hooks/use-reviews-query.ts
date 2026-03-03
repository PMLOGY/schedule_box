/**
 * Review Query Hooks
 *
 * TanStack Query hooks for fetching and mutating reviews data.
 * Provides hooks for list view, summary stats, and reply mutation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@schedulebox/shared/types';

// ============================================================================
// TYPES
// ============================================================================

export interface Review {
  id: string; // UUID
  customer_id: number | null;
  customer_name: string | null;
  booking_id: number | null;
  service_id: number | null;
  service_name: string | null;
  employee_id: number | null;
  rating: number;
  comment: string | null;
  redirected_to: string | null;
  is_published: boolean;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ReviewsQueryParams {
  page?: number;
  limit?: number;
  rating_min?: number;
  status?: 'approved' | 'pending';
}

// ============================================================================
// REVIEWS LIST QUERY
// ============================================================================

/**
 * Hook for fetching paginated reviews list with filters
 * Used on /reviews page
 */
export function useReviewsQuery(params: ReviewsQueryParams = {}) {
  return useQuery({
    queryKey: ['reviews', params],
    queryFn: async () => {
      return apiClient.get<PaginatedResponse<Review>>(
        '/reviews',
        params as Record<string, unknown>,
      );
    },
    staleTime: 60_000,
  });
}

// ============================================================================
// REPLY TO REVIEW MUTATION
// ============================================================================

/**
 * Hook for posting a reply to a review
 * POST /api/v1/reviews/[id]/reply
 */
export function useReplyToReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      return apiClient.post(`/reviews/${id}/reply`, { reply });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}
