'use client';

/**
 * Revenue Chart Component
 * Line chart showing revenue trends over time with Recharts
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { ChartContainer } from './chart-container';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  bookings: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const t = useTranslations('analytics.revenue');

  // Format date for X-axis
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d', { locale: cs });
    } catch {
      return dateString;
    }
  };

  // Format revenue for Y-axis and tooltip
  const formatRevenue = (value: number) => {
    const thousands = Math.round(value / 1000);
    return `${thousands}k Kč`;
  };

  // Custom tooltip with Czech locale formatting
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; payload: RevenueDataPoint }>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium mb-1">{formatDate(payload[0].payload.date)}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Tržby: {payload[0].value.toLocaleString('cs')} Kč
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Rezervace: {payload[0].payload.bookings}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer id="revenue-chart" title={t('chartTitle')} description={t('chartDescription')}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="date" tickFormatter={formatDate} className="text-sm" />
        <YAxis tickFormatter={formatRevenue} className="text-sm" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Tržby (Kč)"
          stroke="#3B82F6"
          strokeWidth={2}
          activeDot={{ r: 8 }}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
