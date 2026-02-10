---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/app/page.tsx
autonomous: true

must_haves:
  truths:
    - 'Visiting / redirects to /cs/login (or /cs/ if authenticated)'
    - 'next-intl middleware processes root path correctly'
  artifacts:
    - path: 'apps/web/app/page.tsx'
      provides: 'Root page redirect handler'
      min_lines: 5
  key_links:
    - from: 'apps/web/app/page.tsx'
      to: 'apps/web/middleware.ts'
      via: 'Next.js routing layer'
      pattern: 'redirect.*locale'
---

<objective>
Fix the root URL (/) showing 404 instead of redirecting to the localized path.

Purpose: The next-intl middleware rewrites paths to include locale, but Next.js requires a root page.tsx to exist for the middleware to process the request. Without it, Next.js returns 404 before the middleware can run.

Output: Root page.tsx that redirects to the default locale path, allowing next-intl middleware to handle localization properly.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

# Current middleware configuration
@apps/web/middleware.ts

# Existing layouts
@apps/web/app/layout.tsx
@apps/web/app/[locale]/layout.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create root page redirect</name>
  <files>apps/web/app/page.tsx</files>
  <action>
Create `apps/web/app/page.tsx` that redirects to the default locale path.

The issue: Next.js routing processes `app/page.tsx` before middleware runs. The middleware is configured to rewrite `/` to `/cs/` (default locale), but without a root page.tsx, Next.js returns 404.

Implementation:
1. Create `apps/web/app/page.tsx` with redirect to '/cs'
2. Use Next.js `redirect()` from 'next/navigation'
3. This allows the middleware to then rewrite '/cs' to the appropriate localized path
4. Add comment explaining this is a workaround for next-intl middleware integration

The flow will be:
- User visits `/`
- Next.js matches `app/page.tsx`
- Page redirects to `/cs`
- Middleware processes `/cs` and serves content from `app/[locale]/*`

Note: This is a known pattern when using next-intl with App Router and `localePrefix: 'as-needed'`.
  </action>
  <verify>
1. File exists at `apps/web/app/page.tsx`
2. File imports and uses `redirect` from 'next/navigation'
3. File redirects to '/cs'
  </verify>
  <done>
Root page.tsx exists and redirects to default locale path, enabling next-intl middleware to handle routing correctly.
  </done>
</task>

<task type="auto">
  <name>Task 2: Test root path behavior</name>
  <files>None (testing only)</files>
  <action>
Verify the root URL redirect works correctly:

1. Start dev server: `pnpm --filter web dev`
2. Wait for server to be ready (localhost:3000)
3. Test root path: `curl -I http://localhost:3000/` and verify:
   - Returns 307 redirect (temporary redirect from page.tsx)
   - Location header points to /cs or /cs/login
4. Test in browser: Visit http://localhost:3000/ and verify:
   - No 404 error
   - Redirects to login page if unauthenticated
   - URL shows /login (not /cs/login due to localePrefix: 'as-needed')
5. Stop dev server after verification

If any issues occur, review the redirect flow and middleware matcher configuration.
  </action>
  <verify>
1. `curl -I http://localhost:3000/` returns 30x redirect (not 404)
2. Browser navigation to / shows login page without 404
3. URL bar shows /login after redirect (no /cs prefix due to default locale)
  </verify>
  <done>
Root URL (/) successfully redirects through the next-intl middleware flow to the appropriate localized page without 404 errors.
  </done>
</task>

</tasks>

<verification>
1. Root page.tsx file created with redirect to default locale
2. Dev server accessible at root path (/) without 404
3. Middleware processes the redirect correctly
4. Users land on login page (or dashboard if authenticated)
</verification>

<success_criteria>
- Visiting http://localhost:3000/ does NOT return 404
- Root path redirects to localized path (/cs → /login)
- next-intl middleware processes requests correctly
- No regression in existing /cs/, /login, or dashboard routes
</success_criteria>

<output>
After completion, create `.planning/quick/001-fix-root-url-404-redirect/001-SUMMARY.md`
</output>
