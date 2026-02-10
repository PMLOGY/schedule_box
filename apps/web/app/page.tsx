import { redirect } from 'next/navigation';

/**
 * Root Page Redirect
 *
 * This page exists to handle the root path (/) and redirect to the default locale.
 *
 * Why this is needed:
 * - next-intl middleware requires a page.tsx to exist at the root
 * - Without this file, Next.js returns 404 before middleware can process the request
 * - The middleware is configured with `localePrefix: 'as-needed'` which means:
 *   - Default locale (cs) paths don't include /cs prefix in the URL
 *   - Non-default locales (sk, en) include the locale prefix
 *
 * Flow:
 * 1. User visits /
 * 2. This page redirects to /cs
 * 3. Middleware processes /cs and rewrites to appropriate content from app/[locale]/*
 * 4. If unauthenticated, user sees /login (not /cs/login due to localePrefix: 'as-needed')
 *
 * This is a documented pattern when using next-intl with App Router and localePrefix: 'as-needed'.
 */
export default function RootPage() {
  redirect('/cs');
}
