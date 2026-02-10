# Phase 1: Project Setup & Infrastructure - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Initialize the monorepo workspace, Docker development environment, CI/CD pipeline, and developer tooling. After this phase, any developer can clone, install, and run the full stack locally with one command. No business logic — pure infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Monorepo Structure
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

### Docker Environment
- Docker Compose for local development
- PostgreSQL 16 alpine (port 5432, user: schedulebox, db: schedulebox)
- Redis 7 alpine (port 6379)
- RabbitMQ 3.13 management alpine (ports 5672 + 15672 management UI)
- Health checks on all services with `depends_on: condition: service_healthy`
- Persistent volume for PostgreSQL data
- App container with volume mount for hot reload + node_modules isolation
- Next.js dev server on port 3000

### CI/CD Pipeline
- GitHub Actions
- Triggers: push to main/develop, PR to main
- Jobs: lint -> test-unit -> test-integration -> build -> deploy
- Node.js 20, pnpm for install
- Container registry: ghcr.io
- For Phase 1: only lint + type-check jobs (tests come in later phases)
- Trivy security scanning on Docker images

### Developer Tooling
- TypeScript strict mode across all packages
- ESLint with flat config
- Prettier for formatting
- Pre-commit hooks (husky + lint-staged)
- Conventional Commits enforced
- Branch naming: `segment/{name}/feature` (e.g., `segment/database/feature-name`)

### Environment Variables
- `.env.example` with all variables documented (from doc section 38)
- `.env.local` for developer overrides (gitignored)
- Database: `DATABASE_URL=postgresql://schedulebox:schedulebox@localhost:5432/schedulebox`
- Redis: `REDIS_URL=redis://localhost:6379`
- RabbitMQ: `RABBITMQ_URL=amqp://guest:guest@localhost:5672`
- JWT secrets with placeholder values for dev
- Node env: development

### Health Endpoints
- Every service exposes `GET /health` (liveness) and `GET /readiness` (readiness)
- Returns `{ status: "ok", service: "service-name", version: "x.y.z", timestamp: "ISO" }`
- Used by Docker health checks and later by Kubernetes probes

### Claude's Discretion
- Exact ESLint rule configuration (follow Next.js recommended + strict TypeScript)
- tsconfig paths and module resolution details
- Turbo/nx or plain pnpm scripts for task orchestration
- Specific pre-commit hook configuration details

</decisions>

<specifics>
## Specific Ideas

- Documentation is the single source of truth: `schedulebox_complete_documentation.md`
- All code in English (variables, comments, commits), documentation in Czech
- Multi-stage Dockerfile pattern from documentation section 37.1 (base -> builder -> production)
- Docker Compose spec from documentation section 37.2
- CI/CD workflow from documentation section 36.1
- Error format standard: `{ error: string, code: string, message: string, details?: any }`
- API prefix: all endpoints under `/api/v1/`
- UUIDs for public-facing IDs, SERIAL for internal DB IDs
- Timezone: Europe/Prague, all timestamps as TIMESTAMPTZ

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. All decisions derived from existing documentation.

</deferred>

---

*Phase: 01-project-setup-infrastructure*
*Context gathered: 2026-02-10*
