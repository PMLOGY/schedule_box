---
phase: 03-auth-core-services
plan: '05'
subsystem: backend
tags: [mfa, oauth2, api-keys, authentication, security]
dependency_graph:
  requires: [03-01, 03-02, 03-03]
  provides: [mfa-utilities, mfa-endpoints, oauth-scaffolds, api-key-management]
  affects: [auth-flow, integrations]
tech_stack:
  added: [otplib@13.2.1, qrcode@1.5.4]
  patterns: [totp, sha256-hashing, soft-delete]
key_files:
  created:
    - apps/web/lib/auth/mfa.ts
    - apps/web/app/api/v1/auth/mfa/setup/route.ts
    - apps/web/app/api/v1/auth/mfa/verify/route.ts
    - apps/web/app/api/v1/auth/oauth/[provider]/route.ts
    - apps/web/app/api/v1/auth/oauth/[provider]/callback/route.ts
    - apps/web/app/api/v1/settings/api-keys/route.ts
    - apps/web/app/api/v1/settings/api-keys/[id]/route.ts
  modified:
    - apps/web/app/api/v1/auth/login/route.ts
    - packages/shared/src/errors/app-error.ts
    - packages/shared/src/errors/index.ts
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - decision: Use otplib functional API (generateSecret, generateURI, verifySync) instead of class-based authenticator
    rationale: v13 otplib has simpler functional API, better TypeScript support
    outcome: Clean TOTP implementation with minimal boilerplate
  - decision: OAuth2 endpoints return 501 Not Implemented
    rationale: Full OAuth2 with PKCE deferred to integration phase, scaffold now for API consistency
    outcome: API structure ready, implementation pending
  - decision: API keys use SHA-256 hash storage, return full key only once
    rationale: Security best practice, key cannot be retrieved after creation
    outcome: Secure API key management with proper key lifecycle
  - decision: API key deletion is soft delete (isActive=false)
    rationale: Audit trail preservation, prevents accidental key loss
    outcome: Revoked keys remain in DB for auditing
metrics:
  duration: 426s
  completed_date: 2026-02-10T20:15:32Z
  tasks_completed: 2
  commits: 1
  files_modified: 12
---

# Phase 03 Plan 05: MFA, OAuth2 Scaffolds, and API Key Management Summary

**One-liner:** TOTP MFA with QR codes and backup codes, OAuth2 scaffolds for future integration, and secure API key management with SHA-256 hashing

## What Was Built

### MFA (Multi-Factor Authentication)
- **lib/auth/mfa.ts**: TOTP utilities using otplib functional API
  - `setupMFA()`: Generates TOTP secret, QR code data URL, 10 backup codes (nanoid)
  - `verifyMFACode()`: Validates 6-digit TOTP code against secret
  - `enableMFA()`: Enables MFA on user account after code verification
- **POST /api/v1/auth/mfa/setup**: Returns secret, QR code, backup codes (requires auth)
- **POST /api/v1/auth/mfa/verify**: Validates code and sets mfaEnabled=true (requires auth)
- **Updated login route**: Now uses verifyMFACode helper from mfa.ts

### OAuth2 Scaffolds
- **GET /api/v1/auth/oauth/{provider}**: OAuth login initiation (501 Not Implemented)
- **GET /api/v1/auth/oauth/{provider}/callback**: OAuth callback handler (501 Not Implemented)
- Validates provider: google, facebook, apple
- TODOs document full PKCE flow for future implementation

### API Key Management
- **GET /api/v1/settings/api-keys**: List active API keys with metadata
  - Returns: id, name, key_prefix, scopes, timestamps
  - NEVER returns keyHash or full key
- **POST /api/v1/settings/api-keys**: Create new API key
  - Format: `sb_live_{nanoid(32)}`
  - Stores SHA-256 hash in DB
  - Returns full key ONLY ONCE on creation
- **DELETE /api/v1/settings/api-keys/{id}**: Revoke API key (soft delete)
  - Sets isActive=false
  - Tenant-scoped by company_id
- All endpoints require auth + `settings.manage` permission

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added NotImplementedError class**
- **Found during:** Task 2 - OAuth scaffolds
- **Issue:** OAuth endpoints need 501 Not Implemented response, but NotImplementedError didn't exist in @schedulebox/shared
- **Fix:** Added NotImplementedError class extending AppError with statusCode 501
- **Files modified:** packages/shared/src/errors/app-error.ts, packages/shared/src/errors/index.ts
- **Commit:** Included in main commit

**2. [Rule 1 - Bug] Fixed otplib import for v13 API**
- **Found during:** Task 1 - MFA utilities
- **Issue:** otplib v13 removed authenticator export, now uses functional API (generateSecret, generateURI, verifySync)
- **Fix:** Switched from `authenticator` class to functional exports
- **Files modified:** apps/web/lib/auth/mfa.ts
- **Commit:** Included in main commit

**3. [Rule 1 - Bug] Removed paramsSchema from DELETE route**
- **Found during:** Task 2 - API key delete
- **Issue:** createRouteHandler paramsSchema type mismatch with Zod transform
- **Fix:** Manually parse ID from URL path instead of using paramsSchema
- **Files modified:** apps/web/app/api/v1/settings/api-keys/[id]/route.ts
- **Commit:** Included in main commit

## Implementation Notes

### MFA Flow
1. User calls POST /api/v1/auth/mfa/setup → receives secret, QR code, backup codes
2. User scans QR with authenticator app (Google Authenticator, Authy, etc.)
3. User calls POST /api/v1/auth/mfa/verify with 6-digit code
4. If valid, mfaEnabled=true on user account
5. Future logins require mfa_code parameter (handled in login route)

### API Key Security
- Keys generated with `sb_live_` prefix for live environment
- SHA-256 hash stored in DB, never retrievable
- Key shown only once on creation - user must save it
- Soft delete preserves audit trail
- Tenant isolation enforced via company_id

### OAuth2 Future Implementation
TODO markers document full PKCE flow:
1. Generate PKCE code verifier and challenge
2. Store verifier in Redis with short TTL
3. Build authorization URL with state parameter
4. Redirect to provider OAuth endpoint
5. Callback validates state, exchanges code for token
6. Fetch user profile, create/link account
7. Generate JWT tokens, redirect to app

## Verification

✅ `pnpm tsc --noEmit` passes without errors
✅ MFA setup returns TOTP secret, QR code data URL, 10 backup codes
✅ MFA verify enables MFA after successful code validation
✅ OAuth endpoints return 501 Not Implemented
✅ API key creation returns full key once, stores SHA-256 hash
✅ API key listing never exposes key hash
✅ API key deletion is tenant-scoped and soft delete
✅ All endpoints follow createRouteHandler pattern

## Self-Check: PASSED

**Created files exist:**
```
FOUND: apps/web/lib/auth/mfa.ts
FOUND: apps/web/app/api/v1/auth/mfa/setup/route.ts
FOUND: apps/web/app/api/v1/auth/mfa/verify/route.ts
FOUND: apps/web/app/api/v1/auth/oauth/[provider]/route.ts
FOUND: apps/web/app/api/v1/auth/oauth/[provider]/callback/route.ts
FOUND: apps/web/app/api/v1/settings/api-keys/route.ts
FOUND: apps/web/app/api/v1/settings/api-keys/[id]/route.ts
```

**Commits exist:**
```
FOUND: 4ea2888 (feat(backend): add MFA utilities and setup/verify endpoints)
```

Note: OAuth and API key endpoints were committed in parallel plan 03-08 execution (commit 2f5050c), which is expected behavior in multi-agent development. MFA implementation was committed separately as planned.

## Next Steps

1. **Phase 3 Wave 4**: Continue with remaining auth endpoints (if any)
2. **Integration Phase**: Implement full OAuth2 PKCE flow for Google/Facebook/Apple
3. **API Key Auth**: Add middleware to authenticate API key requests (validate keyHash)
4. **MFA Backup Codes**: Implement backup code verification in login flow
5. **Rate Limiting**: Add rate limiting to MFA verify to prevent brute force

---

**Phase 03 Plan 05 Complete** ✅
