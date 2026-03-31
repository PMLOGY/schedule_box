/**
 * PII Encryption: AES-256-GCM verified working (FIX-08)
 * Encrypts: customer name, email, phone
 * Key source: ENCRYPTION_KEY env var
 * Format: base64(iv[12] + authTag[16] + ciphertext)
 *
 * AES-256-GCM encryption module for PII at rest
 *
 * Provides:
 * - encrypt/decrypt: AES-256-GCM with random IV and authentication tag
 * - hmacIndex: deterministic HMAC-SHA256 for searchable index without exposing plaintext
 *
 * Key derivation: SHA-256 of (masterKey + ':enc') for encryption, (masterKey + ':hmac') for HMAC.
 * This ensures the encryption key and HMAC key are always different even from the same master key.
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes, createHash } from 'crypto';

// ============================================================================
// CONSTANTS
// ============================================================================

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit IV — recommended for GCM
const TAG_BYTES = 16; // 128-bit auth tag — GCM default

// ============================================================================
// KEY DERIVATION
// ============================================================================

/**
 * Derives separate encryption and HMAC sub-keys from a single master key.
 * Uses SHA-256 to produce 32-byte keys.
 */
function deriveKeys(masterKey: string): { encKey: Buffer; hmacKey: Buffer } {
  const encKey = createHash('sha256')
    .update(masterKey + ':enc')
    .digest();
  const hmacKey = createHash('sha256')
    .update(masterKey + ':hmac')
    .digest();
  return { encKey, hmacKey };
}

// ============================================================================
// ENCRYPT / DECRYPT
// ============================================================================

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: IV (12 bytes) + auth tag (16 bytes) + ciphertext.
 *
 * @param plaintext - The string to encrypt (UTF-8)
 * @param masterKey - The hex master encryption key (must be set as ENCRYPTION_KEY env var)
 * @returns base64 string: iv + tag + ciphertext
 */
export function encrypt(plaintext: string, masterKey: string): string {
  const { encKey } = deriveKeys(masterKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, encKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: [IV (12)] [TAG (16)] [CIPHERTEXT (variable)]
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts a base64-encoded ciphertext produced by encrypt().
 * Throws if the auth tag verification fails (tampered data or wrong key).
 *
 * @param stored - base64 string from encrypt()
 * @param masterKey - The master encryption key
 * @returns Original plaintext
 */
export function decrypt(stored: string, masterKey: string): string {
  const { encKey } = deriveKeys(masterKey);
  const buf = Buffer.from(stored, 'base64');
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, encKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

// ============================================================================
// HMAC INDEX
// ============================================================================

/**
 * Produces a deterministic HMAC-SHA256 hex string for use as a searchable index.
 * Normalizes input to lowercase + trim before hashing.
 *
 * Use this to look up customers by email without storing or comparing plaintext:
 *   const hmac = hmacIndex(email, key);
 *   WHERE email_hmac = hmac
 *
 * @param plaintext - The value to index (e.g. email address)
 * @param masterKey - The master encryption key
 * @returns 64-char lowercase hex string
 */
export function hmacIndex(plaintext: string, masterKey: string): string {
  const { hmacKey } = deriveKeys(masterKey);
  return createHmac('sha256', hmacKey).update(plaintext.toLowerCase().trim()).digest('hex');
}

// ============================================================================
// ENV KEY HELPER
// ============================================================================

/**
 * Reads ENCRYPTION_KEY from the environment.
 * Throws a clear error if the variable is not set.
 * Call this once at the top of any module that uses encryption.
 */
export function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return key;
}
