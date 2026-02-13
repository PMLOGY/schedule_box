import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useCompanySettingsQuery } from '@/hooks/use-settings-query';

/**
 * Maps app locales to Intl.NumberFormat locale codes.
 */
const LOCALE_MAP: Record<string, string> = {
  cs: 'cs-CZ',
  sk: 'sk-SK',
  en: 'en-US',
};

/**
 * Hook that returns a currency formatter using the company's configured
 * currency and the user's current locale.
 *
 * Falls back to CZK if company settings haven't loaded yet.
 */
export function useCurrencyFormat() {
  const locale = useLocale();
  const { data: company } = useCompanySettingsQuery();
  const currency = company?.currency || 'CZK';
  const intlLocale = LOCALE_MAP[locale] || locale;

  const formatCurrency = useCallback(
    (
      value: number | string,
      options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
    ) => {
      const numValue = typeof value === 'string' ? parseFloat(value || '0') : value;
      return new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency,
        ...options,
      }).format(numValue);
    },
    [currency, intlLocale],
  );

  return { formatCurrency, currency };
}
