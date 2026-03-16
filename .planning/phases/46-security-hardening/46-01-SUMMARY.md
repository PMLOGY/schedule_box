---
phase: 46-security-hardening
plan: 01
subsystem: security
tags: [xss, dompurify, hibp, ssrf, sanitization, security, api]

# Dependency graph
requires:
  - phase: 45-infrastructure-migration
    provides: Neon/Upstash migration, Vercel-ready codebase
provides:
  - XSS sanitization via isomorphic-dompurify (sanitizeText, sanitizeRichText)
  - HIBP k-anonymity password breach check with fail-open policy
  - SSRF private IP validator blocking RFC 1918/loopback/link-local/CGNAT
  - All three utilities wired into 8 existing API routes
affects: [future-api-routes, auth-flows, user-generated-content]

# Tech tracking
tech-stack:
  added:
    - isomorphic-dompurify (DOMPurify with jsdom shim for server-side use)
    - "@types/dompurify (dev)"
  patterns:
    - sanitizeText() for plain text fields (strips all HTML)
    - sanitizeRichText() for rich text fields (allows safe subset)
    - isPasswordBreached() with fail-open: HIBP error = allow through (don't block registrations)
    - isPrivateIP() rejects on invalid URL (treat malformed as unsafe)
    - validateWebhookUrl() throws ValidationError on private IP

key-files:
  created:
    - apps/web/lib/security/sanitize.ts
    - apps/web/lib/security/sanitize.test.ts
    - apps/web/lib/auth/hibp.ts
    - apps/web/lib/auth/hibp.test.ts
    - apps/web/lib/security/ssrf.ts
    - apps/web/lib/security/ssrf.test.ts
  modified:
    - apps/web/app/api/v1/reviews/route.ts
    - apps/web/app/api/v1/auth/register/route.ts
    - apps/web/app/api/v1/auth/change-password/route.ts
    - apps/web/app/api/v1/automation/rules/route.ts
    - apps/web/app/api/v1/automation/rules/[id]/route.ts
    - apps/web/app/api/v1/notification-templates/route.ts
    - apps/web/app/api/v1/notification-templates/[id]/route.ts
    - apps/web/app/api/v1/settings/company/route.ts
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json

key-decisions:
  - 'isomorphic-dompurify chosen over sanitize-html — DOMPurify is OWASP-recommended; isomorphic wrapper provides jsdom shim for server-side use without separate setup'
  - 'HIBP fail-open policy — network errors from HIBP return false (allow), not an exception; legitimate registrations must not be blocked by third-party API failures'
  - 'SSRF validation at creation time — hostname regex check at rule creation; DNS rebinding limitation documented as Phase 49/50 concern'
  - 'webhookUrlSchema Zod export provided for future inline schema use alongside imperative validateWebhookUrl()'

patterns-established:
  - 'SEC-02 pattern: sanitizeText() for plain text user input, sanitizeRichText() for rich text fields — always at the API layer before DB insert/update'
  - 'SEC-04 pattern: isPasswordBreached() called after validation, before hashPassword() — fail-open on HIBP errors'
  - 'SEC-05 pattern: validateWebhookUrl() called in webhook action handler before DB insert/update — throws ValidationError on private IPs'

requirements-completed: [SEC-02, SEC-04, SEC-05]

# Metrics
duration: 13min
completed: 2026-03-16
---

# Phase 46 Plan 01: Security Utilities Summary

**isomorphic-dompurify XSS sanitization, HIBP k-anonymity breach check, and SSRF private IP blocking wired into 8 API routes**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-16T18:37:33Z
- **Completed:** 2026-03-16T18:50:43Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- Three security utility modules created with 26 unit tests, all passing (TDD: RED → GREEN)
- XSS sanitization wired into reviews, notification templates, and company settings routes before DB writes
- HIBP breach check wired into register and change-password routes with fail-open policy
- SSRF protection wired into automation rules create and update handlers for webhook actionType
- Czech, English, Slovak translations added for breached password error message

## Task Commits

Both tasks were absorbed into a single commit by lint-staged (git hook behavior):

1. **Task 1: Create security utility modules with tests** - `c8b81ee` (feat)
2. **Task 2: Wire security utilities into existing API routes** - `c8b81ee` (feat)

_Note: lint-staged hook amended the commit — all work is in c8b81ee alongside the encryption module commit that was already in progress._

## Files Created/Modified

- `apps/web/lib/security/sanitize.ts` - DOMPurify wrapper: sanitizeText() strips all HTML, sanitizeRichText() allows safe subset
- `apps/web/lib/security/sanitize.test.ts` - 10 tests for sanitization edge cases
- `apps/web/lib/auth/hibp.ts` - k-anonymity HIBP check; fail-open on any API error
- `apps/web/lib/auth/hibp.test.ts` - 4 tests including mock fetch for breach detection and fail-open
- `apps/web/lib/security/ssrf.ts` - isPrivateIP() + validateWebhookUrl() + webhookUrlSchema Zod export
- `apps/web/lib/security/ssrf.test.ts` - 12 tests for RFC 1918, loopback, link-local, CGNAT, invalid URLs
- `apps/web/app/api/v1/reviews/route.ts` - sanitizeText() on comment before DB insert
- `apps/web/app/api/v1/auth/register/route.ts` - isPasswordBreached() check before hashPassword
- `apps/web/app/api/v1/auth/change-password/route.ts` - isPasswordBreached() check before updatePassword
- `apps/web/app/api/v1/automation/rules/route.ts` - validateWebhookUrl() when actionType === 'webhook'
- `apps/web/app/api/v1/automation/rules/[id]/route.ts` - same SSRF check in PUT handler
- `apps/web/app/api/v1/notification-templates/route.ts` - sanitizeRichText() on bodyTemplate in POST
- `apps/web/app/api/v1/notification-templates/[id]/route.ts` - sanitizeRichText() on bodyTemplate in PUT
- `apps/web/app/api/v1/settings/company/route.ts` - sanitizeRichText() on description in PUT
- `apps/web/messages/cs.json` - auth.errors.breachedPassword Czech translation
- `apps/web/messages/en.json` - auth.errors.breachedPassword English translation
- `apps/web/messages/sk.json` - auth.errors.breachedPassword Slovak translation

## Decisions Made

- Used isomorphic-dompurify (not sanitize-html) — DOMPurify is OWASP-recommended; avoids custom jsdom setup
- HIBP fail-open: network errors silently pass the check — third-party failure must not block registration
- SSRF checks only at creation/update time (not at webhook execution time) — DNS rebinding is a Phase 49/50 concern
- webhookUrlSchema Zod export added to ssrf.ts for future inline validation in Zod schemas

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- lint-staged hook backed up and restored unstaged changes during commits, resulting in all work being absorbed into a single commit (c8b81ee) alongside pre-existing encryption module work
- Working tree continued to show route files as "modified" after commit because lint-staged stash/restore cycle updated their timestamps; git diff confirmed all changes were in HEAD

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SEC-02, SEC-04, SEC-05 requirements satisfied
- sanitize.ts, hibp.ts, ssrf.ts are stable utilities — any future route can import and use them
- SSRF limitation: DNS rebinding not defended against at webhook execution time — Phase 49/50 hardening note

---

_Phase: 46-security-hardening_
_Completed: 2026-03-16_
