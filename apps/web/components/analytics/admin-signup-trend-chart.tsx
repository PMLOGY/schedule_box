'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SignupTrend } from '@/hooks/use-admin-analytics';

interface AdminSignupTrendChartProps {
  data: SignupTrend[];
}

export function AdminSignupTrendChart({ data }: AdminSignupTrendChartProps) {
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }),
    count: item.count,
  }));

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 3 }}
            name="New Signups"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
