'use client';

import { useState } from 'react';
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
import { Info, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useOnboardingWizard } from '@/stores/onboarding-wizard.store';
import { firstServiceSchema, type FirstServiceInput } from '@/validations/onboarding';
import { IndustryTemplatePicker } from '@/components/onboarding/industry-template-picker';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

export function FirstServiceStep() {
  const t = useTranslations();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const {
    data,
    updateData,
    nextStep,
    prevStep,
    setSubmitting,
    setError,
    markStepCompleted,
    setStep,
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

  /**
   * Called when the template picker successfully applies a template.
   * The template sets both services AND working hours, so mark both
   * steps 2 and 3 as completed and jump to step 4 (share link).
   */
  const handleTemplateApplied = (_industryType: string) => {
    markStepCompleted(2);
    markStepCompleted(3);
    setStep(4);
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
        throw new Error((errorData as { message?: string }).message ?? 'Failed to create service');
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
    <div className="space-y-6">
      {/* Title */}
      <h2 className="text-2xl font-bold text-foreground">{t('onboarding.firstService.title')}</h2>

      {/* ── Industry Template Picker (collapsible) ── */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between h-auto py-0 px-0 hover:bg-transparent font-medium"
          onClick={() => setShowTemplatePicker((v) => !v)}
        >
          <span>{t('onboarding.templates.useTemplate')}</span>
          {showTemplatePicker ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </Button>

        {showTemplatePicker && <IndustryTemplatePicker onTemplateApplied={handleTemplateApplied} />}
      </div>

      {/* ── Divider ── */}
      <div className="relative flex items-center">
        <div className="flex-1 border-t" />
        <span className="mx-3 text-xs text-muted-foreground">
          {t('onboarding.templates.orCreateOwn')}
        </span>
        <div className="flex-1 border-t" />
      </div>

      {/* ── Manual Service Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          <Label htmlFor="service_description">
            {t('onboarding.firstService.descriptionLabel')}
          </Label>
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
    </div>
  );
}
