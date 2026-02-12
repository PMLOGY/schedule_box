'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Plus, Loader2 } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarToolbar } from '@/components/calendar/calendar-toolbar';
import { Button } from '@/components/ui/button';

const BookingCalendar = dynamic(() => import('@/components/booking/BookingCalendar'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] rounded-lg border bg-card">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function CalendarPage() {
  const t = useTranslations('calendar');
  const tBooking = useTranslations('booking');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title={t('title')} />
        <Button asChild>
          <Link href="/bookings/new">
            <Plus className="h-4 w-4 mr-2" />
            {tBooking('new.title')}
          </Link>
        </Button>
      </div>
      <CalendarToolbar />
      <BookingCalendar />
    </div>
  );
}
