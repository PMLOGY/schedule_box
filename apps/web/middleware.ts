import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except:
  // - API routes (/api/*)
  // - Next.js internals (_next/*)
  // - Embed routes (/embed/*)
  // - Static files (*.*)
  matcher: ['/((?!api|_next|embed|.*\\..*).*)'],
};
