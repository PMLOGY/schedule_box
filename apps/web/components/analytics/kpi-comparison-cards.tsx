'use client';

/**
 * KPI Comparison Cards Component
 * Displays key performance indicators with period-over-period comparison
 */

import {
  ArrowUp,
  ArrowDown,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrencyFormat } from '@/hooks/use-currency-format';

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

interface KpiComparisonCardsProps {
  overview: OverviewData;
}

export function KpiComparisonCards({ overview }: KpiComparisonCardsProps) {
  const t = useTranslations('analytics.kpi');

  const { formatCurrency: formatCurrencyRaw } = useCurrencyFormat();
  const formatCurrency = (value: number) =>
    formatCurrencyRaw(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Format percentage change
  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Calculate no-show rate
  const calculateNoShowRate = (period: PeriodStats) => {
    if (period.totalBookings === 0) return 0;
    return (period.noShows / period.totalBookings) * 100;
  };

  const currentNoShowRate = calculateNoShowRate(overview.currentPeriod);
  const previousNoShowRate = calculateNoShowRate(overview.previousPeriod);

  // KPI card configuration
  const kpis = [
    {
      title: t('totalBookings'),
      value: overview.currentPeriod.totalBookings.toLocaleString('cs'),
      change: overview.comparison.bookingsChange,
      icon: CalendarCheck,
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: t('totalRevenue'),
      value: formatCurrency(overview.currentPeriod.totalRevenue),
      change: overview.comparison.revenueChange,
      icon: DollarSign,
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: t('avgRevenuePerDay'),
      value: formatCurrency(overview.currentPeriod.avgRevenuePerDay),
      change: overview.comparison.revenueChange, // Same as revenue change
      icon: TrendingUp,
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: t('noShowRate'),
      value: `${currentNoShowRate.toFixed(1)}%`,
      change: currentNoShowRate - previousNoShowRate,
      icon: AlertCircle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      invertColors: true, // For no-show rate, increase is bad (red), decrease is good (green)
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const isPositive = kpi.invertColors ? kpi.change < 0 : kpi.change > 0;
        const isNegative = kpi.invertColors ? kpi.change > 0 : kpi.change < 0;
        const changeColor = isPositive
          ? 'text-green-600 dark:text-green-400'
          : isNegative
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-600 dark:text-gray-400';

        return (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              {kpi.change !== 0 && (
                <div className={`flex items-center gap-1 text-xs ${changeColor} mt-1`}>
                  {isPositive ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : isNegative ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : null}
                  <span>{formatPercentage(Math.abs(kpi.change))}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
