'use client';

import Link from 'next/link';
import { CalendarPlus, UserPlus, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  const t = useTranslations('dashboard');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('quickActions')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/calendar">
            <CalendarPlus className="mr-2 h-4 w-4" />
            {t('newBooking')}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/customers">
            <UserPlus className="mr-2 h-4 w-4" />
            {t('addCustomer')}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/calendar">
            <Calendar className="mr-2 h-4 w-4" />
            {t('viewCalendar')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
