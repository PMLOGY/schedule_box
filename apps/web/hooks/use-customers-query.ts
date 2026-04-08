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

export interface CustomerDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
  customer_metadata?: Record<string, unknown> | null;
  source: string | null;
  health_score: number | null;
  clv_predicted: string | null;
  no_show_count: number | null;
  total_bookings: number;
  total_spent: string;
  last_visit_at: string | null;
  marketing_consent: boolean;
  preferred_contact: string | null;
  preferred_reminder_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tags: CustomerTag[];
}

export interface CustomerTag {
  id: number;
  name: string;
  color: string | null;
}

export interface CustomerBooking {
  id: string;
  service_id: number | null;
  employee_id: number | null;
  start_time: string;
  end_time: string;
  status: string;
  source: string | null;
  notes: string | null;
  price: string | null;
  currency: string | null;
  discount_amount: string | null;
  no_show_probability: number | null;
  created_at: string;
  updated_at: string;
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
      customer_metadata?: Record<string, unknown>;
    }) => {
      return apiClient.put(`/customers/${uuid}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useCustomerDetail(uuid: string) {
  return useQuery({
    queryKey: ['customers', uuid],
    queryFn: () => apiClient.get<CustomerDetail>(`/customers/${uuid}`),
    enabled: !!uuid,
  });
}

export function useCustomerBookings(uuid: string) {
  return useQuery({
    queryKey: ['customers', uuid, 'bookings'],
    queryFn: () => apiClient.get<PaginatedResponse<CustomerBooking>>(`/customers/${uuid}/bookings`),
    enabled: !!uuid,
  });
}

export function useTagsQuery() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiClient.get<{ data: CustomerTag[] }>('/tags'),
  });
}

export function useUpdateCustomerTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, tagIds }: { uuid: string; tagIds: number[] }) =>
      apiClient.put(`/customers/${uuid}/tags`, { tag_ids: tagIds }),
    onSuccess: (_, { uuid }) => {
      qc.invalidateQueries({ queryKey: ['customers', uuid] });
    },
  });
}
