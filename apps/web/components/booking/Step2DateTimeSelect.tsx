'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-wizard.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilityGrid } from './AvailabilityGrid';

interface AvailabilitySlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  employeeId: number;
  employeeName: string;
  isAvailable: boolean;
}

interface AvailabilityResponse {
  slots: AvailabilitySlot[];
}

export function Step2DateTimeSelect() {
  const t = useTranslations('booking.wizard.step2');
  const { data, updateData, nextStep, prevStep } = useBookingWizard();
  const { user } = useAuthStore();

  // Default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    data.selectedDate ? new Date(data.selectedDate) : tomorrow,
  );

  const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;

  const { data: availabilityData, isLoading } = useQuery<AvailabilityResponse>({
    queryKey: ['availability', data.serviceId, data.employeeId, dateString],
    queryFn: () =>
      apiClient.get('/availability', {
        company_slug: user?.companyId || '', // Using companyId as slug for now
        service_id: data.serviceId,
        employee_id: data.employeeId,
        date_from: dateString,
        date_to: dateString,
      }),
    enabled: !!data.serviceId && !!dateString,
  });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      updateData({
        selectedDate: format(date, 'yyyy-MM-dd'),
        // Clear time selection when date changes
        startTime: undefined,
        endTime: undefined,
        displayTime: undefined,
      });
    }
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    // Convert HH:mm to ISO 8601 datetime
    const startDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
    const endDateTime = new Date(`${slot.date}T${slot.endTime}:00`);

    updateData({
      employeeId: slot.employeeId,
      employeeName: slot.employeeName,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      displayTime: slot.startTime,
      selectedDate: slot.date,
    });

    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t('title')}</h2>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-3">{t('selectDate')}</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />
        </div>

        {selectedDate && (
          <div>
            <h3 className="font-medium mb-3">{t('availableSlots')}</h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : availabilityData?.slots ? (
              <AvailabilityGrid
                slots={availabilityData.slots}
                selectedDate={dateString!}
                onSelect={handleSlotSelect}
              />
            ) : null}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          {t('../../common.back')}
        </Button>
      </div>
    </div>
  );
}
