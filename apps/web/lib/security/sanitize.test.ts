/**
 * Tests for XSS sanitization utilities
 * SEC-02: DOMPurify sanitizes all user-generated content
 */

import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeRichText } from './sanitize';

describe('sanitizeText', () => {
  it('strips all HTML tags including script', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('');
  });

  it('strips safe tags like <b>', () => {
    expect(sanitizeText('<b>bold</b>')).toBe('bold');
  });

  it('preserves HTML entities', () => {
    expect(sanitizeText('hello &amp; world')).toBe('hello &amp; world');
  });

  it('strips nested tags', () => {
    expect(sanitizeText('<p><strong>text</strong></p>')).toBe('text');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });
});

describe('sanitizeRichText', () => {
  it('allows safe tags and strips script', () => {
    expect(sanitizeRichText('<b>bold</b><script>x</script>')).toBe('<b>bold</b>');
  });

  it('strips onclick attribute from anchor', () => {
    const input = '<a href="x" onclick="evil()">link</a>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('onclick');
    expect(result).toContain('<a');
    expect(result).toContain('link');
  });

  it('allows href and rel attributes on anchor tags', () => {
    const input = '<a href="https://example.com" rel="noopener">visit</a>';
    const result = sanitizeRichText(input);
    expect(result).toContain('href="https://example.com"');
  });

  it('allows safe formatting tags', () => {
    const input = '<p><em>italic</em> and <strong>bold</strong></p>';
    expect(sanitizeRichText(input)).toContain('<em>italic</em>');
  });

  it('strips script tags entirely', () => {
    expect(sanitizeRichText('<script>alert("xss")</script>')).toBe('');
  });
});
