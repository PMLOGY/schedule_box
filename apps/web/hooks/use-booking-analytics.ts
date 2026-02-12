import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface BookingStatsDataPoint {
  date: string;
  completed: number;
  cancelled: number;
  noShows: number;
  total: number;
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

export function useBookingAnalytics(days: number) {
  return useQuery({
    queryKey: ['analytics', 'bookings', days],
    queryFn: async () => {
      const data = await apiClient.get<BookingStatsDataPoint[]>('/analytics/bookings', { days });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAnalyticsOverview(days: number) {
  return useQuery({
    queryKey: ['analytics', 'overview', days],
    queryFn: async () => {
      const data = await apiClient.get<OverviewData>('/analytics/overview', { days });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
