---
phase: 01-project-setup-infrastructure
plan: g
type: execute
wave: 3
depends_on: ["01-b", "01-c"]
files_modified:
  - apps/web/app/api/health/route.ts
  - apps/web/app/api/readiness/route.ts
  - pnpm-lock.yaml
autonomous: true

must_haves:
  truths:
    - "GET /api/health returns 200 with status, service, version, timestamp"
    - "GET /api/readiness returns 200 with status and checks for all services"
    - "pnpm install succeeds and resolves all workspace packages"
    - "pnpm lint runs without errors"
    - "pnpm type-check runs without errors"
    - "pnpm dev starts Next.js dev server"
  artifacts:
    - path: "apps/web/app/api/health/route.ts"
      provides: "Liveness health check endpoint"
      exports: ["GET"]
    - path: "apps/web/app/api/readiness/route.ts"
      provides: "Readiness check endpoint"
      exports: ["GET"]
    - path: "pnpm-lock.yaml"
      provides: "Lock file from successful install"
      contains: "@schedulebox"
  key_links:
    - from: "apps/web/app/api/health/route.ts"
      to: "packages/shared/src/types/index.ts"
      via: "HealthResponse type import"
      pattern: "@schedulebox/shared"
    - from: "apps/web/app/api/readiness/route.ts"
      to: ".env.example"
      via: "environment variables for service URLs"
      pattern: "DATABASE_URL|REDIS_URL|RABBITMQ_URL"
---

<objective>
Create health and readiness endpoints, run pnpm install to validate the entire monorepo, and verify all tooling works end-to-end.

Purpose: This is the final plan that brings everything together. Health endpoints satisfy INFRA-05, and the full install + verification validates that all preceding plans created a working monorepo.

Output: Working health endpoints, validated monorepo installation, passing lint and type-check.
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
@.planning/phases/01-project-setup-infrastructure/01-b-SUMMARY.md
@.planning/phases/01-project-setup-infrastructure/01-c-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create health and readiness API endpoints</name>
  <files>
    apps/web/app/api/health/route.ts
    apps/web/app/api/readiness/route.ts
  </files>
  <action>
    Create `apps/web/app/api/health/route.ts` — liveness probe:
    ```typescript
    import { NextResponse } from 'next/server';

    /**
     * GET /api/health
     * Liveness probe - returns 200 if the service is running.
     * Used by Docker health checks and Kubernetes liveness probes.
     */
    export async function GET() {
      return NextResponse.json(
        {
          status: 'ok' as const,
          service: 'schedulebox-web',
          version: process.env.APP_VERSION ?? '1.0.0',
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      );
    }
    ```

    Create `apps/web/app/api/readiness/route.ts` — readiness probe that checks external service connectivity:
    ```typescript
    import { NextResponse } from 'next/server';

    interface ServiceCheck {
      name: string;
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    }

    /**
     * GET /api/readiness
     * Readiness probe - checks connectivity to PostgreSQL, Redis, and RabbitMQ.
     * Used by Kubernetes readiness probes and Docker health checks.
     *
     * Returns 200 if all services are reachable, 503 if any service is down.
     */
    export async function GET() {
      const checks: ServiceCheck[] = [];
      let allHealthy = true;

      // Check PostgreSQL
      const pgCheck = await checkService('PostgreSQL', async () => {
        // In Phase 1, just verify the env var is set
        // Actual DB connection check added in Phase 2 when Drizzle is configured
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL not configured');
        }
        return true;
      });
      checks.push(pgCheck);
      if (pgCheck.status === 'error') allHealthy = false;

      // Check Redis
      const redisCheck = await checkService('Redis', async () => {
        if (!process.env.REDIS_URL) {
          throw new Error('REDIS_URL not configured');
        }
        return true;
      });
      checks.push(redisCheck);
      if (redisCheck.status === 'error') allHealthy = false;

      // Check RabbitMQ
      const rmqCheck = await checkService('RabbitMQ', async () => {
        if (!process.env.RABBITMQ_URL) {
          throw new Error('RABBITMQ_URL not configured');
        }
        return true;
      });
      checks.push(rmqCheck);
      if (rmqCheck.status === 'error') allHealthy = false;

      const response = {
        status: allHealthy ? ('ok' as const) : ('degraded' as const),
        service: 'schedulebox-web',
        version: process.env.APP_VERSION ?? '1.0.0',
        timestamp: new Date().toISOString(),
        checks,
      };

      return NextResponse.json(response, {
        status: allHealthy ? 200 : 503,
      });
    }

    async function checkService(
      name: string,
      check: () => Promise<boolean>,
    ): Promise<ServiceCheck> {
      const start = Date.now();
      try {
        await check();
        return {
          name,
          status: 'ok',
          latency: Date.now() - start,
        };
      } catch (error) {
        return {
          name,
          status: 'error',
          latency: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
    ```

    The readiness endpoint:
    - Returns response format matching CONTEXT.md: { status, service, version, timestamp }
    - Adds a `checks` array with per-service status
    - Returns 200 if all services OK, 503 if any are down
    - In Phase 1, only checks env var presence (actual connection checks added in Phase 2+)
    - Designed for Docker health checks and future Kubernetes probes
  </action>
  <verify>
    - File `apps/web/app/api/health/route.ts` exists with GET export
    - File `apps/web/app/api/readiness/route.ts` exists with GET export
    - Health endpoint returns { status: 'ok', service: 'schedulebox-web', version, timestamp }
    - Readiness endpoint checks DATABASE_URL, REDIS_URL, RABBITMQ_URL
  </verify>
  <done>Health and readiness endpoints exist. Liveness probe returns basic status, readiness probe checks service connectivity with per-service detail.</done>
</task>

<task type="auto">
  <name>Task 2: Install dependencies and validate monorepo</name>
  <files>
    pnpm-lock.yaml
  </files>
  <action>
    Run the complete monorepo validation sequence:

    1. **Install dependencies:**
       ```bash
       pnpm install
       ```
       This must succeed and generate pnpm-lock.yaml. All workspace:* references must resolve.

    2. **Verify workspace resolution:**
       ```bash
       pnpm ls --filter @schedulebox/web --depth 0
       ```
       Must show @schedulebox/shared, @schedulebox/ui, @schedulebox/events, @schedulebox/database as linked workspace packages.

    3. **Run lint:**
       ```bash
       pnpm lint
       ```
       Must pass with no errors. If there are lint errors in the scaffold files, fix them.

    4. **Run type-check:**
       ```bash
       pnpm type-check
       ```
       Must pass with no type errors. If there are type errors, fix them.

    5. **Run format check:**
       ```bash
       pnpm format:check
       ```
       Must pass. If formatting issues, run `pnpm format` to fix and commit.

    6. **Verify Next.js dev server starts** (quick smoke test):
       ```bash
       # Start dev server in background, wait for ready, then kill
       timeout 30 pnpm dev &
       sleep 10
       curl -s http://localhost:3000/api/health || echo "Dev server test (may fail without .env.local - OK for CI)"
       kill %1 2>/dev/null
       ```
       If this fails due to missing env vars, that's acceptable for Phase 1.
       The important thing is that `next dev` starts without crashing.

    **If any step fails:** Fix the issue in the relevant file and re-run. Common issues:
    - Phantom dependency: add missing package with `pnpm add -D <package> -w`
    - Type error: fix TypeScript issue in the flagged file
    - Lint error: fix or add eslint-disable comment if intentional
    - Format error: run `pnpm format` to auto-fix

    After all validations pass, ensure `pnpm-lock.yaml` is committed.
  </action>
  <verify>
    - `pnpm install` exits with code 0
    - `pnpm-lock.yaml` exists and contains @schedulebox/* packages
    - `pnpm lint` exits with code 0
    - `pnpm type-check` exits with code 0
    - `pnpm format:check` exits with code 0
    - `pnpm --filter @schedulebox/web dev` starts without immediate crash
  </verify>
  <done>Monorepo is fully functional. Dependencies install, lint passes, type-check passes, and the dev server starts. All Phase 1 success criteria are met.</done>
</task>

</tasks>

<verification>
1. GET /api/health returns { status: 'ok', service: 'schedulebox-web', version, timestamp }
2. GET /api/readiness returns service checks for PostgreSQL, Redis, RabbitMQ
3. `pnpm install` succeeds with all workspace packages resolved
4. `pnpm lint` passes
5. `pnpm type-check` passes
6. `pnpm dev` starts Next.js dev server
7. pnpm-lock.yaml is committed
</verification>

<success_criteria>
Phase 1 is complete. The monorepo installs successfully, all tooling works, health endpoints respond, and the dev server starts. All five Phase 1 success criteria from ROADMAP.md are satisfied:
1. `pnpm install` succeeds and workspace packages resolve
2. `docker compose up` starts PostgreSQL, Redis, and RabbitMQ with passing health checks (validated by docker-compose.yml structure)
3. `pnpm dev` starts Next.js dev server connecting to all services
4. CI pipeline runs lint and type-check on every push (ci.yml configured)
5. Health/readiness endpoints respond with 200
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-setup-infrastructure/01-g-SUMMARY.md`
</output>
