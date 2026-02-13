import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CompanySettings {
  uuid: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  address_street: string | null;
  address_city: string | null;
  address_zip: string | null;
  currency: string;
  timezone: string;
  subscription_plan: string;
  created_at: string;
}

export interface WorkingHour {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function useCompanySettingsQuery() {
  return useQuery({
    queryKey: ['settings', 'company'],
    queryFn: async () => {
      // API returns { data: { data: company } } — apiClient unwraps outer { data }
      const result = await apiClient.get<{ data: CompanySettings }>('/settings/company');
      return result.data;
    },
    staleTime: 120_000,
  });
}

export function useWorkingHoursQuery() {
  return useQuery({
    queryKey: ['settings', 'working-hours'],
    queryFn: async () => {
      const result = await apiClient.get<{ data: WorkingHour[] }>('/settings/working-hours');
      return result.data;
    },
    staleTime: 120_000,
  });
}

export interface CompanyUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  description?: string;
  address_street?: string;
  address_city?: string;
  address_zip?: string;
  currency?: string;
  timezone?: string;
}

export interface WorkingHourInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CompanyUpdateData) => {
      return apiClient.put('/settings/company', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'company'] });
    },
  });
}

export function useUpdateWorkingHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: WorkingHourInput[]) => {
      return apiClient.put('/settings/working-hours', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'working-hours'] });
    },
  });
}
