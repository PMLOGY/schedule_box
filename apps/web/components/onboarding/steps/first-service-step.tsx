'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';
import { useOnboardingWizard } from '@/stores/onboarding-wizard.store';
import { firstServiceSchema, type FirstServiceInput } from '@/validations/onboarding';

// Service templates per industry type
const INDUSTRY_TEMPLATES: Record<string, { name: string; duration: number; price: number }> = {
  beauty_salon: { name: 'Střih dámský', duration: 60, price: 500 },
  barbershop: { name: 'Střih pánský', duration: 30, price: 300 },
  spa_wellness: { name: 'Masáž relaxační', duration: 60, price: 800 },
  fitness_gym: { name: 'Osobní trénink', duration: 60, price: 600 },
  yoga_pilates: { name: 'Hodina jógy', duration: 60, price: 250 },
  dance_studio: { name: 'Lekce tance', duration: 60, price: 350 },
  medical_clinic: { name: 'Konzultace', duration: 30, price: 500 },
  veterinary: { name: 'Prohlídka', duration: 30, price: 600 },
  physiotherapy: { name: 'Terapeutické sezení', duration: 45, price: 700 },
  psychology: { name: 'Psychoterapie', duration: 50, price: 1200 },
  auto_service: { name: 'Výměna oleje', duration: 60, price: 800 },
  cleaning_service: { name: 'Úklid domácnosti', duration: 120, price: 600 },
  tutoring: { name: 'Doučovací hodina', duration: 60, price: 400 },
  photography: { name: 'Portrétní focení', duration: 60, price: 2000 },
  consulting: { name: 'Konzultace', duration: 60, price: 1500 },
  coworking: { name: 'Denní pronájem stolu', duration: 480, price: 300 },
  pet_grooming: { name: 'Koupání a střih', duration: 90, price: 600 },
  tattoo_piercing: { name: 'Konzultace a návrh', duration: 60, price: 500 },
  escape_room: { name: 'Escape room 60 min', duration: 60, price: 800 },
  general: { name: 'Konzultace', duration: 60, price: 500 },
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

export function FirstServiceStep() {
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FirstServiceInput>({
    resolver: zodResolver(firstServiceSchema),
    defaultValues: {
      name: data.serviceName ?? '',
      duration_minutes: data.serviceDuration ?? 60,
      price: data.servicePrice ?? 0,
      description: data.serviceDescription ?? '',
    },
  });

  const duration = watch('duration_minutes');

  const handleUseTemplate = () => {
    const industryType = data.industryType ?? 'general';
    const template = INDUSTRY_TEMPLATES[industryType] ?? INDUSTRY_TEMPLATES['general'];
    setValue('name', template.name);
    setValue('duration_minutes', template.duration);
    setValue('price', template.price);
  };

  const onSubmit = async (values: FirstServiceInput) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          duration_minutes: values.duration_minutes,
          price: values.price,
          description: values.description || undefined,
          online_booking_enabled: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ?? 'Failed to create service');
      }

      updateData({
        serviceName: values.name,
        serviceDuration: values.duration_minutes,
        servicePrice: values.price,
        serviceDescription: values.description,
      });

      markStepCompleted(2);
      nextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    markStepCompleted(2);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{t('onboarding.firstService.title')}</h2>
        {data.industryType && (
          <Button type="button" variant="outline" size="sm" onClick={handleUseTemplate}>
            {t('onboarding.firstService.useTemplate')}
          </Button>
        )}
      </div>

      {/* Tip */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t('onboarding.firstService.tip')}</AlertDescription>
      </Alert>

      {/* Service Name */}
      <div className="space-y-2">
        <Label htmlFor="service_name">{t('onboarding.firstService.nameLabel')} *</Label>
        <Input
          id="service_name"
          {...register('name')}
          placeholder={t('onboarding.firstService.namePlaceholder')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">{t('onboarding.firstService.durationLabel')} *</Label>
        <Select
          value={String(duration)}
          onValueChange={(value) => setValue('duration_minutes', Number(value))}
        >
          <SelectTrigger id="duration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d} {t('onboarding.firstService.minutes')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.duration_minutes && (
          <p className="text-sm text-destructive">{errors.duration_minutes.message}</p>
        )}
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price">{t('onboarding.firstService.priceLabel')} *</Label>
        <div className="relative">
          <Input
            id="price"
            type="number"
            min={0}
            step={1}
            {...register('price', { valueAsNumber: true })}
            className={errors.price ? 'border-destructive pr-10' : 'pr-10'}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            Kč
          </span>
        </div>
        {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="service_description">{t('onboarding.firstService.descriptionLabel')}</Label>
        <Textarea id="service_description" {...register('description')} rows={2} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4">
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
            {t('onboarding.back')}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
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
          {t('onboarding.firstService.skipText')}
        </button>
      </div>
    </form>
  );
}
