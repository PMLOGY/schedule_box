'use client';

import { Calendar, Banknote, Users, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatCard } from './stat-card';
import { useAnalyticsQuery } from '@/hooks/use-analytics-query';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardGrid() {
  const t = useTranslations('dashboard');
  const { data, isLoading } = useAnalyticsQuery(30);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t('todayBookings')}
        value={data?.totalBookings ?? 0}
        trend={data?.comparison.bookingsChange ? Math.round(data.comparison.bookingsChange) : 0}
        icon={Calendar}
        formatter="number"
      />
      <StatCard
        title={t('monthlyRevenue')}
        value={data?.totalRevenue ?? 0}
        trend={data?.comparison.revenueChange ? Math.round(data.comparison.revenueChange) : 0}
        icon={Banknote}
        formatter="currency"
      />
      <StatCard
        title={t('newCustomers')}
        value={data?.totalCustomers ?? 0}
        icon={Users}
        formatter="number"
      />
      <StatCard
        title={t('noShowRate')}
        value={
          data?.comparison?.noShowChange != null
            ? `${Math.abs(Math.round(data.comparison.noShowChange))}%`
            : 'N/A'
        }
        trend={
          data?.comparison?.noShowChange != null
            ? -Math.round(data.comparison.noShowChange)
            : undefined
        }
        icon={AlertTriangle}
        formatter="number"
      />
    </div>
  );
}
