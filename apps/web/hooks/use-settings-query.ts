import { useQuery } from '@tanstack/react-query';
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
