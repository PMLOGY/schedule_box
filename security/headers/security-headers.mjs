/**
 * Security Headers Configuration for ScheduleBox (ESM version for Next.js config)
 *
 * Comprehensive security headers for Next.js application:
 * - HSTS with 2-year max-age
 * - Content Security Policy with production/development modes
 * - X-Frame-Options (SAMEORIGIN for embed widget preview)
 * - Permissions-Policy for privacy features
 *
 * References:
 * - OWASP Secure Headers Project
 * - Next.js Security Headers Documentation
 */

/**
 * Build Content Security Policy directive
 *
 * Production mode removes 'unsafe-eval' from script-src
 * (Next.js requires unsafe-eval in development)
 */
function buildCSP() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const csp = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js inline scripts
      ...(isDevelopment ? ["'unsafe-eval'"] : []), // Only in dev for HMR
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS and shadcn/ui
    ],
    'img-src': [
      "'self'",
      'data:', // Allow data URIs for base64 images
      'blob:', // Allow blob URLs for generated content
      'https:', // Allow HTTPS images (avatars, company logos from external sources)
    ],
    'font-src': ["'self'"], // Inter font loaded locally
    'connect-src': [
      "'self'",
      'https://*.schedulebox.cz', // API endpoints
      'wss://*.schedulebox.cz', // WebSocket connections for real-time features
    ],
    'frame-src': [
      "'self'",
      'https://pay.comgate.cz', // Comgate payment iframe
    ],
    'frame-ancestors': ["'self'"], // Prevent clickjacking except same origin
    'object-src': ["'none'"], // Disable plugins
    'base-uri': ["'self'"], // Prevent base tag injection
    'form-action': ["'self'"], // Restrict form submissions
    'upgrade-insecure-requests': [], // Upgrade HTTP to HTTPS
  };

  return Object.entries(csp)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive; // Directive without sources (e.g., upgrade-insecure-requests)
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Security headers array for Next.js `headers()` configuration
 *
 * Applied to all routes by default, with relaxed rules for /embed/ routes
 */
export const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload', // 2 years HSTS
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN', // Allow same-origin framing (needed for embed widget preview)
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff', // Prevent MIME type sniffing
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(self), geolocation=(), interest-cohort=()', // Microphone allowed for voice booking
  },
  {
    key: 'Content-Security-Policy',
    value: buildCSP(),
  },
];

/**
 * Relaxed security headers for /embed/ widget routes
 *
 * Widget must be embeddable from any domain:
 * - X-Frame-Options: ALLOWALL
 * - CSP frame-ancestors: *
 */
export const embedSecurityHeaders = securityHeaders
  .filter(
    (h) =>
      h.key !== 'Content-Security-Policy' && h.key !== 'X-Frame-Options',
  )
  .concat([
    {
      key: 'X-Frame-Options',
      value: 'ALLOWALL', // Widget must be embeddable
    },
    {
      key: 'Content-Security-Policy',
      value: "frame-ancestors *; default-src 'self'", // Allow embedding from any domain
    },
  ]);
