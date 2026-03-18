---
phase: 47-notifications-super-admin
plan: 03
subsystem: admin
tags: [impersonation, jwt, audit-log, suspend, super-admin, react, nextjs]

# Dependency graph
requires:
  - phase: 47-notifications-super-admin-01
    provides: platform schema (impersonationSessions, platformAuditLogs tables), writeAuditLog helper

provides:
  - Admin impersonation flow: POST/DELETE /api/v1/admin/impersonate with JWT + HttpOnly cookie + sessionStorage display
  - Company suspend/unsuspend: POST /api/v1/admin/companies/suspend with mandatory reason + audit log
  - Suspended company login guard: login route returns 403 COMPANY_SUSPENDED before token generation
  - Audit log API: GET /api/v1/admin/audit-log with pagination + filters
  - Impersonation banner component: red fixed banner with countdown, end session, sessionStorage state
  - Admin audit log UI page: paginated table with action type filter, expandable before/after JSON diffs
  - Admin users page: Impersonate button for non-admin users (red-outlined, UserCog icon)

affects: [47-notifications-super-admin, admin-ui, auth-flow, login-route]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - sessionStorage for impersonation display state (HttpOnly cookie not JS-readable)
    - 15-min hard timeout via JWT expiry + DB revokedAt check (double enforcement)
    - All impersonation actions must write audit log before returning response (no silent success)

key-files:
  created:
    - apps/web/lib/admin/impersonation.ts
    - apps/web/app/api/v1/admin/impersonate/route.ts
    - apps/web/app/api/v1/admin/companies/suspend/route.ts
    - apps/web/app/api/v1/admin/audit-log/route.ts
    - apps/web/components/admin/impersonation-banner.tsx
    - apps/web/app/[locale]/(admin)/admin/audit-log/page.tsx
  modified:
    - apps/web/app/api/v1/auth/login/route.ts
    - apps/web/app/[locale]/(admin)/admin/users/page.tsx
    - apps/web/app/providers.tsx
    - apps/web/messages/en.json
    - apps/web/messages/cs.json
    - apps/web/messages/sk.json

key-decisions:
  - 'sessionStorage for impersonation banner display: HttpOnly imp_token cookie not readable by JS;
    sessionStorage stores {name, email, role, expiresAt} from POST response for banner rendering'
  - 'Suspend requires reason field: empty reason throws 403 ForbiddenError before any DB update'
  - 'Login route returns 403 with structured {code, message} for suspended companies — frontend
    can detect COMPANY_SUSPENDED code and show appropriate UI'

patterns-established:
  - 'Admin routes: always check user.role === admin at handler start, throw ForbiddenError if not'
  - 'Audit log writes are mandatory and not wrapped in try/catch — failures abort the request'

requirements-completed: [ADMIN-01, ADMIN-03, ADMIN-07]

# Metrics
duration: 14min
completed: 2026-03-18
---

# Phase 47 Plan 03: Admin Impersonation, Suspend/Unsuspend, Audit Log Summary

**Admin impersonation with 15-min JWT + DB session tracking, red banner with countdown,
company suspend/unsuspend API with audit trail, and paginated audit log viewer.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-03-18T15:36:12Z
- **Completed:** 2026-03-18T15:50:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Impersonation library (generateImpersonationToken, verifyImpersonationToken, endImpersonationSession)
  with DB session tracking and double expiry enforcement (JWT + revokedAt)
- POST/DELETE impersonate API: starts/ends sessions, sets HttpOnly imp_token cookie, writes audit log
- Company suspend API: requires non-empty reason, writes before/after audit, login returns 403 COMPANY_SUSPENDED
- Audit log API with pagination, action type filter, date range filter, admin name join
- Red ImpersonationBanner with countdown timer, auto-redirect on expiry, sessionStorage state management
- Admin users page: Impersonate button for non-admin users (skipped for admin role)
- Admin audit log UI: paginated table with expandable before/after JSON diffs
- Translation keys for impersonation and auditLog sections in en/cs/sk

## Task Commits

1. **Task 1: Impersonation library, API routes, suspend, login guard** - `bc29df1` (feat)
2. **Task 2: Banner, audit log UI, users page impersonate button** - `bc29df1` (feat)
3. **Translation keys (impersonation + auditLog)** - `d614f31` (feat)

Note: bc29df1 committed both Task 1 and Task 2 files together due to git stash restoration
behavior during lint-staged failures; d614f31 added remaining translation keys.

## Files Created/Modified

- `apps/web/lib/admin/impersonation.ts` - JWT generation, session DB tracking, revocation
- `apps/web/app/api/v1/admin/impersonate/route.ts` - POST start / DELETE end impersonation
- `apps/web/app/api/v1/admin/companies/suspend/route.ts` - POST suspend/unsuspend company
- `apps/web/app/api/v1/admin/audit-log/route.ts` - GET paginated audit log with filters
- `apps/web/components/admin/impersonation-banner.tsx` - Red fixed banner + helper exports
- `apps/web/app/[locale]/(admin)/admin/audit-log/page.tsx` - Audit log UI page
- `apps/web/app/api/v1/auth/login/route.ts` - Added suspension check step 6.5
- `apps/web/app/[locale]/(admin)/admin/users/page.tsx` - Added Impersonate button
- `apps/web/app/providers.tsx` - Added ImpersonationBanner render
- `apps/web/messages/{en,cs,sk}.json` - impersonation and auditLog translation keys

## Decisions Made

- sessionStorage for impersonation banner display: HttpOnly imp_token is not JS-readable,
  so POST response body carries {name, email, role, expiresAt} stored in sessionStorage
- Suspend requires reason: throwing 403 ForbiddenError prevents empty suspensions
- Login 403 uses structured code field so frontend can detect COMPANY_SUSPENDED specifically

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Git lint-staged stash mechanism repeatedly restored old file versions during commit attempts,
  causing ESLint failures on unused NextResponse import. Resolved by dropping all lint-staged
  stashes and re-committing with corrected files.

## Next Phase Readiness

- Impersonation flow fully functional; red banner renders on all pages when imp session active
- All impersonation actions audit-logged for forensic accountability
- Audit log UI ready for admin use
- Company suspend/unsuspend admin workflow operational

---

_Phase: 47-notifications-super-admin_
_Completed: 2026-03-18_
