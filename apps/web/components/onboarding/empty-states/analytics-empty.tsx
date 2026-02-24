'use client';

import { useTranslations } from 'next-intl';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { useCompanySettingsQuery } from '@/hooks/use-settings-query';

export function AnalyticsEmptyState() {
  const t = useTranslations('emptyStates.analytics');
  const { data: companySettings } = useCompanySettingsQuery();

  const handleShareLink = () => {
    const slug = companySettings?.slug;
    const bookingUrl = slug ? `${window.location.origin}/book/${slug}` : window.location.origin;
    navigator.clipboard.writeText(bookingUrl).catch(() => {
      // Fallback: silent fail
    });
  };

  return (
    <EmptyState
      icon={BarChart3}
      title={t('title')}
      description={t('description')}
      action={{
        label: t('action'),
        onClick: handleShareLink,
      }}
    />
  );
}
