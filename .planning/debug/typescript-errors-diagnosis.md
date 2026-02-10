---
status: investigating
trigger: 'Investigate root cause of 372 TypeScript errors from pnpm type-check'
created: 2026-02-10T00:00:00Z
updated: 2026-02-10T00:00:00Z
---

## Current Focus

hypothesis: Multiple root causes - missing @/ path alias resolution in components, .js extension imports in API routes, schema field name mismatches in seeds, outdated faker API
test: Reading key files to understand schema mismatches and tsconfig setup
expecting: Schema has different field names than seed code expects
next_action: Read schema files and component imports to verify hypotheses

## Symptoms

expected: pnpm type-check should pass without errors
actual: 372 TypeScript errors across 5 categories
errors:
  - Cannot find module '@/lib/utils' in shadcn/ui components
  - Cannot find module '@/lib/middleware/route-handler.js' with .js extension
  - Implicit 'any' type on destructured handler parameters
  - firstName doesn't exist on user type in seeds
  - duration doesn't exist on service type in seeds
  - faker.locale API deprecated
reproduction: Run `pnpm type-check` in project root
started: Unknown, present in current state

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-10T00:00:00Z
  checked: apps/web/tsconfig.json
  found: Path aliases configured correctly with "@/*" mapping to multiple directories
  implication: Path aliases are configured, likely a compilation or build issue

- timestamp: 2026-02-10T00:00:01Z
  checked: apps/web/lib/utils.ts
  found: File exists with cn() function export
  implication: Module exists, path resolution issue likely in how TypeScript compiles shadcn components

- timestamp: 2026-02-10T00:00:02Z
  checked: apps/web/lib/middleware/route-handler.ts
  found: File exists but API routes import it as .js extension
  implication: TypeScript doesn't resolve .js extensions to .ts source files by default

- timestamp: 2026-02-10T00:00:03Z
  checked: packages/database/src/schema/auth.ts
  found: users table has 'name' field (line 154), NOT firstName/lastName
  implication: Seed script expects firstName/lastName but schema has single 'name' field

- timestamp: 2026-02-10T00:00:04Z
  checked: packages/database/src/schema/services.ts
  found: services table has 'durationMinutes' field (line 69), NOT 'duration'
  implication: Seed script uses 'duration' but schema expects 'durationMinutes'

- timestamp: 2026-02-10T00:00:05Z
  checked: packages/database/src/seeds/helpers.ts line 11
  found: faker.locale = 'cs' (deprecated API)
  implication: Should use faker.setLocale('cs') or faker.locale = 'cs_CZ' for newer @faker-js/faker

- timestamp: 2026-02-10T00:00:06Z
  checked: apps/web/components/ui/ directory
  found: No .tsx files found via glob pattern
  implication: Components might be in different location or not created yet

- timestamp: 2026-02-10T00:00:07Z
  checked: apps/web/components directory recursively
  found: 26 .tsx files including ui components (avatar, badge, button, etc.)
  implication: Components exist, TypeScript may not be compiling them correctly

- timestamp: 2026-02-10T00:00:08Z
  checked: packages/database/src/schema/employees.ts
  found: employees table has 'name' field (line 44), NOT firstName/lastName
  implication: Seed uses firstName/lastName but employees schema has single 'name' field

- timestamp: 2026-02-10T00:00:09Z
  checked: packages/database/src/schema/customers.ts
  found: customers table has 'name' field (line 43), NOT firstName/lastName
  implication: Seed uses firstName/lastName but customers schema has single 'name' field

- timestamp: 2026-02-10T00:00:10Z
  checked: 42 files importing with .js extensions
  found: All API routes, middleware, auth libs use .js extensions for TypeScript imports
  implication: Widespread pattern, not isolated errors - need moduleResolution fix or remove extensions

- timestamp: 2026-02-10T00:00:11Z
  checked: employees.ts seed lines 355-356, 382-383
  found: Accessing user.firstName and employeeName.firstName for employees table
  implication: Attempting to use firstName/lastName on 'name' field

- timestamp: 2026-02-10T00:00:12Z
  checked: customers.ts seed lines 478-479, 499-500
  found: Accessing user.firstName and customerName.firstName for customers table
  implication: Attempting to use firstName/lastName on 'name' field

- timestamp: 2026-02-10T00:00:13Z
  checked: development.ts seed line 323
  found: duration: serviceData.duration (passing to services insert)
  implication: SERVICE_NAMES helper has 'duration' but schema expects 'durationMinutes'

## Resolution

root_cause: 5 DISTINCT ROOT CAUSES IDENTIFIED

### 1. Schema Field Name Mismatches (Database Package)
**Root Cause:** Database schemas use single `name` field, but seed scripts expect `firstName` and `lastName` fields

**Affected Schemas:**
- `packages/database/src/schema/auth.ts` - users table (line 154): has `name`, not `firstName`/`lastName`
- `packages/database/src/schema/employees.ts` - employees table (line 44): has `name`, not `firstName`/`lastName`
- `packages/database/src/schema/customers.ts` - customers table (line 43): has `name`, not `firstName`/`lastName`
- `packages/database/src/schema/services.ts` - services table (line 69): has `durationMinutes`, not `duration`

**Affected Seed Files:**
- `packages/database/src/seeds/development.ts` (lines 201-202, 219-220, 240-241, 262-263, 355-356, 382-383, 478-479, 499-500, 323)
- `packages/database/src/seeds/helpers.ts` (lines 197-198 - czechName() returns firstName/lastName)

**Fix Needed:**
- Change seed script to use single `name` field (concatenate firstName + lastName)
- Change SERVICE_NAMES helper to use `durationMinutes` instead of `duration`

### 2. .js Extension Imports (Web Package)
**Root Cause:** TypeScript source files are imported with `.js` extensions, which TypeScript's default module resolution doesn't handle

**Affected Files:** 42 files including:
- All API routes in `apps/web/app/api/v1/`
- `apps/web/lib/middleware/route-handler.ts`, `auth.ts`, `rbac.ts`
- `apps/web/lib/auth/password.ts`, `jwt.ts`
- `apps/web/lib/utils/errors.ts`

**Fix Needed:**
- Either remove `.js` extensions from imports (use `.ts` or no extension)
- OR configure `tsconfig.json` with `"moduleResolution": "nodenext"` to support .js extensions for ESM

### 3. Implicit 'any' Types (Web Package)
**Root Cause:** Handler function destructured parameters lack explicit types when using createRouteHandler

**Pattern:** `handler: async ({ req, body, user, params }) => { ... }`

**Fix Needed:** Add explicit type annotations or ensure RouteHandlerContext types are properly inferred

### 4. faker.locale Deprecated API (Database Package)
**Root Cause:** Using old faker API `faker.locale = 'cs'` which is deprecated in @faker-js/faker v10.3.0

**Affected File:** `packages/database/src/seeds/helpers.ts` (line 11)

**Fix Needed:** Use `faker.setDefaultRefDate()` and `faker.setLocale()` or configure locale via imports

### 5. Missing shadcn/ui Component Files (Web Package) - UNLIKELY
**Root Cause:** Components exist (26 .tsx files found) but may not be properly compiled or TypeScript can't resolve them

**Alternative Theory:** This might be false positive - components exist and import correctly, errors may be from other causes

**Fix Needed:** Verify if this is actually causing errors or if it's resolved by fixing #2 (.js extensions)

fix: Pending implementation
verification: Pending
files_changed: []
