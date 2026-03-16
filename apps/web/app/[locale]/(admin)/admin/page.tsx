'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, BookOpen, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { useAdminStats } from '@/hooks/use-admin-queries';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const t = useTranslations('admin.dashboard');
  const { data: stats, isLoading } = useAdminStats();

  const kpiCards = [
    {
      key: 'totalCompanies',
      icon: Building2,
      value: stats?.total_companies,
      color: 'text-blue-600',
    },
    {
      key: 'totalUsers',
      icon: Users,
      value: stats?.total_users,
      color: 'text-green-600',
    },
    {
      key: 'totalBookings',
      icon: BookOpen,
      value: stats?.total_bookings,
      color: 'text-purple-600',
    },
    {
      key: 'totalRevenue',
      icon: DollarSign,
      value: stats ? `${Number(stats.total_revenue).toLocaleString()} CZK` : undefined,
      color: 'text-amber-600',
    },
    {
      key: 'newCompanies30d',
      icon: TrendingUp,
      value: stats?.new_companies_30d,
      color: 'text-indigo-600',
    },
    {
      key: 'bookings7d',
      icon: Calendar,
      value: stats?.bookings_7d,
      color: 'text-rose-600',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card) => (
          <Card key={card.key} variant="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(card.key)}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{card.value ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
