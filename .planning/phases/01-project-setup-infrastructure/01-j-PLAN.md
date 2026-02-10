---
phase: 01-project-setup-infrastructure
plan: j
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/app/layout.tsx
  - apps/web/app/page.tsx
  - apps/web/app/(auth)/**/*
  - apps/web/app/(dashboard)/**/*
  - apps/web/app/[locale]/layout.tsx (new)
  - apps/web/app/[locale]/page.tsx (new)
  - apps/web/app/[locale]/(auth)/**/* (new)
  - apps/web/app/[locale]/(dashboard)/**/* (new)
autonomous: true
gap_closure: true

must_haves:
  truths:
    - 'Visiting localhost:3000 shows the ScheduleBox page without errors'
    - 'Czech locale (cs) loads as default without /cs prefix in URL'
    - 'English locale (/en) and Slovak locale (/sk) load correctly with prefix'
  artifacts:
    - path: 'apps/web/app/[locale]/layout.tsx'
      provides: 'Root layout with locale parameter'
      min_lines: 30
    - path: 'apps/web/app/[locale]/page.tsx'
      provides: 'Homepage with locale context'
      min_lines: 10
    - path: 'apps/web/app/[locale]/(auth)/'
      provides: 'Auth pages within locale segment'
    - path: 'apps/web/app/[locale]/(dashboard)/'
      provides: 'Dashboard pages within locale segment'
  key_links:
    - from: 'apps/web/middleware.ts'
      to: 'apps/web/app/[locale]/*'
      via: 'next-intl locale routing'
      pattern: '\[locale\]'
---

<objective>
Fix homepage 404 by restructuring app directory to use [locale] dynamic segment required by next-intl.

Purpose: Enable proper internationalization routing so users can access the application
Output: Working homepage at localhost:3000 with proper locale routing
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-project-setup-infrastructure/01-UAT.md
@.planning/debug/homepage-404.md

@apps/web/middleware.ts
@apps/web/next.config.mjs
@apps/web/i18n/request.ts
@apps/web/app/layout.tsx
@apps/web/app/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restructure app directory with [locale] segment</name>
  <files>
apps/web/app/[locale]/layout.tsx (new)
apps/web/app/[locale]/page.tsx (new)
apps/web/app/[locale]/(auth)/ (moved)
apps/web/app/[locale]/(dashboard)/ (moved)
apps/web/app/layout.tsx (deleted)
apps/web/app/page.tsx (deleted)
apps/web/app/(auth)/ (deleted)
apps/web/app/(dashboard)/ (deleted)
  </files>
  <action>
**Root cause:** Next.js 14 App Router with next-intl requires a `[locale]` dynamic segment in the app directory. Current structure has pages at `app/` root, but they must be nested inside `app/[locale]/` for next-intl routing to work.

**Fix:** Restructure the app directory to provide locale context to all pages.

**Step 1: Create [locale] directory**
```bash
mkdir apps/web/app/[locale]
```

**Step 2: Move layout.tsx**

Move `apps/web/app/layout.tsx` to `apps/web/app/[locale]/layout.tsx`

Update the layout to accept locale parameter:

```typescript
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <html lang={params.locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**Note:** The function name should be `LocaleLayout` (not `RootLayout`) to clarify it's the locale-specific layout.

**Step 3: Move page.tsx**

Move `apps/web/app/page.tsx` to `apps/web/app/[locale]/page.tsx`

The page already uses `useTranslations()` from next-intl, so it should work without changes. Just verify it's moved correctly.

**Step 4: Move route groups**

```bash
mv apps/web/app/(auth) apps/web/app/[locale]/(auth)
mv apps/web/app/(dashboard) apps/web/app/[locale]/(dashboard)
```

All pages within these route groups already use next-intl hooks, so they should work without modification.

**Step 5: Keep API routes at root**

**IMPORTANT:** Do NOT move `apps/web/app/api/` into `[locale]/`. API routes should remain at the root level (`apps/web/app/api/`) because they are not locale-specific and should be accessible without locale prefix.

Current structure:
```
apps/web/app/
├── api/              ← KEEP HERE (no locale prefix)
├── [locale]/         ← NEW
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   └── (dashboard)/
```

**Step 6: Create root layout (required by Next.js)**

Next.js 14 requires a root layout at `apps/web/app/layout.tsx`. Create a minimal root layout:

```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

This layout simply passes through to the `[locale]` layout. The locale-specific layout handles HTML structure and i18n provider.

**Step 7: Verify middleware configuration**

The middleware configuration in `apps/web/middleware.ts` is already correct:
- `locales: ['cs', 'sk', 'en']`
- `defaultLocale: 'cs'`
- `localePrefix: 'as-needed'`

With `as-needed`, Czech (default) loads without `/cs` prefix, while `/en` and `/sk` show explicit prefixes.
  </action>
  <verify>
Start dev server and test all locale routes:

```bash
pnpm dev
```

Test cases:
1. Visit http://localhost:3000 - should show Czech homepage (no 404)
2. Visit http://localhost:3000/en - should show English homepage
3. Visit http://localhost:3000/sk - should show Slovak homepage
4. Visit http://localhost:3000/api/health - should return 200 (API not locale-prefixed)

All should return 200 status, no 404 errors.
  </verify>
  <done>Homepage loads successfully at localhost:3000, Czech is default without prefix, /en and /sk routes work, API routes remain at root level</done>
</task>

</tasks>

<verification>
- [ ] `pnpm dev` starts without errors
- [ ] http://localhost:3000 returns 200 and shows homepage in Czech
- [ ] http://localhost:3000/en returns 200 and shows homepage in English
- [ ] http://localhost:3000/sk returns 200 and shows homepage in Slovak
- [ ] http://localhost:3000/api/health still works (not locale-prefixed)
- [ ] No /_not-found compilation in dev server logs
- [ ] Browser console shows no errors
- [ ] All route groups ((auth), (dashboard)) accessible with locale prefix
</verification>

<success_criteria>
Users can access the application homepage without 404 errors. Internationalization routing works correctly with Czech as default (no prefix) and English/Slovak with explicit prefixes. API routes remain accessible without locale prefixes.
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-setup-infrastructure/01-j-SUMMARY.md`
</output>
