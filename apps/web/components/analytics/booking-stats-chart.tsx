'use client';

/**
 * Booking Stats Chart Component
 * Stacked bar chart showing booking status breakdown with Recharts
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { ChartContainer } from './chart-container';

interface BookingStatsDataPoint {
  date: string;
  completed: number;
  cancelled: number;
  noShows: number;
  total: number;
}

interface BookingStatsChartProps {
  data: BookingStatsDataPoint[];
}

export function BookingStatsChart({ data }: BookingStatsChartProps) {
  const t = useTranslations('analytics.bookings');

  // Format date for X-axis
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d', { locale: cs });
    } catch {
      return dateString;
    }
  };

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: BookingStatsDataPoint }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium mb-2">{formatDate(data.date)}</p>
          <div className="space-y-1 text-sm">
            <p className="text-green-600 dark:text-green-400">
              {t('completed')}: {data.completed}
            </p>
            <p className="text-red-600 dark:text-red-400">
              {t('cancelled')}: {data.cancelled}
            </p>
            <p className="text-amber-600 dark:text-amber-400">
              {t('noShow')}: {data.noShows}
            </p>
            <p className="font-medium border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
              {t('total')}: {data.total}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      id="booking-stats-chart"
      title={t('chartTitle')}
      description={t('chartDescription')}
    >
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="date" tickFormatter={formatDate} className="text-sm" />
        <YAxis className="text-sm" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="completed" name={t('completed')} fill="#22C55E" stackId="bookings" />
        <Bar
          dataKey="cancelled"
          name={t('cancelled')}
          fill="#EF4444"
          stackId="bookings"
          strokeDasharray="5 5"
        />
        <Bar dataKey="noShows" name={t('noShow')} fill="#F59E0B" stackId="bookings" />
      </BarChart>
    </ChartContainer>
  );
}
