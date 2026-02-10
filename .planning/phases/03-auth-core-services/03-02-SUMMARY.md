---
phase: 03-auth-core-services
plan: 02
subsystem: backend-auth
tags: [jwt, password-hashing, redis, validation, security]
completed: 2026-02-10T20:55:54Z
duration: 340s

dependency_graph:
  requires:
    - phase-02-database-schema (auth tables)
  provides:
    - JWT token generation and verification
    - Refresh token rotation with race condition prevention
    - Argon2id password hashing with OWASP parameters
    - Redis token blacklist
    - Zod validation middleware
  affects:
    - 03-03-PLAN.md (login endpoint will use these utilities)
    - 03-04-PLAN.md (MFA will use JWT utilities)
    - All protected API routes (will use validateBody/validateQuery)

tech_stack:
  added:
    - ioredis: ^5.9.2 (Redis client)
    - zod: ^3.23.0 (schema validation)
    - jsonwebtoken: ^9.0.3 (JWT signing/verification)
    - argon2: ^0.44.0 (password hashing)
    - nanoid: ^5.1.6 (refresh token generation)
    - drizzle-orm: ^0.36.4 (database ORM)
  patterns:
    - Singleton pattern for Redis client
    - SELECT FOR UPDATE for token rotation (prevents race conditions)
    - SHA-256 hashing for refresh token storage
    - Redis TTL matching JWT remaining lifetime for blacklist
    - Zod safeParse with sanitized errors (no input value leakage)

key_files:
  created:
    - apps/web/lib/redis/client.ts (Redis singleton with reconnection)
    - apps/web/lib/db/client.ts (DB client re-export)
    - apps/web/lib/middleware/validate.ts (Zod validation wrappers)
    - apps/web/lib/auth/jwt.ts (JWT lifecycle management)
    - apps/web/lib/auth/password.ts (Argon2id password utilities)
  modified:
    - apps/web/package.json (added dependencies)
    - pnpm-lock.yaml (dependency resolution)

decisions:
  - decision: Use nanoid(64) for refresh tokens instead of UUID
    rationale: Higher entropy (64 chars), cryptographically random, URL-safe
    alternatives: UUID v4 (128-bit), crypto.randomBytes(32).toString('hex')
  - decision: Store SHA-256 hash of refresh tokens in DB
    rationale: One-way hash prevents token reconstruction if DB is compromised
    alternatives: Plain text (insecure), bcrypt (unnecessarily slow for tokens)
  - decision: Redis blacklist with TTL instead of DB table
    rationale: Auto-expiry reduces cleanup complexity, fast O(1) lookup
    alternatives: DB table with scheduled cleanup job
  - decision: Argon2id over bcrypt
    rationale: OWASP recommendation, resistant to GPU/ASIC attacks, modern algorithm
    alternatives: bcrypt (older, less secure), scrypt (less widely adopted)

metrics:
  duration: 340s
  tasks_completed: 2
  files_created: 5
  lines_added: 484
  commits: 1
---

# Phase 03 Plan 02: Auth Core Utilities Summary

**One-liner:** JWT token lifecycle (generate, verify, rotate, blacklist) with Argon2id password hashing, Redis blacklist, and Zod validation middleware

## What Was Built

Created core authentication utilities that provide JWT token management, password security, validation, and caching infrastructure for the backend API.

### JWT Token Management (`apps/web/lib/auth/jwt.ts`)

**Access Tokens:**
- 15-minute expiry (matching documentation section 25.1)
- Claims: `sub` (user UUID), `company_id`, `role`, `permissions[]`, `mfa_verified`
- Signed with JWT_SECRET (env var, fails in production if missing)
- Issuer: `schedulebox`, Audience: `schedulebox-api`

**Refresh Tokens:**
- 64-character random strings via `nanoid(64)`
- SHA-256 hashed before storage in `refresh_tokens` table
- 30-day expiry
- Revoked flag for one-time use enforcement

**Token Rotation:**
- Atomically revokes old token and issues new pair
- Uses `SELECT FOR UPDATE` to prevent race conditions (critical for concurrent requests)
- Fetches user permissions from `role_permissions` junction table
- Returns `{ accessToken, refreshToken, expiresIn }`

**Token Blacklist:**
- Redis-based with `blacklist:{token}` key pattern
- TTL = JWT remaining lifetime (exp - now)
- Auto-expires when token would have expired anyway
- O(1) lookup on every verification

**Functions:**
- `generateTokenPair(userId, userUuid, companyId, roleId, roleName, mfaVerified)` → token pair
- `verifyJWT(token)` → JWTPayload (throws UnauthorizedError if invalid/revoked)
- `rotateRefreshToken(refreshToken)` → new token pair
- `blacklistToken(token)` → void (idempotent)

### Password Security (`apps/web/lib/auth/password.ts`)

**Argon2id Parameters (OWASP-compliant, Doc section 24.1):**
- Memory cost: 65536 KiB (64 MB)
- Time cost: 3 iterations
- Parallelism: 4 threads
- Algorithm: Argon2id (hybrid mode, resistant to side-channel and GPU attacks)

**Password History:**
- Last 5 passwords tracked in `password_history` table
- Prevents password reuse (compliance requirement)
- Historical hashes are also Argon2id for consistent verification

**Functions:**
- `hashPassword(password)` → Argon2id hash
- `verifyPassword(hash, password)` → boolean (safe mode: returns false on error)
- `checkPasswordHistory(userId, newPassword)` → boolean (true = safe to use)
- `updatePassword(userId, newPassword)` → void (atomic: updates user + adds to history + cleans old entries)

### Redis Client (`apps/web/lib/redis/client.ts`)

**Features:**
- Singleton instance connecting to `REDIS_URL` env var (defaults to `redis://localhost:6379`)
- Reconnection strategy: exponential backoff (max 3s)
- Handles READONLY errors (Redis failover scenarios)
- Max retries per request: 3
- Graceful shutdown: `process.on('beforeExit')` cleanup
- Development logging for connection events

### DB Client Re-export (`apps/web/lib/db/client.ts`)

**Purpose:**
- Single import point for web app: `import { db } from '../lib/db/client.js'`
- Re-exports `db` and `Database` type from `@schedulebox/database`
- Prevents direct package imports throughout codebase (cleaner abstraction)

### Zod Validation Middleware (`apps/web/lib/middleware/validate.ts`)

**Security Feature: Sanitized Errors**
- Zod errors are sanitized to NEVER include user input values
- Only `path` and `message` are returned
- Prevents accidental exposure of PII/secrets in error logs/responses

**Functions:**
- `validateBody<T>(schema, req)` → T (parses req.json(), throws ValidationError)
- `validateQuery<T>(schema, req)` → T (parses URL searchParams)
- `validateParams<T>(schema, params)` → T (parses route params)

**Error Format:**
```typescript
{
  code: 'VALIDATION_ERROR',
  message: 'Request body validation failed',
  statusCode: 400,
  details: {
    errors: [
      { path: 'email', message: 'Invalid email format' },
      { path: 'password', message: 'String must contain at least 8 character(s)' }
    ]
  }
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing drizzle-orm dependency in web app**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** `drizzle-orm` was in `@schedulebox/database` but not in `apps/web`, causing import errors
- **Fix:** Added `drizzle-orm: ^0.36.4` to `apps/web/package.json`
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`
- **Commit:** bd53c91

**2. [Rule 1 - Bug] Fixed incorrect database schema import path**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Imported from `@schedulebox/database/schema` (invalid subpath) instead of `@schedulebox/database`
- **Fix:** Changed imports in jwt.ts and password.ts to use main package export
- **Files modified:** `apps/web/lib/auth/jwt.ts`, `apps/web/lib/auth/password.ts`
- **Commit:** bd53c91

**3. [Rule 2 - Missing Critical Functionality] Added error handling for shared package exports**
- **Found during:** Task 1 (implementing validate.ts)
- **Issue:** Plan mentioned "error classes from Plan 03-01 may not be available yet (parallel execution)"
- **Fix:** Verified `@schedulebox/shared` exports error classes, used them directly (no deviation needed)
- **Files modified:** None (verification only)
- **Commit:** N/A

**4. [Rule 1 - Bug] Fixed argon2 TypeScript type for argon2id constant**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** TypeScript didn't recognize `argon2.argon2id` as a valid exported type
- **Fix:** Changed type annotation from `argon2.argon2id` to `number` (runtime value is correct, types are incorrect)
- **Files modified:** `apps/web/lib/auth/password.ts`
- **Commit:** bd53c91

**5. [Rule 1 - Bug] Fixed nullable mfaEnabled field in token rotation**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** `users.mfaEnabled` is `boolean | null`, but `generateTokenPair` expects `boolean`
- **Fix:** Added nullish coalescing: `user.mfaEnabled ?? false`
- **Files modified:** `apps/web/lib/auth/jwt.ts`
- **Commit:** bd53c91

**6. [Rule 1 - Bug] Removed unused import causing linting error**
- **Found during:** Commit (pre-commit hook)
- **Issue:** Imported `and` from drizzle-orm but never used it
- **Fix:** Removed `and` from imports in jwt.ts
- **Files modified:** `apps/web/lib/auth/jwt.ts`
- **Commit:** bd53c91

**7. [Rule 1 - Bug] Removed unused error variable in catch block**
- **Found during:** Commit (pre-commit hook)
- **Issue:** `catch (error)` declared variable that was never used
- **Fix:** Changed to `catch { }` (no variable binding)
- **Files modified:** `apps/web/lib/auth/password.ts`
- **Commit:** bd53c91

**8. [Rule 1 - Bug] Fixed password history cleanup to use inArray operator**
- **Found during:** Task 2 (implementation review)
- **Issue:** Original plan used simplified single-ID delete, but should delete multiple IDs
- **Fix:** Used `inArray(passwordHistory.id, idsToDelete)` for proper batch deletion
- **Files modified:** `apps/web/lib/auth/password.ts`
- **Commit:** bd53c91

## Verification

✅ **TypeScript compilation:** `pnpm tsc --noEmit` passes in `apps/web`
✅ **All 5 files created** with specified exports
✅ **JWT access token expiry:** 15 minutes (ACCESS_TOKEN_EXPIRY = '15m')
✅ **Refresh token rotation:** Uses `SELECT FOR UPDATE` (line 178 in jwt.ts)
✅ **Redis blacklist TTL:** Matches JWT remaining lifetime (`exp - now`)
✅ **Argon2id parameters:** memory=65536, timeCost=3, parallelism=4
✅ **Password history limit:** 5 passwords (PASSWORD_HISTORY_LIMIT = 5)
✅ **Zod error sanitization:** `sanitizeZodErrors` maps only path and message, never input values
✅ **All dependencies installed:** ioredis, zod, jsonwebtoken, argon2, nanoid, drizzle-orm

## Security Highlights

1. **No plaintext secrets:** Refresh tokens hashed with SHA-256, passwords with Argon2id
2. **Race condition prevention:** SELECT FOR UPDATE ensures atomic token rotation
3. **Auto-expiring blacklist:** Redis TTL prevents token resurrection after expiry
4. **Timing attack resistance:** `verifyPassword` returns false on error (constant-time comparison)
5. **Input sanitization:** Zod errors never leak user input values
6. **Environment validation:** JWT_SECRET enforced in production, dev fallback for local testing
7. **OWASP compliance:** Argon2id parameters match OWASP recommendations (Doc section 24.1)

## Next Steps

These utilities are consumed by:
- **Plan 03-03:** Login endpoint (`/api/v1/auth/login`) will call `generateTokenPair`
- **Plan 03-04:** MFA verification will update JWT with `mfa_verified: true`
- **Plan 03-05:** Logout endpoint will call `blacklistToken`
- **All API routes:** Will use `validateBody/validateQuery` for request validation
- **Password change endpoint:** Will use `checkPasswordHistory` and `updatePassword`

## Self-Check: PASSED

### Created Files
✅ FOUND: apps/web/lib/redis/client.ts (961 bytes)
✅ FOUND: apps/web/lib/db/client.ts (165 bytes)
✅ FOUND: apps/web/lib/middleware/validate.ts (2149 bytes)
✅ FOUND: apps/web/lib/auth/jwt.ts (6924 bytes)
✅ FOUND: apps/web/lib/auth/password.ts (3533 bytes)

### Commits
✅ FOUND: bd53c91 (feat(backend): add JWT, password hashing, Redis, and validation middleware)

### Dependencies
✅ FOUND: ioredis ^5.9.2 in apps/web/package.json
✅ FOUND: zod ^3.23.0 in apps/web/package.json
✅ FOUND: jsonwebtoken ^9.0.3 in apps/web/package.json
✅ FOUND: argon2 ^0.44.0 in apps/web/package.json
✅ FOUND: nanoid ^5.1.6 in apps/web/package.json
✅ FOUND: drizzle-orm ^0.36.4 in apps/web/package.json
✅ FOUND: @types/jsonwebtoken ^9.0.10 in apps/web/devDependencies

All claims verified. Plan 03-02 executed successfully.
