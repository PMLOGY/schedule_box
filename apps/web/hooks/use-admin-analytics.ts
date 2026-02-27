import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface PlanDistribution {
  plan: string;
  count: number;
  percentage: number;
}

export interface SignupTrend {
  date: string;
  count: number;
}

export interface MrrByPlan {
  plan: string;
  mrr: number;
}

export interface AdminAnalyticsData {
  mrr: number;
  arr: number;
  churnRate: number;
  activeCompanies: number;
  totalCompanies: number;
  planDistribution: PlanDistribution[];
  signupTrend: SignupTrend[];
  mrrByPlan: MrrByPlan[];
}

export function useAdminAnalytics(days: number) {
  return useQuery({
    queryKey: ['admin', 'analytics', days],
    queryFn: async () => {
      const data = await apiClient.get<AdminAnalyticsData>('/admin/analytics', { days });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
