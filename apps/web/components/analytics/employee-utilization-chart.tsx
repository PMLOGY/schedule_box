'use client';

/**
 * Employee Utilization Chart
 * Grouped bar chart showing bookings and occupancy % per employee with Recharts
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { ChartContainer } from './chart-container';
import type { EmployeeUtilizationData } from '@/hooks/use-extended-analytics';

interface EmployeeUtilizationChartProps {
  data: EmployeeUtilizationData[];
}

// Custom tooltip showing all values
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: EmployeeUtilizationData }>;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-medium mb-1">{item.employeeName}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">Rezervace: {item.bookingCount}</p>
        <p className="text-sm text-green-600 dark:text-green-400">
          Vytizenost: {item.occupancyPercent}%
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Trzby: {item.totalRevenue.toLocaleString('cs')} Kc
        </p>
      </div>
    );
  }
  return null;
}

export function EmployeeUtilizationChart({ data }: EmployeeUtilizationChartProps) {
  return (
    <ChartContainer
      id="employee-utilization-chart"
      title="Vytizenost zamestnancu"
      description="Pocet rezervaci a mira vytizeni pro kazdeho zamestnance"
    >
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="employeeName"
          className="text-sm"
          tick={{ fontSize: 12 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis className="text-sm" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="bookingCount" name="Rezervace" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="occupancyPercent"
          name="Vytizenost (%)"
          fill="#10B981"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
