'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminAnalyticsData } from '@/hooks/use-admin-analytics';

// Dynamic imports for Recharts (prevent SSR hydration issues)
const AdminPlanDistributionChart = dynamic(
  () =>
    import('./admin-plan-distribution-chart').then((mod) => ({
      default: mod.AdminPlanDistributionChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

const AdminSignupTrendChart = dynamic(
  () =>
    import('./admin-signup-trend-chart').then((mod) => ({
      default: mod.AdminSignupTrendChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

const AdminMrrByPlanChart = dynamic(
  () =>
    import('./admin-mrr-by-plan-chart').then((mod) => ({
      default: mod.AdminMrrByPlanChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

function formatCZK(value: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getChurnColor(rate: number): string {
  if (rate < 5) return 'text-green-600';
  if (rate <= 10) return 'text-yellow-600';
  return 'text-red-600';
}

interface AdminDashboardProps {
  data: AdminAnalyticsData;
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCZK(data.mrr)}</p>
            <p className="text-xs text-muted-foreground mt-1">ARR: {formatCZK(data.arr)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.activeCompanies}</p>
            <p className="text-xs text-muted-foreground mt-1">Total: {data.totalCompanies}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${getChurnColor(data.churnRate)}`}>
              {data.churnRate.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Period churn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ARR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCZK(data.arr)}</p>
            <p className="text-xs text-muted-foreground mt-1">Annual recurring revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {data.planDistribution.length > 0 ? (
            <AdminPlanDistributionChart data={data.planDistribution} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">No plan data available</div>
          )}
        </CardContent>
      </Card>

      {/* Two-column grid: Signup Trend + MRR by Plan */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signup Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {data.signupTrend.length > 0 ? (
              <AdminSignupTrendChart data={data.signupTrend} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">No signup data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MRR by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {data.mrrByPlan.length > 0 ? (
              <AdminMrrByPlanChart data={data.mrrByPlan} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">No MRR data</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
