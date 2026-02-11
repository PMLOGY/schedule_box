'use client';

import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarToolbar } from '@/components/calendar/calendar-toolbar';
import { Button } from '@/components/ui/button';
import BookingCalendar from '@/components/booking/BookingCalendar';

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
