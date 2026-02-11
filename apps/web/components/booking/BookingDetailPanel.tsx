/**
 * Booking Detail Panel Component
 *
 * Slide-over panel that displays full booking details with status action buttons.
 * Opens when a booking is clicked in calendar or list view.
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { cs, sk, enUS } from 'date-fns/locale';
import { Loader2, Calendar, User, Briefcase, Clock, DollarSign, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useBookingDetail } from '@/hooks/use-bookings-query';
import { apiClient } from '@/lib/api-client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import BookingStatusBadge from './BookingStatusBadge';
import type { Booking } from '@schedulebox/shared/types';
import type { ApiResponse } from '@schedulebox/shared/types';

interface BookingDetailPanelProps {
  bookingId: number | null;
  open: boolean;
  onClose: () => void;
}

const LOCALE_MAP = {
  cs,
  sk,
  en: enUS,
};

export default function BookingDetailPanel({ bookingId, open, onClose }: BookingDetailPanelProps) {
  const t = useTranslations('booking.detail');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useBookingDetail(bookingId);

  // Get locale from next-intl (default to cs if not available)
  const locale = 'cs' as 'cs' | 'sk' | 'en'; // TODO: Get from useLocale() hook
  const dateLocale = LOCALE_MAP[locale] || cs;

  // Mutation for booking actions (confirm, cancel, complete, no-show)
  const actionMutation = useMutation<
    ApiResponse<Booking>,
    Error,
    { action: string; reason?: string }
  >({
    mutationFn: async ({ action, reason }) => {
      if (!bookingId) throw new Error('No booking ID');

      const endpoint = `/bookings/${bookingId}/${action}`;
      const payload = reason ? { reason } : undefined;

      return await apiClient.post<ApiResponse<Booking>>(endpoint, payload);
    },
    onSuccess: (_, { action }) => {
      toast.success(t(`actions.${action}.success`));
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
    onError: (error, { action }) => {
      toast.error(t(`actions.${action}.error`), {
        description: error.message,
      });
    },
  });

  const handleAction = (action: string) => {
    actionMutation.mutate({ action });
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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : booking ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <span>{booking.service.name}</span>
                <BookingStatusBadge status={booking.status} />
              </SheetTitle>
              <SheetDescription>
                {t('bookingId')}: #{booking.id}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Customer Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  {t('customer')}
                </div>
                <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{booking.customer.name}</p>
                  {booking.customer.email && <p>{booking.customer.email}</p>}
                  {booking.customer.phone && <p>{booking.customer.phone}</p>}
                </div>
              </div>

              <Separator />

              {/* Service & Employee */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Briefcase className="h-4 w-4" />
                  {t('service')}
                </div>
                <div className="pl-6 space-y-1 text-sm">
                  <p className="font-medium">{booking.service.name}</p>
                  <p className="text-muted-foreground">
                    {booking.service.durationMinutes} {t('minutes')}
                  </p>
                  {booking.employee && (
                    <p className="text-muted-foreground">
                      {t('employee')}: {booking.employee.name}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Date & Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  {t('dateTime')}
                </div>
                <div className="pl-6 text-sm">
                  <p className="font-medium">{formatDateTime(booking.startTime)}</p>
                  <p className="text-muted-foreground">
                    {format(new Date(booking.startTime), 'HH:mm')} -{' '}
                    {format(new Date(booking.endTime), 'HH:mm')}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Price */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4" />
                  {t('price')}
                </div>
                <div className="pl-6 text-sm">
                  <p className="font-medium">{formatPrice(booking.price, booking.currency)}</p>
                  {parseFloat(booking.discountAmount) > 0 && (
                    <p className="text-muted-foreground">
                      {t('discount')}: -{formatPrice(booking.discountAmount, booking.currency)}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {(booking.notes || booking.internalNotes) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      {t('notes')}
                    </div>
                    <div className="pl-6 space-y-2 text-sm">
                      {booking.notes && (
                        <div>
                          <p className="font-medium text-muted-foreground">{t('customerNotes')}:</p>
                          <p className="text-foreground">{booking.notes}</p>
                        </div>
                      )}
                      {booking.internalNotes && (
                        <div>
                          <p className="font-medium text-muted-foreground">{t('internalNotes')}:</p>
                          <p className="text-foreground">{booking.internalNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Metadata */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  {t('metadata')}
                </div>
                <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                  <p>
                    {t('createdAt')}: {formatDateTime(booking.createdAt)}
                  </p>
                  <p>
                    {t('source')}: {booking.source}
                  </p>
                  {booking.cancelledAt && (
                    <>
                      <p>
                        {t('cancelledAt')}: {formatDateTime(booking.cancelledAt)}
                      </p>
                      {booking.cancellationReason && (
                        <p>
                          {t('cancellationReason')}: {booking.cancellationReason}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-2">
                {booking.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => handleAction('confirm')}
                      disabled={actionMutation.isPending}
                      className="w-full"
                    >
                      {actionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {t('actions.confirm.button')}
                    </Button>
                    <Button
                      onClick={() => handleAction('cancel')}
                      disabled={actionMutation.isPending}
                      variant="destructive"
                      className="w-full"
                    >
                      {t('actions.cancel.button')}
                    </Button>
                  </>
                )}

                {booking.status === 'confirmed' && (
                  <>
                    <Button
                      onClick={() => handleAction('complete')}
                      disabled={actionMutation.isPending}
                      className="w-full"
                    >
                      {actionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {t('actions.complete.button')}
                    </Button>
                    <Button
                      onClick={() => handleAction('no-show')}
                      disabled={actionMutation.isPending}
                      variant="outline"
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      {t('actions.noShow.button')}
                    </Button>
                    <Button
                      onClick={() => handleAction('cancel')}
                      disabled={actionMutation.isPending}
                      variant="destructive"
                      className="w-full"
                    >
                      {t('actions.cancel.button')}
                    </Button>
                  </>
                )}

                <Button onClick={onClose} variant="ghost" className="w-full">
                  {tCommon('close')}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">{t('notFound')}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
