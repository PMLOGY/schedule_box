import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AiInsightsData {
  highRiskBookings: Array<{
    bookingId: string;
    customerName: string;
    serviceName: string;
    startTime: string;
    noShowProbability: number;
    riskLevel: 'medium' | 'high';
  }>;
  totalTodayBookings: number;
  highRiskCount: number;
  aiActive: boolean;
  totalCompanyBookings: number;
  suggestions: string[];
}

export function useAiInsightsQuery() {
  return useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: async () => {
      return apiClient.get<AiInsightsData>('/ai/insights');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - insights are somewhat stable
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes on dashboard
  });
}
