'use client';

import { useTranslations } from 'next-intl';
import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export default function SettingsPage() {
  const t = useTranslations('nav');

  return (
    <div className="space-y-8">
      <PageHeader title={t('settings')} />
      <EmptyState
        icon={Settings}
        title="Settings panel coming soon"
        description="This feature will be available in a future phase."
      />
    </div>
  );
}
