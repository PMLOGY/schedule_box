'use client';

import { useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export default function BookingsPage() {
  const t = useTranslations('nav');

  return (
    <div className="space-y-8">
      <PageHeader title={t('bookings')} />
      <EmptyState
        icon={BookOpen}
        title="Booking list coming soon"
        description="This feature will be available in a future phase."
      />
    </div>
  );
}
