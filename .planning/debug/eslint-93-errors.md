---
status: diagnosed
trigger: 'Investigate root cause of 93 ESLint errors from `pnpm lint` in ScheduleBox project'
created: 2026-02-10T00:00:00Z
updated: 2026-02-10T00:12:00Z
---

## Current Focus

hypothesis: CONFIRMED - Code was committed without running lint, strict rules catch type assertions
test: examined route handler contract and import usage patterns
expecting: root cause identified, need to decide fix strategy
next_action: formulate diagnosis with fix recommendations

## Symptoms

expected: Code should pass ESLint with zero errors
actual: 93 ESLint errors across API route files and middleware
errors:
  - @typescript-eslint/no-non-null-assertion: ~70+ violations (user!, params!, or()!)
  - @typescript-eslint/no-unused-vars: unused imports (successResponse, CustomerCreate, and, z)
  - @typescript-eslint/consistent-type-imports: missing `import type` in validate.ts
reproduction: Run `pnpm lint` from project root
started: After implementing Phase 04 API routes (files committed without running lint)

## Eliminated

## Evidence

- timestamp: 2026-02-10T00:01:00Z
  checked: eslint.config.mjs
  found: Uses typescript-eslint strict config (line 10) which includes no-non-null-assertion rule
  implication: The strict rule set explicitly bans non-null assertions (!) as unsafe

- timestamp: 2026-02-10T00:02:00Z
  checked: apps/web/app/api/v1/customers/route.ts (lines 31, 187)
  found: user!.sub on line 31 despite createRouteHandler guaranteeing user is defined when requiresAuth: true
  implication: Route handler middleware validates user exists, so ! assertion is semantically safe

- timestamp: 2026-02-10T00:03:00Z
  checked: apps/web/app/api/v1/customers/route.ts (line 51)
  found: or()! assertion after building search condition
  implication: Drizzle ORM's or() can theoretically return undefined, but in this context it's guaranteed to have value

- timestamp: 2026-02-10T00:04:00Z
  checked: apps/web/app/api/v1/customers/route.ts (lines 14, 18)
  found: successResponse and CustomerCreate imported but not used in this file
  implication: Dead imports - code was refactored but imports not cleaned up

- timestamp: 2026-02-10T00:05:00Z
  checked: apps/web/lib/middleware/validate.ts
  found: Imports z, NextRequest, and ValidationError without `type` keyword
  implication: ESLint wants type-only imports to use `import type` syntax

- timestamp: 2026-02-10T00:06:00Z
  checked: Pattern across all API routes
  found: 15 files use user! pattern, 32 files use or() from drizzle-orm
  implication: This is a systematic pattern across the entire API surface

- timestamp: 2026-02-10T00:07:00Z
  checked: Git status
  found: Multiple modified and untracked API route files in apps/web/app/api/v1/
  implication: Files were implemented and committed without running lint check

- timestamp: 2026-02-10T00:08:00Z
  checked: apps/web/lib/middleware/route-handler.ts (lines 23, 131)
  found: RouteHandlerContext.user is typed as `JWTPayload | undefined`, handler receives user as potentially undefined
  implication: Type system correctly reflects that user can be undefined (when requiresAuth=false), so ! assertions are needed OR type narrowing is needed

- timestamp: 2026-02-10T00:09:00Z
  checked: Import usage in employees/route.ts
  found: Line 9 imports `and` from drizzle-orm, but line 49 uses `and()` with only 2 args where it could be inline
  implication: `and` is used but could be considered unnecessary in some contexts

- timestamp: 2026-02-10T00:10:00Z
  checked: successResponse usage pattern
  found: employees/route.ts line 13 imports successResponse but also returns it on lines 81, 138-142
  implication: This is NOT unused - this is a false positive or I need to check the file again

- timestamp: 2026-02-10T00:11:00Z
  checked: successResponse in customers/route.ts
  found: Line 14 imports successResponse, but actual usage is paginatedResponse (line 168) and createdResponse (line 247)
  implication: successResponse IS actually unused in customers/route.ts - dead import

## Resolution

root_cause: |
  Files were committed without running `pnpm lint`. ESLint is configured with typescript-eslint strict rules which caught three categories of violations:

  1. **@typescript-eslint/no-non-null-assertion (~70+ violations)**
     - Code uses `user!.sub`, `params!.id`, `or()!` assertions
     - Route handler types user as `JWTPayload | undefined` even when requiresAuth=true
     - Type system doesn't narrow types based on requiresAuth config
     - Assertions are semantically safe (middleware guarantees values exist) but TypeScript can't prove it
     - This is a TYPE SYSTEM LIMITATION, not a code bug

  2. **@typescript-eslint/no-unused-vars (multiple files)**
     - Dead imports from refactoring (e.g., successResponse imported but not used)
     - Unused type imports (e.g., CustomerCreate imported but not referenced)
     - Import cleanup was not performed after code changes

  3. **@typescript-eslint/consistent-type-imports (validate.ts)**
     - ValidationError imported without `import type` syntax
     - ESLint rule requires type-only imports to use `import type { ValidationError }` syntax
     - This enforces clear separation of runtime vs type-only imports

fix: |
  Three fix strategies available:

  **Option A: Fix the code (recommended for category 2 & 3)**
  - Remove unused imports (category 2)
  - Add `import type` for type-only imports (category 3)
  - For category 1, refactor type system to use type guards or change RouteHandlerContext typing

  **Option B: Adjust ESLint rules (pragmatic for category 1)**
  - Disable @typescript-eslint/no-non-null-assertion or make it warning
  - Acknowledge that middleware guarantees make assertions safe
  - Keep other rules strict

  **Option C: Hybrid approach (RECOMMENDED)**
  - Fix categories 2 & 3 (unused imports, type imports) - these are clear bugs
  - For category 1, either:
    a) Refactor RouteHandlerContext to make user non-nullable when requiresAuth=true (complex)
    b) Use type guards instead of ! assertions (verbose but safe)
    c) Disable no-non-null-assertion rule with comment explaining why

verification: |
  - Run `pnpm lint` to get exact error count and file list
  - After fixes, `pnpm lint` should report 0 errors
  - TypeScript compilation should still pass (`pnpm build`)

files_changed: []
