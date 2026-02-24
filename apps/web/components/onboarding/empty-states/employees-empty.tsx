'use client';

import { useTranslations } from 'next-intl';
import { UserPlus } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

interface EmployeesEmptyStateProps {
  onAddEmployee?: () => void;
}

export function EmployeesEmptyState({ onAddEmployee }: EmployeesEmptyStateProps) {
  const t = useTranslations('emptyStates.employees');

  return (
    <EmptyState
      icon={UserPlus}
      title={t('title')}
      description={t('description')}
      action={{
        label: t('action'),
        onClick: onAddEmployee,
      }}
    />
  );
}
