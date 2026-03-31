---
phase: 57-fixes-wcag
plan: 03
subsystem: web-ui
tags: [cookie-consent, web-component, offline, marketplace, compliance]
dependency_graph:
  requires: []
  provides: [cookie-categories, web-component-widget, offline-banner, premium-cta]
  affects: [marketing-pages, embed-widget, all-pages, marketplace-detail]
tech_stack:
  added: []
  patterns: [web-component-shadow-dom, category-consent, navigator-online]
key_files:
  created:
    - apps/web/lib/cookies/consent-store.ts
    - apps/web/public/schedulebox-widget.js
    - apps/web/components/ui/offline-banner.tsx
    - apps/web/components/marketplace/premium-upgrade-cta.tsx
  modified:
    - apps/web/app/[locale]/(marketing)/_components/cookie-consent-banner.tsx
    - apps/web/app/embed/[company_slug]/layout.tsx
    - apps/web/app/providers.tsx
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json
decisions:
  - Cookie preferences stored as JSON in localStorage key sb_cookie_preferences with necessary always true
  - Web Component uses shadow DOM with iframe to isolate widget styles on third-party pages
  - Offline banner mounted in providers.tsx (above QueryClientProvider) for global visibility
  - Premium CTA is presentational only, links to existing billing settings page
metrics:
  completed: 2026-03-31
  tasks: 2/2
  files_created: 4
  files_modified: 6
---

# Phase 57 Plan 03: Cookie Consent Categories, Web Component Widget, Offline Banner, Marketplace Premium CTA

Category-based cookie consent with necessary/analytics/marketing toggles, embeddable Web Component widget using shadow DOM, offline detection banner, and marketplace premium upgrade CTA.

## What Was Done

### Task 1: Cookie Consent Categories + Offline Banner (FIX-07, FIX-11)

**Cookie consent store** (`apps/web/lib/cookies/consent-store.ts`):
- `CookiePreferences` type with `necessary: true`, `analytics: boolean`, `marketing: boolean`
- `getConsentPreferences()`, `setConsentPreferences()`, `hasConsented()` functions
- Convenience helpers `isAnalyticsAllowed()` and `isMarketingAllowed()`
- localStorage key: `sb_cookie_preferences` (JSON)

**Cookie consent banner** (rewritten):
- Three category rows with shadcn Switch toggles
- Necessary cookies: always on, disabled toggle
- Analytics and marketing: opt-in toggles, default off
- Three actions: "Accept all" (all true), "Save selection" (current state), "Reject all" (text link, analytics+marketing false)
- Translations added for cs/en/sk locales

**Offline banner** (`apps/web/components/ui/offline-banner.tsx`):
- Uses `navigator.onLine` + `online`/`offline` window events
- Fixed top banner with amber background when offline
- 1-second delay before hiding when back online to avoid flicker
- Mounted in `providers.tsx` for global visibility across all pages

### Task 2: Web Component Widget + Marketplace Premium CTA (FIX-09, FIX-10)

**Web Component widget** (`apps/web/public/schedulebox-widget.js`):
- Custom element `<schedulebox-widget>` with shadow DOM isolation
- Observed attributes: `slug`, `theme`, `locale`, `height`, `base-url`
- Creates iframe pointing to `/embed/{slug}` with theme/locale/parent_origin params
- Loading skeleton with pulse animation, hides on iframe load
- Error state when slug attribute is missing
- Self-contained vanilla JS, no build step required

**Embed layout update**:
- Removed unused imports, kept CSP `frame-ancestors *` for iframe embedding

**Marketplace premium CTA** (`apps/web/components/marketplace/premium-upgrade-cta.tsx`):
- Shows "Boost your profile" card to company owners only
- Lists premium benefits with icons (position, badge, priority)
- CTA button navigates to `/settings/billing?upgrade=premium`
- If already premium, shows "Premium active" badge instead
- Translations added for cs/en/sk locales

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added Slovak translations**
- Plan specified cs/en only but sk.json exists with full translations
- Added sk translations for cookie consent categories and marketplace premium keys
- Also added offline translations for all three locales

## Verification Results

- TypeScript compiles with zero new errors (pre-existing error in automation route is unrelated)
- `customElements.define` present in schedulebox-widget.js
- Cookie consent banner uses Switch toggles for analytics and marketing categories
- Offline banner component exists and is mounted in providers
- Premium CTA component exports correctly

## Self-Check: PASSED

- [x] `apps/web/lib/cookies/consent-store.ts` exists
- [x] `apps/web/public/schedulebox-widget.js` contains `customElements.define`
- [x] `apps/web/components/ui/offline-banner.tsx` exists
- [x] `apps/web/components/marketplace/premium-upgrade-cta.tsx` exists
- [x] `apps/web/app/providers.tsx` imports and renders `OfflineBanner`
- [x] Cookie consent banner has Switch toggles
- [x] All translation files updated (cs, en, sk)
- [x] Code committed in 87e4510
