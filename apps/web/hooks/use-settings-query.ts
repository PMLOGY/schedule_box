import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

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
  onboarding_completed: boolean | null;
  industry_type: string | null;
}

export interface WorkingHour {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function useCompanySettingsQuery() {
  const user = useAuthStore((s) => s.user);
  // Skip for admin (no company) and employee (no settings.manage permission)
  const canFetchSettings = !!user && user.role !== 'admin' && user.role !== 'employee';

  return useQuery({
    queryKey: ['settings', 'company'],
    queryFn: async () => {
      return apiClient.get<CompanySettings>('/settings/company');
    },
    staleTime: 120_000,
    enabled: canFetchSettings,
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
