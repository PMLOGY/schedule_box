# Phase 1: Project Setup & Infrastructure - Research

**Researched:** 2026-02-10
**Domain:** Monorepo Infrastructure, Docker Development Environment, CI/CD Pipeline
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for the ScheduleBox project: a production-ready monorepo workspace with pnpm, Next.js 14 App Router, Docker Compose local development environment (PostgreSQL 16, Redis 7, RabbitMQ 3.13), and GitHub Actions CI/CD pipeline. The research confirms that the chosen stack (pnpm workspaces, Docker multi-stage builds, ESLint flat config, GitHub Actions with Trivy scanning) represents current best practices as of 2026.

The key technical challenges are: (1) TypeScript path alias configuration across workspace packages, (2) node_modules isolation in Docker with hot reload, and (3) coordinating dependency versions across 5+ workspace packages. All have established solutions documented below.

**Primary recommendation:** Use pnpm workspaces with simple scripts (not Turbo/Nx for Phase 1), Next.js standalone output for Docker production builds, ESLint 9 flat config with Prettier, and GitHub Actions with pnpm caching. Defer Turbo/Nx until Phase 10+ when build orchestration complexity justifies the overhead.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Monorepo Structure:**
- pnpm workspaces (not npm or yarn)
- Package layout from documentation:
  - `apps/web/` — Next.js 14 (App Router) frontend + API routes
  - `packages/database/` — Drizzle ORM schemas, migrations
  - `packages/shared/` — Shared types, utils, Zod schemas
  - `packages/events/` — RabbitMQ event definitions & helpers (CloudEvents format)
  - `packages/ui/` — Shared UI components (shadcn/ui based)
  - `services/` — Standalone microservices (AI, notifications — later phases)
  - `docker/` — Docker configs
  - `k8s/` — Kubernetes manifests (empty for now, Phase 15)
  - `.github/workflows/` — CI/CD pipelines

**Docker Environment:**
- Docker Compose for local development
- PostgreSQL 16 alpine (port 5432, user: schedulebox, db: schedulebox)
- Redis 7 alpine (port 6379)
- RabbitMQ 3.13 management alpine (ports 5672 + 15672 management UI)
- Health checks on all services with `depends_on: condition: service_healthy`
- Persistent volume for PostgreSQL data
- App container with volume mount for hot reload + node_modules isolation
- Next.js dev server on port 3000

**CI/CD Pipeline:**
- GitHub Actions
- Triggers: push to main/develop, PR to main
- Jobs: lint -> test-unit -> test-integration -> build -> deploy
- Node.js 20, pnpm for install
- Container registry: ghcr.io
- For Phase 1: only lint + type-check jobs (tests come in later phases)
- Trivy security scanning on Docker images

**Developer Tooling:**
- TypeScript strict mode across all packages
- ESLint with flat config
- Prettier for formatting
- Pre-commit hooks (husky + lint-staged)
- Conventional Commits enforced
- Branch naming: `segment/{name}/feature`

**Environment Variables:**
- `.env.example` with all variables documented
- `.env.local` for developer overrides (gitignored)
- Database: `DATABASE_URL=postgresql://schedulebox:schedulebox@localhost:5432/schedulebox`
- Redis: `REDIS_URL=redis://localhost:6379`
- RabbitMQ: `RABBITMQ_URL=amqp://guest:guest@localhost:5672`
- JWT secrets with placeholder values for dev

**Health Endpoints:**
- Every service exposes `GET /health` and `GET /readiness`
- Returns `{ status: "ok", service: "service-name", version: "x.y.z", timestamp: "ISO" }`

### Claude's Discretion

- Exact ESLint rule configuration (follow Next.js recommended + strict TypeScript)
- tsconfig paths and module resolution details
- Turbo/nx or plain pnpm scripts for task orchestration
- Specific pre-commit hook configuration details

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. All decisions derived from existing documentation.

</user_constraints>

---

## Standard Stack

### Core Technologies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm | 9.15+ | Package manager, workspace orchestration | Built for monorepos with content-addressable storage, strict node_modules prevents phantom dependencies, 2x faster than npm, industry standard for 2026 monorepos ([pnpm.io](https://pnpm.io/next/workspaces)) |
| Node.js | 20 LTS | Runtime environment | Current LTS, supported until 2026-04-30, required for Next.js 14 |
| Next.js | 14.2+ | Frontend framework + API routes | Stable App Router, standalone output for Docker, official ESLint flat config support ([Next.js docs](https://nextjs.org/docs/app/api-reference/config/eslint)) |
| TypeScript | 5.6+ | Type safety | Strict mode required, project references optional (add complexity, defer until Phase 10+) |
| ESLint | 9.x | Code linting | Flat config is primary direction as of 2026, Next.js 16 removes `next lint` ([ESLint blog](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/)) |
| Prettier | 3.x | Code formatting | Industry standard, integrates with ESLint via `eslint-config-prettier` |
| Docker | 27.x | Containerization | Multi-stage builds standard, health checks required for orchestration |
| Docker Compose | 2.x | Local dev orchestration | Version 3.8+ format, health check support with `service_healthy` condition |

### Supporting Tools

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| husky | 9.x | Git hooks | Pre-commit for lint-staged, commit-msg for conventional commits |
| lint-staged | 15.x | Stage file linting | Run ESLint/Prettier only on changed files, speeds up commits |
| @commitlint/cli | 19.x | Enforce commit format | Validate Conventional Commits format before commit |
| Trivy | latest | Docker security scanning | CI/CD scan for CRITICAL/HIGH vulnerabilities ([aquasecurity/trivy-action](https://github.com/aquasecurity/trivy-action)) |
| Zod | 3.x | Runtime validation | Validate all API inputs, generates TypeScript types from schemas ([Zod docs](https://zod.dev/)) |
| shadcn/ui | latest | UI component system | Built-in monorepo support via CLI, generates to `packages/ui` ([shadcn/ui monorepo](https://ui.shadcn.com/docs/monorepo)) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pnpm workspaces | Turbo or Nx | Turbo/Nx add build orchestration + caching. Defer until Phase 10+ when 10+ packages justify overhead. Plain pnpm sufficient for Phase 1-9. ([Turbo vs Nx comparison](https://nx.dev/docs/guides/adopting-nx/from-turborepo)) |
| ESLint flat config | .eslintrc.json | Flat config is official direction, .eslintrc deprecated in ESLint 9+ ([ESLint migration guide](https://eslint.org/docs/latest/use/configure/migration-guide)) |
| Next.js standalone | Full node_modules copy | Standalone reduces Docker image from ~1GB to ~100MB, production standard ([Next.js standalone docs](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output)) |

**Installation (root package.json):**
```bash
pnpm add -D -w typescript @types/node eslint prettier husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm add -D -w eslint-config-next eslint-config-prettier eslint-plugin-prettier
```

---

## Architecture Patterns

### Recommended Project Structure

```
schedulebox/
├── .github/
│   └── workflows/
│       └── ci.yml                   # Lint, type-check, build
├── apps/
│   └── web/                         # Next.js 14 app
│       ├── app/                     # App Router pages
│       ├── components/              # Page-specific components
│       ├── next.config.mjs
│       ├── tsconfig.json            # Extends root, adds path aliases
│       └── package.json             # workspace:* dependencies
├── packages/
│   ├── database/                    # Drizzle ORM (Phase 2)
│   │   ├── src/
│   │   │   ├── schema/              # Table definitions
│   │   │   └── migrations/          # SQL migrations
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   ├── shared/                      # Shared utilities
│   │   ├── src/
│   │   │   ├── types/               # Shared TypeScript types
│   │   │   ├── utils/               # Helper functions
│   │   │   └── schemas/             # Zod validation schemas
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── events/                      # RabbitMQ events (CloudEvents)
│   │   ├── src/
│   │   │   ├── definitions/         # Event type definitions
│   │   │   └── client.ts            # RabbitMQ client wrapper
│   │   └── package.json
│   └── ui/                          # shadcn/ui components
│       ├── src/
│       │   ├── components/          # Shared UI components
│       │   └── lib/                 # UI utilities
│       ├── tailwind.config.ts
│       └── package.json
├── services/                        # Microservices (Phase 8+)
├── docker/
│   ├── Dockerfile                   # Multi-stage build
│   └── docker-compose.yml           # Local dev environment
├── .dockerignore
├── .eslintrc.js                     # Flat config
├── .prettierrc.json
├── .env.example                     # All env vars documented
├── pnpm-workspace.yaml              # Workspace definition
├── package.json                     # Root scripts
└── tsconfig.json                    # Base config
```

### Pattern 1: pnpm Workspace Configuration

**What:** Define workspace packages and use `workspace:*` protocol for internal dependencies

**When to use:** Always in monorepos with pnpm

**Example:**
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
```

```json
// apps/web/package.json
{
  "name": "@schedulebox/web",
  "dependencies": {
    "@schedulebox/shared": "workspace:*",
    "@schedulebox/ui": "workspace:*",
    "@schedulebox/events": "workspace:*",
    "next": "14.2.21",
    "react": "^18.3.1"
  }
}
```

**Source:** [pnpm workspaces docs](https://pnpm.io/next/workspaces), [Complete Monorepo Guide](https://jsdev.space/complete-monorepo-guide/)

### Pattern 2: TypeScript Path Aliases for Workspace Packages

**What:** Configure tsconfig paths to import workspace packages without relative paths

**When to use:** When you need to import from `packages/*` in `apps/*`

**Example:**
```json
// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@schedulebox/shared": ["../../packages/shared/src"],
      "@schedulebox/shared/*": ["../../packages/shared/src/*"],
      "@schedulebox/ui": ["../../packages/ui/src"],
      "@schedulebox/ui/*": ["../../packages/ui/src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Gotcha:** Next.js only reads tsconfig from the app, not workspace packages. If `@schedulebox/ui` has path aliases, they won't resolve in `apps/web`. Solution: use `transpilePackages: ['@schedulebox/ui']` in next.config.mjs.

**Source:** [Next.js absolute imports docs](https://nextjs.org/docs/14/app/building-your-application/configuring/absolute-imports-and-module-aliases), [Turborepo discussion #620](https://github.com/vercel/turborepo/discussions/620)

### Pattern 3: Docker Multi-Stage Build with Next.js Standalone

**What:** Build Next.js in standalone mode, copy only traced dependencies to production stage

**When to use:** Always for production Docker images (reduces size by 90%)

**Example:**
```dockerfile
# Base: Install dependencies
FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Builder: Build Next.js app
FROM base AS builder
WORKDIR /app
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @schedulebox/web build

# Production: Copy standalone output
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
```

```javascript
// apps/web/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@schedulebox/ui', '@schedulebox/shared'],
};

export default nextConfig;
```

**Source:** [Next.js standalone output docs](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output), [Dockerizing Next.js 2025](https://medium.com/front-end-world/dockerizing-a-next-js-application-in-2025-bacdca4810fe)

### Pattern 4: Docker Compose with Health Checks and node_modules Isolation

**What:** Use named volumes to isolate container node_modules from host, prevent platform mismatch

**When to use:** Always for local development with hot reload

**Example:**
```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: schedulebox
      POSTGRES_USER: schedulebox
      POSTGRES_PASSWORD: schedulebox
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U schedulebox -d schedulebox']
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 3

  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    ports:
      - '5672:5672'
      - '15672:15672'
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    healthcheck:
      test: ['CMD', 'rabbitmq-diagnostics', 'check_running']
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
      target: base
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://schedulebox:schedulebox@postgres:5432/schedulebox
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - CHOKIDAR_USEPOLLING=true  # File watching for hot reload
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    volumes:
      - ..:/app                    # Mount project root
      - /app/node_modules          # Isolate node_modules (named volume)
      - /app/apps/web/node_modules # Isolate app node_modules
    command: pnpm --filter @schedulebox/web dev

volumes:
  postgres_data:
```

**Why node_modules isolation:** When you mount your host directory into the container, host node_modules (built for your OS) would overwrite container node_modules (built for Alpine Linux). Anonymous volumes `/app/node_modules` and `/app/apps/web/node_modules` prevent this by taking precedence.

**Source:** [Docker volumes and node_modules](https://medium.com/@justinecodez/docker-volumes-and-the-node-modules-conundrum-fef34c230225), [Docker hot reload guide 2026](https://oneuptime.com/blog/post/2026-01-06-docker-hot-reloading/view)

### Pattern 5: ESLint Flat Config with Prettier

**What:** Use ESLint 9 flat config (eslint.config.js) with Prettier integration

**When to use:** Always (ESLint 9+ deprecates .eslintrc)

**Example:**
```javascript
// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from 'eslint-config-next/core-web-vitals';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  nextPlugin,
  prettierConfig, // Must be last to override conflicts
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
    ],
  }
);
```

**Source:** [ESLint flat config evolution](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/), [Next.js ESLint 2026 guide](https://thelinuxcode.com/nextjs-eslint-a-practical-modern-guide-for-2026/)

### Pattern 6: GitHub Actions with pnpm Cache

**What:** Cache pnpm store directory to speed up CI builds

**When to use:** Always in CI/CD

**Example:**
```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'  # Built-in pnpm cache support

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint

      - run: pnpm type-check

  build:
    runs-on: ubuntu-latest
    needs: lint
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm --filter @schedulebox/web build

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/${{ github.repository }}:${{ github.sha }}
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
```

**Source:** [pnpm CI docs](https://pnpm.io/continuous-integration), [pnpm action-setup](https://github.com/pnpm/action-setup), [Trivy GitHub Actions](https://github.com/aquasecurity/trivy-action)

### Pattern 7: Pre-commit Hooks with Husky and lint-staged

**What:** Run linters only on staged files before commit

**When to use:** Always (prevents broken code from being committed)

**Example:**
```json
// package.json (root)
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no-install commitlint --edit "$1"
```

```javascript
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['database', 'backend', 'frontend', 'devops', 'docs'],
    ],
  },
};
```

**Monorepo gotcha:** Install husky and lint-staged only in root. If installed in each package, hooks won't run.

**Source:** [lint-staged monorepo setup](https://www.horacioh.com/writing/setup-lint-staged-on-a-monorepo/), [husky monorepo guide](https://fab1o.medium.com/how-to-setup-git-hooks-in-monorepo-1aed1e1ac8c2)

### Anti-Patterns to Avoid

- **Don't use TypeScript project references in Phase 1:** Adds complexity without benefit for 5 packages. Defer until 15+ packages cause slow type-checking. ([Colin Hacks: Live Types](https://colinhacks.com/essays/live-types-typescript-monorepo))
- **Don't install dependencies in each package separately:** Always use `pnpm install` at root to maintain lockfile integrity.
- **Don't copy entire node_modules to Docker:** Use Next.js standalone output to copy only traced dependencies (90% size reduction).
- **Don't skip .dockerignore:** Without it, .git, node_modules, .env files get copied to build context, exposing secrets and slowing builds.
- **Don't use different TypeScript versions across packages:** IDE will break. Keep one version in root package.json. ([pnpm discussion #6174](https://github.com/orgs/pnpm/discussions/6174))

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API input validation | Custom validation functions | Zod | Zod generates TypeScript types from schemas, eliminating duplication. Runtime validation catches bugs early. ([Zod docs](https://zod.dev/)) |
| RabbitMQ message format | Custom JSON structure | CloudEvents spec | CloudEvents is CNCF standard with binary and structured modes. Interoperable with Knative, Azure, AWS EventBridge. ([CloudEvents AMQP binding](https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/amqp-protocol-binding.md)) |
| Docker security scanning | Shell scripts | Trivy | Trivy scans for CVEs, misconfigurations, secrets, SBOM. Official GitHub Action with SARIF output. ([Trivy Action](https://github.com/aquasecurity/trivy-action)) |
| UI components | Custom design system | shadcn/ui | 50+ accessible components, monorepo CLI support, copy-paste approach (no runtime dependency). ([shadcn/ui monorepo](https://ui.shadcn.com/docs/monorepo)) |
| Conventional commits validation | Git hooks | commitlint | Enforces format, integrates with Husky, standard in 2026. ([commitlint docs](https://commitlint.js.org/)) |

**Key insight:** Infrastructure tooling (validation, messaging, security) has mature ecosystems. Custom solutions underestimate edge cases (Zod handles coercion, async validation, recursive types; CloudEvents handles message ordering, retries, dead-letter queues; Trivy has 200k+ CVE database). Focus custom development on business logic.

---

## Common Pitfalls

### Pitfall 1: TypeScript Path Aliases Not Resolving in Docker

**What goes wrong:** You configure path aliases in workspace package tsconfig, but imports fail when built in Docker.

**Why it happens:** TypeScript compiler doesn't rewrite import paths. If `@schedulebox/ui` imports from `@/components/button`, TypeScript output still has `@/components/button`, which Node.js can't resolve.

**How to avoid:**
1. Use relative imports in workspace packages: `import { Button } from './components/button'`
2. OR use `tsconfig-paths` to register aliases at runtime (adds dependency)
3. For Next.js apps, configure `transpilePackages` to compile workspace packages

**Warning signs:** `Error: Cannot find module '@/components/button'` when running Docker container.

**Source:** [Turborepo TypeScript paths discussion](https://github.com/vercel/turborepo/discussions/620)

### Pitfall 2: Docker Volume Mount Overwrites node_modules

**What goes wrong:** You mount project directory to container, hot reload works, but app crashes with "Cannot find module" errors.

**Why it happens:** Host node_modules (built for your OS) overwrites container node_modules (built for Alpine Linux). Binary modules like `bcrypt`, `sharp` fail because they're compiled for wrong platform.

**How to avoid:** Use anonymous volumes to isolate node_modules:
```yaml
volumes:
  - .:/app
  - /app/node_modules
  - /app/apps/web/node_modules
```

**Warning signs:** `Error: /app/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node: invalid ELF header`

**Source:** [Docker volumes and node_modules](https://medium.com/@justinecodez/docker-volumes-and-the-node-modules-conundrum-fef34c230225)

### Pitfall 3: pnpm Phantom Dependencies Breaking Build

**What goes wrong:** Import works locally but fails in CI: `Cannot find module 'lodash'`

**Why it happens:** With npm/yarn hoisting, you can import packages not in your package.json (because they're dependencies of dependencies). pnpm's strict node_modules prevents this. Your code has a phantom dependency.

**How to avoid:**
1. When you see "Cannot find module X", run `pnpm add X` in the package that imports it
2. Embrace the error — pnpm is exposing a real bug (missing dependency declaration)

**Warning signs:** Code works with npm, fails with pnpm.

**Source:** [pnpm hoisting discussion #6367](https://github.com/orgs/pnpm/discussions/6367)

### Pitfall 4: Secrets Leaked in Docker Image

**What goes wrong:** You build Docker image, push to ghcr.io, later discover .env file with production secrets is inside the image.

**Why it happens:** No .dockerignore file, so COPY . . includes .env, .env.local, .git directory with commit history.

**How to avoid:** Create .dockerignore:
```
# .dockerignore
.git
.env
.env.local
.env.*.local
node_modules
.next
dist
coverage
*.log
.DS_Store
```

**Warning signs:** Docker build context is 500MB+ (should be <50MB without node_modules).

**Source:** [Node.js Docker best practices](https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/), [Container security 2026](https://www.ox.security/blog/container-security-best-practices/)

### Pitfall 5: Inconsistent Dependency Versions Across Packages

**What goes wrong:** `@schedulebox/web` uses React 18.3.1, `@schedulebox/ui` uses React 18.2.0. Build works locally, fails in CI with type errors.

**Why it happens:** Each package has its own package.json. Someone updates React in one package but not others.

**How to avoid:**
1. Use pnpm Catalogs (define versions in pnpm-workspace.yaml, reference by name)
2. OR use root package.json with `pnpm add -w react` to install at workspace root
3. Add `pnpm list react` to CI to detect version mismatches

**Warning signs:** `pnpm list <package>` shows multiple versions.

**Source:** [pnpm Catalogs](https://makerkit.dev/docs/nextjs-drizzle/installation/setup-dependencies), [Monorepo insights](https://medium.com/ekino-france/monorepo-insights-nx-turborepo-and-pnpm-3-4-751384b5a6db)

### Pitfall 6: Health Check Starts Before Service Ready

**What goes wrong:** Docker Compose starts app container immediately after postgres container starts, app crashes because database isn't accepting connections yet.

**Why it happens:** Container "started" ≠ service "ready". PostgreSQL takes 5-10 seconds to initialize.

**How to avoid:** Use health checks with `depends_on: condition: service_healthy`:
```yaml
postgres:
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U schedulebox -d schedulebox']
    interval: 5s
    timeout: 5s
    retries: 5
    start_period: 10s

app:
  depends_on:
    postgres:
      condition: service_healthy
```

**Warning signs:** App logs show "Connection refused" or "ECONNREFUSED" on first startup.

**Source:** [Docker health checks 2026](https://oneuptime.com/blog/post/2026-01-16-docker-compose-depends-on-healthcheck/view), [Docker Compose health checks guide](https://last9.io/blog/docker-compose-health-checks/)

### Pitfall 7: ESLint Flat Config Not Found

**What goes wrong:** You create eslint.config.js, run `pnpm lint`, get error: "ESLint couldn't find a configuration file."

**Why it happens:** ESLint 9 requires flat config as ESM (export default) or CJS (module.exports). If you use .mjs extension but write CJS syntax, it fails.

**How to avoid:**
1. Use .js extension with `"type": "module"` in package.json
2. OR use .mjs extension with ESM syntax (`export default`)
3. OR use .cjs extension with CJS syntax (`module.exports =`)

**Warning signs:** "Unexpected token 'export'" or "Cannot use import statement outside a module"

**Source:** [ESLint flat config migration](https://eslint.org/docs/latest/use/configure/migration-guide)

---

## Code Examples

Verified patterns from official sources:

### Health Check Endpoint

```typescript
// apps/web/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'schedulebox-web',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
```

**Source:** ScheduleBox documentation section 48

### Zod Validation Middleware

```typescript
// packages/shared/src/middleware/validate.ts
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';

export function validateRequest<T extends ZodSchema>(schema: T) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            code: 'INVALID_INPUT',
            message: 'Request validation failed',
            details: error.errors,
          },
          { status: 400 }
        );
      }
      throw error;
    }
  };
}
```

**Source:** [Zod REST API validation](https://jeffsegovia.dev/blogs/rest-api-validation-using-zod), ScheduleBox error format standard

### CloudEvents Message Structure

```typescript
// packages/events/src/definitions/booking-created.ts
import { z } from 'zod';

export const BookingCreatedEventSchema = z.object({
  specversion: z.literal('1.0'),
  type: z.literal('com.schedulebox.booking.created'),
  source: z.string().url(),
  id: z.string().uuid(),
  time: z.string().datetime(),
  datacontenttype: z.literal('application/json'),
  data: z.object({
    bookingId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    customerId: z.number().int().positive(),
    serviceId: z.number().int().positive(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    status: z.enum(['pending', 'confirmed', 'cancelled']),
  }),
});

export type BookingCreatedEvent = z.infer<typeof BookingCreatedEventSchema>;
```

**Source:** [CloudEvents spec](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md), [AMQP protocol binding](https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/amqp-protocol-binding.md)

### pnpm Workspace Scripts

```json
// package.json (root)
{
  "scripts": {
    "dev": "pnpm --filter @schedulebox/web dev",
    "build": "pnpm --filter @schedulebox/web build",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "prepare": "husky install"
  }
}
```

**Source:** [pnpm filter docs](https://pnpm.io/filtering)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| .eslintrc.json | eslint.config.js (flat config) | ESLint 9.0 (2024-04) | Flat config is more explicit, supports ESM, better conflict resolution |
| npm/yarn | pnpm | Mainstream 2023+ | 2x faster installs, strict node_modules prevents phantom dependencies |
| Copy full node_modules to Docker | Next.js standalone output | Next.js 12 (2021-10) | 90% size reduction (1GB → 100MB) |
| eslint-plugin-prettier | eslint-config-prettier | 2022+ | Config-only approach simpler, faster, no plugin conflicts |
| Separate Docker Compose for dev/test | Docker Compose with profiles | Docker Compose 2.x | Single file with `--profile` flag for different environments |
| Manual security scanning | Trivy in CI/CD | 2024+ standard | Automated CVE scanning with 200k+ vulnerability database |

**Deprecated/outdated:**
- **.eslintrc.json:** Deprecated in ESLint 9+, removed in ESLint 10 (expected 2026-06)
- **npm ci:** pnpm is 2x faster and prevents phantom dependencies
- **Docker Compose v2 format:** v3.8+ format supports health checks and longer timeout syntax
- **husky v4:** v9 has simpler setup (no need for .huskyrc.json)

---

## Open Questions

1. **Turbo vs plain pnpm for build orchestration**
   - What we know: Turbo adds caching and parallel execution. Plain pnpm sufficient for Phase 1-9 (5 packages).
   - What's unclear: At what package count does Turbo's overhead become worth it?
   - Recommendation: Defer Turbo until Phase 10+. Document decision point: if `pnpm build` takes >5min OR 10+ interdependent packages, migrate to Turbo.

2. **TypeScript project references for monorepo**
   - What we know: Project references speed up type-checking by only re-checking changed packages. Add complexity (composite: true, references array, build order).
   - What's unclear: Performance benefit for 5 packages vs setup overhead.
   - Recommendation: Skip for Phase 1-9. Re-evaluate in Phase 10 if `tsc --noEmit` takes >60s.

3. **Single GitHub Actions workflow vs matrix strategy**
   - What we know: Single workflow simpler, matrix strategy runs jobs in parallel per package.
   - What's unclear: Does GitHub Actions runner pool limit parallel jobs in free tier?
   - Recommendation: Start with single workflow. If CI time >10min, migrate to matrix strategy with `--filter` per package.

---

## Sources

### Primary (HIGH confidence)

- [pnpm workspaces documentation](https://pnpm.io/next/workspaces) - Workspace protocol, filtering, monorepo setup
- [Next.js standalone output docs](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output) - Docker production builds
- [ESLint flat config evolution](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/) - defineConfig, globalIgnores, extends
- [CloudEvents AMQP protocol binding](https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/amqp-protocol-binding.md) - RabbitMQ message format
- [Zod documentation](https://zod.dev/) - Schema validation, type inference
- [shadcn/ui monorepo docs](https://ui.shadcn.com/docs/monorepo) - UI component monorepo setup
- [Trivy GitHub Action](https://github.com/aquasecurity/trivy-action) - Security scanning integration
- ScheduleBox complete documentation (lines 7101-7650) - Docker Compose, CI/CD, environment variables, observability

### Secondary (MEDIUM confidence)

- [Complete Monorepo Guide: pnpm + Workspace](https://jsdev.space/complete-monorepo-guide/) - Workspace protocol, changesets, TypeScript paths
- [Docker Compose health checks 2026](https://oneuptime.com/blog/post/2026-01-16-docker-compose-depends-on-healthcheck/view) - service_healthy condition
- [Dockerizing Next.js 2025](https://medium.com/front-end-world/dockerizing-a-next-js-application-in-2025-bacdca4810fe) - Multi-stage builds, standalone mode
- [ESLint Prettier flat config 2026](https://medium.com/@madhan.gannarapu/how-to-set-up-eslint-9-with-prettier-in-node-js-flat-config-typescript-0eb1755f83cd) - Integration patterns
- [pnpm CI documentation](https://pnpm.io/continuous-integration) - Caching strategies
- [Docker volumes and node_modules](https://medium.com/@justinecodez/docker-volumes-and-the-node-modules-conundrum-fef34c230225) - node_modules isolation
- [Node.js Docker best practices](https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/) - .dockerignore, multi-stage builds
- [Colin Hacks: Live types in TypeScript monorepo](https://colinhacks.com/essays/live-types-typescript-monorepo) - Project references critique

### Tertiary (LOW confidence)

- [Turbo vs Nx comparison](https://nx.dev/docs/guides/adopting-nx/from-turborepo) - Migration guide (Nx-biased, need neutral source)
- [pnpm Catalogs early adopter](https://makerkit.dev/docs/nextjs-drizzle/installation/setup-dependencies) - Install times 45s→18s (single data point, need verification)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs, npm registry stats, 2026 guides confirm pnpm/Next.js 14/ESLint 9 as current
- Architecture: HIGH - Official Next.js standalone, Docker multi-stage, pnpm workspace patterns well-documented
- Pitfalls: MEDIUM - Drawn from issue trackers and Medium posts, not all officially documented
- Code examples: HIGH - Verified against official docs and ScheduleBox documentation

**Research date:** 2026-02-10
**Valid until:** 2026-05-10 (90 days - stable infrastructure domain)

**Key uncertainties:**
- Turbo vs plain pnpm tradeoff (defer decision to Phase 10)
- TypeScript project references value (defer to Phase 10)
- GitHub Actions runner pool limits (test empirically)
