import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // Supported locales
  locales: ['cs', 'sk', 'en'],

  // Default locale (Czech)
  defaultLocale: 'cs',

  // Don't add /cs prefix for default locale
  localePrefix: 'as-needed',
});

export const config = {
  // Match all pathnames except:
  // - API routes (/api/*)
  // - Next.js internals (_next/*)
  // - Static files (*.*)
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
