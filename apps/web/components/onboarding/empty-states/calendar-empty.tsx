'use client';

import { useTranslations } from 'next-intl';
import { Calendar } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

export function CalendarEmptyState() {
  const t = useTranslations('emptyStates.calendar');

  return (
    <EmptyState
      icon={Calendar}
      title={t('title')}
      description={t('description')}
      action={{
        label: t('action'),
        href: '/bookings/new',
      }}
      secondaryAction={{
        label: t('secondaryAction'),
        href: '/settings',
      }}
    />
  );
}
