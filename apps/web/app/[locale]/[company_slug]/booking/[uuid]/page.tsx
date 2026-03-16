'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cs, sk, enUS } from 'date-fns/locale';
import { Link } from '@/lib/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  UserPlus,
  Star,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface PublicBooking {
  uuid: string;
  status: string;
  start_time: string;
  end_time: string;
  service_name: string;
  employee_name: string | null;
  company_name: string;
  company_slug: string;
  price: string;
  currency: string;
}

export default function BookingTrackingPage() {
  const params = useParams<{ uuid: string; company_slug: string }>();
  const t = useTranslations('publicBooking.tracking');
  const locale = useLocale();
  const dateLocale = { cs, sk, en: enUS }[locale] || cs;
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelEmail, setCancelEmail] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const {
    data: booking,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['public', 'booking', params.uuid],
    queryFn: async () => {
      const res = await fetch(`/api/v1/public/bookings/${params.uuid}`);
      if (!res.ok) throw new Error('Booking not found');
      const json = await res.json();
      return (json.data || json) as PublicBooking;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`/api/v1/public/bookings/${params.uuid}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Cancellation failed');
      }
    },
    onSuccess: () => {
      setCancelDialogOpen(false);
      setCancelEmail('');
      refetch();
    },
    onError: (err: Error) => {
      setCancelError(err.message);
    },
  });

  const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
    pending: { icon: AlertCircle, color: 'text-amber-500' },
    confirmed: { icon: CheckCircle2, color: 'text-blue-500' },
    completed: { icon: CheckCircle2, color: 'text-green-500' },
    cancelled: { icon: XCircle, color: 'text-gray-500' },
    no_show: { icon: XCircle, color: 'text-red-500' },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">{t('notFound')}</h2>
            <p className="text-muted-foreground mt-2">{t('notFoundDescription')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const canCancel = ['pending', 'confirmed'].includes(booking.status);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <Card>
          <CardHeader className="text-center">
            <StatusIcon className={`h-12 w-12 mx-auto ${config.color} mb-2`} />
            <CardTitle>{t('title')}</CardTitle>
            <Badge variant="outline" className="mx-auto">
              {t(`status.${booking.status}`)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{booking.company_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(booking.start_time), 'PPP', { locale: dateLocale })}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(booking.start_time), 'p', { locale: dateLocale })} –{' '}
                  {format(new Date(booking.end_time), 'p', { locale: dateLocale })}
                </span>
              </div>
              <div className="border-t pt-3 mt-1">
                <div className="flex justify-between">
                  <span className="font-medium">{booking.service_name}</span>
                  <span className="font-semibold">
                    {Number(booking.price).toLocaleString()} {booking.currency}
                  </span>
                </div>
                {booking.employee_name && (
                  <p className="text-sm text-muted-foreground mt-1">{booking.employee_name}</p>
                )}
              </div>
            </div>

            {booking.status === 'completed' && (
              <div className="border rounded-lg p-4 text-center space-y-3 bg-muted/30">
                <Star className="h-6 w-6 mx-auto text-amber-500" />
                <p className="text-sm font-medium">{t('reviewCta')}</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${params.company_slug}/review/${params.uuid}`}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {t('leaveReview')}
                  </Link>
                </Button>
              </div>
            )}

            {canCancel && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCancelDialogOpen(true)}
              >
                {t('cancelBooking')}
              </Button>
            )}

            <div className="border-t pt-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">{t('createAccountCta')}</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/register">
                  <UserPlus className="h-4 w-4 mr-1" />
                  {t('createAccount')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('cancelDialog.title')}</DialogTitle>
              <DialogDescription>{t('cancelDialog.description')}</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCancelError(null);
                cancelMutation.mutate(cancelEmail);
              }}
            >
              <div className="py-4">
                <Input
                  type="email"
                  placeholder={t('cancelDialog.emailPlaceholder')}
                  value={cancelEmail}
                  onChange={(e) => setCancelEmail(e.target.value)}
                  required
                />
                {cancelError && <p className="text-sm text-destructive mt-2">{cancelError}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCancelDialogOpen(false)}>
                  {t('cancelDialog.back')}
                </Button>
                <Button type="submit" variant="destructive" disabled={cancelMutation.isPending}>
                  {cancelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  {t('cancelDialog.confirm')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
