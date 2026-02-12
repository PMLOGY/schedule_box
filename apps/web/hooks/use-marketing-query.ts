import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@schedulebox/shared/types';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface GiftCard {
  id: string;
  code: string;
  initial_balance: number;
  current_balance: number;
  currency: string;
  recipient_name: string | null;
  recipient_email: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export function useCouponsQuery(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['coupons', params],
    queryFn: async () => {
      return apiClient.get<PaginatedResponse<Coupon>>('/coupons', {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
      } as Record<string, unknown>);
    },
    staleTime: 60_000,
  });
}

export function useGiftCardsQuery(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['gift-cards', params],
    queryFn: async () => {
      return apiClient.get<PaginatedResponse<GiftCard>>('/gift-cards', {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
      } as Record<string, unknown>);
    },
    staleTime: 60_000,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      code: string;
      discount_type: 'percentage' | 'fixed';
      discount_value: number;
      description?: string;
    }) => {
      return apiClient.post('/coupons', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useCreateGiftCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      initial_balance: number;
      recipient_name?: string;
      recipient_email?: string;
    }) => {
      return apiClient.post('/gift-cards', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      code?: string;
      description?: string;
      discount_type?: 'percentage' | 'fixed';
      discount_value?: number;
      is_active?: boolean;
    }) => {
      return apiClient.put(`/coupons/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useUpdateGiftCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      recipient_name?: string;
      recipient_email?: string;
      is_active?: boolean;
    }) => {
      return apiClient.put(`/gift-cards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
    },
  });
}
