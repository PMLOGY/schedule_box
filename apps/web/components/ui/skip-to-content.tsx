'use client';

/**
 * Skip-to-content link for WCAG 2.1 AA compliance.
 *
 * Re-exports the existing SkipLink component for backwards compatibility
 * and provides a standalone version that works without i18n context
 * (e.g. in the root locale layout before NextIntlClientProvider).
 */

export { SkipLink as SkipToContent } from '@/components/accessibility/skip-link';
