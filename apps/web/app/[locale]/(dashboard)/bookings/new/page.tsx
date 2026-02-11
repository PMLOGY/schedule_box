'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import BookingWizard from '@/components/booking/BookingWizard';

export default function NewBookingPage() {
  const t = useTranslations('booking');

  return (
    <div className="space-y-8">
      <PageHeader title={t('new.title')} />
      <BookingWizard />
    </div>
  );
}
