---
phase: 01-project-setup-infrastructure
plan: b
type: execute
wave: 2
depends_on: ["01-a"]
files_modified:
  - packages/database/package.json
  - packages/database/tsconfig.json
  - packages/database/src/index.ts
  - packages/shared/package.json
  - packages/shared/tsconfig.json
  - packages/shared/src/index.ts
  - packages/shared/src/types/index.ts
  - packages/shared/src/utils/index.ts
  - packages/shared/src/schemas/index.ts
  - packages/events/package.json
  - packages/events/tsconfig.json
  - packages/events/src/index.ts
  - packages/ui/package.json
  - packages/ui/tsconfig.json
  - packages/ui/src/index.ts
autonomous: true

must_haves:
  truths:
    - "Each package has a valid package.json with @schedulebox scope and proper exports"
    - "Each package has a tsconfig.json extending root tsconfig"
    - "Each package has a src/index.ts barrel export"
    - "Workspace packages can be referenced via workspace:* protocol"
  artifacts:
    - path: "packages/database/package.json"
      provides: "Database package definition"
      contains: "@schedulebox/database"
    - path: "packages/shared/package.json"
      provides: "Shared package definition"
      contains: "@schedulebox/shared"
    - path: "packages/events/package.json"
      provides: "Events package definition"
      contains: "@schedulebox/events"
    - path: "packages/ui/package.json"
      provides: "UI package definition"
      contains: "@schedulebox/ui"
    - path: "packages/shared/src/types/index.ts"
      provides: "Shared types barrel export"
      contains: "export"
    - path: "packages/shared/src/schemas/index.ts"
      provides: "Shared Zod schemas barrel export"
      contains: "export"
  key_links:
    - from: "packages/*/package.json"
      to: "tsconfig.json"
      via: "extends in tsconfig"
      pattern: "extends.*\\.\\./\\.\\./tsconfig"
---

<objective>
Create stub packages for all four workspace packages (database, shared, events, ui) with proper package.json, tsconfig.json, and barrel exports.

Purpose: These stubs establish the package structure so apps/web and CI can reference them. Actual implementation comes in later phases (Phase 2 for database, Phase 3+ for events, Phase 4+ for UI).

Output: Four workspace packages with proper TypeScript configuration and export structure.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-project-setup-infrastructure/01-CONTEXT.md
@.planning/phases/01-project-setup-infrastructure/01-a-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create database and shared packages</name>
  <files>
    packages/database/package.json
    packages/database/tsconfig.json
    packages/database/src/index.ts
    packages/shared/package.json
    packages/shared/tsconfig.json
    packages/shared/src/index.ts
    packages/shared/src/types/index.ts
    packages/shared/src/utils/index.ts
    packages/shared/src/schemas/index.ts
  </files>
  <action>
    Create `packages/database/` package:
    - package.json:
      - name: "@schedulebox/database"
      - version: "0.0.0"
      - private: true
      - type: "module"
      - main: "./src/index.ts"
      - types: "./src/index.ts"
      - exports: { ".": { "types": "./src/index.ts", "default": "./src/index.ts" } }
      - scripts: { "type-check": "tsc --noEmit" }
      - dependencies: {} (drizzle-orm added in Phase 2)
      - devDependencies: { "typescript": "workspace:*" } (if using catalog) or leave empty (inherits from root)
    - tsconfig.json: extends "../../tsconfig.json", compilerOptions: { "baseUrl": ".", "outDir": "./dist" }, include: ["src/**/*.ts"]
    - src/index.ts: `// Database package - Drizzle ORM schemas and migrations\n// Implementation in Phase 2\nexport {};`

    Create `packages/shared/` package:
    - package.json:
      - name: "@schedulebox/shared"
      - version: "0.0.0"
      - private: true
      - type: "module"
      - main: "./src/index.ts"
      - types: "./src/index.ts"
      - exports: { ".": { "types": "./src/index.ts", "default": "./src/index.ts" }, "./types": { "types": "./src/types/index.ts", "default": "./src/types/index.ts" }, "./schemas": { "types": "./src/schemas/index.ts", "default": "./src/schemas/index.ts" }, "./utils": { "types": "./src/utils/index.ts", "default": "./src/utils/index.ts" } }
      - scripts: { "type-check": "tsc --noEmit" }
      - dependencies: { "zod": "^3.23.0" }
    - tsconfig.json: extends "../../tsconfig.json", compilerOptions: { "baseUrl": ".", "outDir": "./dist" }, include: ["src/**/*.ts"]
    - src/index.ts: re-exports from types, utils, schemas
    - src/types/index.ts: Export the standard error format type:
      ```typescript
      /** Standard API error response format */
      export interface ApiError {
        error: string;
        code: string;
        message: string;
        details?: unknown;
      }

      /** Standard health check response */
      export interface HealthResponse {
        status: 'ok' | 'degraded' | 'error';
        service: string;
        version: string;
        timestamp: string;
      }
      ```
    - src/utils/index.ts: `// Shared utilities\n// Implementation added as needed\nexport {};`
    - src/schemas/index.ts: `// Zod validation schemas\n// Implementation in Phase 3\nexport {};`
  </action>
  <verify>
    - Directory `packages/database/src/` exists with index.ts
    - Directory `packages/shared/src/types/` exists with index.ts containing ApiError interface
    - Both package.json files have correct @schedulebox scope
    - Both tsconfig.json files extend root config
  </verify>
  <done>Database and shared packages have proper structure with package.json, tsconfig.json, and barrel exports. Shared package defines standard error and health response types.</done>
</task>

<task type="auto">
  <name>Task 2: Create events and UI packages</name>
  <files>
    packages/events/package.json
    packages/events/tsconfig.json
    packages/events/src/index.ts
    packages/events/src/definitions/.gitkeep
    packages/ui/package.json
    packages/ui/tsconfig.json
    packages/ui/src/index.ts
    packages/ui/src/components/.gitkeep
    packages/ui/src/lib/.gitkeep
  </files>
  <action>
    Create `packages/events/` package:
    - package.json:
      - name: "@schedulebox/events"
      - version: "0.0.0"
      - private: true
      - type: "module"
      - main: "./src/index.ts"
      - types: "./src/index.ts"
      - exports: { ".": { "types": "./src/index.ts", "default": "./src/index.ts" } }
      - scripts: { "type-check": "tsc --noEmit" }
      - dependencies: {} (amqplib added in later phases)
    - tsconfig.json: extends "../../tsconfig.json", compilerOptions: { "baseUrl": ".", "outDir": "./dist" }, include: ["src/**/*.ts"]
    - src/index.ts: `// RabbitMQ event definitions and helpers (CloudEvents format)\n// Implementation in Phase 3+\nexport {};`
    - src/definitions/.gitkeep (empty directory for future event type files)

    Create `packages/ui/` package:
    - package.json:
      - name: "@schedulebox/ui"
      - version: "0.0.0"
      - private: true
      - type: "module"
      - main: "./src/index.ts"
      - types: "./src/index.ts"
      - exports: { ".": { "types": "./src/index.ts", "default": "./src/index.ts" }, "./components": { "types": "./src/components/index.ts", "default": "./src/components/index.ts" } }
      - scripts: { "type-check": "tsc --noEmit" }
      - dependencies: {} (react, tailwind added in Phase 4)
    - tsconfig.json: extends "../../tsconfig.json", compilerOptions: { "baseUrl": ".", "outDir": "./dist", "jsx": "react-jsx" }, include: ["src/**/*.ts", "src/**/*.tsx"]
    - src/index.ts: `// Shared UI components (shadcn/ui based)\n// Implementation in Phase 4\nexport {};`
    - src/components/.gitkeep (empty directory for future components)
    - src/lib/.gitkeep (empty directory for UI utilities like cn())
  </action>
  <verify>
    - Directory `packages/events/src/` exists with index.ts
    - Directory `packages/ui/src/` exists with index.ts
    - Both package.json files have correct @schedulebox scope
    - packages/ui/tsconfig.json has jsx: "react-jsx"
    - Empty directories have .gitkeep files
  </verify>
  <done>Events and UI packages have proper structure with package.json, tsconfig.json, barrel exports, and placeholder directories for future implementation.</done>
</task>

</tasks>

<verification>
1. All four packages exist: packages/database, packages/shared, packages/events, packages/ui
2. Each has package.json with @schedulebox/* name and "private": true
3. Each has tsconfig.json extending root tsconfig
4. Each has src/index.ts barrel export
5. packages/shared has types/index.ts with ApiError and HealthResponse interfaces
6. packages/ui tsconfig has jsx support
</verification>

<success_criteria>
All four workspace packages are stubbed with proper TypeScript and package configurations. They can be referenced via workspace:* protocol by apps/web and resolve during pnpm install.
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-setup-infrastructure/01-b-SUMMARY.md`
</output>
