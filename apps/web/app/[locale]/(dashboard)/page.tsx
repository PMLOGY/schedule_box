'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { QuickActions } from '@/components/dashboard/quick-actions';

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} />
      <DashboardGrid />
      <QuickActions />
    </div>
  );
}
