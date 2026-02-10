'use client';

import { Calendar, Banknote, Users, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatCard } from './stat-card';

export function DashboardGrid() {
  const t = useTranslations('dashboard');

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t('todayBookings')}
        value={12}
        trend={8}
        icon={Calendar}
        formatter="number"
      />
      <StatCard
        title={t('monthlyRevenue')}
        value={47850}
        trend={12}
        icon={Banknote}
        formatter="currency"
      />
      <StatCard title={t('newCustomers')} value={23} trend={5} icon={Users} formatter="number" />
      <StatCard title={t('averageRating')} value={4.7} trend={0.2} icon={Star} formatter="rating" />
    </div>
  );
}
