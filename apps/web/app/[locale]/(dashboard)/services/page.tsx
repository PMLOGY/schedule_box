'use client';

import { useTranslations } from 'next-intl';
import { Scissors } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export default function ServicesPage() {
  const t = useTranslations('nav');

  return (
    <div className="space-y-8">
      <PageHeader title={t('services')} />
      <EmptyState
        icon={Scissors}
        title="Service catalog coming soon"
        description="This feature will be available in a future phase."
      />
    </div>
  );
}
