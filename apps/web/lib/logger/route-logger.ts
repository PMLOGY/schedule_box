/**
 * Route Logger — Structured JSON logging helper for API routes
 *
 * Produces Vercel log drain-compatible structured JSON entries with:
 * - level, message, route, method, status, duration_ms, request_id
 * - Automatic error_message field when an error is provided
 *
 * Usage:
 *   import { logRouteComplete, getRequestId } from '@/lib/logger/route-logger';
 *   const requestId = getRequestId(req);
 *   const startTime = Date.now();
 *   // ... handler logic ...
 *   logRouteComplete({ route: '/api/v1/bookings', method: 'POST', status: 201,
 *                      duration_ms: Date.now() - startTime, request_id: requestId });
 */

import { logInfo, logError } from '@schedulebox/shared/logger';

export interface RouteCompleteParams {
  route: string;
  method: string;
  status: number;
  duration_ms: number;
  request_id: string;
  error?: Error;
}

/**
 * Log structured route completion with Vercel log drain fields.
 * Calls logError when params.error is provided, logInfo otherwise.
 */
export function logRouteComplete(params: RouteCompleteParams): void {
  const { route, method, status, duration_ms, request_id, error } = params;

  if (error) {
    logError('route_error', {
      route,
      method,
      status,
      duration_ms,
      request_id,
      error_message: error.message,
    });
  } else {
    logInfo('route_complete', {
      route,
      method,
      status,
      duration_ms,
      request_id,
    });
  }
}

/**
 * Extract the request ID from incoming request headers.
 * Reads the x-request-id header set by middleware.
 * Returns 'unknown' when header is absent.
 */
export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') ?? 'unknown';
}
