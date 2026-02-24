'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Sun, CloudSun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface TimeGroup {
  key: 'morning' | 'afternoon' | 'evening';
  slots: AvailabilitySlot[];
}

const TIME_GROUP_ICONS = {
  morning: Sun,
  afternoon: CloudSun,
  evening: Moon,
} as const;

function groupSlotsByTimeOfDay(slots: AvailabilitySlot[]): TimeGroup[] {
  const groups: TimeGroup[] = [
    { key: 'morning', slots: [] },
    { key: 'afternoon', slots: [] },
    { key: 'evening', slots: [] },
  ];

  for (const slot of slots) {
    const hour = parseInt(slot.startTime.split(':')[0], 10);
    if (hour < 12) {
      groups[0].slots.push(slot);
    } else if (hour < 17) {
      groups[1].slots.push(slot);
    } else {
      groups[2].slots.push(slot);
    }
  }

  // Only return groups that have slots
  return groups.filter((g) => g.slots.length > 0);
}

export function AvailabilityGrid({ slots, selectedDate, onSelect }: AvailabilityGridProps) {
  const t = useTranslations('booking.wizard.step2');

  // Filter only available slots for the selected date
  const availableSlots = useMemo(
    () => slots.filter((slot) => slot.isAvailable && slot.date === selectedDate),
    [slots, selectedDate],
  );

  // Check if multiple employees have available slots
  const hasMultipleEmployees = useMemo(() => {
    const employeeIds = new Set(availableSlots.map((slot) => slot.employeeId));
    return employeeIds.size > 1;
  }, [availableSlots]);

  // Group slots by time of day
  const timeGroups = useMemo(() => groupSlotsByTimeOfDay(availableSlots), [availableSlots]);

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('noSlotsAvailable')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {timeGroups.map((group) => {
        const Icon = TIME_GROUP_ICONS[group.key];

        return (
          <div key={group.key} className="space-y-3">
            {/* Group header */}
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span>{t(group.key)}</span>
              <span className="text-xs">({group.slots.length})</span>
            </div>

            {/* Slot buttons grid -- 48px height exceeds 44px mobile tap target minimum */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {group.slots.map((slot, index) => (
                <Button
                  key={`${slot.employeeId}-${slot.startTime}-${index}`}
                  variant="outline"
                  className="h-12 text-sm font-medium"
                  onClick={() => onSelect(slot)}
                >
                  <div className="flex flex-col items-center">
                    <span>{slot.startTime}</span>
                    {/* Show employee first name when multiple employees have slots */}
                    {hasMultipleEmployees && (
                      <span className="text-xs text-muted-foreground truncate max-w-full">
                        {slot.employeeName.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
