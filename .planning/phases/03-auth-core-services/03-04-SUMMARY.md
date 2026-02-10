---
phase: 03-auth-core-services
plan: 04
subsystem: api
tags: [auth, jwt, otplib, argon2, redis, password-reset, email-verification]

# Dependency graph
requires:
  - phase: 03-01
    provides: Error classes, response utilities, handleRouteError
  - phase: 03-02
    provides: JWT generation/verification, password hashing, token rotation
  - phase: 03-03
    provides: createRouteHandler, authenticateRequest, validation schemas
provides:
  - 9 complete auth API endpoints (register, login, refresh, logout, password management, profile)
  - Company + user creation flow in transaction
  - MFA login challenge flow using otplib
  - Password reset flow with Redis-backed tokens
  - Email verification flow
  - Profile GET/PUT endpoints
affects: [03-05-mfa, 03-06-oauth, frontend-auth, customer-portal]

# Tech tracking
tech-stack:
  added: [otplib@13.2.1]
  patterns:
    - Public endpoints use manual handleRouteError (no createRouteHandler auth)
    - Protected endpoints use createRouteHandler with requiresAuth
    - Company slug generation with nanoid suffix
    - Password reset tokens stored as SHA-256 hashes in Redis
    - Never expose SERIAL IDs (return UUIDs in responses)

key-files:
  created:
    - apps/web/app/api/v1/auth/register/route.ts
    - apps/web/app/api/v1/auth/login/route.ts
    - apps/web/app/api/v1/auth/refresh/route.ts
    - apps/web/app/api/v1/auth/logout/route.ts
    - apps/web/app/api/v1/auth/forgot-password/route.ts
    - apps/web/app/api/v1/auth/reset-password/route.ts
    - apps/web/app/api/v1/auth/verify-email/route.ts
    - apps/web/app/api/v1/auth/change-password/route.ts
    - apps/web/app/api/v1/auth/me/route.ts
  modified: []

key-decisions:
  - 'Used otplib v13 verify() function (v13 removed authenticator package)'
  - 'Register endpoint creates both company and user in single transaction'
  - 'Forgot password never reveals email existence (security best practice)'
  - 'Reset password disables MFA and revokes all sessions (per research pitfall #3)'
  - 'Login returns company UUID not internal ID in user object'
  - 'MFA verification inline with otplib until lib/auth/mfa.ts created in plan 03-05'

patterns-established:
  - 'Public auth endpoints (register, login, refresh, forgot/reset password, verify email) use manual error handling'
  - 'Protected auth endpoints (logout, change password, profile) use createRouteHandler with requiresAuth'
  - 'Password reset and email verification tokens stored as SHA-256 hashes in Redis with TTL'
  - 'All password operations check password_history to prevent reuse'
  - 'Token-based flows (reset, verify) are one-time use (delete from Redis after validation)'

# Metrics
duration: 7min
completed: 2026-02-10
---

# Phase 03 Plan 04: Auth API Endpoints Summary

**Complete auth lifecycle with register, login (MFA challenge), token refresh, logout, password reset, email verification, and profile management**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-10T20:08:06Z
- **Completed:** 2026-02-10T20:14:57Z
- **Tasks:** 2
- **Files created:** 9

## Accomplishments

- POST /api/v1/auth/register creates company + user in transaction with JWT pair response
- POST /api/v1/auth/login with MFA challenge flow (returns mfa_required or tokens)
- POST /api/v1/auth/refresh rotates tokens from body or httpOnly cookie
- POST /api/v1/auth/logout blacklists access token, revokes refresh tokens, clears cookie
- POST /api/v1/auth/forgot-password generates reset token (logs to console in dev, email service pending)
- POST /api/v1/auth/reset-password validates token, checks password history, disables MFA, revokes sessions
- POST /api/v1/auth/verify-email marks user as emailVerified=true
- POST /api/v1/auth/change-password verifies current password, checks history, revokes sessions
- GET/PUT /api/v1/auth/me returns/updates user profile with company UUID

## Task Commits

Each task was committed atomically:

1. **Task 1: Register, login, and refresh endpoints** - `634cde9` (feat)
   - POST /api/v1/auth/register with company creation
   - POST /api/v1/auth/login with MFA challenge flow
   - POST /api/v1/auth/refresh with token rotation
   - Install otplib@13.2.1

2. **Task 2: Logout, password management, email verification, and profile** - `2f5050c` (feat)
   - POST /api/v1/auth/logout
   - POST /api/v1/auth/forgot-password
   - POST /api/v1/auth/reset-password
   - POST /api/v1/auth/verify-email
   - POST /api/v1/auth/change-password
   - GET/PUT /api/v1/auth/me

## Files Created

- `apps/web/app/api/v1/auth/register/route.ts` - Registration with company creation in transaction
- `apps/web/app/api/v1/auth/login/route.ts` - Login with MFA challenge flow using otplib verify()
- `apps/web/app/api/v1/auth/refresh/route.ts` - Token refresh from body or cookie
- `apps/web/app/api/v1/auth/logout/route.ts` - Logout with token blacklist and session revocation
- `apps/web/app/api/v1/auth/forgot-password/route.ts` - Password reset request (never reveals email existence)
- `apps/web/app/api/v1/auth/reset-password/route.ts` - Password reset with history check, MFA disable
- `apps/web/app/api/v1/auth/verify-email/route.ts` - Email verification with one-time token
- `apps/web/app/api/v1/auth/change-password/route.ts` - Password change with current password verification
- `apps/web/app/api/v1/auth/me/route.ts` - User profile GET/PUT with company UUID

## Decisions Made

- **otplib v13 API:** Used `verify()` function directly instead of removed `authenticator` package (breaking change in v13)
- **Inline MFA verification:** Used otplib directly in login endpoint; lib/auth/mfa.ts will be created in plan 03-05 for reusability
- **Company slug generation:** Lowercase name + replace non-alphanumeric with hyphens + nanoid(4) suffix for uniqueness
- **Password reset security:** Disables MFA after password reset (research pitfall #3 mitigation)
- **Email enumeration prevention:** Forgot password always returns success message regardless of email existence
- **Token storage:** Password reset and email verification tokens stored as SHA-256 hashes in Redis (not plaintext)
- **One-time tokens:** Reset and verify tokens deleted from Redis after successful use

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all endpoints implemented and compiled successfully on first type check.

## User Setup Required

None - no external service configuration required. Email sending will be added in future notification service plan.

## Next Phase Readiness

- Complete auth API surface implemented
- Ready for frontend integration (login forms, password reset flows)
- Ready for MFA setup/verify endpoints (plan 03-05)
- Ready for OAuth provider integration (plan 03-06)

## Self-Check: PASSED

All 9 route files verified:
- ✓ apps/web/app/api/v1/auth/register/route.ts
- ✓ apps/web/app/api/v1/auth/login/route.ts
- ✓ apps/web/app/api/v1/auth/refresh/route.ts
- ✓ apps/web/app/api/v1/auth/logout/route.ts
- ✓ apps/web/app/api/v1/auth/forgot-password/route.ts
- ✓ apps/web/app/api/v1/auth/reset-password/route.ts
- ✓ apps/web/app/api/v1/auth/verify-email/route.ts
- ✓ apps/web/app/api/v1/auth/change-password/route.ts
- ✓ apps/web/app/api/v1/auth/me/route.ts

All commits verified:
- ✓ 634cde9 (Task 1: register, login, refresh)
- ✓ 2f5050c (Task 2: logout, password mgmt, profile)

---

_Phase: 03-auth-core-services_
_Completed: 2026-02-10_
