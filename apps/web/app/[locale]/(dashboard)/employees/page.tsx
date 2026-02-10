'use client';

import { useTranslations } from 'next-intl';
import { UserCog } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export default function EmployeesPage() {
  const t = useTranslations('nav');

  return (
    <div className="space-y-8">
      <PageHeader title={t('employees')} />
      <EmptyState
        icon={UserCog}
        title="Employee management coming soon"
        description="This feature will be available in a future phase."
      />
    </div>
  );
}
