'use client';

/**
 * Admin Platform Metrics Dashboard
 * /admin/metrics
 *
 * Two-row layout:
 * - Top row: Business KPIs (signups, MRR, churn, active companies, bookings)
 * - Bottom row: Operational health (notification rate, SMS rate, failed payments, API errors)
 *
 * Auto-refreshes every 60 seconds via TanStack Query refetchInterval.
 */

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Building2,
  Calendar,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Bell,
  MessageSquare,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetricsKpis {
  newSignupsToday: number;
  newSignupsThisWeek: number;
  totalActiveCompanies: number;
  totalBookingsThisWeek: number;
  mrr: number;
  churnRate: number;
}

interface MetricsHealth {
  notificationDeliveryRate: number;
  smsDeliveryRate: number;
  failedPaymentsToday: number;
  apiErrorRate: null;
}

interface MetricsResponse {
  kpis: MetricsKpis;
  health: MetricsHealth;
  asOf: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  loading,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ElementType;
  badge?: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
  loading: boolean;
}) {
  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-end gap-2">
            <div className="text-2xl font-bold">{value}</div>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>
        )}
        {subtitle && !loading && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function DeliveryRateBadge({ rate, loading }: { rate: number | undefined; loading: boolean }) {
  if (loading || rate === undefined) return null;
  if (rate >= 95)
    return (
      <Badge variant="default" className="bg-green-600">
        OK
      </Badge>
    );
  if (rate >= 80) return <Badge variant="secondary">Warn</Badge>;
  return <Badge variant="destructive">Low</Badge>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminMetricsPage() {
  const t = useTranslations();

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => apiClient.get<MetricsResponse>('/admin/metrics'),
    staleTime: 30_000,
    refetchInterval: 60_000, // Auto-refresh every 60 seconds
  });

  const kpis = data?.kpis;
  const health = data?.health;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <PageHeader title={t('admin.metrics.title')} />
            <p className="text-sm text-muted-foreground">{t('admin.metrics.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            {data?.asOf && (
              <span className="text-xs text-muted-foreground">
                {t('admin.metrics.lastUpdated', {
                  time: format(new Date(data.asOf), 'HH:mm:ss', { locale: cs }),
                })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              {t('admin.metrics.refresh')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Business KPIs row */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('admin.metrics.kpis.title')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            title={t('admin.metrics.kpis.newSignupsToday')}
            value={kpis?.newSignupsToday ?? 0}
            subtitle={
              kpis
                ? `${kpis.newSignupsThisWeek} ${t('admin.metrics.kpis.newSignupsThisWeek').toLowerCase()}`
                : undefined
            }
            icon={UserPlus}
            loading={isLoading}
          />
          <MetricCard
            title={t('admin.metrics.kpis.totalActiveCompanies')}
            value={kpis?.totalActiveCompanies ?? 0}
            icon={Building2}
            loading={isLoading}
          />
          <MetricCard
            title={t('admin.metrics.kpis.totalBookingsThisWeek')}
            value={kpis?.totalBookingsThisWeek ?? 0}
            icon={Calendar}
            loading={isLoading}
          />
          <MetricCard
            title={t('admin.metrics.kpis.mrr')}
            value={kpis ? `${kpis.mrr.toLocaleString('cs-CZ')} CZK` : '0 CZK'}
            icon={DollarSign}
            loading={isLoading}
          />
          <MetricCard
            title={t('admin.metrics.kpis.churnRate')}
            value={kpis ? `${kpis.churnRate}%` : '0%'}
            icon={kpis && kpis.churnRate > 5 ? TrendingDown : TrendingUp}
            badge={
              kpis && kpis.churnRate > 5
                ? { label: 'High', variant: 'destructive' }
                : kpis
                  ? { label: 'Low', variant: 'default' }
                  : undefined
            }
            loading={isLoading}
          />
        </div>
      </div>

      {/* Operational health row */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('admin.metrics.health.title')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={t('admin.metrics.health.notificationDeliveryRate')}
            value={
              health ? (
                <span className="flex items-center gap-1">
                  {health.notificationDeliveryRate}%
                  <DeliveryRateBadge rate={health.notificationDeliveryRate} loading={isLoading} />
                </span>
              ) : (
                '—'
              )
            }
            icon={Bell}
            loading={isLoading}
          />
          <MetricCard
            title={t('admin.metrics.health.smsDeliveryRate')}
            value={
              health ? (
                <span className="flex items-center gap-1">
                  {health.smsDeliveryRate}%
                  <DeliveryRateBadge rate={health.smsDeliveryRate} loading={isLoading} />
                </span>
              ) : (
                '—'
              )
            }
            icon={MessageSquare}
            loading={isLoading}
          />
          <MetricCard
            title={t('admin.metrics.health.failedPaymentsToday')}
            value={health?.failedPaymentsToday ?? 0}
            icon={CreditCard}
            badge={
              health && health.failedPaymentsToday > 0
                ? { label: 'Alert', variant: 'destructive' }
                : undefined
            }
            loading={isLoading}
          />
          <MetricCard
            title={t('admin.metrics.health.apiErrorRate')}
            value={t('admin.metrics.pending')}
            icon={AlertTriangle}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Footer: last DB snapshot info */}
      {dataUpdatedAt > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('admin.metrics.lastUpdated', {
            time: format(new Date(dataUpdatedAt), 'HH:mm:ss', { locale: cs }),
          })}
        </p>
      )}
    </div>
  );
}
