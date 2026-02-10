# ScheduleBox — State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization
**Current focus:** Phase 1 — Project Setup & Infrastructure

## Position

- **Milestone:** v1.0
- **Phase:** 1 of 15 — Project Setup & Infrastructure
- **Status:** Not started
- **Plans:** 0 created, 0 executed

## What's Done

- [x] Documentation complete (v13.0 FINAL, 9785 lines)
- [x] GSD planning artifacts created (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, config.json)
- [x] 103 requirements defined across 17 categories
- [x] 15 phases mapped across 4 milestones

## What's Next

Phase 1: Project Setup & Infrastructure
- Initialize monorepo with pnpm workspaces
- Set up Docker Compose environment
- Configure CI/CD pipeline
- Set up linting and formatting

## Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 14 monorepo | App Router + API routes + standalone microservices for AI/notifications | -- Pending |
| Drizzle ORM over Prisma | Better SQL control, migration flexibility, lighter weight | -- Pending |
| RabbitMQ over Kafka | Simpler for target scale (5000 businesses), sufficient throughput | -- Pending |
| Cloudflare R2 over AWS S3 | Cost-effective, S3-compatible API | -- Pending |
| PostgreSQL full-text search | Simpler than Elasticsearch, sufficient for v1 | -- Pending |
| Choreography SAGA | Event-driven, decoupled, fits RabbitMQ architecture | -- Pending |
| 4 parallel segments | DATABASE, BACKEND, FRONTEND, DEVOPS for parallel development | -- Pending |

## Blockers

None — ready to start implementation.

## Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Requirements | 103 | 0 implemented |
| Phases | 15 | 0 complete |
| DB Tables | 47 | 0 |
| API Endpoints | 99 | 0 |
| Frontend Components | 32+ | 0 |
| Test Coverage | 80% | 0% |

---
*Last updated: 2026-02-10 after GSD upgrade*
