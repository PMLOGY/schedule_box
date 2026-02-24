'use client';

import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Link } from '@/lib/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import BookingStatusBadge from '@/components/booking/BookingStatusBadge';
import { useBookingsQuery } from '@/hooks/use-bookings-query';

/**
 * Recent bookings card for the dashboard.
 * Shows the latest 5 bookings with customer name, service, time, and status.
 */
export function RecentBookings() {
  const t = useTranslations('dashboard');
  const { data, isLoading } = useBookingsQuery({ page: 1, limit: 5 });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('recentBookings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const bookings = data?.data ?? [];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium">{t('recentBookings')}</CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('noBookingsYet')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.uuid}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{booking.customer?.name ?? '—'}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{booking.service?.name ?? '—'}</span>
                    <span className="shrink-0">{format(new Date(booking.startTime), 'HH:mm')}</span>
                  </div>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>
            ))}
            <Link
              href="/bookings"
              className="block text-center text-sm text-primary hover:underline pt-1"
            >
              {t('viewAllBookings')}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
