---
status: resolved
trigger: 'Navigating to / or dashboard routes throws: Missing required html tags <html> <body> in Root Layout'
created: 2026-02-10T12:00:00Z
updated: 2026-02-10T12:05:00Z
---

## Current Focus

hypothesis: Root layout at app/layout.tsx returns bare `children` without html/body tags; the real html/body tags are in app/[locale]/layout.tsx which only renders for /[locale]/* routes, not for /
test: Read both layout files, confirm root layout lacks html/body
expecting: Root layout has no html/body; locale layout has them
next_action: Document root cause and fix

## Symptoms

expected: Navigating to / or /bookings etc. renders the dashboard
actual: Next.js error "Missing required html tags. The following tags are missing in the Root Layout: <html>, <body>"
errors: Missing required html tags <html> <body>
reproduction: Navigate to localhost:3000/ or any dashboard route
started: After pages were moved from app/(dashboard)/ to app/[locale]/(dashboard)/

## Eliminated

(none needed - root cause found on first inspection)

## Evidence

- timestamp: 2026-02-10T12:01:00Z
  checked: app/layout.tsx (root layout)
  found: Returns bare `children` with no <html> or <body> tags (6 lines total)
  implication: This is the DIRECT cause of the error - Next.js requires the root layout to have <html> and <body>

- timestamp: 2026-02-10T12:02:00Z
  checked: app/[locale]/layout.tsx
  found: Contains <html lang={params.locale}> and <body> with Inter font, providers, i18n, toaster
  implication: The html/body tags were moved here during i18n restructuring, but root layout was left as a passthrough

- timestamp: 2026-02-10T12:03:00Z
  checked: Directory structure
  found: app/(auth)/ and app/(dashboard)/ directories are DELETED (git status shows D). Pages now live under app/[locale]/(auth)/ and app/[locale]/(dashboard)/
  implication: A restructuring moved all pages under [locale] for i18n, but the root layout was stripped of html/body tags incorrectly

- timestamp: 2026-02-10T12:04:00Z
  checked: Route resolution for /
  found: No page.tsx exists at app/page.tsx (deleted). The only page.tsx for / is at app/[locale]/(dashboard)/page.tsx
  implication: Navigating to / has no matching page unless Next.js middleware redirects to /cs or /en first

## Resolution

root_cause: |
  app/layout.tsx (root layout) returns bare `children` without <html> or <body> tags.
  Next.js App Router REQUIRES the root layout to contain these tags.

  During i18n restructuring, all pages were moved from app/(auth)/ and app/(dashboard)/
  into app/[locale]/(auth)/ and app/[locale]/(dashboard)/. The <html> and <body> tags
  were placed in app/[locale]/layout.tsx instead of the root layout.

  This violates Next.js's requirement: the ROOT layout (app/layout.tsx) must always
  have <html> and <body>. Nested layouts like [locale]/layout.tsx should NOT have them.

fix: |
  Move <html> and <body> tags back to app/layout.tsx (root layout).
  Remove <html> and <body> from app/[locale]/layout.tsx (keep it as content-only wrapper).

verification: Navigate to / and dashboard routes without error
files_changed:
  - apps/web/app/layout.tsx
  - apps/web/app/[locale]/layout.tsx
