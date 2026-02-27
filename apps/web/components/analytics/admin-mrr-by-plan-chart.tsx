'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { MrrByPlan } from '@/hooks/use-admin-analytics';

const PLAN_COLORS: Record<string, string> = {
  free: '#9ca3af',
  essential: '#3b82f6',
  growth: '#22c55e',
  ai_powered: '#a855f7',
};

interface AdminMrrByPlanChartProps {
  data: MrrByPlan[];
}

export function AdminMrrByPlanChart({ data }: AdminMrrByPlanChartProps) {
  const chartData = data.map((item) => ({
    plan: item.plan.charAt(0).toUpperCase() + item.plan.slice(1).replace('_', '-'),
    mrr: item.mrr,
    originalPlan: item.plan,
  }));

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="plan" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip
            formatter={(value) =>
              new Intl.NumberFormat('cs-CZ', {
                style: 'currency',
                currency: 'CZK',
                minimumFractionDigits: 0,
              }).format(Number(value))
            }
          />
          <Bar dataKey="mrr" name="MRR">
            {chartData.map((item, index) => (
              <Cell key={`cell-${index}`} fill={PLAN_COLORS[item.originalPlan] || '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
