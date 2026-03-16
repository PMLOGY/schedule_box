/**
 * CSRF Audit — Phase 46 (SEC-06)
 *
 * This application uses Authorization: Bearer <JWT> headers for ALL authenticated
 * API calls. Bearer tokens sent via custom Authorization headers are inherently
 * CSRF-safe because cross-origin form submissions and <img> tag requests cannot
 * set custom headers (OWASP CSRF Prevention Cheat Sheet).
 *
 * Webhook callback routes (unauthenticated, receive external POST requests):
 * These are explicitly excluded from Bearer auth because they receive callbacks
 * from external services (Comgate, Twilio, email tracking).
 */
export const CSRF_AUDIT = {
  methodology: 'Bearer JWT in Authorization header (CSRF-safe per OWASP)',
  auditDate: '2026-03-16',
  authenticatedRoutes: 'All /api/v1/* routes use createRouteHandler with requiresAuth: true',
  excludedWebhookRoutes: [
    '/api/v1/webhooks/comgate — Comgate payment callbacks (verified by shared secret)',
    '/api/v1/webhooks/twilio-usage — Twilio usage webhook (verified by Twilio signature)',
    '/api/v1/webhooks/email-tracking/open — Email open tracking pixel',
    '/api/v1/webhooks/email-tracking/click — Email click tracking redirect',
    '/api/v1/webhooks/push/register — Push notification subscription',
    '/api/v1/billing/webhook — Billing payment callback',
    '/api/v1/payments/comgate/callback — Comgate payment callback',
  ],
  publicRoutes: [
    '/api/v1/public/* — Public booking and company lookup routes (read-only GETs, no state changes via POST without customer email verification)',
    '/api/v1/auth/register — Registration (no session to forge)',
    '/api/v1/auth/login — Login (no session to forge)',
  ],
  conclusion:
    'No additional CSRF token middleware needed. Bearer header prevents cross-origin state-changing requests.',
} as const;
