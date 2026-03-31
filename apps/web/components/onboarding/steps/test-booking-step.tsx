'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, CalendarCheck, CheckSquare, Square } from 'lucide-react';
import { useOnboardingWizard } from '@/stores/onboarding-wizard.store';
import { apiClient } from '@/lib/api-client';

export function TestBookingStep() {
  const t = useTranslations();
  const router = useRouter();
  const { data, prevStep, setSubmitting, setError, isSubmitting, markStepCompleted } =
    useOnboardingWizard();

  const [testDone, setTestDone] = useState(false);
  const [companySlug, setCompanySlug] = useState<string | null>(data.companySlug ?? null);

  // Fetch slug if not already known
  useEffect(() => {
    if (companySlug) return;
    apiClient
      .get<Record<string, unknown>>('/settings/company')
      .then((res) => {
        const slug = res?.slug as string | undefined;
        if (slug) setCompanySlug(slug);
      })
      .catch((err) => {
        console.error('[TestBookingStep] Failed to fetch company slug:', err);
      });
  }, [companySlug]);

  const baseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? `${window.location.origin}`
      : 'https://schedulebox.cz';
  const bookingUrl = companySlug ? `${baseUrl}/${companySlug}` : '';

  const handleOpenBooking = () => {
    if (bookingUrl) {
      window.open(bookingUrl, '_blank');
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      markStepCompleted(5);
      await apiClient.put('/settings/company', { onboarding_completed: true });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-8 w-8 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{t('onboarding.testBooking.title')}</h2>
      </div>
      <p className="text-muted-foreground">{t('onboarding.testBooking.subtitle')}</p>

      {/* Test booking card */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 space-y-4">
        <p className="text-sm text-foreground">{t('onboarding.testBooking.instructions')}</p>
        <Button
          onClick={handleOpenBooking}
          disabled={!bookingUrl}
          variant="outline"
          className="w-full gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          {t('onboarding.testBooking.openBookingPage')}
        </Button>
      </div>

      {/* Confirmation checkbox */}
      <button
        type="button"
        className="flex items-center gap-3 rounded-lg border p-4 w-full text-left hover:bg-muted/50 transition-colors"
        onClick={() => setTestDone(!testDone)}
      >
        {testDone ? (
          <CheckSquare className="h-5 w-5 text-primary shrink-0" />
        ) : (
          <Square className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm font-medium">{t('onboarding.testBooking.confirmDone')}</span>
      </button>

      {/* Note: optional step */}
      <p className="text-xs text-muted-foreground">{t('onboarding.testBooking.optional')}</p>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4">
        <Button onClick={handleComplete} disabled={isSubmitting} className="w-full" size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('onboarding.saving')}
            </>
          ) : (
            t('onboarding.testBooking.complete')
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={prevStep} className="w-full">
          {t('onboarding.back')}
        </Button>
      </div>
    </div>
  );
}
