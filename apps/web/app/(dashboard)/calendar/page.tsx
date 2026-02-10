'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarToolbar } from '@/components/calendar/calendar-toolbar';
import { CalendarView } from '@/components/calendar/calendar-view';

export default function CalendarPage() {
  const t = useTranslations('calendar');

  return (
    <div className="space-y-4">
      <PageHeader title={t('title')} />
      <CalendarToolbar />
      <CalendarView />
    </div>
  );
}
