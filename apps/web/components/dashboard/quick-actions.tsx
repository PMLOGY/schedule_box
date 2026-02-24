'use client';

import { Link } from '@/lib/i18n/navigation';
import { CalendarPlus, UserPlus, Calendar, BarChart3, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  const t = useTranslations('dashboard');

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" size="sm" asChild>
        <Link href="/bookings/new">
          <CalendarPlus className="mr-2 h-4 w-4" />
          {t('newBooking')}
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/customers">
          <UserPlus className="mr-2 h-4 w-4" />
          {t('addCustomer')}
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/calendar">
          <Calendar className="mr-2 h-4 w-4" />
          {t('viewCalendar')}
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/analytics">
          <BarChart3 className="mr-2 h-4 w-4" />
          {t('viewAnalytics')}
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/services">
          <Settings className="mr-2 h-4 w-4" />
          {t('manageServices')}
        </Link>
      </Button>
    </div>
  );
}
