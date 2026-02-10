---
phase: 01-project-setup-infrastructure
plan: a
type: execute
wave: 1
depends_on: []
files_modified:
  - pnpm-workspace.yaml
  - package.json
  - tsconfig.json
  - .gitignore
  - .npmrc
  - .env.example
  - .dockerignore
autonomous: true

must_haves:
  truths:
    - "pnpm-workspace.yaml defines all workspace package globs"
    - "Root package.json declares all monorepo scripts (dev, build, lint, type-check, format, prepare)"
    - "Root tsconfig.json sets strict mode as base for all packages"
    - ".env.example documents all required environment variables with defaults"
    - ".gitignore excludes node_modules, .next, dist, .env.local, coverage"
  artifacts:
    - path: "pnpm-workspace.yaml"
      provides: "Workspace package definitions"
      contains: "packages:"
    - path: "package.json"
      provides: "Root monorepo package with scripts and devDependencies"
      contains: "@schedulebox"
    - path: "tsconfig.json"
      provides: "Base TypeScript configuration with strict mode"
      contains: "strict"
    - path: ".env.example"
      provides: "Environment variable documentation"
      contains: "DATABASE_URL"
    - path: ".gitignore"
      provides: "Git ignore rules for monorepo"
      contains: "node_modules"
    - path: ".npmrc"
      provides: "pnpm configuration"
      contains: "shamefully-hoist"
    - path: ".dockerignore"
      provides: "Docker build context exclusions"
      contains: ".git"
  key_links:
    - from: "pnpm-workspace.yaml"
      to: "package.json"
      via: "workspace protocol"
      pattern: "workspace:\\*"
---

<objective>
Initialize the root monorepo scaffold with pnpm workspace configuration, TypeScript base config, environment variable templates, and Git/Docker ignore files.

Purpose: This is the foundational plan that all other Phase 1 plans depend on. It creates the root files that define the monorepo structure, scripts, and configuration baseline.

Output: Root-level configuration files that enable pnpm workspace resolution, TypeScript compilation, and environment setup.
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
@.planning/phases/01-project-setup-infrastructure/01-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create pnpm workspace and root package.json</name>
  <files>
    pnpm-workspace.yaml
    package.json
    .npmrc
  </files>
  <action>
    Create `pnpm-workspace.yaml` with workspace globs:
    ```yaml
    packages:
      - 'apps/*'
      - 'packages/*'
      - 'services/*'
    ```

    Create root `package.json`:
    - name: "@schedulebox/root"
    - private: true
    - type: "module" (ESM for ESLint flat config and modern tooling)
    - packageManager: "pnpm@9.15.4" (or latest 9.x)
    - engines: { node: ">=20.0.0", pnpm: ">=9.0.0" }
    - scripts:
      - "dev": "pnpm --filter @schedulebox/web dev"
      - "build": "pnpm --filter @schedulebox/web build"
      - "lint": "eslint ."
      - "lint:fix": "eslint . --fix"
      - "type-check": "tsc --noEmit"
      - "format": "prettier --write ."
      - "format:check": "prettier --check ."
      - "prepare": "husky"
      - "docker:up": "docker compose -f docker/docker-compose.yml up -d"
      - "docker:down": "docker compose -f docker/docker-compose.yml down"
      - "docker:logs": "docker compose -f docker/docker-compose.yml logs -f"
    - devDependencies: typescript@^5.6.0, @types/node@^20.0.0 (other devDeps added by Plan 01-e)

    Create `.npmrc`:
    ```
    shamefully-hoist=false
    strict-peer-dependencies=false
    auto-install-peers=true
    ```

    NOTE: Do NOT run `pnpm install` yet — that happens in Plan 01-g after all packages exist.
  </action>
  <verify>
    - File `pnpm-workspace.yaml` exists and contains `apps/*`, `packages/*`, `services/*`
    - File `package.json` exists with `"private": true` and all listed scripts
    - File `.npmrc` exists with pnpm configuration
  </verify>
  <done>Root monorepo scaffold exists with workspace definition, all scripts, and pnpm config. No install needed yet.</done>
</task>

<task type="auto">
  <name>Task 2: Create base TypeScript config and ignore files</name>
  <files>
    tsconfig.json
    .gitignore
    .dockerignore
  </files>
  <action>
    Create root `tsconfig.json` (base config for all packages to extend):
    ```json
    {
      "compilerOptions": {
        "target": "ES2022",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "moduleResolution": "bundler",
        "resolveJsonModule": true,
        "allowJs": true,
        "strict": true,
        "noEmit": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "isolatedModules": true,
        "incremental": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true
      },
      "exclude": ["node_modules", "dist", ".next", "coverage"]
    }
    ```

    Create `.gitignore` for the monorepo:
    ```
    # Dependencies
    node_modules/
    .pnpm-store/

    # Next.js
    .next/
    out/

    # Build
    dist/
    build/

    # Environment
    .env.local
    .env.*.local
    .env.development.local
    .env.test.local
    .env.production.local

    # IDE
    .vscode/
    .idea/
    *.swp
    *.swo

    # OS
    .DS_Store
    Thumbs.db

    # Testing
    coverage/

    # Logs
    *.log
    npm-debug.log*
    pnpm-debug.log*

    # Docker
    docker/data/

    # Misc
    *.tsbuildinfo
    ```

    Create `.dockerignore`:
    ```
    .git
    .gitignore
    .env
    .env.local
    .env.*.local
    node_modules
    .next
    dist
    build
    coverage
    *.log
    .DS_Store
    .vscode
    .idea
    .planning
    k8s
    .github
    *.md
    !README.md
    docker/data
    ```
  </action>
  <verify>
    - File `tsconfig.json` exists with `"strict": true`
    - File `.gitignore` exists and contains `node_modules/`, `.env.local`, `.next/`
    - File `.dockerignore` exists and contains `.git`, `node_modules`, `.env.local`
  </verify>
  <done>Base TypeScript strict config and comprehensive ignore files exist for monorepo development.</done>
</task>

<task type="auto">
  <name>Task 3: Create environment variable template</name>
  <files>
    .env.example
  </files>
  <action>
    Create `.env.example` with all Phase 1 environment variables documented (per CONTEXT.md decisions):

    ```bash
    # ScheduleBox Environment Variables
    # Copy to .env.local and customize for your setup

    # ===================
    # Application
    # ===================
    NODE_ENV=development
    PORT=3000
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    APP_VERSION=1.0.0

    # ===================
    # Database (PostgreSQL 16)
    # ===================
    DATABASE_URL=postgresql://schedulebox:schedulebox@localhost:5432/schedulebox
    DATABASE_HOST=localhost
    DATABASE_PORT=5432
    DATABASE_USER=schedulebox
    DATABASE_PASSWORD=schedulebox
    DATABASE_NAME=schedulebox

    # ===================
    # Redis 7
    # ===================
    REDIS_URL=redis://localhost:6379
    REDIS_HOST=localhost
    REDIS_PORT=6379

    # ===================
    # RabbitMQ 3.13
    # ===================
    RABBITMQ_URL=amqp://guest:guest@localhost:5672
    RABBITMQ_HOST=localhost
    RABBITMQ_PORT=5672
    RABBITMQ_MANAGEMENT_PORT=15672
    RABBITMQ_USER=guest
    RABBITMQ_PASSWORD=guest

    # ===================
    # Authentication (placeholder — configured in Phase 3)
    # ===================
    JWT_ACCESS_SECRET=dev-access-secret-change-in-production
    JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
    JWT_ACCESS_EXPIRY=15m
    JWT_REFRESH_EXPIRY=7d

    # ===================
    # Timezone
    # ===================
    TZ=Europe/Prague
    ```

    Also create empty directory stubs (with .gitkeep files) for directories referenced by the workspace but not yet populated:
    - `services/.gitkeep`
    - `k8s/.gitkeep`
  </action>
  <verify>
    - File `.env.example` exists and contains `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`
    - File `services/.gitkeep` exists
    - File `k8s/.gitkeep` exists
  </verify>
  <done>Environment variable template documents all required dev values. Empty directory stubs exist for workspace globs.</done>
</task>

</tasks>

<verification>
1. All root configuration files exist: pnpm-workspace.yaml, package.json, tsconfig.json, .gitignore, .npmrc, .dockerignore, .env.example
2. pnpm-workspace.yaml references apps/*, packages/*, services/*
3. Root package.json has all scripts defined (dev, build, lint, type-check, format, docker:up/down)
4. tsconfig.json has strict: true
5. .env.example has DATABASE_URL, REDIS_URL, RABBITMQ_URL with localhost defaults
</verification>

<success_criteria>
Root monorepo scaffold is complete. All foundational configuration files exist. Subsequent plans (01-b through 01-g) can create packages and apps that reference these root configs.
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-setup-infrastructure/01-a-SUMMARY.md`
</output>
