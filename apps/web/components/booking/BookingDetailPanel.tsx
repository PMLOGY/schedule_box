/**
 * Booking Detail Panel Component
 *
 * Slide-over panel that displays full booking details with status action buttons.
 * Opens when a booking is clicked in calendar or list view.
 */

'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { format } from 'date-fns';
import { cs, sk, enUS } from 'date-fns/locale';
import {
  Loader2,
  Calendar,
  User,
  Briefcase,
  Clock,
  Coins,
  FileText,
  ClipboardList,
  Pencil,
  Save,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBookingDetail } from '@/hooks/use-bookings-query';
import { apiClient } from '@/lib/api-client';
import { VERTICAL_FIELDS } from '@/lib/industry/industry-fields';
import { useIndustryLabels } from '@/hooks/use-industry-labels';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { BookingStatus } from '@schedulebox/shared/types';
import BookingStatusBadge from './BookingStatusBadge';
import { NoShowRiskDetail } from '@/components/ai/NoShowRiskDetail';

/** Booking shape matching the actual API snake_case response */
interface BookingDetail {
  id: string;
  customer: { id: string; name: string; email: string | null; phone: string | null };
  service: { id: string; name: string; durationMinutes: number; price: string };
  employee: { id: string; name: string } | null;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  price: string;
  currency: string;
  discountAmount: string;
  notes: string | null;
  internalNotes: string | null;
  noShowProbability: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
  bookingMetadata?: Record<string, unknown> | null;
}

interface BookingDetailPanelProps {
  bookingId: string | null;
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
  const locale = useLocale() as 'cs' | 'sk' | 'en';
  const queryClient = useQueryClient();
  const labels = useIndustryLabels();

  const { data: booking, isLoading } = useBookingDetail(bookingId) as {
    data: BookingDetail | null | undefined;
    isLoading: boolean;
  };

  const dateLocale = LOCALE_MAP[locale] || cs;

  // Editable tutoring notes state
  const [editingNotes, setEditingNotes] = useState(false);
  const [lessonNotes, setLessonNotes] = useState('');
  const [homework, setHomework] = useState('');

  // Sync tutoring fields when booking data loads or changes
  useEffect(() => {
    if (booking?.bookingMetadata) {
      setLessonNotes(String(booking.bookingMetadata.lesson_notes ?? ''));
      setHomework(String(booking.bookingMetadata.homework ?? ''));
    }
  }, [booking?.bookingMetadata]);

  // Reset editing state when panel closes
  useEffect(() => {
    if (!open) setEditingNotes(false);
  }, [open]);

  const isTutoring = booking?.bookingMetadata?.industry_type === 'tutoring';

  // Mutation for saving tutoring notes/homework via PUT
  const metadataMutation = useMutation({
    mutationFn: async () => {
      if (!bookingId) throw new Error('No booking ID');
      const updatedMetadata = {
        ...(booking?.bookingMetadata as Record<string, unknown>),
        lesson_notes: lessonNotes,
        homework: homework,
      };
      return await apiClient.put(`/bookings/${bookingId}`, {
        booking_metadata: updatedMetadata,
      });
    },
    onSuccess: () => {
      toast.success('Poznámky uloženy');
      setEditingNotes(false);
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('Nepodařilo se uložit poznámky', {
        description: typeof error.message === 'string' ? error.message : undefined,
      });
    },
  });

  // Map API action names to translation keys (no-show → noShow)
  const actionToKey = (action: string) => action.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  // Mutation for booking actions (confirm, cancel, complete, no-show)
  const actionMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: string; reason?: string }) => {
      if (!bookingId) throw new Error('No booking ID');

      const endpoint = `/bookings/${bookingId}/${action}`;
      const payload = reason ? { reason } : {};

      return await apiClient.post(endpoint, payload);
    },
    onSuccess: (_, { action }) => {
      toast.success(t(`actions.${actionToKey(action)}.success`));
      // Invalidate detail query so panel shows updated status without closing
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
      // Also invalidate list so the table reflects the change
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      // Panel stays open — user can close manually with the close button
    },
    onError: (error: { message?: string }, { action }) => {
      toast.error(t(`actions.${actionToKey(action)}.error`), {
        description: typeof error.message === 'string' ? error.message : undefined,
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
            <SheetTitle className="sr-only">{t('loading')}</SheetTitle>
            <SheetDescription className="sr-only">{t('loading')}</SheetDescription>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : booking ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <span>{booking.service.name}</span>
                <BookingStatusBadge status={booking.status as BookingStatus} />
              </SheetTitle>
              <SheetDescription>
                {t('bookingId')}: #{booking.id.slice(0, 8)}
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
                  <Coins className="h-4 w-4" />
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

              {/* Vertical Metadata (industry-specific fields) */}
              {booking.bookingMetadata && Object.keys(booking.bookingMetadata).length > 1 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ClipboardList className="h-4 w-4" />
                        {labels.customer} — doplňkové údaje
                      </div>
                      {isTutoring && !editingNotes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNotes(true)}
                          className="h-7 gap-1 text-xs"
                        >
                          <Pencil className="h-3 w-3" />
                          Upravit poznámky
                        </Button>
                      )}
                    </div>

                    {/* Editable tutoring notes */}
                    {isTutoring && editingNotes ? (
                      <div className="pl-6 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-sm text-muted-foreground font-medium">
                            Poznámky z lekce
                          </label>
                          <Textarea
                            value={lessonNotes}
                            onChange={(e) => setLessonNotes(e.target.value)}
                            placeholder="Co se probíralo, postřehy..."
                            maxLength={2000}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm text-muted-foreground font-medium">
                            Domácí úkol
                          </label>
                          <Textarea
                            value={homework}
                            onChange={(e) => setHomework(e.target.value)}
                            placeholder="Zadání pro studenta..."
                            maxLength={1000}
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => metadataMutation.mutate()}
                            disabled={metadataMutation.isPending}
                            className="gap-1"
                          >
                            {metadataMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            Uložit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingNotes(false);
                              setLessonNotes(String(booking.bookingMetadata?.lesson_notes ?? ''));
                              setHomework(String(booking.bookingMetadata?.homework ?? ''));
                            }}
                            className="gap-1"
                          >
                            <XCircle className="h-3 w-3" />
                            Zrušit
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="pl-6 space-y-1 text-sm">
                        {Object.entries(booking.bookingMetadata)
                          .filter(([key]) => key !== 'industry_type')
                          .map(([key, value]) => {
                            const industryType = (
                              booking.bookingMetadata as Record<string, unknown>
                            )?.industry_type;
                            const fields = VERTICAL_FIELDS[String(industryType ?? '')] ?? [];
                            const fieldDef = fields.find((f) => f.key === key);
                            const label = fieldDef?.label ?? key;
                            return (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* AI No-Show Prediction */}
              <NoShowRiskDetail probability={booking.noShowProbability} />

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
            <SheetTitle className="sr-only">{t('notFound')}</SheetTitle>
            <SheetDescription className="sr-only">{t('notFound')}</SheetDescription>
            <p className="text-muted-foreground">{t('notFound')}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
