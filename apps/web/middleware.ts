import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  // Generate a unique request ID for log correlation across the request lifecycle.
  const requestId = crypto.randomUUID();

  const { pathname } = req.nextUrl;

  // Skip maintenance check for maintenance page itself, admin paths, and API routes
  const isMaintenancePage = pathname.includes('/maintenance');
  const isAdminPath = pathname.includes('/admin');

  if (!isMaintenancePage && !isAdminPath) {
    // Check maintenance mode via Redis.
    // Middleware runs on Edge — we can only use HTTP-based Redis here.
    // Upstash HTTP: direct REST API call
    // Standard Redis: check via internal API route (avoids importing ioredis in Edge)
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      try {
        const res = await fetch(`${upstashUrl}/get/maintenance:enabled`, {
          headers: { Authorization: `Bearer ${upstashToken}` },
          next: { revalidate: 5 },
        });
        const data = (await res.json()) as { result?: string | null };
        if (data.result === 'true') {
          const bypassCookie = req.cookies.get('maintenance_bypass')?.value;
          if (bypassCookie !== process.env.MAINTENANCE_BYPASS_SECRET) {
            const segments = pathname.split('/').filter(Boolean);
            const locale = segments[0] || 'cs';
            const redirectResponse = NextResponse.redirect(
              new URL(`/${locale}/maintenance`, req.url),
            );
            redirectResponse.headers.set('X-Request-Id', requestId);
            redirectResponse.headers.set('x-request-id', requestId);
            return redirectResponse;
          }
        }
      } catch {
        // Redis unavailable — fail open (do not block users)
      }
    } else if (process.env.REDIS_URL) {
      // Standard Redis — check maintenance via internal API (Edge can't use TCP)
      try {
        const origin = req.nextUrl.origin;
        const res = await fetch(`${origin}/api/v1/admin/maintenance/status`, {
          headers: { 'x-internal-check': '1' },
          next: { revalidate: 5 },
        });
        if (res.ok) {
          const data = (await res.json()) as { enabled?: boolean };
          if (data.enabled) {
            const bypassCookie = req.cookies.get('maintenance_bypass')?.value;
            if (bypassCookie !== process.env.MAINTENANCE_BYPASS_SECRET) {
              const segments = pathname.split('/').filter(Boolean);
              const locale = segments[0] || 'cs';
              const redirectResponse = NextResponse.redirect(
                new URL(`/${locale}/maintenance`, req.url),
              );
              redirectResponse.headers.set('X-Request-Id', requestId);
              redirectResponse.headers.set('x-request-id', requestId);
              return redirectResponse;
            }
          }
        }
      } catch {
        // Redis unavailable — fail open (do not block users)
      }
    }
  }

  const response = intlMiddleware(req);

  // Attach the request ID to outgoing headers so API routes and logs can correlate requests.
  response.headers.set('X-Request-Id', requestId);
  response.headers.set('x-request-id', requestId);

  return response;
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
