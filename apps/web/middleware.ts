import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip maintenance check for maintenance page itself, admin paths, and API routes
  const isMaintenancePage = pathname.includes('/maintenance');
  const isAdminPath = pathname.includes('/admin');

  if (!isMaintenancePage && !isAdminPath) {
    // Check maintenance mode via Upstash Redis HTTP fetch.
    // Direct fetch to Upstash REST API to avoid importing the heavy redis client in middleware.
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      try {
        const res = await fetch(`${upstashUrl}/get/maintenance:enabled`, {
          headers: { Authorization: `Bearer ${upstashToken}` },
          // Cache for 5s to reduce Redis calls per request
          next: { revalidate: 5 },
        });
        const data = (await res.json()) as { result?: string | null };
        if (data.result === 'true') {
          // Check bypass cookie — allows admins to access during maintenance
          const bypassCookie = req.cookies.get('maintenance_bypass')?.value;
          if (bypassCookie !== process.env.MAINTENANCE_BYPASS_SECRET) {
            // Extract locale from path (first segment) for redirect
            const segments = pathname.split('/').filter(Boolean);
            const locale = segments[0] || 'cs';
            return NextResponse.redirect(new URL(`/${locale}/maintenance`, req.url));
          }
        }
      } catch {
        // Redis unavailable — fail open (do not block users)
      }
    }
  }

  return intlMiddleware(req);
}

export const config = {
  // Match all pathnames except:
  // - API routes (/api/*)
  // - Next.js internals (_next/*)
  // - Embed routes (/embed/*)
  // - Sentry tunnel route (/monitoring)
  // - Static files (*.*)
  matcher: ['/((?!api|_next|embed|monitoring|.*\\..*).*)'],
};
