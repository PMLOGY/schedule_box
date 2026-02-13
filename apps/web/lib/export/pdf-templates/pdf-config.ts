import { Font } from '@react-pdf/renderer';

/**
 * Register Roboto font family with Latin Extended support (Czech diacritics).
 * Must be called before any renderToBuffer() call.
 */
let fontsRegistered = false;

export function registerFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;

  Font.register({
    family: 'Roboto',
    fonts: [
      {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
        fontWeight: 'normal',
      },
      {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
        fontWeight: 'bold',
      },
    ],
  });
}

export type PdfLocale = 'cs' | 'sk' | 'en';

const translations: Record<PdfLocale, Record<string, string>> = {
  cs: {
    revenueTitle: 'ScheduleBox - Report trzeb',
    bookingsTitle: 'ScheduleBox - Report rezervaci',
    period: 'Obdobi',
    generated: 'Vygenerovano',
    summary: 'Souhrn',
    totalRevenue: 'Celkove trzby',
    bookingCount: 'Pocet rezervaci',
    avgPerDay: 'Prumer na den',
    date: 'Datum',
    revenue: 'Trzby',
    bookings: 'Rezervace',
    completed: 'Dokoncene',
    cancelled: 'Zrusene',
    noShows: 'No-shows',
    total: 'Celkem',
    footer: 'Vygenerovano automaticky systemem ScheduleBox',
    page: 'Strana',
    of: 'z',
  },
  sk: {
    revenueTitle: 'ScheduleBox - Report trzieb',
    bookingsTitle: 'ScheduleBox - Report rezervacii',
    period: 'Obdobie',
    generated: 'Vygenerovane',
    summary: 'Suhrn',
    totalRevenue: 'Celkove trzby',
    bookingCount: 'Pocet rezervacii',
    avgPerDay: 'Priemer na den',
    date: 'Datum',
    revenue: 'Trzby',
    bookings: 'Rezervacie',
    completed: 'Dokoncene',
    cancelled: 'Zrusene',
    noShows: 'No-shows',
    total: 'Celkom',
    footer: 'Vygenerovane automaticky systemom ScheduleBox',
    page: 'Strana',
    of: 'z',
  },
  en: {
    revenueTitle: 'ScheduleBox - Revenue Report',
    bookingsTitle: 'ScheduleBox - Bookings Report',
    period: 'Period',
    generated: 'Generated',
    summary: 'Summary',
    totalRevenue: 'Total Revenue',
    bookingCount: 'Booking Count',
    avgPerDay: 'Average per Day',
    date: 'Date',
    revenue: 'Revenue',
    bookings: 'Bookings',
    completed: 'Completed',
    cancelled: 'Cancelled',
    noShows: 'No-shows',
    total: 'Total',
    footer: 'Generated automatically by ScheduleBox',
    page: 'Page',
    of: 'of',
  },
};

export function getPdfTranslations(locale: string): Record<string, string> {
  const key = locale === 'cs' || locale === 'sk' || locale === 'en' ? locale : 'cs';
  return translations[key];
}

export function formatPdfCurrency(value: number, currency = 'CZK', locale = 'cs'): string {
  const localeMap: Record<string, string> = { cs: 'cs-CZ', sk: 'sk-SK', en: 'en-US' };
  return new Intl.NumberFormat(localeMap[locale] || 'cs-CZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPdfDate(date: string, locale = 'cs'): string {
  const d = new Date(date);
  const localeMap: Record<string, string> = { cs: 'cs-CZ', sk: 'sk-SK', en: 'en-GB' };
  return d.toLocaleDateString(localeMap[locale] || 'cs-CZ');
}
