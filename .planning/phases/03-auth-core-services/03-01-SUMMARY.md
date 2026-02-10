---
phase: 03-auth-core-services
plan: 01
subsystem: shared-backend
tags: [error-handling, api-responses, types, utilities]
dependencies:
  requires: []
  provides: [error-classes, api-response-utilities, jwt-types, pagination-types]
  affects: [all-api-routes]
tech-stack:
  added: []
  patterns: [standard-error-response, standard-success-response]
key-files:
  created:
    - packages/shared/src/errors/app-error.ts
    - packages/shared/src/errors/index.ts
    - packages/shared/src/types/api.ts
    - apps/web/lib/utils/response.ts
    - apps/web/lib/utils/errors.ts
  modified:
    - packages/shared/src/types/index.ts
    - packages/shared/src/index.ts
decisions: []
metrics:
  duration_seconds: 175
  completed_at: 2026-02-10T20:53:01Z
  tasks: 2
  commits: 2
---

# Phase 03 Plan 01: Error Handling & API Response Foundation Summary

**One-liner:** AppError base class with 7 error subclasses, ERROR_CODES constants, and standardized API response utilities (successResponse, errorResponse, paginatedResponse, handleRouteError) with security-first validation error handling

## What Was Built

### Error Classes (`packages/shared/src/errors/`)

**AppError Base Class:**
- Extends Error with: code (string), statusCode (number), message (string), details (optional unknown)
- Proper prototype chain for TypeScript extending built-ins
- Stack trace capture for debugging

**Error Subclasses (7 total):**
1. UnauthorizedError (401) - Authentication required/failed
2. ForbiddenError (403) - Authenticated but not authorized
3. NotFoundError (404) - Resource does not exist
4. ValidationError (400) - Invalid input validation
5. ConflictError (409) - Resource conflict (duplicate email, etc.)
6. InternalError (500) - Unexpected server error
7. BadRequestError (400) - Malformed request

**ERROR_CODES Constant:**
- 19 predefined error codes matching API documentation format
- Includes generic HTTP errors (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, CONFLICT, INTERNAL_ERROR, BAD_REQUEST, METHOD_NOT_ALLOWED)
- Authentication-specific codes (INVALID_CREDENTIALS, INVALID_MFA_CODE, INVALID_REFRESH_TOKEN, TOKEN_EXPIRED, TOKEN_REVOKED, MFA_REQUIRED)
- Account-specific codes (ACCOUNT_LOCKED, EMAIL_NOT_VERIFIED)
- Resource conflict codes (DUPLICATE_EMAIL, DUPLICATE_ENTRY)
- Rate limiting code (RATE_LIMIT_EXCEEDED)
- Exported as const with ErrorCode type for type safety

### API Types (`packages/shared/src/types/api.ts`)

**Core Types:**
- PaginationMeta: { total, page, limit, total_pages }
- PaginatedResponse<T>: { data: T[], meta: PaginationMeta }
- ApiResponse<T>: { data: T }
- JWTPayload: Complete JWT structure with sub, iss, aud, exp, iat, company_id, role, permissions, mfa_verified

**Existing Types (preserved):**
- ApiError: { error, code, message, details }
- HealthResponse: { status, service, version, timestamp }

### Response Utilities (`apps/web/lib/utils/response.ts`)

**6 Response Helpers:**
1. **successResponse<T>(data, status=200)** - Standard success with data wrapper
2. **createdResponse<T>(data)** - 201 Created response
3. **noContentResponse()** - 204 No Content (for DELETE operations)
4. **paginatedResponse<T>(data, meta)** - Paginated list responses
5. **errorResponse(error: AppError)** - Converts AppError to JSON response
6. **validationErrorResponse(errors)** - Validation errors with SECURITY note: never includes raw input values

**Format Consistency:**
- Success: `{ data: T }` with appropriate status code
- Error: `{ error: { code, message, details } }` with error statusCode
- Pagination: `{ data: T[], meta: PaginationMeta }`

### Error Handler (`apps/web/lib/utils/errors.ts`)

**handleRouteError(error: unknown):**
- Handles AppError instances → errorResponse
- Handles standard Error → logs + InternalError response
- Handles unknown types → logs + InternalError response
- Centralized try/catch wrapper for all API routes

## Deviations from Plan

None - plan executed exactly as written.

## Testing & Verification

**TypeScript Compilation:**
- ✅ packages/shared compiles cleanly (`pnpm tsc --noEmit`)
- ✅ All exports verified: AppError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, ConflictError, ERROR_CODES, PaginationMeta, JWTPayload
- ✅ Response utilities compile cleanly
- ✅ All 6 response functions exported: successResponse, createdResponse, noContentResponse, paginatedResponse, errorResponse, validationErrorResponse
- ✅ Error handler exports handleRouteError

**Note:** apps/web has unrelated TypeScript errors in uncommitted files (lib/auth/jwt.ts) but Task 2 files compile correctly in isolation.

## Integration Points

**Downstream Usage:**
- All API route handlers will import handleRouteError for consistent error handling
- All success responses use successResponse/createdResponse/paginatedResponse
- All validation errors use validationErrorResponse (never exposes raw passwords/tokens)
- Authentication endpoints use UnauthorizedError, ForbiddenError
- Resource CRUD uses NotFoundError, ConflictError
- Booking endpoints use ValidationError for slot validation

**Security Considerations:**
- validationErrorResponse explicitly documented to NEVER include raw input values
- Prevents password leaking in logs via validation error details
- Error details field typed as `unknown` to prevent accidental sensitive data exposure
- Stack traces only captured in development (Error.captureStackTrace)

## What's Next

**Immediate Dependencies (Phase 03):**
- Plan 03-02: JWT token generation/verification (uses JWTPayload interface)
- Plan 03-03: Auth endpoints (uses UnauthorizedError, ForbiddenError, ValidationError)
- Plan 03-04: Session management (uses error classes and response utilities)
- Plan 03-05: Password hashing utilities (uses ValidationError, InternalError)
- Plan 03-06: RLS middleware (uses ForbiddenError, UnauthorizedError)
- Plan 03-07: Company management endpoints (uses all response utilities)
- Plan 03-08: API key authentication (uses UnauthorizedError, ForbiddenError)

**Files Ready for Import:**
```typescript
// In any API route
import { handleRouteError, successResponse, errorResponse } from '@/lib/utils/errors';
import { UnauthorizedError, ValidationError, ERROR_CODES } from '@schedulebox/shared';
```

## Key Decisions

1. **Security-first validation errors** - validationErrorResponse explicitly documented to never include raw input values, preventing password/token leaks in logs
2. **Consistent error format** - All errors return `{ error: { code, message, details } }` matching documentation exactly
3. **TypeScript strict typing** - ErrorCode type derived from ERROR_CODES const ensures compile-time safety
4. **Proper prototype chain** - Object.setPrototypeOf for each error subclass ensures `instanceof` checks work correctly

## Metrics

- **Duration:** 175 seconds (~3 minutes)
- **Files created:** 5
- **Files modified:** 2
- **Lines of code:** ~300
- **Error classes:** 7 subclasses + 1 base class
- **Error codes:** 19 constants
- **Response utilities:** 6 functions
- **Tasks completed:** 2
- **Commits:** 2

## Self-Check: PASSED

**Created files exist:**
```
✅ packages/shared/src/errors/app-error.ts
✅ packages/shared/src/errors/index.ts
✅ packages/shared/src/types/api.ts
✅ apps/web/lib/utils/response.ts
✅ apps/web/lib/utils/errors.ts
```

**Commits exist:**
```
✅ b8b045f - feat(shared): add error classes and API type definitions
✅ 25409dd - feat(backend): add API response utilities and error handler
```

**Exports verified:**
```
✅ AppError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, ConflictError, InternalError, BadRequestError
✅ ERROR_CODES, ErrorCode
✅ PaginationMeta, PaginatedResponse<T>, ApiResponse<T>, JWTPayload
✅ successResponse, createdResponse, noContentResponse, paginatedResponse, errorResponse, validationErrorResponse
✅ handleRouteError
```

All verification criteria met. Plan 03-01 complete.
