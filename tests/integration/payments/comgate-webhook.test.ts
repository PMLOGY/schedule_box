/**
 * Integration Tests: Comgate Webhook Secret Verification (ITEST-04)
 *
 * Tests the POST body secret verification used by the Comgate payment gateway
 * webhook handler. Comgate sends the merchant secret as a POST body parameter
 * named "secret" — NOT as an HMAC header. This is Comgate's actual API behavior,
 * confirmed via PHP SDK, Node SDK, and Clojure client source code.
 *
 * The `verifyComgateWebhookSecret` function uses crypto.timingSafeEqual to prevent
 * timing attacks, and rejects secrets with mismatched lengths before attempting
 * the comparison.
 *
 * These tests are placed in the integration suite (rather than unit tests) because
 * they exercise the actual crypto module behavior and verify the environment-variable-
 * based secret loading that matches the production credential injection pattern.
 */

import { verifyComgateWebhookSecret } from '../../../apps/web/app/api/v1/payments/comgate/client';

// ============================================================================
// Constants
// ============================================================================

const TEST_SECRET = 'test-secret-key-for-testing';
const TEST_MERCHANT_ID = 'test-merchant';

// ============================================================================
// Suite setup / teardown
// ============================================================================

beforeAll(() => {
  process.env.COMGATE_MERCHANT_ID = TEST_MERCHANT_ID;
  process.env.COMGATE_SECRET = TEST_SECRET;
});

afterAll(() => {
  delete process.env.COMGATE_MERCHANT_ID;
  delete process.env.COMGATE_SECRET;
});

// ============================================================================
// Tests
// ============================================================================

describe('Comgate webhook secret verification', () => {
  it('accepts valid secret matching COMGATE_SECRET', () => {
    expect(verifyComgateWebhookSecret(TEST_SECRET)).toBe(true);
  });

  it('rejects wrong secret', () => {
    expect(verifyComgateWebhookSecret('wrong-secret')).toBe(false);
  });

  it('rejects empty secret', () => {
    // Length mismatch: empty string (0 chars) vs TEST_SECRET (27 chars)
    expect(verifyComgateWebhookSecret('')).toBe(false);
  });

  it('rejects secret with extra whitespace', () => {
    // Trailing space causes length mismatch — rejected before timingSafeEqual
    expect(verifyComgateWebhookSecret(TEST_SECRET + ' ')).toBe(false);
  });

  it('rejects undefined/null-like string values', () => {
    // Comgate should never send these, but guards against deserialization bugs
    expect(verifyComgateWebhookSecret('undefined')).toBe(false);
    expect(verifyComgateWebhookSecret('null')).toBe(false);
  });

  it('uses timing-safe comparison (no throw on length-mismatched inputs)', () => {
    // Design assertion: function must not throw regardless of input length
    // Short string — length mismatch path
    expect(() => verifyComgateWebhookSecret('short')).not.toThrow();
    // Very long string — length mismatch path
    expect(() => verifyComgateWebhookSecret('x'.repeat(10000))).not.toThrow();
    // Both return false (length mismatch)
    expect(verifyComgateWebhookSecret('short')).toBe(false);
    expect(verifyComgateWebhookSecret('x'.repeat(10000))).toBe(false);
  });

  it('handles special characters in secret', () => {
    // Verify timing-safe comparison works with URL-unsafe characters
    const specialSecret = 'secret+key=test/value';
    process.env.COMGATE_SECRET = specialSecret;
    try {
      expect(verifyComgateWebhookSecret(specialSecret)).toBe(true);
      expect(verifyComgateWebhookSecret('secret+key=test/valu')).toBe(false);
    } finally {
      // Restore original test secret
      process.env.COMGATE_SECRET = TEST_SECRET;
    }
  });
});
