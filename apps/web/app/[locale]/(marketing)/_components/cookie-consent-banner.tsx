'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Link } from '@/lib/i18n/navigation';
import {
  type CookiePreferences,
  setConsentPreferences,
  hasConsented,
} from '@/lib/cookies/consent-store';

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const t = useTranslations('landing.cookie');

  useEffect(() => {
    setMounted(true);
    if (!hasConsented()) {
      setVisible(true);
    }
  }, []);

  const save = useCallback((prefs: CookiePreferences) => {
    setConsentPreferences(prefs);
    setVisible(false);
  }, []);

  const handleAcceptAll = useCallback(() => {
    save({ necessary: true, analytics: true, marketing: true });
  }, [save]);

  const handleSaveSelection = useCallback(() => {
    save({ necessary: true, analytics, marketing });
  }, [save, analytics, marketing]);

  const handleRejectAll = useCallback(() => {
    save({ necessary: true, analytics: false, marketing: false });
  }, [save]);

  if (!mounted || !visible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label={t('title')}
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 shadow-lg dark:bg-gray-900 dark:border-gray-700"
    >
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t('categoryDescription')}{' '}
          <Link href="/privacy" className="underline">
            {t('privacyLink')}
          </Link>
          .
        </p>

        {/* Category toggles */}
        <div className="space-y-3">
          {/* Necessary - always on */}
          <div className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium">{t('necessary')}</p>
              <p className="text-xs text-muted-foreground">{t('necessaryDesc')}</p>
            </div>
            <Switch checked disabled aria-label={t('necessary')} />
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium">{t('analytics')}</p>
              <p className="text-xs text-muted-foreground">{t('analyticsDesc')}</p>
            </div>
            <Switch
              checked={analytics}
              onCheckedChange={setAnalytics}
              aria-label={t('analytics')}
            />
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium">{t('marketing')}</p>
              <p className="text-xs text-muted-foreground">{t('marketingDesc')}</p>
            </div>
            <Switch
              checked={marketing}
              onCheckedChange={setMarketing}
              aria-label={t('marketing')}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleRejectAll}
            className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
          >
            {t('rejectAll')}
          </button>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handleSaveSelection}>
              {t('saveSelection')}
            </Button>
            <Button size="sm" onClick={handleAcceptAll}>
              {t('acceptAll')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
