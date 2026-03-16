/**
 * Unit tests for AES-256-GCM encryption module
 * Tests round-trip, random IV, HMAC determinism, error handling
 */

import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, hmacIndex } from './encryption';

const TEST_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

describe('encrypt', () => {
  it('returns a base64 string', () => {
    const result = encrypt('hello', TEST_KEY);
    expect(typeof result).toBe('string');
    // Should be valid base64
    expect(() => Buffer.from(result, 'base64')).not.toThrow();
  });

  it('encrypt + decrypt round-trip returns original plaintext', () => {
    const plaintext = 'test@example.com';
    const ciphertext = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(ciphertext, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it('two encrypt calls with same plaintext produce different ciphertext (random IV)', () => {
    const plaintext = 'test@example.com';
    const ct1 = encrypt(plaintext, TEST_KEY);
    const ct2 = encrypt(plaintext, TEST_KEY);
    expect(ct1).not.toBe(ct2);
  });

  it('handles empty string input', () => {
    const ct = encrypt('', TEST_KEY);
    const result = decrypt(ct, TEST_KEY);
    expect(result).toBe('');
  });

  it('handles unicode input (Czech characters)', () => {
    const plaintext = 'Příliš žluťoučký kůň';
    const ct = encrypt(plaintext, TEST_KEY);
    const result = decrypt(ct, TEST_KEY);
    expect(result).toBe(plaintext);
  });
});

describe('decrypt', () => {
  it('decrypt with wrong key throws an error', () => {
    const ct = encrypt('hello world', TEST_KEY);
    const wrongKey = 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3';
    expect(() => decrypt(ct, wrongKey)).toThrow();
  });

  it('decrypt with tampered ciphertext throws (GCM auth tag verification)', () => {
    const ct = encrypt('secure data', TEST_KEY);
    // Tamper: flip a character in the middle of the base64 string
    const buf = Buffer.from(ct, 'base64');
    buf[buf.length - 5] ^= 0xff;
    const tampered = buf.toString('base64');
    expect(() => decrypt(tampered, TEST_KEY)).toThrow();
  });
});

describe('hmacIndex', () => {
  it('returns a 64-char hex string', () => {
    const result = hmacIndex('test@example.com', TEST_KEY);
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic — same input always returns same hash', () => {
    const h1 = hmacIndex('test@example.com', TEST_KEY);
    const h2 = hmacIndex('test@example.com', TEST_KEY);
    expect(h1).toBe(h2);
  });

  it('normalizes input to lowercase (FOO === foo)', () => {
    const lower = hmacIndex('foo@example.com', TEST_KEY);
    const upper = hmacIndex('FOO@EXAMPLE.COM', TEST_KEY);
    expect(lower).toBe(upper);
  });

  it('different inputs produce different hashes', () => {
    const h1 = hmacIndex('alice@example.com', TEST_KEY);
    const h2 = hmacIndex('bob@example.com', TEST_KEY);
    expect(h1).not.toBe(h2);
  });
});
