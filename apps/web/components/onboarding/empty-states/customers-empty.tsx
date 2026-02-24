'use client';

import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

interface CustomersEmptyStateProps {
  onAddCustomer?: () => void;
}

export function CustomersEmptyState({ onAddCustomer }: CustomersEmptyStateProps) {
  const t = useTranslations('emptyStates.customers');

  return (
    <EmptyState
      icon={Users}
      title={t('title')}
      description={t('description')}
      action={{
        label: t('action'),
        onClick: onAddCustomer,
      }}
    />
  );
}
