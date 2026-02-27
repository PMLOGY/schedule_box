'use client';

/**
 * Payment Method Breakdown Chart
 * Pie chart showing payment gateway distribution with Recharts
 */

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ChartContainer } from './chart-container';
import type { PaymentMethodData } from '@/hooks/use-extended-analytics';

interface PaymentMethodChartProps {
  data: PaymentMethodData[];
}

// Color map per gateway
const GATEWAY_COLORS: Record<string, string> = {
  comgate: '#3B82F6',
  qrcomat: '#10B981',
  cash: '#F59E0B',
  bank_transfer: '#8B5CF6',
  gift_card: '#EC4899',
};

// Czech-friendly labels per gateway
const GATEWAY_LABELS: Record<string, string> = {
  comgate: 'Kartou',
  qrcomat: 'QR',
  cash: 'Hotovost',
  bank_transfer: 'Prevodem',
  gift_card: 'Poukazka',
};

const DEFAULT_COLOR = '#6B7280';

// Custom tooltip with percentage
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PaymentMethodData & { label: string } }>;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-medium mb-1">{item.label}</p>
        <p className="text-sm">
          Pocet: {item.count} ({item.percentage}%)
        </p>
        <p className="text-sm">Celkem: {item.totalAmount.toLocaleString('cs')} Kc</p>
      </div>
    );
  }
  return null;
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  // Map data with Czech labels
  const chartData = data.map((item) => ({
    ...item,
    label: GATEWAY_LABELS[item.gateway] || item.gateway,
  }));

  return (
    <ChartContainer
      id="payment-method-chart"
      title="Platebni metody"
      description="Rozdeleni plateb podle platebni metody"
    >
      <PieChart accessibilityLayer>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ''} (${((percent ?? 0) * 100).toFixed(1)}%)`
          }
          labelLine
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={GATEWAY_COLORS[entry.gateway] || DEFAULT_COLOR} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ChartContainer>
  );
}
