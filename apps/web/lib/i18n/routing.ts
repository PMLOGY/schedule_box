import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['cs', 'sk', 'en'],
  defaultLocale: 'cs',
  localePrefix: 'as-needed',
  localeDetection: false,
});
