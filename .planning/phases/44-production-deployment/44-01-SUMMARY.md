---
phase: 44-production-deployment
plan: 01
subsystem: devops
tags: [docker, deployment, env-validation, production]
dependency_graph:
  requires: [docker/Dockerfile]
  provides: [docker/docker-compose.prod.yml, apps/web/lib/env.ts, apps/web/instrumentation.ts]
  affects: [.env.example]
tech_stack:
  added: []
  patterns: [zod-env-validation, next-instrumentation, docker-compose-profiles]
key_files:
  created:
    - docker/docker-compose.prod.yml
    - apps/web/lib/env.ts
    - apps/web/instrumentation.ts
  modified:
    - .env.example
decisions:
  - "Migration service uses builder target with profiles:['migrate'] for on-demand schema updates"
  - "Postgres and redis ports not exposed to host in prod compose (internal Docker network only)"
  - "Env validation runs via Next.js instrumentation hook on nodejs runtime only (not Edge)"
  - "JWT secret minimum 16 chars enforced only in production mode"
metrics:
  duration: ~2 minutes
  completed: 2026-03-13T16:50:15Z
  tasks_completed: 1
  tasks_total: 1
  files_created: 3
  files_modified: 1
---

# Phase 44 Plan 01: Production Docker Compose & Env Validation Summary

Production Docker Compose with app/postgres/redis services plus Zod-based env validation that catches missing required vars on Next.js server startup.

## What Was Built

### 1. Production Docker Compose (`docker/docker-compose.prod.yml`)

Three core services on a dedicated `schedulebox` bridge network:

- **postgres**: PostgreSQL 16-alpine with healthcheck, persistent volume, password from env
- **redis**: Redis 7-alpine with AOF persistence, 256MB max memory, LRU eviction
- **app**: Builds from existing Dockerfile `target: production` (standalone output, non-root user). Overrides DATABASE_URL and REDIS_URL for Docker networking. Depends on healthy postgres and redis.
- **migrate**: One-off migration service using `builder` target with pnpm. Available via `docker compose --profile migrate up migrate`. Runs `db:migrate` and `db:apply-sql`.

No RabbitMQ, AI service, or notification-worker included (per requirements).

### 2. Environment Validation (`apps/web/lib/env.ts`)

Zod schema with required/optional split:
- **Required**: DATABASE_URL (must start with `postgresql://`), REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, NEXT_PUBLIC_APP_URL
- **Production enforcement**: JWT secrets must be 16+ characters in production
- **Optional with defaults**: NODE_ENV, PORT, JWT expiry, TZ
- **Optional services**: SMTP, Comgate, Twilio, AI, CRON_SECRET

Exports `validateEnv()` (throws with clear per-variable errors) and lazy `env` proxy for type-safe access.

### 3. Instrumentation Hook (`apps/web/instrumentation.ts`)

Next.js instrumentation file that calls `validateEnv()` on server startup (nodejs runtime only, skips Edge).

### 4. Updated `.env.example`

- Added `POSTGRES_PASSWORD` for Docker Compose postgres service
- Added clear section headers: "Required for production" vs "Optional / has defaults"
- Added `COMGATE_TEST_MODE`, `COMGATE_RECURRING_ENABLED`
- Added `SMS_COST_PER_SEGMENT_CZK`, `SMS_MONTHLY_COST_LIMIT_CZK`
- Added `PLATFORM_COMPANY_NAME`, `PLATFORM_ICO`, `PLATFORM_DIC`, `PLATFORM_ADDRESS`

## Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Production Docker Compose and env validation | c849305 | docker/docker-compose.prod.yml, apps/web/lib/env.ts, apps/web/instrumentation.ts, .env.example |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- All 4 files created/modified successfully
- TypeScript compilation passes without errors
- Prettier/ESLint pre-commit hooks passed
- POSTGRES_PASSWORD present in .env.example (2 occurrences)
- docker-compose.prod.yml has exactly 3 core services + 1 migrate profile service
