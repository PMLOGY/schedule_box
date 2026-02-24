'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { PlanDistribution } from '@/hooks/use-admin-analytics';

const PLAN_COLORS: Record<string, string> = {
  free: '#9ca3af', // gray
  essential: '#3b82f6', // blue
  growth: '#22c55e', // green
  ai_powered: '#a855f7', // purple
};

interface AdminPlanDistributionChartProps {
  data: PlanDistribution[];
}

export function AdminPlanDistributionChart({ data }: AdminPlanDistributionChartProps) {
  const chartData = data.map((item) => ({
    name: item.plan.charAt(0).toUpperCase() + item.plan.slice(1).replace('_', '-'),
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            nameKey="name"
            label={({ name, percentage }: { name?: string; percentage?: number }) =>
              `${name ?? ''} (${percentage ?? 0}%)`
            }
          >
            {data.map((item, index) => (
              <Cell key={`cell-${index}`} fill={PLAN_COLORS[item.plan] || '#6b7280'} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} companies`]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
