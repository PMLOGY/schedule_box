'use client';

import { CalendarPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface AddToCalendarButtonProps {
  bookingUuid: string;
  className?: string;
}

export function AddToCalendarButton({ bookingUuid, className }: AddToCalendarButtonProps) {
  const t = useTranslations('booking.wizard.step4');

  const handleDownload = () => {
    // Trigger ICS file download by navigating to the calendar export endpoint
    const url = `/api/v1/bookings/${bookingUuid}/calendar`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${bookingUuid.slice(0, 8)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button variant="outline" onClick={handleDownload} className={className}>
      <CalendarPlus className="mr-2 h-4 w-4" />
      {t('addToCalendar')}
    </Button>
  );
}
