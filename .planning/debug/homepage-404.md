---
status: diagnosed
trigger: 'Investigate root cause of homepage 404 in ScheduleBox project'
created: 2026-02-10T00:00:00Z
updated: 2026-02-10T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Next.js 14 App Router with next-intl requires [locale] dynamic segment
test: Examined file structure and next-intl documentation requirements
expecting: Missing [locale] folder in app directory causing 404
next_action: Document root cause and required fix

## Symptoms

expected: Visiting localhost:3000 should show the homepage (Czech as default, no /cs prefix)
actual: Middleware redirects to /en, which returns 404 and compiles /_not-found
errors: GET /en returns 404
reproduction: Start `pnpm dev`, visit localhost:3000
started: Current implementation phase (Phase 04 frontend shell)

## Eliminated

## Evidence

- timestamp: 2026-02-10T00:05:00Z
  checked: apps/web/middleware.ts
  found: Correctly configured with locales: ['cs', 'sk', 'en'], defaultLocale: 'cs', localePrefix: 'as-needed'
  implication: Middleware configuration is correct

- timestamp: 2026-02-10T00:06:00Z
  checked: apps/web/next.config.mjs
  found: Uses createNextIntlPlugin('./i18n/request.ts'), no custom rewrites/redirects
  implication: Next.js config is correct

- timestamp: 2026-02-10T00:07:00Z
  checked: apps/web/i18n/request.ts
  found: Correctly loads messages from ../messages/${locale}.json
  implication: i18n request config is correct

- timestamp: 2026-02-10T00:08:00Z
  checked: apps/web/messages/ directory
  found: All three locale files exist (cs.json, en.json, sk.json)
  implication: Translation files are present

- timestamp: 2026-02-10T00:09:00Z
  checked: apps/web/app/ directory structure
  found: page.tsx, layout.tsx exist at root, but NO [locale] folder
  implication: CRITICAL - Next.js 14 App Router with next-intl requires [locale] dynamic segment

- timestamp: 2026-02-10T00:10:00Z
  checked: apps/web/app/layout.tsx
  found: Uses getLocale() and getMessages() from next-intl/server
  implication: Layout expects locale context but it's not provided by route structure

## Resolution

root_cause: Next.js 14 App Router with next-intl REQUIRES a [locale] dynamic segment in the app directory. Current structure has page.tsx and layout.tsx at app/ root, but they must be nested inside app/[locale]/ for next-intl routing to work. When middleware detects no locale and tries to redirect, there's no matching route structure to handle the locale-prefixed paths.

fix: Restructure app directory - create app/[locale]/ folder and move layout.tsx, page.tsx, and all route groups ((auth), (dashboard)) into it. The [locale] segment provides the locale parameter to layouts and pages.

verification: After restructure, visiting localhost:3000 should show homepage without prefix (Czech default), /en should show English version, /sk should show Slovak version.

files_changed:
  - apps/web/app/[locale]/layout.tsx (moved from app/layout.tsx)
  - apps/web/app/[locale]/page.tsx (moved from app/page.tsx)
  - apps/web/app/[locale]/(auth)/* (moved from app/(auth)/*)
  - apps/web/app/[locale]/(dashboard)/* (moved from app/(dashboard)/*)
