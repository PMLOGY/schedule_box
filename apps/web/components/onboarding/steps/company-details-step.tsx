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
import { useOnboardingWizard } from '@/stores/onboarding-wizard.store';
import {
  companyDetailsSchema,
  type CompanyDetailsInput,
  INDUSTRY_TYPES,
} from '@/validations/onboarding';
import { Loader2 } from 'lucide-react';

export function CompanyDetailsStep() {
  const t = useTranslations();
  const { data, updateData, nextStep, setSubmitting, setError, markStepCompleted, isSubmitting } =
    useOnboardingWizard();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyDetailsInput>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      name: data.companyName ?? '',
      phone: data.phone ?? '',
      description: data.description ?? '',
      address_street: data.addressStreet ?? '',
      address_city: data.addressCity ?? '',
      address_zip: data.addressZip ?? '',
      industry_type: (data.industryType as CompanyDetailsInput['industry_type']) ?? 'general',
    },
  });

  const industryType = watch('industry_type');

  const onSubmit = async (values: CompanyDetailsInput) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          phone: values.phone || undefined,
          description: values.description || undefined,
          address_street: values.address_street || undefined,
          address_city: values.address_city || undefined,
          address_zip: values.address_zip || undefined,
          industry_type: values.industry_type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ?? 'Failed to save company details');
      }

      updateData({
        companyName: values.name,
        phone: values.phone,
        description: values.description,
        addressStreet: values.address_street,
        addressCity: values.address_city,
        addressZip: values.address_zip,
        industryType: values.industry_type,
      });

      markStepCompleted(1);
      nextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    markStepCompleted(1);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {t('onboarding.companyDetails.title')}
        </h2>
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="name">{t('onboarding.companyDetails.nameLabel')} *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder={t('onboarding.companyDetails.namePlaceholder')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* Industry Type */}
      <div className="space-y-2">
        <Label htmlFor="industry_type">{t('onboarding.companyDetails.industryLabel')} *</Label>
        <Select
          value={industryType}
          onValueChange={(value) =>
            setValue('industry_type', value as CompanyDetailsInput['industry_type'])
          }
        >
          <SelectTrigger id="industry_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`onboarding.industryTypes.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.industry_type && (
          <p className="text-sm text-destructive">{errors.industry_type.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">{t('onboarding.companyDetails.phoneLabel')}</Label>
        <Input
          id="phone"
          {...register('phone')}
          placeholder={t('onboarding.companyDetails.phonePlaceholder')}
          type="tel"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t('onboarding.companyDetails.descriptionLabel')}</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder={t('onboarding.companyDetails.descriptionPlaceholder')}
          rows={3}
        />
      </div>

      {/* Address */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="address_street">
            {t('onboarding.companyDetails.addressStreetLabel')}
          </Label>
          <Input id="address_street" {...register('address_street')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address_zip">{t('onboarding.companyDetails.addressZipLabel')}</Label>
          <Input
            id="address_zip"
            {...register('address_zip')}
            placeholder="123 45"
            className={errors.address_zip ? 'border-destructive' : ''}
          />
          {errors.address_zip && (
            <p className="text-sm text-destructive">{errors.address_zip.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address_city">{t('onboarding.companyDetails.addressCityLabel')}</Label>
        <Input id="address_city" {...register('address_city')} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('onboarding.saving')}
            </>
          ) : (
            t('onboarding.next')
          )}
        </Button>
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 text-center"
        >
          {t('onboarding.skip')}
        </button>
      </div>
    </form>
  );
}
