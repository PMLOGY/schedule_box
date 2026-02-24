'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, Download, PartyPopper } from 'lucide-react';
import { useOnboardingWizard } from '@/stores/onboarding-wizard.store';

export function ShareLinkStep() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { data, prevStep, setSubmitting, setError, isSubmitting } = useOnboardingWizard();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [companySlug, setCompanySlug] = useState<string | null>(data.companySlug ?? null);

  // Fetch slug if not already in store data
  useEffect(() => {
    if (companySlug) return;
    fetch('/api/v1/settings/company')
      .then((r) => r.json())
      .then((body) => {
        const slug = body?.data?.slug;
        if (slug) setCompanySlug(slug);
      })
      .catch(() => {
        // Non-critical — user can still complete setup
      });
  }, [companySlug]);

  const bookingUrl = companySlug ? `https://schedulebox.cz/${companySlug}` : '';

  // Generate QR code once we have the booking URL
  useEffect(() => {
    if (!bookingUrl) return;
    QRCode.toDataURL(bookingUrl, { width: 200, margin: 2 })
      .then((url) => setQrDataUrl(url))
      .catch(() => {
        // QR generation failure is non-critical
      });
  }, [bookingUrl]);

  const handleCopy = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — silently ignore
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `schedulebox-qr-${companySlug ?? 'booking'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleComplete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ?? 'Failed to complete onboarding');
      }

      router.push(`/${locale}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Celebratory heading */}
      <div className="flex items-center gap-3">
        <PartyPopper className="h-8 w-8 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{t('onboarding.shareLink.title')}</h2>
      </div>
      <p className="text-muted-foreground">{t('onboarding.shareLink.subtitle')}</p>

      {/* Booking URL */}
      {bookingUrl ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-lg font-mono font-semibold text-primary break-all">{bookingUrl}</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted p-4 animate-pulse">
          <div className="h-6 bg-muted-foreground/20 rounded w-3/4" />
        </div>
      )}

      {/* Copy button */}
      <Button
        variant="outline"
        onClick={handleCopy}
        disabled={!bookingUrl}
        className="w-full gap-2"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-green-600">{t('onboarding.shareLink.copied')}</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            {t('onboarding.shareLink.copyLink')}
          </>
        )}
      </Button>

      {/* QR Code */}
      {qrDataUrl && (
        <div className="flex flex-col items-center gap-4">
          <img
            src={qrDataUrl}
            alt={t('onboarding.shareLink.qrCodeAlt')}
            width={200}
            height={200}
            className="rounded-lg border"
          />
          <Button variant="ghost" size="sm" onClick={handleDownloadQR} className="gap-2">
            <Download className="h-4 w-4" />
            {t('onboarding.shareLink.downloadQR')}
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4">
        <Button onClick={handleComplete} disabled={isSubmitting} className="w-full" size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('onboarding.saving')}
            </>
          ) : (
            t('onboarding.shareLink.complete')
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={prevStep} className="w-full">
          {t('onboarding.back')}
        </Button>
      </div>
    </div>
  );
}
