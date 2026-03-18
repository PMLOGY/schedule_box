/**
 * HIBP (Have I Been Pwned) k-anonymity password breach check
 * SEC-04: Check passwords against the HIBP Pwned Passwords API
 *
 * Uses the k-anonymity model: only the first 5 characters of the SHA-1 hash
 * are sent to the API, preserving user privacy.
 *
 * Fail-open policy: if the HIBP API is unreachable or returns an error,
 * we log a warning but allow the password — do not block legitimate registrations
 * over network failures.
 *
 * Source: HIBP API docs (https://haveibeenpwned.com/API/v3#PwnedPasswords)
 */

import { createHash } from 'crypto';

/**
 * Check if a password has appeared in known data breaches.
 *
 * @param password - The plaintext password to check (never logged or stored)
 * @returns true if the password was found in the breach database, false otherwise
 *          Returns false (fail-open) on any network or API error.
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    // Compute SHA-1 hash and split into prefix (5 chars) + suffix
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      cache: 'no-store',
    });

    if (!res.ok) {
      // HIBP unavailable — fail open (do not block registration)
      console.warn('[HIBP] API unavailable, skipping breach check. Status:', res.status);
      return false;
    }

    const text = await res.text();

    // Parse response lines: each line is "SUFFIX:COUNT"
    return text.split('\n').some((line) => {
      const [hashSuffix, countStr] = line.trim().split(':');
      return hashSuffix === suffix && parseInt(countStr, 10) > 0;
    });
  } catch (error) {
    // Network error or other failure — fail open
    console.warn(
      '[HIBP] Breach check failed, skipping:',
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
