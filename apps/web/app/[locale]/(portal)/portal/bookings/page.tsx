'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { format } from 'date-fns';
import { cs, sk, enUS } from 'date-fns/locale';
import { Link } from '@/lib/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, MapPin, Star, ExternalLink } from 'lucide-react';
import { usePortalBookings } from '@/hooks/use-portal-queries';
import BookingStatusBadge from '@/components/booking/BookingStatusBadge';
import type { BookingStatus } from '@schedulebox/shared/types';

export default function PortalBookingsPage() {
  const t = useTranslations('portal.bookings');
  const locale = useLocale();
  const dateLocale = { cs, sk, en: enUS }[locale] || cs;
  const [activeTab, setActiveTab] = useState('upcoming');

  const statusMap: Record<string, string> = {
    upcoming: 'pending,confirmed',
    completed: 'completed',
    cancelled: 'cancelled',
  };

  const { data, isLoading } = usePortalBookings({
    status: statusMap[activeTab],
  });

  const bookings = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">{t('tabs.upcoming')}</TabsTrigger>
          <TabsTrigger value="completed">{t('tabs.completed')}</TabsTrigger>
          <TabsTrigger value="cancelled">{t('tabs.cancelled')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} variant="glass">
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : bookings.length === 0 ? (
            <Card variant="glass">
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>{t('empty')}</p>
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking) => (
              <Card key={booking.uuid} variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{booking.service_name}</span>
                        <BookingStatusBadge status={booking.status as BookingStatus} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(booking.start_time), 'PPP', { locale: dateLocale })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(booking.start_time), 'p', { locale: dateLocale })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {booking.company_name}
                        </span>
                        {booking.employee_name && <span>{booking.employee_name}</span>}
                      </div>
                      <div className="text-sm font-medium">
                        {Number(booking.price).toLocaleString()} {booking.currency}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {booking.status === 'completed' && !booking.has_review && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/${booking.company_slug}/review/${booking.uuid}`}>
                            <Star className="h-3.5 w-3.5 mr-1" />
                            {t('leaveReview')}
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${booking.company_slug}/booking/${booking.uuid}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          {t('trackBooking')}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
