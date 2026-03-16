/**
 * Tests for HIBP k-anonymity password breach check
 * SEC-04: HIBP API checks passwords on registration and password change
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isPasswordBreached } from './hibp';

// SHA-1 of 'password' = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
// prefix = 5BAA6, suffix = 1E4C9B93F3F0682250B6CF8331B7EE68FD8
const PASSWORD_SHA1_PREFIX = '5BAA6';
const PASSWORD_SHA1_SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';

// SHA-1 of 'uniqueSecurePassword123!' — we mock a response that doesn't contain its suffix
const SAFE_PASSWORD = 'uniqueSecurePassword123!';

describe('isPasswordBreached', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true for a known breached password ("password")', async () => {
    const mockResponse = {
      ok: true,
      text: async () =>
        `0018A45C4D1DEF81644B54AB7F969B88D65:1\n${PASSWORD_SHA1_SUFFIX}:3730471\nABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901:2`,
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as unknown as Response);

    const result = await isPasswordBreached('password');
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      `https://api.pwnedpasswords.com/range/${PASSWORD_SHA1_PREFIX}`,
      expect.objectContaining({ headers: { 'Add-Padding': 'true' }, cache: 'no-store' }),
    );
  });

  it('returns false for a password not in breach database', async () => {
    const mockResponse = {
      ok: true,
      text: async () =>
        `0018A45C4D1DEF81644B54AB7F969B88D65:1\nABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901:2`,
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as unknown as Response);

    const result = await isPasswordBreached(SAFE_PASSWORD);
    expect(result).toBe(false);
  });

  it('returns false (fail-open) when HIBP API returns 500', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as unknown as Response);

    const result = await isPasswordBreached('anypassword');
    expect(result).toBe(false);
  });

  it('returns false (fail-open) when fetch throws a network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await isPasswordBreached('anypassword');
    expect(result).toBe(false);
  });
});
