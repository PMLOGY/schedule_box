/**
 * Tests for SSRF private IP validation
 * SEC-05: SSRF protection — URL whitelist + private IP blocking on webhook URLs
 */

import { describe, it, expect } from 'vitest';
import { isPrivateIP, validateWebhookUrl } from './ssrf';

describe('isPrivateIP', () => {
  it('returns true for 10.x.x.x (RFC 1918)', () => {
    expect(isPrivateIP('http://10.0.0.1/hook')).toBe(true);
  });

  it('returns true for 192.168.x.x (RFC 1918)', () => {
    expect(isPrivateIP('http://192.168.1.1/hook')).toBe(true);
  });

  it('returns true for 172.16.x.x (RFC 1918)', () => {
    expect(isPrivateIP('http://172.16.0.1/hook')).toBe(true);
  });

  it('returns true for 127.x.x.x (loopback)', () => {
    expect(isPrivateIP('http://127.0.0.1/hook')).toBe(true);
  });

  it('returns true for 169.254.x.x (link-local)', () => {
    expect(isPrivateIP('http://169.254.1.1/hook')).toBe(true);
  });

  it('returns false for a public URL', () => {
    expect(isPrivateIP('https://api.example.com/hook')).toBe(false);
  });

  it('returns true for invalid URL (treat as unsafe)', () => {
    expect(isPrivateIP('invalid-url')).toBe(true);
  });

  it('returns true for 172.31.x.x (upper RFC 1918 range)', () => {
    expect(isPrivateIP('http://172.31.255.255/hook')).toBe(true);
  });

  it('returns false for 172.32.x.x (outside RFC 1918)', () => {
    expect(isPrivateIP('https://172.32.0.1/hook')).toBe(false);
  });

  it('returns true for 0.x.x.x (reserved)', () => {
    expect(isPrivateIP('http://0.0.0.1/hook')).toBe(true);
  });
});

describe('validateWebhookUrl', () => {
  it('throws for private IP addresses', () => {
    expect(() => validateWebhookUrl('http://10.0.0.1/hook')).toThrow();
    expect(() => validateWebhookUrl('http://192.168.1.1/hook')).toThrow();
    expect(() => validateWebhookUrl('http://127.0.0.1/hook')).toThrow();
  });

  it('does not throw for public URLs', () => {
    expect(() => validateWebhookUrl('https://api.example.com/hook')).not.toThrow();
    expect(() => validateWebhookUrl('https://webhook.site/abc123')).not.toThrow();
  });
});
