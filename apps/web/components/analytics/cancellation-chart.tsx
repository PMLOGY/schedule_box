'use client';

/**
 * Cancellation & No-Show Trends Chart
 * Line chart showing cancellation and no-show rates over time with Recharts
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ChartContainer } from './chart-container';
import type { CancellationData } from '@/hooks/use-extended-analytics';

interface CancellationChartProps {
  data: CancellationData[];
}

// Format date for X-axis using Czech locale
function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return format(date, 'MMM d', { locale: cs });
  } catch {
    return dateString;
  }
}

// Format rate as percentage
function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

// Custom tooltip showing both rates and counts
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CancellationData }>;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-medium mb-1">{formatDate(item.date)}</p>
        <p className="text-sm text-red-600 dark:text-red-400">
          Zruseni: {(item.cancelRate * 100).toFixed(1)}% ({item.cancelled}/{item.total})
        </p>
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Nedostaveni: {(item.noShowRate * 100).toFixed(1)}% ({item.noShows}/{item.total})
        </p>
      </div>
    );
  }
  return null;
}

export function CancellationChart({ data }: CancellationChartProps) {
  return (
    <ChartContainer
      id="cancellation-chart"
      title="Zruseni a nedostaveni se"
      description="Denni trend miry zruseni a nedostaveni se"
    >
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="date" tickFormatter={formatDate} className="text-sm" />
        <YAxis tickFormatter={formatRate} className="text-sm" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="cancelRate"
          name="Zruseni (%)"
          stroke="#EF4444"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="noShowRate"
          name="Nedostaveni (%)"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
