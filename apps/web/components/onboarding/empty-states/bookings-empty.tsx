'use client';

import { useTranslations } from 'next-intl';
import { CalendarPlus } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { useCompanySettingsQuery } from '@/hooks/use-settings-query';

export function BookingsEmptyState() {
  const t = useTranslations('emptyStates.bookings');
  const { data: companySettings } = useCompanySettingsQuery();

  const handleShareLink = () => {
    const slug = companySettings?.slug;
    const bookingUrl = slug ? `${window.location.origin}/book/${slug}` : window.location.origin;
    navigator.clipboard.writeText(bookingUrl).catch(() => {
      // Fallback: navigate to settings to find the link
    });
  };

  return (
    <EmptyState
      icon={CalendarPlus}
      title={t('title')}
      description={t('description')}
      action={{
        label: t('action'),
        onClick: handleShareLink,
      }}
      secondaryAction={{
        label: t('secondaryAction'),
        href: '/bookings/new',
      }}
    />
  );
}
