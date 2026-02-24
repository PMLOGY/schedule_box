'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodSelector } from '@/components/analytics/period-selector';
import { KpiComparisonCards } from '@/components/analytics/kpi-comparison-cards';
import { ExportToolbar } from '@/components/analytics/export-toolbar';
import { useRevenueAnalytics } from '@/hooks/use-revenue-analytics';
import { useBookingAnalytics, useAnalyticsOverview } from '@/hooks/use-booking-analytics';
import {
  usePaymentMethodAnalytics,
  useTopServicesAnalytics,
  usePeakHoursAnalytics,
  useEmployeeUtilization,
  useCancellationAnalytics,
  useCustomerRetention,
} from '@/hooks/use-extended-analytics';
import { AnalyticsEmptyState } from '@/components/onboarding/empty-states/analytics-empty';

// Chart loading skeleton
const ChartSkeleton = () => (
  <div className="h-[350px] w-full">
    <Skeleton className="h-full w-full" />
  </div>
);

// Dynamic imports for charts to prevent SSR hydration issues
const RevenueChart = dynamic(
  () =>
    import('@/components/analytics/revenue-chart').then((mod) => ({ default: mod.RevenueChart })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const BookingStatsChart = dynamic(
  () =>
    import('@/components/analytics/booking-stats-chart').then((mod) => ({
      default: mod.BookingStatsChart,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const PaymentMethodChart = dynamic(
  () =>
    import('@/components/analytics/payment-method-chart').then((mod) => ({
      default: mod.PaymentMethodChart,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const TopServicesChart = dynamic(
  () =>
    import('@/components/analytics/top-services-chart').then((mod) => ({
      default: mod.TopServicesChart,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const PeakHoursHeatmap = dynamic(
  () =>
    import('@/components/analytics/peak-hours-heatmap').then((mod) => ({
      default: mod.PeakHoursHeatmap,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const EmployeeUtilizationChart = dynamic(
  () =>
    import('@/components/analytics/employee-utilization-chart').then((mod) => ({
      default: mod.EmployeeUtilizationChart,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const CancellationChart = dynamic(
  () =>
    import('@/components/analytics/cancellation-chart').then((mod) => ({
      default: mod.CancellationChart,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const CustomerRetentionPanel = dynamic(
  () =>
    import('@/components/analytics/customer-retention-panel').then((mod) => ({
      default: mod.CustomerRetentionPanel,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export default function AnalyticsPage() {
  const t = useTranslations('analytics');

  // State for selected time period
  const [days, setDays] = useState(30);

  // Fetch existing analytics data
  const { data: revenueData, isLoading: isLoadingRevenue } = useRevenueAnalytics(days);
  const { data: bookingData, isLoading: isLoadingBookings } = useBookingAnalytics(days);
  const { data: overview, isLoading: isLoadingOverview } = useAnalyticsOverview(days);

  // Fetch new extended analytics data
  const { data: paymentData, isLoading: isLoadingPayments } = usePaymentMethodAnalytics(days);
  const { data: topServicesData, isLoading: isLoadingTopServices } = useTopServicesAnalytics(days);
  const { data: peakHoursData, isLoading: isLoadingPeakHours } = usePeakHoursAnalytics(days);
  const { data: employeeData, isLoading: isLoadingEmployees } = useEmployeeUtilization(days);
  const { data: cancellationData, isLoading: isLoadingCancellations } =
    useCancellationAnalytics(days);
  const { data: retentionData, isLoading: isLoadingRetention } = useCustomerRetention();

  const isLoadingAny = isLoadingRevenue || isLoadingBookings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title={t('title')} description={t('description')} />

      {/* Controls: Period selector and Export toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PeriodSelector value={days} onChange={setDays} />
        <ExportToolbar
          revenueData={revenueData}
          bookingData={bookingData}
          days={days}
          isLoading={isLoadingAny}
        />
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
        <AnalyticsEmptyState />
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('revenue.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRevenue ? (
            <ChartSkeleton />
          ) : revenueData && revenueData.length > 0 ? (
            <RevenueChart data={revenueData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
          )}
        </CardContent>
      </Card>

      {/* NEW: Payment Method Breakdown + Top Services (two-column grid) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Platebni metody</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPayments ? (
              <ChartSkeleton />
            ) : paymentData && paymentData.length > 0 ? (
              <PaymentMethodChart data={paymentData} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
            )}
          </CardContent>
        </Card>

        {/* Top Services by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Nejlepsi sluzby podle trzeb</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTopServices ? (
              <ChartSkeleton />
            ) : topServicesData && topServicesData.length > 0 ? (
              <TopServicesChart data={topServicesData} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Stats Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('bookings.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBookings ? (
            <ChartSkeleton />
          ) : bookingData && bookingData.length > 0 ? (
            <BookingStatsChart data={bookingData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
          )}
        </CardContent>
      </Card>

      {/* NEW: Peak Hours Heatmap + Cancellation Trends (two-column grid) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Peak Hours Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Vytizenost podle hodin</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPeakHours ? (
              <ChartSkeleton />
            ) : peakHoursData && peakHoursData.length > 0 ? (
              <PeakHoursHeatmap data={peakHoursData} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation & No-Show Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Zruseni a nedostaveni se</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCancellations ? (
              <ChartSkeleton />
            ) : cancellationData && cancellationData.length > 0 ? (
              <CancellationChart data={cancellationData} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* NEW: Employee Utilization (full width) */}
      <Card>
        <CardHeader>
          <CardTitle>Vytizenost zamestnancu</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingEmployees ? (
            <ChartSkeleton />
          ) : employeeData && employeeData.length > 0 ? (
            <EmployeeUtilizationChart data={employeeData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
          )}
        </CardContent>
      </Card>

      {/* NEW: Customer Retention Panel (full width) */}
      <Card>
        <CardHeader>
          <CardTitle>Udrzeni zakazniku</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRetention ? (
            <ChartSkeleton />
          ) : retentionData ? (
            <CustomerRetentionPanel data={retentionData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
