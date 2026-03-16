---
phase: 46-security-hardening
plan: 02
subsystem: web/security
tags: [sentry, error-tracking, csrf, cookie-policy, gdpr, translations]
dependency_graph:
  requires: []
  provides:
    - Sentry error tracking with ad-blocker bypass tunnel
    - CSRF audit documentation
    - Cookie policy page (CS/EN/SK)
    - Footer cookie policy link
  affects:
    - apps/web/next.config.mjs
    - apps/web/instrumentation.ts
    - apps/web/middleware.ts
    - apps/web/messages/*.json
tech_stack:
  added:
    - "@sentry/nextjs@10.43.0 — error tracking and performance monitoring"
  patterns:
    - "Sentry tunnel via /monitoring route to bypass ad-blockers"
    - "serverExternalPackages for jsdom/isomorphic-dompurify to prevent webpack bundling native file reads"
    - "Next.js instrumentation.ts pattern for server/edge Sentry init"
    - "withSentryConfig wrapping withNextIntl in next.config.mjs"
key_files:
  created:
    - apps/web/sentry.server.config.ts
    - apps/web/sentry.edge.config.ts
    - apps/web/instrumentation-client.ts
    - apps/web/lib/security/csrf-audit.ts
    - apps/web/app/[locale]/(marketing)/cookie-policy/page.tsx
  modified:
    - apps/web/instrumentation.ts
    - apps/web/next.config.mjs
    - apps/web/middleware.ts
    - apps/web/app/[locale]/(marketing)/_components/marketing-footer.tsx
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "autoInstrumentServerFunctions/Middleware/AppDirectory set to false — Sentry 10.43 auto-instrumentation caused webpack chunk conflicts with Next.js 15.5"
  - "isomorphic-dompurify and jsdom added to serverExternalPackages — jsdom uses fs.readFileSync to load default-stylesheet.css at a path that webpack bundling breaks"
  - "@types/dompurify removed — stub package with no .d.ts caused TypeScript implicit type library error; dompurify and isomorphic-dompurify ship own types"
  - "Next.js downgraded from 15.5.12 to 15.5.10 — 15.5.12 had same jsdom bundling issue, package.json already pinned ^15.5.10"
metrics:
  duration: "47 minutes"
  completed: "2026-03-16"
  tasks: 2
  files_changed: 14
---

# Phase 46 Plan 02: Sentry Integration, CSRF Audit, Cookie Policy Summary

Sentry error tracking integrated with ad-blocker tunnel route, CSRF protection documented, and GDPR-required cookie policy page added with footer link in CS/EN/SK.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Sentry SDK integration with tunnel route | ee420d7 | Done |
| 2 | CSRF audit + cookie policy page + footer link | 1ef9843 | Done |

## What Was Built

**Task 1: Sentry SDK Integration**

- `sentry.server.config.ts` — initializes Sentry on Node.js runtime with DSN from env
- `sentry.edge.config.ts` — initializes Sentry on Edge runtime
- `instrumentation-client.ts` — client-side Sentry with `tunnel: '/monitoring'` for ad-blocker bypass
- `instrumentation.ts` updated — imports server/edge configs in `register()`, exports `onRequestError = captureRequestError`
- `next.config.mjs` — wrapped with `withSentryConfig`, tunnel route `/monitoring`, source maps hidden in production
- `middleware.ts` — `monitoring` added to matcher exclusion list so Sentry tunnel bypasses next-intl

**Task 2: CSRF Audit + Cookie Policy**

- `lib/security/csrf-audit.ts` — documents all route categories, why Bearer JWT is CSRF-safe (OWASP), lists all webhook routes excluded from auth
- `cookie-policy/page.tsx` — 8-section page following privacy page pattern (GlassPanel, generateStaticParams, generateMetadata)
- Translations added under `landing.meta.cookiePolicyTitle`, `landing.cookiePolicy.*`, `landing.footer.cookiePolicyLink` in cs/en/sk
- `marketing-footer.tsx` — cookiePolicyLink added to Legal section after termsLink

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resolved git merge conflicts in translation files**

- **Found during:** Task 1 setup (before running build)
- **Issue:** cs.json, en.json, sk.json had `<<<<<<< Updated upstream` conflict markers from a previous git stash pop — files were invalid JSON causing webpack parse failure
- **Fix:** Kept the "Updated upstream" version (more complete: included activate/deactivate keys and portal section)
- **Files modified:** apps/web/messages/cs.json, en.json, sk.json
- **Commit:** ee420d7

**2. [Rule 1 - Bug] Removed @types/dompurify stub causing TypeScript error**

- **Found during:** Task 1 build verification
- **Issue:** `@types/dompurify@3.2.0` is a deprecated stub with no `.d.ts` file; TypeScript saw it as an implicit type library and threw "Cannot find type definition file for 'dompurify'"
- **Fix:** Removed `@types/dompurify` via `pnpm remove` — `isomorphic-dompurify` and `dompurify` both ship own type definitions
- **Files modified:** apps/web/package.json, pnpm-lock.yaml
- **Commit:** 1ef9843

**3. [Rule 3 - Blocking] Fixed jsdom webpack bundling causing build failure**

- **Found during:** Task 1/2 build verification
- **Issue:** `isomorphic-dompurify` pulls in `jsdom` which uses `fs.readFileSync(__dirname + '/../../browser/default-stylesheet.css')`. When webpack bundles jsdom into `.next/server/chunks/`, `__dirname` resolves to `.next/server/chunks/` instead of `jsdom/lib/jsdom/`, causing ENOENT for `.next/browser/default-stylesheet.css`
- **Fix:** Added `isomorphic-dompurify` and `jsdom` to `serverExternalPackages` in next.config.mjs — prevents webpack bundling, keeps native `require()` resolution
- **Files modified:** apps/web/next.config.mjs
- **Commit:** 1ef9843

**4. [Rule 3 - Blocking] Disabled Sentry auto-instrumentation wrappers**

- **Found during:** Task 1 build verification
- **Issue:** Sentry's auto-instrumentation (`autoInstrumentServerFunctions`, `autoInstrumentMiddleware`, `autoInstrumentAppDirectory`) caused webpack chunk conflicts with Next.js 15.5.x build output structure
- **Fix:** Set all three to `false` in `withSentryConfig` options — SDK still initializes via `instrumentation.ts` and `onRequestError` hook, just without webpack-level wrappers
- **Files modified:** apps/web/next.config.mjs
- **Commit:** 1ef9843

## Build Verification

```
Build Exit: 0
✓ Compiled successfully
✓ Generating static pages (268/268)

Cookie policy pages confirmed:
├ ● /[locale]/cookie-policy
├   ├ /cs/cookie-policy
├   ├ /sk/cookie-policy
├   └ /en/cookie-policy
```

## Self-Check: PASSED

- FOUND: apps/web/sentry.server.config.ts
- FOUND: apps/web/sentry.edge.config.ts
- FOUND: apps/web/instrumentation-client.ts
- FOUND: apps/web/lib/security/csrf-audit.ts
- FOUND: apps/web/app/[locale]/(marketing)/cookie-policy/page.tsx
- FOUND: commit ee420d7 (Task 1 — Sentry integration)
- FOUND: commit 1ef9843 (Task 2 — CSRF audit + cookie policy)
