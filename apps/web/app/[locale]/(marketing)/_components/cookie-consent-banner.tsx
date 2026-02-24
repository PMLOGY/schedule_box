'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

const CONSENT_KEY = 'sb_cookie_consent';
type ConsentState = 'accepted' | 'rejected' | null;

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('landing.cookie');

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentState;
    setConsent(stored);
  }, []);

  if (!mounted || consent !== null) {
    return null;
  }

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setConsent('accepted');
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setConsent('rejected');
  };

  return (
    <div
      role="dialog"
      aria-label="Souhlas s cookies"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700">
          {t('message')}{' '}
          <Link href="/privacy" className="underline">
            {t('privacyLink')}
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <Button variant="outline" size="sm" onClick={handleReject}>
            {t('reject')}
          </Button>
          <Button size="sm" onClick={handleAccept}>
            {t('accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
