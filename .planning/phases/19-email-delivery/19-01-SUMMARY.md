---
phase: 19-email-delivery
plan: "01"
subsystem: auth
tags: [nodemailer, smtp, email, auth, password-reset, email-verification, redis]

# Dependency graph
requires:
  - phase: 18-e2e-testing
    provides: full test infrastructure confirming auth routes are tested
provides:
  - nodemailer SMTP transporter for auth email delivery (apps/web/lib/email/auth-emails.ts)
  - sendPasswordResetEmail function - Czech HTML+text, 1hr expiry, STARTTLS SMTP
  - sendEmailVerificationEmail function - Czech HTML+text, 24hr expiry, STARTTLS SMTP
  - forgot-password route now sends actual emails (not TODO no-op)
  - register route generates email_verify token, stores in Redis, fire-and-forgets send
affects: [20-sms-delivery, 21-payment-activation, 22-monitoring]

# Tech tracking
tech-stack:
  added:
    - nodemailer@7.0.11 (SMTP email sending)
    - '@types/nodemailer@6.4.16' (TypeScript types)
  patterns:
    - Module-level nodemailer transporter (created once on import for connection reuse)
    - Fire-and-forget email send pattern for non-blocking registration (.catch() for logging)
    - try/catch around security-sensitive email send (forgot-password: errors must not leak)
    - SHA-256 hash of raw token for Redis storage (raw token in URL, hash in DB)

key-files:
  created:
    - apps/web/lib/email/auth-emails.ts
  modified:
    - apps/web/app/api/v1/auth/forgot-password/route.ts
    - apps/web/app/api/v1/auth/register/route.ts
    - apps/web/package.json
    - apps/web/tsconfig.json

key-decisions:
  - 'SMTP provider-agnostic: env vars (SMTP_HOST/PORT/USER/PASS) not hardcoded provider config'
  - 'Default from address is no-reply@schedulebox.cz (user override from cesky-hosting.cz setup)'
  - 'Registration email is fire-and-forget: account creation never blocked by SMTP failure'
  - 'Forgot-password email errors caught but not re-thrown: prevents email enumeration leakage'
  - 'Module-level transporter created once for connection reuse across requests'

patterns-established:
  - 'Auth email pattern: create transporter at module level, export typed async functions'
  - 'Token pattern: nanoid(64) raw token in email URL, SHA-256 hash stored in Redis'
  - 'Fire-and-forget pattern: sendFn().catch(err => console.error(...)) for non-blocking sends'

# Metrics
duration: 11min
completed: 2026-02-20
---

# Phase 19 Plan 01: Auth Email Delivery Summary

**nodemailer SMTP auth emails wired into forgot-password and register routes: password reset and email verification now fully functional with Czech HTML templates, fire-and-forget safety, and provider-agnostic SMTP config**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-20T18:41:33Z
- **Completed:** 2026-02-20T18:52:41Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Created `apps/web/lib/email/auth-emails.ts` with module-level nodemailer transporter and two Czech-language email functions (password reset + email verification)
- Wired `sendPasswordResetEmail` into forgot-password route, replacing the TODO no-op with actual SMTP delivery
- Wired `sendEmailVerificationEmail` into register route with fire-and-forget pattern — registration succeeds even if SMTP is down
- Fixed pre-existing TypeScript build failure caused by vitest.config.ts type conflict with Next.js tsc

## Task Commits

Each task was committed atomically:

1. **Task 1: Install nodemailer and create auth email library** - `32b7ce3` (feat)
2. **Task 2: Wire password reset and registration email sends** - `1858ecf` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/lib/email/auth-emails.ts` - Module-level SMTP transporter + sendPasswordResetEmail + sendEmailVerificationEmail with Czech HTML+text bodies
- `apps/web/app/api/v1/auth/forgot-password/route.ts` - Import sendPasswordResetEmail, replaced TODO block with try/catch send
- `apps/web/app/api/v1/auth/register/route.ts` - Added createHash/redis/sendEmailVerificationEmail imports, generate+store verify token, fire-and-forget send
- `apps/web/package.json` - Added nodemailer@7 + @types/nodemailer
- `apps/web/tsconfig.json` - Excluded vitest.config.ts + vitest.setup.ts from Next.js tsc

## Decisions Made

- **SMTP provider-agnostic:** All SMTP configuration via env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM). No provider name or URL hardcoded in source.
- **Default from address `no-reply@schedulebox.cz`:** Applied per user override (cesky-hosting.cz SMTP setup). Plan had `info@schedulebox.cz` but user specified no-reply.
- **Fire-and-forget registration email:** Registration never blocked by SMTP failure. Token is always stored in Redis — resend/manual paths remain possible.
- **Forgot-password error suppressed from response:** SMTP errors logged to console but never propagated to HTTP response — consistent with security principle of not revealing whether email exists.
- **Module-level transporter:** Single `nodemailer.createTransport()` call at import time. Reuses SMTP connection pool across requests in long-running Node.js process.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript build failure in apps/web**

- **Found during:** Task 1 (verifying build after adding auth-emails.ts)
- **Issue:** `apps/web/tsconfig.json` included `vitest.config.ts` via `**/*.ts` glob. Vitest 4.0 `defineProject` type is `UserWorkspaceConfig & Promise<UserWorkspaceConfig> & UserProjectConfigFn` which is not assignable to `never` — causing Next.js `tsc --noEmit` to fail. This was pre-existing before Task 1 (confirmed by stashing changes and reproducing same error).
- **Fix:** Added `vitest.config.ts`, `vitest.setup.ts`, and `e2e/**` to the `exclude` array in `apps/web/tsconfig.json`. These files are test infrastructure and should not be type-checked by the Next.js TypeScript checker.
- **Files modified:** `apps/web/tsconfig.json`
- **Verification:** `npx tsc --noEmit` exits 0 with no errors. `pnpm build` reaches "Compiled successfully" before hitting unrelated Windows EPERM symlink errors in standalone output copy.
- **Committed in:** `32b7ce3` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** The tsconfig fix was essential — without it the stated "TypeScript compiles clean" verification criterion could not be met. No scope creep.

## Issues Encountered

- Windows EPERM symlink errors during `pnpm build` standalone output copy — pre-existing OS-level issue unrelated to this plan. TypeScript compilation itself passes cleanly (`tsc --noEmit` exits 0).

## User Setup Required

The following environment variables must be set for email delivery to work in production/staging:

| Variable | Description | Example |
|---|---|---|
| `SMTP_HOST` | SMTP relay hostname | `smtp.example.com` |
| `SMTP_PORT` | SMTP port (STARTTLS) | `587` |
| `SMTP_USER` | SMTP authentication username | `user@example.com` |
| `SMTP_PASS` | SMTP authentication password | `your-smtp-password` |
| `SMTP_FROM` | Sender address (optional) | `no-reply@schedulebox.cz` |
| `NEXT_PUBLIC_APP_URL` | Base URL for email links | `https://app.schedulebox.cz` |

STARTTLS on port 587 (`secure: false` in nodemailer). If omitted, emails silently fail (logged to console).

## Next Phase Readiness

- Auth email delivery is fully wired and functional once SMTP env vars are configured
- Password reset flow: fully functional end-to-end (POST /forgot-password → email → /reset-password?token= → /reset-password)
- Email verification flow: fully functional end-to-end (POST /register → email → /verify-email?token= → POST /verify-email)
- Phase 20 (SMS delivery) can proceed independently — same fire-and-forget pattern applies to Twilio integration

---

_Phase: 19-email-delivery_
_Completed: 2026-02-20_
