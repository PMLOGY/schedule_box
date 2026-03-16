/**
 * Marketplace Query Hooks
 *
 * TanStack Query hooks for browsing marketplace listings
 * and managing the current company's own listing.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// TYPES
// ============================================================================

export interface MarketplaceListing {
  id: string;
  company_name: string;
  title: string;
  description: string | null;
  category: string | null;
  rating: number | null;
  review_count: number;
  is_visible: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface MarketplaceListingsParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

export interface MyListingData {
  title: string;
  description?: string;
  category?: string;
  is_visible: boolean;
}

// ============================================================================
// BROWSE LISTINGS QUERY
// ============================================================================

/**
 * Hook for fetching paginated marketplace listings
 * Used on /marketplace browse tab
 */
export function useMarketplaceListings(params: MarketplaceListingsParams = {}) {
  return useQuery({
    queryKey: ['marketplace', 'listings', params],
    queryFn: async () => {
      return apiClient.get<{
        data: MarketplaceListing[];
        meta?: { total: number; total_pages: number };
      }>('/marketplace/listings', params as Record<string, unknown>);
    },
    staleTime: 60_000,
  });
}

// ============================================================================
// MY LISTING QUERY
// ============================================================================

/**
 * Hook for fetching the current company's marketplace listing
 * Used on /marketplace "My Listing" tab
 */
export function useMyListing() {
  return useQuery({
    queryKey: ['marketplace', 'my-listing'],
    queryFn: async () => {
      return apiClient.get<MarketplaceListing | null>('/marketplace/my-listing');
    },
  });
}

// ============================================================================
// UPDATE MY LISTING MUTATION
// ============================================================================

/**
 * Hook for creating or updating the current company's marketplace listing
 * PUT /api/v1/marketplace/my-listing (upsert)
 */
export function useUpdateMyListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: MyListingData) => {
      return apiClient.put('/marketplace/my-listing', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
}
