'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Search } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { format } from 'date-fns';
import { cs, sk, enUS } from 'date-fns/locale';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBookingsQuery } from '@/hooks/use-bookings-query';
import BookingStatusBadge from '@/components/booking/BookingStatusBadge';
import BookingDetailPanel from '@/components/booking/BookingDetailPanel';
import type { BookingStatus } from '@schedulebox/shared/types';

export default function BookingsPage() {
  const t = useTranslations('booking.list');
  const tBooking = useTranslations('booking');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = { cs, sk, en: enUS }[locale] || cs;

  // Filter state
  const [status, setStatus] = useState<BookingStatus | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Detail panel state
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Fetch bookings with filters
  const { data, isLoading } = useBookingsQuery({
    page,
    limit: 20,
    status,
    // Note: API doesn't support customer search by name yet, would need to add
    // For MVP, we'll filter client-side if needed
  });

  const handleRowClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setDetailPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setDetailPanelOpen(false);
    setSelectedBookingId(null);
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'PPP p', { locale: dateLocale });
  };

  const formatPrice = (price: string, currency: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(parseFloat(price));
  };

  return (
    <>
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

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('filters.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={status ?? 'all'}
            onValueChange={(value) =>
              setStatus(value === 'all' ? undefined : (value as BookingStatus))
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('filters.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
              <SelectItem value="pending">{tBooking('status.pending')}</SelectItem>
              <SelectItem value="confirmed">{tBooking('status.confirmed')}</SelectItem>
              <SelectItem value="completed">{tBooking('status.completed')}</SelectItem>
              <SelectItem value="cancelled">{tBooking('status.cancelled')}</SelectItem>
              <SelectItem value="no_show">{tBooking('status.no_show')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.dateTime')}</TableHead>
                <TableHead>{t('columns.customer')}</TableHead>
                <TableHead>{t('columns.service')}</TableHead>
                <TableHead>{t('columns.employee')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead className="text-right">{t('columns.price')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {tCommon('loading')}
                  </TableCell>
                </TableRow>
              ) : !data || data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('noBookings')}
                  </TableCell>
                </TableRow>
              ) : (
                data.data
                  .filter((booking) => {
                    if (!search) return true;
                    const searchLower = search.toLowerCase();
                    return (
                      booking.customer.name.toLowerCase().includes(searchLower) ||
                      booking.customer.email?.toLowerCase().includes(searchLower) ||
                      booking.customer.phone?.toLowerCase().includes(searchLower)
                    );
                  })
                  .map((booking) => (
                    <TableRow
                      key={booking.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(String(booking.id))}
                    >
                      <TableCell className="font-medium">
                        {formatDateTime(booking.startTime)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.customer.name}</div>
                          {booking.customer.email && (
                            <div className="text-sm text-muted-foreground">
                              {booking.customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{booking.service.name}</TableCell>
                      <TableCell>{booking.employee?.name || '-'}</TableCell>
                      <TableCell>
                        <BookingStatusBadge status={booking.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(booking.price, booking.currency)}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.meta.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {tCommon('showing')} {(page - 1) * 20 + 1} {tCommon('to')}{' '}
              {Math.min(page * 20, data.meta.total)} {tCommon('of')} {data.meta.total}{' '}
              {tCommon('entries')}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {tCommon('previous')}
              </Button>
              <div className="text-sm">
                {tCommon('page')} {page} {tCommon('of')} {data.meta.total_pages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.meta.total_pages, p + 1))}
                disabled={page === data.meta.total_pages}
              >
                {tCommon('next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <BookingDetailPanel
        bookingId={selectedBookingId}
        open={detailPanelOpen}
        onClose={handleCloseDetailPanel}
      />
    </>
  );
}
