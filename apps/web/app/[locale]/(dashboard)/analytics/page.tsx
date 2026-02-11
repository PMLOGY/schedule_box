'use client';

import { useTranslations } from 'next-intl';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export default function AnalyticsPage() {
  const t = useTranslations('nav');

  return (
    <div className="space-y-8">
      <PageHeader title={t('analytics')} />
      <EmptyState
        icon={BarChart3}
        title="Analytics coming soon"
        description="This feature will be available in a future phase."
      />
    </div>
  );
}
