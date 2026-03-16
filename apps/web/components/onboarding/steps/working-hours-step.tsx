'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useOnboardingWizard, type WorkingHourEntry } from '@/stores/onboarding-wizard.store';
import { apiClient } from '@/lib/api-client';

// Generate time options from 06:00 to 22:00 in 30-minute increments
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 6; h <= 22; h++) {
    options.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) options.push(`${String(h).padStart(2, '0')}:30`);
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

// Industry-specific working hour defaults
function getIndustryDefaults(industryType?: string): WorkingHourEntry[] {
  const base = (
    mon: string,
    monEnd: string,
    satActive: boolean,
    satStart: string,
    satEnd: string,
    sunActive: boolean,
    sunStart: string,
    sunEnd: string,
  ): WorkingHourEntry[] => [
    { dayOfWeek: 1, startTime: mon, endTime: monEnd, isActive: true }, // Mon
    { dayOfWeek: 2, startTime: mon, endTime: monEnd, isActive: true }, // Tue
    { dayOfWeek: 3, startTime: mon, endTime: monEnd, isActive: true }, // Wed
    { dayOfWeek: 4, startTime: mon, endTime: monEnd, isActive: true }, // Thu
    { dayOfWeek: 5, startTime: mon, endTime: monEnd, isActive: true }, // Fri
    { dayOfWeek: 6, startTime: satStart, endTime: satEnd, isActive: satActive }, // Sat
    { dayOfWeek: 0, startTime: sunStart, endTime: sunEnd, isActive: sunActive }, // Sun
  ];

  switch (industryType) {
    case 'beauty_salon':
    case 'barbershop':
    case 'spa_wellness':
    case 'pet_grooming':
    case 'tattoo_piercing':
      return base('08:00', '18:00', true, '09:00', '14:00', false, '09:00', '14:00');
    case 'fitness_gym':
    case 'yoga_pilates':
    case 'dance_studio':
    case 'escape_room':
      return base('06:00', '22:00', true, '08:00', '20:00', true, '08:00', '20:00');
    case 'medical_clinic':
    case 'physiotherapy':
    case 'psychology':
    case 'veterinary':
      return base('07:00', '16:00', false, '08:00', '12:00', false, '08:00', '12:00');
    default:
      return base('09:00', '17:00', false, '09:00', '13:00', false, '09:00', '13:00');
  }
}

const DEFAULT_HOURS: WorkingHourEntry[] = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
  { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true },
  { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true },
  { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isActive: true },
  { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isActive: true },
  { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isActive: false },
  { dayOfWeek: 0, startTime: '09:00', endTime: '13:00', isActive: false },
];

export function WorkingHoursStep() {
  const t = useTranslations();
  const {
    data,
    updateData,
    nextStep,
    prevStep,
    setSubmitting,
    setError,
    markStepCompleted,
    isSubmitting,
  } = useOnboardingWizard();

  const [hours, setHours] = useState<WorkingHourEntry[]>(() => {
    if (data.workingHours && data.workingHours.length > 0) {
      return data.workingHours;
    }
    return getIndustryDefaults(data.industryType);
  });

  const DAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'] as const;

  const updateHour = (
    dayOfWeek: number,
    field: keyof WorkingHourEntry,
    value: string | boolean,
  ) => {
    setHours((prev) => prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h)));
  };

  const handleUseDefaults = () => {
    setHours(DEFAULT_HOURS);
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = hours.map((h) => ({
        day_of_week: h.dayOfWeek,
        start_time: h.startTime,
        end_time: h.endTime,
        is_active: h.isActive,
      }));

      await apiClient.put('/settings/working-hours', payload);

      updateData({ workingHours: hours });
      markStepCompleted(3);
      nextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    markStepCompleted(3);
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{t('onboarding.workingHours.title')}</h2>
        <Button type="button" variant="outline" size="sm" onClick={handleUseDefaults}>
          {t('onboarding.workingHours.useDefaults')}
        </Button>
      </div>

      {/* Weekly schedule grid */}
      <div className="space-y-3">
        {/* Sort: Mon-Fri first, then Sat, Sun */}
        {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
          const hour = hours.find((h) => h.dayOfWeek === dayOfWeek) ?? {
            dayOfWeek,
            startTime: '09:00',
            endTime: '17:00',
            isActive: false,
          };

          return (
            <div key={dayOfWeek} className="flex items-center gap-3">
              {/* Active toggle */}
              <div className="flex items-center gap-2 w-32">
                <Switch
                  id={`day-${dayOfWeek}`}
                  checked={hour.isActive}
                  onCheckedChange={(checked: boolean) => updateHour(dayOfWeek, 'isActive', checked)}
                />
                <Label
                  htmlFor={`day-${dayOfWeek}`}
                  className={`text-sm font-medium w-20 ${!hour.isActive ? 'text-muted-foreground' : ''}`}
                >
                  {t(`onboarding.workingHours.days.${DAY_KEYS[dayOfWeek]}`)}
                </Label>
              </div>

              {/* Time selectors */}
              {hour.isActive ? (
                <div className="flex items-center gap-2 flex-1">
                  <Select
                    value={hour.startTime}
                    onValueChange={(v) => updateHour(dayOfWeek, 'startTime', v)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-sm">–</span>
                  <Select
                    value={hour.endTime}
                    onValueChange={(v) => updateHour(dayOfWeek, 'endTime', v)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic flex-1">Zavřeno</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4">
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
            {t('onboarding.back')}
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('onboarding.saving')}
              </>
            ) : (
              t('onboarding.next')
            )}
          </Button>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 text-center"
        >
          {t('onboarding.skip')}
        </button>
      </div>
    </div>
  );
}
