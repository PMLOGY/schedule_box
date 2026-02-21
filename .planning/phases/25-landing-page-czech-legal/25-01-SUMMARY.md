# Plan 25-01 Summary: Marketing Layout, Navbar, Footer, i18n

**Status:** Complete
**Duration:** ~5 min

## What was done

1. **Installed `motion` package** (MIT) for scroll animations in later plans
2. **Fixed root `[locale]/layout.tsx`** for static rendering:
   - Added `setRequestLocale(locale)` call before `getMessages()`
   - Added `generateStaticParams` export using `routing.locales`
   - Properly awaits `params` (Next.js 15 async params pattern)
3. **Added complete `landing` i18n namespace** to all three message files (cs.json, en.json, sk.json):
   - Sub-namespaces: meta, nav, hero, features, trust, pricing (with features sub-keys), social, cookie, privacy, terms, footer
   - All translations needed by plans 25-01 through 25-04 are pre-populated
4. **Created `(marketing)` route group** with layout, navbar, and footer:
   - `layout.tsx`: Wraps children with navbar + footer, no AuthGuard, no sidebar. Calls `setRequestLocale` and exports `generateStaticParams`
   - `marketing-navbar.tsx`: Async server component with sticky header, ScheduleBox logo, Features/Pricing nav links, LocaleSwitcher, "Začít zdarma" CTA button
   - `marketing-footer.tsx`: Async server component with 4-column grid (company info with ICO/DIC/address from env vars, product links, legal links, contact), copyright line with registry note

## Key decisions
- Navbar uses `Link` from `@/lib/i18n/navigation` for locale-aware internal links
- Footer company info uses `NEXT_PUBLIC_COMPANY_*` env vars with sensible defaults
- CookieConsentBanner placeholder comment in layout — will be wired in plan 25-04

## Files created/modified
- `apps/web/app/[locale]/layout.tsx` (modified)
- `apps/web/app/[locale]/(marketing)/layout.tsx` (created)
- `apps/web/app/[locale]/(marketing)/_components/marketing-navbar.tsx` (created)
- `apps/web/app/[locale]/(marketing)/_components/marketing-footer.tsx` (created)
- `apps/web/messages/cs.json` (modified — added landing namespace)
- `apps/web/messages/en.json` (modified — added landing namespace)
- `apps/web/messages/sk.json` (modified — added landing namespace)
- `apps/web/package.json` (modified — added motion dependency)

## Verification
- TypeScript compiles without errors
- All three JSON files are valid JSON
- `motion` is in package.json dependencies
- Root layout has `setRequestLocale` and `generateStaticParams`
