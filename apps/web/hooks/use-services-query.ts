import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Service {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  duration_minutes: number;
  price: string;
  currency: string;
  max_capacity: number;
  online_booking_enabled: boolean;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface ServicesQueryParams {
  is_active?: string;
  category_id?: number;
}

export function useServicesQuery(params: ServicesQueryParams = {}) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: async () => {
      return apiClient.get<Service[]>('/services', params as Record<string, unknown>);
    },
    staleTime: 60_000,
  });
}

export function useServiceCategoriesQuery() {
  return useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const result = await apiClient.get<{ data: ServiceCategory[] }>('/service-categories');
      return result.data;
    },
    staleTime: 60_000,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      duration_minutes: number;
      price: number;
      category_id?: number;
      max_capacity?: number;
      online_booking_enabled?: boolean;
    }) => {
      return apiClient.post('/services', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      uuid,
      ...data
    }: {
      uuid: string;
      name?: string;
      duration_minutes?: number;
      price?: number;
      category_id?: number;
      max_capacity?: number;
      online_booking_enabled?: boolean;
      is_active?: boolean;
    }) => {
      return apiClient.put(`/services/${uuid}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useCreateServiceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiClient.post('/service-categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      return apiClient.delete(`/services/${uuid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
