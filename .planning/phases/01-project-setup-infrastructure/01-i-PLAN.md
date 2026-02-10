---
phase: 01-project-setup-infrastructure
plan: i
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/app/api/v1/**/*.ts (42 files)
  - apps/web/lib/middleware/route-handler.ts
  - apps/web/lib/middleware/validate.ts
  - apps/web/lib/middleware/rbac.ts
  - apps/web/lib/auth/jwt.ts
  - apps/web/lib/auth/password.ts
  - apps/web/lib/db/tenant-scope.ts
  - apps/web/lib/utils/errors.ts
  - apps/web/lib/utils/response.ts
  - packages/database/src/seeds/development.ts
  - packages/database/src/seeds/helpers.ts
  - packages/database/src/schema/auth.ts
  - packages/database/src/schema/services.ts
  - packages/database/src/schema/employees.ts
  - packages/database/src/schema/customers.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - 'pnpm type-check exits with code 0'
    - 'pnpm lint exits with code 0'
  artifacts:
    - path: 'apps/web/app/api/v1/**/*.ts'
      provides: 'TypeScript-compliant imports without .js extensions'
      contains: 'import.*from.*@/lib'
    - path: 'packages/database/src/seeds/development.ts'
      provides: 'Seed data matching schema field names'
      contains: 'name:.*firstName.*lastName'
    - path: 'packages/database/src/seeds/helpers.ts'
      provides: 'Modern faker API usage'
      pattern: 'faker\\.locale'
  key_links:
    - from: 'API route files'
      to: 'middleware modules'
      via: 'ESM imports without .js extension'
      pattern: "import.*from '@/lib/middleware"
    - from: 'Seed scripts'
      to: 'Schema definitions'
      via: 'Field name matching'
      pattern: 'name:.*firstName'
---

<objective>
Fix TypeScript and ESLint errors: remove .js extensions from imports, fix seed data schema mismatches, remove unused imports, add type imports, and update deprecated faker API.

Purpose: Achieve zero TypeScript and ESLint errors for clean CI/CD pipeline
Output: Type-check and lint pass successfully
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-project-setup-infrastructure/01-UAT.md
@.planning/debug/typescript-errors-diagnosis.md
@.planning/debug/eslint-93-errors.md

@apps/web/tsconfig.json
@packages/database/package.json
@apps/web/lib/middleware/route-handler.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove .js extensions from all TypeScript imports</name>
  <files>
apps/web/app/api/v1/**/*.ts (42 files)
apps/web/lib/middleware/route-handler.ts
apps/web/lib/middleware/validate.ts
apps/web/lib/middleware/rbac.ts
apps/web/lib/auth/jwt.ts
apps/web/lib/auth/password.ts
apps/web/lib/db/tenant-scope.ts
apps/web/lib/utils/errors.ts
apps/web/lib/utils/response.ts
  </files>
  <action>
**Root cause:** TypeScript source files are imported with `.js` extensions (ESM convention), but TypeScript's default module resolution doesn't resolve `.js` to `.ts` source files.

**Fix:** Remove `.js` extensions from all imports in apps/web/

Find all imports with .js extensions:
```bash
grep -r "from '@/lib.*\.js'" apps/web/app/api/v1/ apps/web/lib/
```

For each file, change imports from:
```typescript
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
```

To:
```typescript
import { createRouteHandler } from '@/lib/middleware/route-handler';
```

Pattern: Remove `.js` extension from all `@/lib/*` imports and relative imports ending in `.js`.

**Why not moduleResolution: nodenext?** While that would technically work, removing extensions is simpler and aligns with standard TypeScript conventions for path aliases.

Use global find-replace:
- Pattern: `from '(@/[^']+)\.js'` → `from '$1'`
- Pattern: `from "(@/[^"]+)\.js"` → `from "$1"`
- Pattern: `from '(\.[^']+)\.js'` → `from '$1'` (for relative imports)
  </action>
  <verify>
Run TypeScript check on web package:
```bash
cd apps/web && pnpm type-check
```

Should show significantly reduced errors (from ~372 to ~80 remaining schema errors).
  </verify>
  <done>All .js extension import errors resolved, type-check shows only seed data schema errors remaining</done>
</task>

<task type="auto">
  <name>Task 2: Fix seed data schema mismatches and faker API</name>
  <files>
packages/database/src/seeds/development.ts
packages/database/src/seeds/helpers.ts
  </files>
  <action>
**Root causes:**
1. Seed scripts use `firstName`/`lastName` but schemas have single `name` field
2. Seed uses `duration` but schema has `durationMinutes`
3. `faker.locale` deprecated in @faker-js/faker v10.3.0

**Fix helpers.ts (lines 11, 197-198):**

Change line 11 from:
```typescript
faker.locale = 'cs';
```
To:
```typescript
faker.setDefaultRefDate(new Date('2025-01-01'));
```

Change czechName() function (lines 197-210) from:
```typescript
export function czechName(): { firstName: string; lastName: string } {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  };
}
```
To:
```typescript
export function czechName(): string {
  return faker.person.fullName();
}
```

**Fix development.ts seed data:**

**Users table (lines 201-202, 219-220, 240-241, 262-263):**
Change from:
```typescript
name: `${userName.firstName} ${userName.lastName}`,
```
To:
```typescript
name: userName, // czechName() now returns full name string
```

**Employees table (lines 355-356, 382-383):**
Change from:
```typescript
name: `${employeeName.firstName} ${employeeName.lastName}`,
```
To:
```typescript
name: employeeName,
```

**Customers table (lines 478-479, 499-500):**
Change from:
```typescript
name: `${customerName.firstName} ${customerName.lastName}`,
```
To:
```typescript
name: customerName,
```

**Services table (line 323):**
Change from:
```typescript
duration: serviceData.duration,
```
To:
```typescript
durationMinutes: serviceData.duration, // SERVICE_NAMES uses 'duration' key but schema expects 'durationMinutes'
```

**Note:** The SERVICE_NAMES constant uses `duration` as the property name, but the schema field is `durationMinutes`. We keep the constant as-is and map it during insert.
  </action>
  <verify>
Run full type-check on database package:
```bash
cd packages/database && pnpm type-check
```

Should exit with code 0. Then verify seed still runs:
```bash
cd packages/database && pnpm db:seed
```
  </verify>
  <done>Seed data uses correct field names (name, durationMinutes), faker API modernized, database package type-check passes</done>
</task>

<task type="auto">
  <name>Task 3: Fix ESLint errors - unused imports and type imports</name>
  <files>
apps/web/app/api/v1/customers/route.ts
apps/web/lib/middleware/validate.ts
(and other files with unused imports)
  </files>
  <action>
**Root causes:**
1. Dead imports from refactoring (e.g., `successResponse`, `CustomerCreate` imported but not used)
2. Missing `import type` syntax for type-only imports

**Strategy:** Let ESLint autofix what it can, manually fix the rest.

**Step 1: Auto-fix with ESLint**
```bash
pnpm lint --fix
```

This will automatically:
- Remove unused imports
- Add `import type` for type-only imports where safe

**Step 2: Manual fixes for remaining violations**

**validate.ts:** Change type-only imports:
```typescript
import type { z } from 'zod';
import type { NextRequest } from 'next/server';
```

**API routes with non-null assertions:** ESLint will flag ~70 `user!` and `params!` assertions.

**Decision:** Use type guards instead of disabling the rule:

For `user!.sub` patterns, change from:
```typescript
const companyId = await findCompanyId(user!.sub);
```
To:
```typescript
if (!user) throw new Error('Unauthorized');
const companyId = await findCompanyId(user.sub);
```

For `params!.id` patterns:
```typescript
if (!params?.id) throw new ValidationError('Missing ID parameter');
const id = params.id;
```

For `or()!` patterns (Drizzle ORM):
```typescript
const condition = or(...filters);
if (!condition) throw new Error('Invalid query');
```

**Alternative (if type guards are too verbose):** Add ESLint disable comments:
```typescript
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const companyId = await findCompanyId(user!.sub);
```

**Note:** Since middleware guarantees `user` exists when `requiresAuth: true`, the assertions are semantically safe. We're only satisfying the linter's type narrowing requirements.
  </action>
  <verify>
Run ESLint check:
```bash
pnpm lint
```

Should exit with code 0 (or very low error count if some manual fixes needed).

Also run type-check to ensure changes didn't break types:
```bash
pnpm type-check
```
  </verify>
  <done>All unused imports removed, type-only imports use `import type`, non-null assertions handled via type guards or disable comments, ESLint passes</done>
</task>

</tasks>

<verification>
- [ ] `pnpm type-check` exits with code 0 across all packages
- [ ] `pnpm lint` exits with code 0 across all packages
- [ ] Seed script runs successfully: `pnpm --filter @schedulebox/database db:seed`
- [ ] No .js extensions in TypeScript imports
- [ ] Seed data uses `name` field (not firstName/lastName)
- [ ] Seed data uses `durationMinutes` (not duration)
- [ ] faker API uses modern syntax (no deprecated `faker.locale`)
</verification>

<success_criteria>
Zero TypeScript and ESLint errors. CI/CD pipeline passes lint and type-check stages. Seed data correctly populates database with schema-compliant data.
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-setup-infrastructure/01-i-SUMMARY.md`
</output>
