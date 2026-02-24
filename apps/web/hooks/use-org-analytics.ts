import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface OrgLocationStats {
  companyId: string;
  companyName: string;
  totalRevenue: number;
  totalBookings: number;
  completedBookings: number;
  occupancyApprox: number;
}

export interface OrgTotals {
  totalRevenue: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  uniqueCustomers: number;
}

export interface OrgAnalyticsData {
  organizationId: string;
  organizationName: string;
  totals: OrgTotals;
  locations: OrgLocationStats[];
}

export function useOrgAnalytics(days: number) {
  return useQuery({
    queryKey: ['analytics', 'organization', days],
    queryFn: async () => {
      const data = await apiClient.get<OrgAnalyticsData>('/analytics/organization', { days });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
