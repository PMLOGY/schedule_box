/**
 * Shared utility functions for ScheduleBox
 * Common helpers used across backend services and API routes
 */

/**
 * Generate a URL-safe slug from text
 * Handles Czech/Slovak diacritics
 */
export function generateSlug(text: string): string {
  const diacriticsMap: Record<string, string> = {
    á: 'a',
    č: 'c',
    ď: 'd',
    é: 'e',
    ě: 'e',
    í: 'i',
    ň: 'n',
    ó: 'o',
    ř: 'r',
    š: 's',
    ť: 't',
    ú: 'u',
    ů: 'u',
    ý: 'y',
    ž: 'z',
    ä: 'a',
    ö: 'o',
    ü: 'u',
    ľ: 'l',
    ŕ: 'r',
    ĺ: 'l',
    ô: 'o',
  };

  return text
    .toLowerCase()
    .split('')
    .map((char) => diacriticsMap[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format monetary amount for display
 * Uses Czech locale conventions by default
 */
export function formatCurrency(
  amount: string | number,
  currency = 'CZK',
  locale = 'cs-CZ',
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'CZK' ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

/**
 * Calculate pagination metadata from total count, page, and limit
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number,
): { total: number; page: number; limit: number; total_pages: number } {
  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Calculate SQL offset from page and limit
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Parse a date string as start-of-day in UTC
 * Useful for date range query lower bounds
 */
export function parseStartOfDayUTC(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * Parse a date string as end-of-day in UTC
 * Useful for date range query upper bounds
 */
export function parseEndOfDayUTC(dateStr: string): Date {
  return new Date(dateStr + 'T23:59:59.999Z');
}

/**
 * Mask sensitive data for logging (e.g., email, phone)
 * "john@example.com" → "j***@example.com"
 * "+420123456789" → "+420***789"
 */
export function maskSensitive(value: string, type: 'email' | 'phone' = 'email'): string {
  if (type === 'email') {
    const [local, domain] = value.split('@');
    if (!domain) return '***';
    return `${local[0]}***@${domain}`;
  }
  if (value.length <= 6) return '***';
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
}

/**
 * Safely parse a numeric string, returning null if invalid
 * Useful for query parameters and form data
 */
export function parseNumericOrNull(value: string | undefined | null): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Omit keys from an object (type-safe)
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const keysSet = new Set<string | number | symbol>(keys);
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keysSet.has(key))) as Omit<T, K>;
}

/**
 * Pick keys from an object (type-safe)
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
