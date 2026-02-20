import { describe, it, expect } from 'vitest';
import {
  generateSlug,
  formatCurrency,
  calculatePagination,
  calculateOffset,
  parseStartOfDayUTC,
  parseEndOfDayUTC,
  maskSensitive,
  parseNumericOrNull,
  omit,
  pick,
} from './index';

// ============================================================================
// generateSlug
// ============================================================================

describe('generateSlug', () => {
  it('converts simple Latin text to lowercase hyphenated slug', () => {
    expect(generateSlug('Salon Krasa')).toBe('salon-krasa');
  });

  it('handles Czech diacritics correctly', () => {
    expect(generateSlug('Kadeřnictví u Říčky')).toBe('kadernictvi-u-ricky');
  });

  it('handles Slovak diacritics correctly', () => {
    expect(generateSlug('Kúpeľné Služby')).toBe('kupelne-sluzby');
  });

  it('converts Czech characters á č ď é ě í ň ó ř š ť ú ů ý ž', () => {
    expect(generateSlug('Kráčím přes řeku')).toBe('kracim-pres-reku');
  });

  it('strips special characters and replaces with hyphens', () => {
    expect(generateSlug('Hello!!! World???')).toBe('hello-world');
  });

  it('strips leading and trailing hyphens from result', () => {
    expect(generateSlug('---test---')).toBe('test');
  });

  it('collapses multiple spaces and separators into single hyphen', () => {
    expect(generateSlug('a   b   c')).toBe('a-b-c');
  });

  it('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('');
  });

  it('converts purely numeric text', () => {
    expect(generateSlug('123 456')).toBe('123-456');
  });

  it('handles mixed Czech and Slovak diacritics', () => {
    expect(generateSlug('Ľudmila má šťastie')).toBe('ludmila-ma-stastie');
  });

  it('handles trailing spaces by stripping resulting hyphens', () => {
    expect(generateSlug('  Test Name  ')).toBe('test-name');
  });

  it('handles ä ö ü from German (present in diacritics map)', () => {
    expect(generateSlug('Schön')).toBe('schon');
  });
});

// ============================================================================
// formatCurrency
// ============================================================================

describe('formatCurrency', () => {
  it('formats CZK amount with Czech locale by default', () => {
    const result = formatCurrency(1500);
    // Czech formatting: "1 500 Kč" or "1 500 CZK" depending on locale support
    expect(result).toContain('1');
    expect(result).toContain('500');
  });

  it('formats CZK with no decimal fraction digits', () => {
    const result = formatCurrency(1500, 'CZK');
    // CZK should have 0 fraction digits (minimumFractionDigits: 0)
    expect(result).not.toContain('.00');
  });

  it('formats EUR with 2 decimal places', () => {
    const result = formatCurrency(29.99, 'EUR', 'cs-CZ');
    expect(result).toContain('29');
    expect(result).toContain('99');
  });

  it('accepts string amount and parses it', () => {
    const result = formatCurrency('1500.50', 'CZK');
    expect(result).toContain('1');
    expect(result).toContain('500');
  });

  it('formats zero amount', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('formats negative amount', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
    // Negative values should contain minus or negative indicator
    expect(result).toMatch(/-|−|\(500\)/);
  });

  it('returns a non-empty string', () => {
    expect(formatCurrency(100)).toBeTruthy();
    expect(typeof formatCurrency(100)).toBe('string');
  });
});

// ============================================================================
// calculatePagination
// ============================================================================

describe('calculatePagination', () => {
  it('returns correct pagination for standard case', () => {
    const result = calculatePagination(100, 1, 20);
    expect(result).toEqual({ total: 100, page: 1, limit: 20, total_pages: 5 });
  });

  it('calculates partial last page correctly', () => {
    const result = calculatePagination(101, 1, 20);
    expect(result.total_pages).toBe(6);
  });

  it('returns total_pages of 1 when total is 0 (not 0)', () => {
    const result = calculatePagination(0, 1, 20);
    expect(result.total_pages).toBe(1);
  });

  it('returns total_pages of 1 for single item', () => {
    const result = calculatePagination(1, 1, 20);
    expect(result.total_pages).toBe(1);
  });

  it('returns correct page and limit in result', () => {
    const result = calculatePagination(50, 3, 10);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(50);
    expect(result.total_pages).toBe(5);
  });

  it('handles exact page boundary (total exactly divisible by limit)', () => {
    const result = calculatePagination(20, 1, 20);
    expect(result.total_pages).toBe(1);
  });

  it('handles large total values', () => {
    const result = calculatePagination(10000, 1, 100);
    expect(result.total_pages).toBe(100);
  });
});

// ============================================================================
// calculateOffset
// ============================================================================

describe('calculateOffset', () => {
  it('returns 0 for page 1', () => {
    expect(calculateOffset(1, 20)).toBe(0);
  });

  it('returns 20 for page 2 with limit 20', () => {
    expect(calculateOffset(2, 20)).toBe(20);
  });

  it('returns 40 for page 3 with limit 20', () => {
    expect(calculateOffset(3, 20)).toBe(40);
  });

  it('returns 0 for page 1 with limit 50', () => {
    expect(calculateOffset(1, 50)).toBe(0);
  });

  it('calculates offset correctly for higher pages', () => {
    expect(calculateOffset(5, 10)).toBe(40);
  });

  it('works with limit of 1', () => {
    expect(calculateOffset(10, 1)).toBe(9);
  });
});

// ============================================================================
// parseStartOfDayUTC / parseEndOfDayUTC
// ============================================================================

describe('parseStartOfDayUTC', () => {
  it('returns a Date instance', () => {
    const result = parseStartOfDayUTC('2026-02-15');
    expect(result).toBeInstanceOf(Date);
  });

  it('sets time to 00:00:00.000Z for the given date', () => {
    const result = parseStartOfDayUTC('2026-02-15');
    expect(result.toISOString()).toBe('2026-02-15T00:00:00.000Z');
  });

  it('preserves the correct date component', () => {
    const result = parseStartOfDayUTC('2026-12-31');
    expect(result.toISOString()).toBe('2026-12-31T00:00:00.000Z');
  });
});

describe('parseEndOfDayUTC', () => {
  it('returns a Date instance', () => {
    const result = parseEndOfDayUTC('2026-02-15');
    expect(result).toBeInstanceOf(Date);
  });

  it('sets time to 23:59:59.999Z for the given date', () => {
    const result = parseEndOfDayUTC('2026-02-15');
    expect(result.toISOString()).toBe('2026-02-15T23:59:59.999Z');
  });

  it('end-of-day is always after start-of-day for the same date', () => {
    const start = parseStartOfDayUTC('2026-02-15');
    const end = parseEndOfDayUTC('2026-02-15');
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it('preserves the correct date component', () => {
    const result = parseEndOfDayUTC('2026-01-01');
    expect(result.toISOString()).toBe('2026-01-01T23:59:59.999Z');
  });
});

// ============================================================================
// maskSensitive
// ============================================================================

describe('maskSensitive', () => {
  describe('email masking (default type)', () => {
    it('masks email keeping first char and domain', () => {
      expect(maskSensitive('john@example.com')).toBe('j***@example.com');
    });

    it('returns *** for value without @ sign', () => {
      expect(maskSensitive('invalid')).toBe('***');
    });

    it('handles single-char local part', () => {
      expect(maskSensitive('a@example.com')).toBe('a***@example.com');
    });

    it('handles email with subdomain in domain part', () => {
      expect(maskSensitive('user@mail.company.cz')).toBe('u***@mail.company.cz');
    });
  });

  describe('phone masking', () => {
    it('masks phone keeping first 4 chars and last 3 chars', () => {
      expect(maskSensitive('+420123456789', 'phone')).toBe('+420***789');
    });

    it('returns *** for short phone numbers (6 or fewer chars)', () => {
      expect(maskSensitive('12345', 'phone')).toBe('***');
    });

    it('returns *** for phone number exactly 6 chars long', () => {
      expect(maskSensitive('123456', 'phone')).toBe('***');
    });

    it('masks longer phone number correctly', () => {
      // 7+ chars: first 4 + *** + last 3
      expect(maskSensitive('1234567', 'phone')).toBe('1234***567');
    });
  });
});

// ============================================================================
// parseNumericOrNull
// ============================================================================

describe('parseNumericOrNull', () => {
  it('parses valid integer string to number', () => {
    expect(parseNumericOrNull('42')).toBe(42);
  });

  it('parses valid float string to number', () => {
    expect(parseNumericOrNull('3.14')).toBeCloseTo(3.14);
  });

  it('returns null for null input', () => {
    expect(parseNumericOrNull(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseNumericOrNull(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseNumericOrNull('')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(parseNumericOrNull('abc')).toBeNull();
  });

  it('returns null for Infinity string (not finite)', () => {
    expect(parseNumericOrNull('Infinity')).toBeNull();
  });

  it('returns null for -Infinity string', () => {
    expect(parseNumericOrNull('-Infinity')).toBeNull();
  });

  it('parses negative number string', () => {
    expect(parseNumericOrNull('-100')).toBe(-100);
  });

  it('parses zero string', () => {
    expect(parseNumericOrNull('0')).toBe(0);
  });
});

// ============================================================================
// omit
// ============================================================================

describe('omit', () => {
  it('omits specified key from object', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('returns original object when no keys to omit', () => {
    expect(omit({ a: 1 }, [])).toEqual({ a: 1 });
  });

  it('omits multiple keys', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ b: 2 });
  });

  it('omits all keys resulting in empty object', () => {
    expect(omit({ a: 1, b: 2 }, ['a', 'b'])).toEqual({});
  });

  it('does not mutate the original object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    omit(obj, ['b']);
    expect(obj).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('ignores keys not present in the object', () => {
    // TypeScript prevents this at compile time, but runtime should be safe
    expect(omit({ a: 1, b: 2 } as Record<string, unknown>, ['c' as string])).toEqual({
      a: 1,
      b: 2,
    });
  });
});

// ============================================================================
// pick
// ============================================================================

describe('pick', () => {
  it('picks specified keys from object', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('ignores keys not present in the object', () => {
    // TypeScript prevents passing unknown keys, but runtime should handle it
    expect(pick({ a: 1 } as { a: number; b?: number }, ['a', 'b'])).toEqual({ a: 1 });
  });

  it('returns empty object for empty keys array', () => {
    expect(pick({ a: 1 }, [])).toEqual({});
  });

  it('picks single key correctly', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ b: 2 });
  });

  it('does not mutate the original object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    pick(obj, ['a']);
    expect(obj).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('picks all keys when all are specified', () => {
    const obj = { x: 10, y: 20 };
    expect(pick(obj, ['x', 'y'])).toEqual({ x: 10, y: 20 });
  });
});
