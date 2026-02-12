'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodSelector } from '@/components/analytics/period-selector';
import { KpiComparisonCards } from '@/components/analytics/kpi-comparison-cards';
import { useRevenueAnalytics } from '@/hooks/use-revenue-analytics';
import { useBookingAnalytics, useAnalyticsOverview } from '@/hooks/use-booking-analytics';

// Dynamic imports for charts to prevent SSR hydration issues
const RevenueChart = dynamic(
  () =>
    import('@/components/analytics/revenue-chart').then((mod) => ({ default: mod.RevenueChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

const BookingStatsChart = dynamic(
  () =>
    import('@/components/analytics/booking-stats-chart').then((mod) => ({
      default: mod.BookingStatsChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

export default function AnalyticsPage() {
  const t = useTranslations('analytics');

  // State for selected time period
  const [days, setDays] = useState(30);

  // Fetch analytics data
  const { data: revenueData, isLoading: isLoadingRevenue } = useRevenueAnalytics(days);
  const { data: bookingData, isLoading: isLoadingBookings } = useBookingAnalytics(days);
  const { data: overview, isLoading: isLoadingOverview } = useAnalyticsOverview(days);

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title={t('title')} description={t('description')} />
        <PeriodSelector value={days} onChange={setDays} />
      </div>

      {/* KPI Comparison Cards */}
      {isLoadingOverview ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-16 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : overview ? (
        <KpiComparisonCards overview={overview} />
      ) : (
        <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('revenue.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRevenue ? (
            <div className="h-[350px] w-full">
              <Skeleton className="h-full w-full" />
            </div>
          ) : revenueData && revenueData.length > 0 ? (
            <RevenueChart data={revenueData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
          )}
        </CardContent>
      </Card>

      {/* Booking Stats Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('bookings.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBookings ? (
            <div className="h-[350px] w-full">
              <Skeleton className="h-full w-full" />
            </div>
          ) : bookingData && bookingData.length > 0 ? (
            <BookingStatsChart data={bookingData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
