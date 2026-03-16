/**
 * SSRF (Server-Side Request Forgery) protection utilities
 * SEC-05: Block webhook URLs targeting private/internal networks
 *
 * Validates URLs against RFC 1918 private ranges, loopback, link-local,
 * CGNAT, and IPv6 private ranges to prevent SSRF attacks.
 *
 * Note: This validates at registration/creation time using hostname string matching.
 * DNS rebinding attacks (where a public hostname later resolves to a private IP)
 * require DNS resolution at request time — documented as Phase 49/50 hardening concern.
 *
 * Source: RFC 1918, RFC 3927, RFC 4193, RFC 6598
 */

import { z } from 'zod';
import { ValidationError } from '@schedulebox/shared';

/**
 * Private and reserved IP ranges to block.
 * Covers: loopback, RFC 1918, link-local (APIPA), CGNAT, reserved,
 *         IPv6 loopback, IPv6 unique local, IPv6 link-local.
 */
const PRIVATE_RANGES: RegExp[] = [
  /^127\./,                                           // IPv4 loopback
  /^10\./,                                            // RFC 1918 Class A
  /^172\.(1[6-9]|2\d|3[01])\./,                      // RFC 1918 Class B (172.16–172.31)
  /^192\.168\./,                                      // RFC 1918 Class C
  /^169\.254\./,                                      // Link-local (APIPA) RFC 3927
  /^::1$/,                                            // IPv6 loopback
  /^fc00:/i,                                          // IPv6 unique local FC00::/7
  /^fd[0-9a-f]{2}:/i,                                 // IPv6 unique local FD00::/8
  /^fe80:/i,                                          // IPv6 link-local
  /^0\./,                                             // Reserved (0.0.0.0/8)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,        // CGNAT RFC 6598 (100.64–100.127)
];

/**
 * Check if a URL resolves to a private or reserved IP address.
 * Returns true for invalid URLs (treat as unsafe).
 *
 * @param urlString - The URL string to validate
 * @returns true if the URL hostname matches a private/reserved range, false if public
 */
export function isPrivateIP(urlString: string): boolean {
  try {
    const { hostname } = new URL(urlString);
    return PRIVATE_RANGES.some((re) => re.test(hostname));
  } catch {
    // Invalid URL — treat as unsafe
    return true;
  }
}

/**
 * Validate that a webhook URL does not point to a private or internal network.
 * Throws ValidationError if the URL targets a private IP or is invalid.
 *
 * @param url - The webhook URL to validate
 * @throws ValidationError if the URL points to a private IP or is malformed
 */
export function validateWebhookUrl(url: string): void {
  if (isPrivateIP(url)) {
    throw new ValidationError(
      'Webhook URL must be a public internet address. Private and link-local IP addresses are not allowed.',
    );
  }
}

/**
 * Zod schema for webhook URLs — validates format and blocks private IPs.
 * Can be used inline in Zod schemas for webhook action configurations.
 */
export const webhookUrlSchema = z
  .string()
  .url()
  .refine((url) => !isPrivateIP(url), {
    message: 'Webhook URL must not point to a private IP address',
  });
