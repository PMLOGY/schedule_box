'use client';

/**
 * Top Services by Revenue Chart
 * Horizontal bar chart showing top services ranked by revenue with Recharts
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ChartContainer } from './chart-container';
import type { TopServiceData } from '@/hooks/use-extended-analytics';

interface TopServicesChartProps {
  data: TopServiceData[];
}

// Format revenue for axis
function formatRevenue(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k Kc`;
  }
  return `${value} Kc`;
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TopServiceData }>;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-medium mb-1">{item.serviceName}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Trzby: {item.totalRevenue.toLocaleString('cs')} Kc
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">Rezervace: {item.bookingCount}</p>
      </div>
    );
  }
  return null;
}

export function TopServicesChart({ data }: TopServicesChartProps) {
  return (
    <ChartContainer
      id="top-services-chart"
      title="Nejlepsi sluzby podle trzeb"
      description="Top 10 sluzeb serazenych podle celkovych trzeb"
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        accessibilityLayer
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis type="number" tickFormatter={formatRevenue} className="text-sm" />
        <YAxis
          type="category"
          dataKey="serviceName"
          width={90}
          className="text-sm"
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="totalRevenue" name="Trzby (Kc)" fill="#3B82F6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
