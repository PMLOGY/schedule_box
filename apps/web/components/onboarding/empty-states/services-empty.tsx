'use client';

import { useTranslations } from 'next-intl';
import { Briefcase } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

interface ServicesEmptyStateProps {
  onAddService?: () => void;
}

export function ServicesEmptyState({ onAddService }: ServicesEmptyStateProps) {
  const t = useTranslations('emptyStates.services');

  return (
    <EmptyState
      icon={Briefcase}
      title={t('title')}
      description={t('description')}
      action={{
        label: t('action'),
        onClick: onAddService,
      }}
      secondaryAction={{
        label: t('secondaryAction'),
        href: '/onboarding',
      }}
    />
  );
}
