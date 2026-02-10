---
phase: 01-project-setup-infrastructure
plan: d
type: execute
wave: 2
depends_on: ["01-a"]
files_modified:
  - docker/docker-compose.yml
  - docker/Dockerfile
autonomous: true

must_haves:
  truths:
    - "docker compose up starts PostgreSQL 16, Redis 7, and RabbitMQ 3.13"
    - "All three services pass health checks before app starts"
    - "PostgreSQL data persists across container restarts via named volume"
    - "App container mounts source with hot reload and isolated node_modules"
    - "RabbitMQ management UI is accessible on port 15672"
  artifacts:
    - path: "docker/docker-compose.yml"
      provides: "Docker Compose local development environment"
      contains: "postgres:16-alpine"
    - path: "docker/Dockerfile"
      provides: "Multi-stage Docker build for Next.js"
      contains: "standalone"
  key_links:
    - from: "docker/docker-compose.yml"
      to: "docker/Dockerfile"
      via: "build context reference"
      pattern: "dockerfile: docker/Dockerfile"
    - from: "docker/docker-compose.yml"
      to: ".env.example"
      via: "environment variables"
      pattern: "DATABASE_URL|REDIS_URL|RABBITMQ_URL"
---

<objective>
Create the Docker Compose development environment and multi-stage Dockerfile for the Next.js application.

Purpose: Enables `docker compose up` to start the complete local development stack (PostgreSQL, Redis, RabbitMQ, Next.js app) with health checks, persistent storage, and hot reload.

Output: docker/docker-compose.yml and docker/Dockerfile ready for local development.
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
@.planning/phases/01-project-setup-infrastructure/01-a-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Docker Compose for local development</name>
  <files>
    docker/docker-compose.yml
  </files>
  <action>
    Create `docker/docker-compose.yml` per CONTEXT.md locked decisions:

    ```yaml
    version: '3.8'

    services:
      postgres:
        image: postgres:16-alpine
        container_name: schedulebox-postgres
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
        restart: unless-stopped

      redis:
        image: redis:7-alpine
        container_name: schedulebox-redis
        ports:
          - '6379:6379'
        volumes:
          - redis_data:/data
        healthcheck:
          test: ['CMD', 'redis-cli', 'ping']
          interval: 5s
          timeout: 3s
          retries: 3
        command: redis-server --appendonly yes
        restart: unless-stopped

      rabbitmq:
        image: rabbitmq:3.13-management-alpine
        container_name: schedulebox-rabbitmq
        ports:
          - '5672:5672'
          - '15672:15672'
        environment:
          RABBITMQ_DEFAULT_USER: guest
          RABBITMQ_DEFAULT_PASS: guest
        volumes:
          - rabbitmq_data:/var/lib/rabbitmq
        healthcheck:
          test: ['CMD', 'rabbitmq-diagnostics', 'check_running']
          interval: 10s
          timeout: 5s
          retries: 5
          start_period: 15s
        restart: unless-stopped

      app:
        build:
          context: ..
          dockerfile: docker/Dockerfile
          target: development
        container_name: schedulebox-app
        ports:
          - '3000:3000'
        environment:
          - NODE_ENV=development
          - DATABASE_URL=postgresql://schedulebox:schedulebox@postgres:5432/schedulebox
          - REDIS_URL=redis://redis:6379
          - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
          - NEXT_TELEMETRY_DISABLED=1
          - CHOKIDAR_USEPOLLING=true
          - WATCHPACK_POLLING=true
        depends_on:
          postgres:
            condition: service_healthy
          redis:
            condition: service_healthy
          rabbitmq:
            condition: service_healthy
        volumes:
          - ..:/app
          - /app/node_modules
          - /app/apps/web/node_modules
          - /app/apps/web/.next
        command: pnpm --filter @schedulebox/web dev
        restart: unless-stopped

    volumes:
      postgres_data:
      redis_data:
      rabbitmq_data:
    ```

    Key decisions per CONTEXT.md:
    - PostgreSQL 16 alpine with pg_isready health check
    - Redis 7 alpine with AOF persistence and redis-cli ping health check
    - RabbitMQ 3.13 management alpine with management UI on 15672
    - App container targets "development" stage of Dockerfile
    - node_modules isolation via anonymous volumes prevents platform mismatch
    - WATCHPACK_POLLING=true for Next.js file watching in Docker
    - .next directory also isolated to prevent host/container conflicts
    - Named volumes for data persistence across restarts
  </action>
  <verify>
    - File `docker/docker-compose.yml` exists
    - Contains postgres:16-alpine, redis:7-alpine, rabbitmq:3.13-management-alpine
    - All three infrastructure services have healthcheck sections
    - App service has depends_on with condition: service_healthy for all three
    - node_modules isolation volumes are declared
    - Named volumes section declares postgres_data, redis_data, rabbitmq_data
  </verify>
  <done>Docker Compose file defines complete local development stack with health checks, persistent volumes, and node_modules isolation.</done>
</task>

<task type="auto">
  <name>Task 2: Create multi-stage Dockerfile</name>
  <files>
    docker/Dockerfile
  </files>
  <action>
    Create `docker/Dockerfile` with three stages per RESEARCH.md Pattern 3:

    ```dockerfile
    # =============================================================================
    # Stage 1: Base - Install dependencies
    # =============================================================================
    FROM node:20-alpine AS base

    # Enable corepack for pnpm
    RUN corepack enable pnpm

    WORKDIR /app

    # Copy workspace configuration first (for better layer caching)
    COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./

    # Copy all package.json files for workspace resolution
    COPY apps/web/package.json ./apps/web/
    COPY packages/database/package.json ./packages/database/
    COPY packages/shared/package.json ./packages/shared/
    COPY packages/events/package.json ./packages/events/
    COPY packages/ui/package.json ./packages/ui/

    # Install dependencies
    RUN pnpm install --frozen-lockfile

    # =============================================================================
    # Stage 2: Development - For local dev with hot reload
    # =============================================================================
    FROM base AS development

    WORKDIR /app

    # Source code is mounted via Docker Compose volumes
    # No COPY needed - volumes handle it

    EXPOSE 3000

    ENV NODE_ENV=development
    ENV NEXT_TELEMETRY_DISABLED=1

    CMD ["pnpm", "--filter", "@schedulebox/web", "dev"]

    # =============================================================================
    # Stage 3: Builder - Build Next.js for production
    # =============================================================================
    FROM base AS builder

    WORKDIR /app

    # Copy all source code
    COPY . .

    ENV NEXT_TELEMETRY_DISABLED=1

    # Build the Next.js app
    RUN pnpm --filter @schedulebox/web build

    # =============================================================================
    # Stage 4: Production - Minimal runtime image
    # =============================================================================
    FROM node:20-alpine AS production

    WORKDIR /app

    # Create non-root user
    RUN addgroup -g 1001 -S nodejs && \
        adduser -S nextjs -u 1001

    # Copy standalone output from builder
    COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
    COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
    COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

    USER nextjs

    EXPOSE 3000

    ENV NODE_ENV=production
    ENV PORT=3000
    ENV HOSTNAME="0.0.0.0"

    CMD ["node", "apps/web/server.js"]
    ```

    Four stages:
    1. **base** - Installs dependencies with pnpm, good layer caching
    2. **development** - Used by docker-compose for local dev (source mounted via volumes)
    3. **builder** - Copies source and builds Next.js standalone output
    4. **production** - Minimal runtime (~100MB) with non-root user, only standalone files

    Note: The development stage doesn't COPY source because docker-compose mounts the project directory as a volume. The base stage installs dependencies that get cached in the image layer.
  </action>
  <verify>
    - File `docker/Dockerfile` exists
    - Contains four stages: base, development, builder, production
    - base stage has `corepack enable pnpm` and `pnpm install --frozen-lockfile`
    - development stage has EXPOSE 3000
    - builder stage runs `pnpm --filter @schedulebox/web build`
    - production stage creates non-root user and copies standalone output
    - production stage runs `node apps/web/server.js`
  </verify>
  <done>Multi-stage Dockerfile supports both local development (with volume mounts) and production builds (standalone ~100MB image with non-root user).</done>
</task>

</tasks>

<verification>
1. `docker/docker-compose.yml` defines postgres, redis, rabbitmq, and app services
2. All infrastructure services have health checks
3. App depends on all three with condition: service_healthy
4. `docker/Dockerfile` has development and production stages
5. Production stage uses standalone output with non-root user
6. node_modules isolation prevents platform mismatch in dev
</verification>

<success_criteria>
Docker environment is fully configured. `docker compose -f docker/docker-compose.yml up` will start all services with health checks. The Dockerfile supports both development (hot reload via volumes) and production (standalone) modes.
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-setup-infrastructure/01-d-SUMMARY.md`
</output>
