import { createNavigation } from 'next-intl/navigation';

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales: ['cs', 'sk', 'en'],
  defaultLocale: 'cs',
  localePrefix: 'as-needed',
});
