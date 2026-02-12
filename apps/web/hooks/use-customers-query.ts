import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@schedulebox/shared/types';

export interface Customer {
  id: number;
  uuid: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  health_score: number | null;
  total_bookings: number;
  total_spent: string;
  is_active: boolean;
  last_visit_at: string | null;
  created_at: string;
}

interface CustomersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
}

export function useCustomersQuery(params: CustomersQueryParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      return apiClient.get<PaginatedResponse<Customer>>(
        '/customers',
        params as Record<string, unknown>,
      );
    },
    staleTime: 60_000,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; notes?: string }) => {
      return apiClient.post('/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      uuid,
      ...data
    }: {
      uuid: string;
      name?: string;
      email?: string;
      phone?: string;
      notes?: string;
    }) => {
      return apiClient.put(`/customers/${uuid}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
