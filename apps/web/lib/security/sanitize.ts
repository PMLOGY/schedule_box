/**
 * XSS sanitization utilities using isomorphic-dompurify
 * SEC-02: Sanitizes all user-generated content before storage
 *
 * Uses isomorphic-dompurify which provides a jsdom shim for Node.js server-side rendering,
 * avoiding the "window is not defined" error that occurs with plain dompurify.
 *
 * Source: isomorphic-dompurify docs (https://github.com/kkomelin/isomorphic-dompurify)
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize plain text input — strips ALL HTML tags.
 * Use for: review comments, customer notes, short text fields.
 *
 * @param input - Raw user input string
 * @returns Sanitized plain text (no HTML tags)
 */
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize rich text input — allows a safe subset of HTML tags and attributes.
 * Use for: notification template bodies, company descriptions.
 *
 * Allowed tags: b, i, em, strong, a, p, br, ul, ol, li
 * Allowed attributes: href, target, rel (on anchor tags only)
 *
 * @param input - Raw HTML string from rich text editor
 * @returns Sanitized HTML with only safe formatting preserved
 */
export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}
