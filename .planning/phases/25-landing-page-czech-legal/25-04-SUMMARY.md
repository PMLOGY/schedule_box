# Plan 25-04 Summary: Privacy, Terms, Cookie Consent

**Status:** Complete
**Duration:** ~3 min

## What was done

1. **Created privacy policy page** (`privacy/page.tsx`):
   - Async server component with 8 structured GDPR sections
   - Covers: data controller, data collected, purpose, legal basis, retention, rights, cookies, DPO contact
   - Company info from NEXT_PUBLIC_COMPANY_* env vars
   - TODO comment for legal team review

2. **Created terms of service page** (`terms/page.tsx`):
   - Async server component with 8 structured commercial sections
   - Covers: intro, service description, registration, pricing, usage terms, liability, data protection (links to /privacy), final provisions
   - Uses Link from @/lib/i18n/navigation for internal links
   - TODO comment for legal team review

3. **Created cookie consent banner** (`cookie-consent-banner.tsx`):
   - 'use client' component with localStorage persistence
   - Mounted guard prevents React hydration mismatch
   - Equal-weight Accept/Reject buttons (Czech ECA 2022 compliant)
   - No close/X button, no pre-checked boxes
   - Fixed bottom overlay, doesn't block page content (not a cookie wall)
   - Links to /privacy page

4. **Updated marketing layout** to include CookieConsentBanner

## Czech ECA 2022 compliance
- [x] No pre-checked boxes
- [x] Equal-weight Accept and Reject buttons
- [x] No close/dismiss button — explicit choice required
- [x] Banner doesn't block content (fixed bottom, content scrollable)
- [x] Privacy policy link present

## Files created/modified
- `apps/web/app/[locale]/(marketing)/privacy/page.tsx` (created)
- `apps/web/app/[locale]/(marketing)/terms/page.tsx` (created)
- `apps/web/app/[locale]/(marketing)/_components/cookie-consent-banner.tsx` (created)
- `apps/web/app/[locale]/(marketing)/layout.tsx` (modified — added CookieConsentBanner)

## Verification
- TypeScript compiles without errors
- Both legal pages export generateStaticParams and call setRequestLocale
- Cookie consent has 'use client' and mounted guard
- Layout imports CookieConsentBanner
