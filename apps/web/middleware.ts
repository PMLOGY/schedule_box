import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except:
  // - API routes (/api/*)
  // - Next.js internals (_next/*)
  // - Embed routes (/embed/*)
  // - Sentry tunnel route (/monitoring)
  // - Static files (*.*)
  matcher: ['/((?!api|_next|embed|monitoring|.*\\..*).*)'],
};
