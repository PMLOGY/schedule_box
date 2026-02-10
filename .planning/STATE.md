# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** Phase 2 — Database Schema & Drizzle ORM

## Position

- **Milestone:** v1.0
- **Phase:** 2 of 15 — Database Schema & Drizzle ORM
- **Status:** In Progress
- **Current Plan:** 8 of TBD in Phase 02
- **Plans Executed:** 15

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
- [x] Plan 02-03: Core Entity schemas (2 tasks, 2 commits)
- [x] Plan 02-04: Bookings & Payments schema (2 tasks, 2 commits)
- [x] Plan 02-05: Business Features schema (2 tasks, 2 commits)
- [x] Plan 02-06: Platform Tables schema (2 tasks, 1 commit - merged with parallel plans)
- [x] Plan 02-07: Row Level Security policies (1 task, 1 commit)
- [x] Plan 02-09: Database Functions & Constraints (2 tasks, 2 commits)

## What's Next

Phase 1: Complete ✅
Phase 2: In Progress - All schemas complete (46 tables + 8 SQL function files + RLS policies)

Next: Generate Drizzle migrations and apply SQL functions and RLS to PostgreSQL

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
- [Phase 02-03]: Soft delete pattern via deletedAt column on customers, services, and employees tables
- [Phase 02-03]: Working hours support both company-level defaults (employeeId NULL) and per-employee overrides
- [Phase 02-03]: Resource quantity tracking supports fractional allocation via quantity_needed field
- [Phase 02-03]: AI-computed fields added to customers (health_score, clv_predicted, no_show_count)
- [Phase 02-04]: Deferred FK pattern for coupon_id, gift_card_id, video_meeting_id allows parallel Wave 2 execution
- [Phase 02-04]: Booking pricing snapshots capture price, currency, discount at booking time for audit trail
- [Phase 02-04]: Payment gateway composite index (gateway, gateway_transaction_id) enables idempotency checks
- [Phase 02-04]: Invoice unique constraint (company_id, invoice_number) enforces per-company numbering
- [Phase 02-05]: Integer array type for applicable_service_ids instead of junction table for flexibility
- [Phase 02-05]: NULL maxUses/maxRedemptions means unlimited rather than requiring large numbers
- [Phase 02-05]: Single loyalty program per company enforced via UNIQUE(company_id) constraint
- [Phase 02-05]: Dual points_balance and stamps_balance on cards for flexible program types
- [Phase 02-05]: JSONB benefits field for extensible tier configuration in loyalty programs
- [Phase 02-06]: varchar(45) for IP addresses instead of inet type (Drizzle ORM compatibility)
- [Phase 02-06]: ai_model_metrics as global table without company_id for system-wide ML metrics
- [Phase 02-06]: audit_logs.company_id nullable to preserve audit trail after company deletion
- [Phase 02-06]: Partial index on notifications.scheduled_at WHERE status='pending' for queue efficiency
- [Phase 02-06]: DESC index on marketplace.average_rating for featured listing optimization
- [Phase 02-07]: RLS enabled on 29 tables with company_id for database-level multi-tenant isolation
- [Phase 02-07]: Junction tables and global tables skip RLS (accessed through parent FK or system-wide)
- [Phase 02-07]: Session variable-based RLS using current_company_id(), current_user_role(), current_user_id()
- [Phase 02-07]: Dual policy pattern (tenant_isolation + admin_bypass) for all RLS-enabled tables
- [Phase 02-07]: Customer self-access policy allows customers to SELECT their own bookings via user_id match
- [Phase 02-09]: btree_gist exclusion constraint for double-booking prevention (defense in depth)
- [Phase 02-09]: Partial indexes on deleted_at IS NULL optimize soft-delete queries (deleted_at columns in Drizzle)
- [Phase 02-09]: Dynamic trigger application via DO $$ loop for updated_at columns
- [Phase 02-09]: Audit trail triggers on 5 critical tables (bookings, customers, services, employees, payments)

## Blockers

None — ready to start implementation.

## Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Requirements | 103 | 0 implemented |
| Phases | 15 | 1 complete, 1 in progress |
| DB Tables | 47 | 46 (all schemas defined, awaiting migrations) |
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
| 02-03 | 139s | 2 | 5 | 2 |
| 02-04 | 328s | 2 | 3 | 2 |
| 02-05 | 444s | 2 | 4 | 2 |
| 02-06 | 485s | 2 | 9 | 1 |
| 02-07 | 146s | 1 | 2 | 1 |
| 02-09 | 113s | 2 | 8 | 2 |

## Session Info

**Last session:** 2026-02-10T19:51:00Z
**Stopped at:** Completed 02-07-PLAN.md (Row Level Security)

---
*Last updated: 2026-02-10T19:51:00Z after completing Plan 02-07*
