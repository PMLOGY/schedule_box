# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** Phase 2 — Database Schema & Drizzle ORM

## Position

- **Milestone:** v1.0
- **Phase:** 2 of 15 — Database Schema & Drizzle ORM
- **Status:** In Progress
- **Current Plan:** 3 of TBD in Phase 02
- **Plans Executed:** 9

## What's Done

- [x] Documentation complete (v13.0 FINAL, 9785 lines)
- [x] GSD planning artifacts created (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, config.json)
- [x] 103 requirements defined across 17 categories
- [x] 15 phases mapped across 4 milestones
- [x] Plan 01-a: Root monorepo scaffold (3 tasks, 3 commits)
- [x] Plan 01-b: Workspace packages stub (2 tasks, 2 commits)
- [x] Plan 01-c: Next.js 14 app setup (2 tasks, 1 commit)
- [x] Plan 01-d: Docker environment (2 tasks, 2 commits)
- [x] Plan 01-e: Developer tooling configuration (3 tasks, 3 commits)
- [x] Plan 01-f: GitHub Actions CI/CD pipeline (2 tasks, 2 commits)
- [x] Plan 01-g: Health endpoints and monorepo validation (2 tasks, 2 commits)
- [x] Plan 02-01: Drizzle ORM infrastructure setup (2 tasks, 2 commits)
- [x] Plan 02-02: Auth & Tenancy schema (2 tasks, 2 commits)

## What's Next

Phase 1: Complete ✅
Phase 2: In Progress - Auth & tenancy schema complete (8 tables)

Next: Define remaining schema groups (booking, customer, services)

## Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 14 monorepo | App Router + API routes + standalone microservices for AI/notifications | Implemented (01-c) |
| Drizzle ORM over Prisma | Better SQL control, migration flexibility, lighter weight | Implemented (02-01) |
| RabbitMQ over Kafka | Simpler for target scale (5000 businesses), sufficient throughput | -- Pending |
| Cloudflare R2 over AWS S3 | Cost-effective, S3-compatible API | -- Pending |
| PostgreSQL full-text search | Simpler than Elasticsearch, sufficient for v1 | -- Pending |
| Choreography SAGA | Event-driven, decoupled, fits RabbitMQ architecture | -- Pending |
| 4 parallel segments | DATABASE, BACKEND, FRONTEND, DEVOPS for parallel development | -- Pending |
| pnpm@9.15.4 package manager | Fast, strict workspace resolution, disk-efficient | Implemented (01-a) |
| ESM-first (type: module) | Modern tooling support (ESLint flat config, Vite) | Implemented (01-a) |
| TypeScript strict mode base | Catch type errors early across all packages | Implemented (01-a) |
| shamefully-hoist=false | Strict dependency isolation between packages | Implemented (01-a) |
| Docker Compose v3.8 | Stable spec with health check support | Implemented (01-d) |
| Alpine-based images | Minimal size, fast startup, security-focused | Implemented (01-d) |
| Multi-stage Dockerfile | Separate dev/prod concerns, minimal production image | Implemented (01-d) |
| Non-root user in production | Security best practice, reduces attack surface | Implemented (01-d) |
- [Phase 01-e]: ESLint 9 flat config with TypeScript strict rules established as code quality baseline
- [Phase 01-e]: Conventional Commits with segment-based scopes enforced via commitlint
- [Phase 01-e]: Pre-commit hooks run lint-staged for automatic code quality enforcement
- [Phase 01-f]: GitHub Actions CI/CD pipeline validates every push/PR with lint and type-check
- [Phase 01-f]: Docker images built on main branch only and pushed to ghcr.io with Trivy security scanning
- [Phase 01-f]: Dependency review workflow denies copyleft licenses (AGPL, GPL) for SaaS compatibility
- [Phase 01-g]: Health endpoint provides liveness probe for Docker and Kubernetes
- [Phase 01-g]: Readiness endpoint checks service connectivity with per-service status
- [Phase 01-g]: Phase 1 readiness checks only env var presence, actual connections added in Phase 2
- [Phase 02-01]: Drizzle ORM with postgres driver (ESM-compatible) configured with connection pooling
- [Phase 02-01]: Separate migration client (max: 1) and query client (max: 10) for transactional safety
- [Phase 02-01]: Runtime DATABASE_URL validation instead of non-null assertions for better error messages
- [Phase 02-02]: Auth & tenancy schema uses unique() for (email, company_id) multi-tenancy
- [Phase 02-02]: PostgreSQL text[] array type for API key scopes with default empty array

## Blockers

None — ready to start implementation.

## Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Requirements | 103 | 0 implemented |
| Phases | 15 | 1 complete, 1 in progress |
| DB Tables | 47 | 8 (auth & tenancy) |
| API Endpoints | 99 | 2 (/api/health, /api/readiness) |
| Frontend Components | 32+ | 0 |
| Test Coverage | 80% | 0% |

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files | Commits |
|------------|----------|-------|-------|---------|
| 01-a | 89s | 3 | 9 | 3 |
| 01-b | 115s | 2 | 18 | 2 |
| 01-c | 114s | 2 | 8 | 1 |
| 01-d | 81s | 2 | 2 | 2 |
| 01-e | 116s | 3 | 7 | 3 |
| 01-f | 46s | 2 | 2 | 2 |
| 01-g | 203s | 2 | 5 | 2 |
| 02-02 | 240s | 2 | 2 | 2 |

## Session Info

**Last session:** 2026-02-10T19:45:00Z
**Stopped at:** Completed 02-02-PLAN.md (Auth & Tenancy Schema)

---
*Last updated: 2026-02-10T19:45:00Z after completing Plan 02-02*
