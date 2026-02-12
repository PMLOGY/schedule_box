import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  bookings: number;
}

export function useRevenueAnalytics(days: number) {
  return useQuery({
    queryKey: ['analytics', 'revenue', days],
    queryFn: async () => {
      const data = await apiClient.get<RevenueDataPoint[]>('/analytics/revenue', { days });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
