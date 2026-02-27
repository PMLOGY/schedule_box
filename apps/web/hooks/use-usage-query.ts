import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface UsageItem {
  resource: string;
  current: number;
  limit: number;
  unlimited: boolean;
  percentUsed: number;
  warning: boolean;
}

export interface UsageSummary {
  plan: string;
  period: string;
  items: UsageItem[];
}

export function useUsageQuery() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      // API returns { data: { plan, period, items } }
      // apiClient.handleResponse unwraps outer { data } envelope
      const result = await apiClient.get<UsageSummary>('/usage');
      return result;
    },
    staleTime: 60_000, // 1 minute — usage data changes with each booking
    refetchInterval: 300_000, // auto-refresh every 5 minutes on dashboard
  });
}
