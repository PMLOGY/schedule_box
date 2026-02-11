'use client';

import { useTranslations } from 'next-intl';
import { Megaphone } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export default function MarketingPage() {
  const t = useTranslations('nav');

  return (
    <div className="space-y-8">
      <PageHeader title={t('marketing')} />
      <EmptyState
        icon={Megaphone}
        title="Marketing coming soon"
        description="This feature will be available in a future phase."
      />
    </div>
  );
}
