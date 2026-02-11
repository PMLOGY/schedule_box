'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-wizard.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface CustomerResponse {
  id: number;
  uuid: string;
}

interface BookingResponse {
  id: number;
  uuid: string;
}

export function Step4Confirmation() {
  const t = useTranslations('booking.wizard.step4');
  const tCommon = useTranslations('common');
  const tStep1 = useTranslations('booking.wizard.step1');
  const { data, prevStep, setSubmitting, setError, setStep, reset } = useBookingWizard();
  const router = useRouter();

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!data.serviceId || !data.startTime || !data.customerName) {
        throw new Error('Missing required booking data');
      }

      // If no existing customer selected, create one first
      let customerId = data.customerId;
      if (!customerId) {
        const customer = await apiClient.post<CustomerResponse>('/customers', {
          name: data.customerName,
          email: data.customerEmail || undefined,
          phone: data.customerPhone || undefined,
        });
        customerId = customer.id;
      }

      return apiClient.post<BookingResponse>('/bookings', {
        customer_id: customerId,
        service_id: data.serviceId,
        employee_id: data.employeeId,
        start_time: data.startTime,
        notes: data.notes,
        source: 'admin',
      });
    },
    onMutate: () => {
      setSubmitting(true);
      setError(null);
    },
    onSuccess: () => {
      setSubmitting(false);
      toast.success(t('bookingSuccess'));
      reset();
      router.push('/bookings');
    },
    onError: (error: Error & { statusCode?: number; code?: string }) => {
      setSubmitting(false);

      // Handle 409 SLOT_TAKEN error
      if (error.statusCode === 409 && error.code === 'SLOT_TAKEN') {
        toast.error(t('slotTaken'));
        // Go back to Step 2 — setStep clears error, so set error AFTER
        setStep(2);
        setError(t('slotTaken'));
      } else {
        const errorMessage = typeof error.message === 'string' ? error.message : t('bookingError');
        setError(errorMessage);
        toast.error(errorMessage);
      }
    },
  });

  const handleConfirm = () => {
    createBookingMutation.mutate();
  };

  const handleCancel = () => {
    reset();
    router.push('/bookings');
  };

  // Format date and time for display
  const formattedDateTime = data.startTime
    ? format(new Date(data.startTime), 'EEEE, d. MMMM yyyy', { locale: cs })
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t('title')}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('summary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">{t('service')}</h3>
            <p className="text-base">
              {data.serviceName} ({data.serviceDuration} min)
            </p>
            <p className="text-sm text-muted-foreground">{data.servicePrice}</p>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium text-sm text-muted-foreground">{t('datetime')}</h3>
            <p className="text-base">{formattedDateTime}</p>
            <p className="text-base">{data.displayTime}</p>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium text-sm text-muted-foreground">{t('employee')}</h3>
            <p className="text-base">{data.employeeName || tStep1('anyEmployee')}</p>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium text-sm text-muted-foreground">{t('customer')}</h3>
            <p className="text-base">{data.customerName}</p>
            {data.customerEmail && (
              <p className="text-sm text-muted-foreground">{data.customerEmail}</p>
            )}
            {data.customerPhone && (
              <p className="text-sm text-muted-foreground">{data.customerPhone}</p>
            )}
          </div>

          {data.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">{t('notes')}</h3>
                <p className="text-base">{data.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={handleCancel}>
          {tCommon('cancel')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={prevStep}>
            {tCommon('back')}
          </Button>
          <Button onClick={handleConfirm} disabled={createBookingMutation.isPending}>
            {createBookingMutation.isPending ? tCommon('loading') : t('confirmBooking')}
          </Button>
        </div>
      </div>
    </div>
  );
}
