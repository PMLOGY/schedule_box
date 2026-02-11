'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AvailabilitySlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  employeeId: number;
  employeeName: string;
  isAvailable: boolean;
}

interface AvailabilityGridProps {
  slots: AvailabilitySlot[];
  selectedDate: string;
  onSelect: (slot: AvailabilitySlot) => void;
}

export function AvailabilityGrid({ slots, selectedDate, onSelect }: AvailabilityGridProps) {
  const t = useTranslations('booking.wizard.step2');

  // Filter only available slots for the selected date
  const availableSlots = slots.filter((slot) => slot.isAvailable && slot.date === selectedDate);

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('noSlotsAvailable')}</p>
      </div>
    );
  }

  // Group slots by employee
  const slotsByEmployee = availableSlots.reduce(
    (acc, slot) => {
      if (!acc[slot.employeeId]) {
        acc[slot.employeeId] = {
          employeeName: slot.employeeName,
          slots: [],
        };
      }
      acc[slot.employeeId].slots.push(slot);
      return acc;
    },
    {} as Record<number, { employeeName: string; slots: AvailabilitySlot[] }>,
  );

  return (
    <div className="space-y-6">
      {Object.entries(slotsByEmployee).map(([employeeId, { employeeName, slots: employeeSlots }]) => (
        <div key={employeeId} className="space-y-3">
          {Object.keys(slotsByEmployee).length > 1 && (
            <h3 className="font-medium text-sm text-muted-foreground">{employeeName}</h3>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {employeeSlots.map((slot, index) => (
              <Button
                key={`${slot.employeeId}-${slot.startTime}-${index}`}
                variant="outline"
                className={cn('h-12')}
                onClick={() => onSelect(slot)}
              >
                {slot.startTime}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
