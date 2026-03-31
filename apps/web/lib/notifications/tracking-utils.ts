/**
 * Notification Tracking Utilities
 *
 * HMAC-signed tokens for secure notification open/click tracking.
 * Tokens encode notification IDs so tracking URLs cannot be forged.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Get the signing secret for tracking tokens.
 * Uses NEXTAUTH_SECRET as the HMAC key.
 */
function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for notification tracking');
  }
  return secret;
}

/**
 * Generate a signed tracking token for a notification ID.
 * Format: `{notificationId}.{hmacSignature}`
 *
 * @param notificationId - Internal notification ID
 * @returns Signed tracking token
 */
export function generateTrackingId(notificationId: number): string {
  const payload = String(notificationId);
  const hmac = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

/**
 * Verify a tracking token and extract the notification ID.
 *
 * @param token - Signed tracking token from URL
 * @returns Notification ID if valid, null if invalid/tampered
 */
export function verifyTrackingId(token: string): number | null {
  if (!token || typeof token !== 'string') return null;

  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const payload = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const notificationId = parseInt(payload, 10);
  if (isNaN(notificationId) || notificationId <= 0) return null;

  // Verify HMAC signature
  const expectedHmac = createHmac('sha256', getSecret()).update(payload).digest('hex');

  // Timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedHmac.length) return null;

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedHmac, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) return null;

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  return notificationId;
}

/**
 * Build a tracking pixel URL for open tracking.
 *
 * @param notificationId - Internal notification ID
 * @returns Absolute path to tracking pixel endpoint
 */
export function buildTrackingPixelUrl(notificationId: number): string {
  const token = generateTrackingId(notificationId);
  return `/api/v1/notifications/track/pixel?t=${encodeURIComponent(token)}`;
}

/**
 * Build a tracking click URL for click tracking.
 *
 * @param notificationId - Internal notification ID
 * @param targetUrl - The actual URL to redirect to after tracking
 * @returns Absolute path to click tracking endpoint
 */
export function buildTrackingClickUrl(notificationId: number, targetUrl: string): string {
  const token = generateTrackingId(notificationId);
  return `/api/v1/notifications/${notificationId}/track?t=${encodeURIComponent(token)}&url=${encodeURIComponent(targetUrl)}`;
}
