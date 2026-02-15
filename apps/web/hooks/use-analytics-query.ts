import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@schedulebox/shared/types';

export interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  totalCustomers: number;
  avgHealthScore: number;
  comparison: {
    revenueChange: number;
    bookingsChange: number;
    noShowChange: number;
  };
}

interface PeriodStats {
  totalBookings: number;
  totalRevenue: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  avgRevenuePerDay: number;
}

interface OverviewData {
  currentPeriod: PeriodStats;
  previousPeriod: PeriodStats;
  comparison: {
    revenueChange: number;
    bookingsChange: number;
    noShowChange: number;
  };
}

export function useAnalyticsQuery(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'overview', days],
    queryFn: async () => {
      // Use new analytics/overview endpoint for booking and revenue data
      const overview = await apiClient.get<OverviewData>('/analytics/overview', { days });

      // Get customer count from customers endpoint (still needed)
      const customersRes = await apiClient.get<PaginatedResponse<{ health_score: number | null }>>(
        '/customers',
        { page: 1, limit: 100 },
      );

      // Calculate average health score
      const healthScores = customersRes.data
        .filter((c): c is { health_score: number } & typeof c => c.health_score !== null)
        .map((c) => c.health_score);
      const avgHealthScore =
        healthScores.length > 0
          ? healthScores.reduce((sum, s) => sum + s, 0) / healthScores.length
          : 0;

      return {
        totalBookings: overview.currentPeriod.totalBookings,
        totalRevenue: overview.currentPeriod.totalRevenue,
        totalCustomers: customersRes.meta.total,
        avgHealthScore: Math.round(avgHealthScore),
        comparison: overview.comparison,
      } satisfies AnalyticsData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
