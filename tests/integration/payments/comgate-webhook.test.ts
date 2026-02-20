/**
 * Integration Tests: Comgate Webhook Signature Verification (ITEST-04)
 *
 * Tests the HMAC-SHA256 cryptographic signature verification used by the Comgate
 * payment gateway webhook handler. This is security-critical: a compromised
 * signature check allows attackers to fake payment confirmations.
 *
 * The `verifyComgateSignature` function uses crypto.timingSafeEqual to prevent
 * timing attacks, and rejects payloads with mismatched lengths before attempting
 * the comparison.
 *
 * These tests are placed in the integration suite (rather than unit tests) because
 * they exercise the actual crypto module behavior against known test vectors and
 * verify the environment-variable-based secret loading.
 */

import crypto from 'node:crypto';
import { verifyComgateSignature } from '../../../apps/web/app/api/v1/payments/comgate/client';

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
// Helper: compute HMAC-SHA256 signature with the test secret
// ============================================================================

function computeSignature(body: string, secret = TEST_SECRET): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

// ============================================================================
// Tests
// ============================================================================

describe('Comgate webhook signature verification', () => {
  it('accepts valid HMAC-SHA256 signature', () => {
    const body = 'transId=ABC-123&status=PAID&price=50000&curr=CZK';
    const signature = computeSignature(body);

    expect(verifyComgateSignature(body, signature)).toBe(true);
  });

  it('rejects tampered payload (price changed)', () => {
    // Attacker changes price from 50000 to 1 to pay much less
    const originalBody = 'transId=ABC-123&status=PAID&price=50000&curr=CZK';
    const originalSignature = computeSignature(originalBody);

    const tamperedBody = 'transId=ABC-123&status=PAID&price=1&curr=CZK';

    expect(verifyComgateSignature(tamperedBody, originalSignature)).toBe(false);
  });

  it('rejects tampered payload (status changed)', () => {
    // Attacker changes status from PENDING to PAID to fake payment confirmation
    const originalBody = 'transId=ABC-123&status=PENDING&price=50000&curr=CZK';
    const originalSignature = computeSignature(originalBody);

    const tamperedBody = 'transId=ABC-123&status=PAID&price=50000&curr=CZK';

    expect(verifyComgateSignature(tamperedBody, originalSignature)).toBe(false);
  });

  it('rejects wrong secret', () => {
    // Signature computed with an incorrect secret
    const body = 'transId=ABC-123&status=PAID&price=50000&curr=CZK';
    const wrongSignature = computeSignature(body, 'wrong-secret');

    expect(verifyComgateSignature(body, wrongSignature)).toBe(false);
  });

  it('rejects empty signature', () => {
    const body = 'any-body';

    // Length mismatch: HMAC-SHA256 hex is always 64 chars; empty string is 0
    expect(verifyComgateSignature(body, '')).toBe(false);
  });

  it('rejects truncated signature', () => {
    const body = 'transId=ABC-123&status=PAID&price=50000&curr=CZK';
    const validSignature = computeSignature(body);
    // Truncate to half — length mismatch detected before timing-safe compare
    const truncatedSignature = validSignature.slice(0, validSignature.length / 2);

    expect(verifyComgateSignature(body, truncatedSignature)).toBe(false);
  });

  it('handles special characters in body (Czech label)', () => {
    // URL-encoded Czech diacritics as they appear in Comgate webhook payloads
    const body = 'label=Masaz+relaxacni&refId=uuid-123';
    const signature = computeSignature(body);

    expect(verifyComgateSignature(body, signature)).toBe(true);
  });
});
