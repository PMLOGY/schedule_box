import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@schedulebox/shared/types';

export interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  totalCustomers: number;
  completedBookings: number;
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
      const overview = await apiClient.get<OverviewData>('/analytics/overview', { days });

      const customersRes = await apiClient.get<PaginatedResponse<unknown>>('/customers', {
        page: 1,
        limit: 1,
      });

      return {
        totalBookings: overview.currentPeriod.totalBookings,
        totalRevenue: overview.currentPeriod.totalRevenue,
        totalCustomers: customersRes.meta.total,
        completedBookings: overview.currentPeriod.completedBookings,
        comparison: overview.comparison,
      } satisfies AnalyticsData;
    },
    staleTime: 5 * 60 * 1000,
  });
}
