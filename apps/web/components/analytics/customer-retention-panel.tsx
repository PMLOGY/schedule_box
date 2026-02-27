'use client';

/**
 * Customer Retention Panel
 * Three-section panel: repeat booking stats, churn breakdown, CLV distribution
 * Uses Card from shadcn/ui and Recharts BarChart for CLV histogram
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ChartContainer } from './chart-container';
import type { CustomerRetentionData } from '@/hooks/use-extended-analytics';

interface CustomerRetentionPanelProps {
  data: CustomerRetentionData;
}

export function CustomerRetentionPanel({ data }: CustomerRetentionPanelProps) {
  const { repeatBooking, churn, clvDistribution } = data;

  const repeatRatePercent = (repeatBooking.repeatRate * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Section 1: Repeat Booking Stats + Section 2: Churn Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Section 1: Repeat Booking Stats */}
        <div className="rounded-lg border bg-card p-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Mira opakovanich rezervaci
          </h4>
          <div className="text-4xl font-bold text-primary">{repeatRatePercent}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            {repeatBooking.repeatCustomers} z {repeatBooking.totalCustomers} zakazniku se vraci
          </div>
        </div>

        {/* Section 2: Churn Breakdown */}
        <div className="rounded-lg border bg-card p-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Stav zakazniku</h4>
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Aktivni: {churn.active}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Ohrozeni: {churn.atRisk}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Odchozeni: {churn.churned}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-3">
            Aktivni = navsteva za poslednich 90 dni | Ohrozeni = 90-180 dni | Odchozeni = 180+ dni
          </div>
        </div>
      </div>

      {/* Section 3: CLV Distribution */}
      {clvDistribution.length > 0 && (
        <div>
          <ChartContainer
            id="clv-distribution-chart"
            title="Rozdeleni hodnoty zakazniku (CLV)"
            description="Pocet zakazniku v jednotlivych rozsazich predpovidane hodnoty"
          >
            <BarChart
              data={clvDistribution}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              accessibilityLayer
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis
                dataKey="range"
                className="text-sm"
                label={{ value: 'Kc', position: 'insideBottomRight', offset: -5 }}
              />
              <YAxis className="text-sm" />
              <Tooltip
                formatter={(value: number | undefined) => [`${value ?? 0} zakazniku`, 'Pocet']}
                labelFormatter={(label: unknown) => `${String(label)} Kc`}
              />
              <Bar dataKey="count" name="Pocet zakazniku" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
