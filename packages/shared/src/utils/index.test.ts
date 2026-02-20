import { describe, test, expect } from 'vitest';
import { generateSlug } from './index';

describe('generateSlug', () => {
  test('converts Czech diacritics', () => {
    expect(generateSlug('Salon Krasa')).toBe('salon-krasa');
  });

  test('converts Czech diacritics characters', () => {
    expect(generateSlug('Kráčím přes řeku')).toBe('kracim-pres-reku');
  });

  test('replaces spaces with hyphens', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  test('strips leading and trailing hyphens', () => {
    expect(generateSlug('  Test Name  ')).toBe('test-name');
  });

  test('collapses multiple spaces', () => {
    expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
  });
});
