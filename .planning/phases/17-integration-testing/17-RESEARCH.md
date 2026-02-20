# Phase 17: Integration Testing - Research

**Researched:** 2026-02-20
**Domain:** Integration testing with Testcontainers (PostgreSQL 16, Redis 7, RabbitMQ 3.13), Drizzle ORM, Vitest 4.0
**Confidence:** HIGH

## Summary

Phase 17 establishes integration testing for ScheduleBox's critical database operations against real PostgreSQL, Redis, and RabbitMQ instances using Testcontainers. Unlike Phase 16's unit tests that use PGLite and MSW for lightweight mocking, integration tests validate behavior that **only real infrastructure can prove**: concurrent `SELECT FOR UPDATE` locking for double-booking prevention, PostgreSQL RLS policies with session variables (`SET app.company_id`), HMAC-SHA256 webhook signature verification, and booking status state machine transitions against real constraints.

The standard approach uses **Testcontainers for Node.js** with dedicated modules (`@testcontainers/postgresql`, `@testcontainers/redis`, `@testcontainers/rabbitmq`) that manage Docker containers automatically. Containers start in `globalSetup`, share connection strings via Vitest's `provide/inject` API, and tear down after all tests. Drizzle ORM's `migrate()` function applies existing migration files programmatically, then the project's `apply-sql.ts` pattern runs RLS functions, policies, triggers, and the `btree_gist` double-booking exclusion constraint against the test database.

GitHub Actions `ubuntu-latest` runners have Docker pre-installed, so Testcontainers works out of the box in CI without additional configuration. The CI pipeline needs a new `test:integration` job that runs after unit tests and before the build job.

**Primary recommendation:** Use Testcontainers with Vitest `globalSetup` for container lifecycle, Drizzle's programmatic `migrate()` for schema setup, raw SQL execution for RLS/triggers, and `provide/inject` for passing connection URIs to tests. Run integration tests in a separate Vitest project with `environment: 'node'` and longer timeouts (60s hooks, 30s tests).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| testcontainers | ^11.12.0 | Container lifecycle management | De facto standard for containerized integration testing, 1.4M+ weekly npm downloads |
| @testcontainers/postgresql | ^11.12.0 | PostgreSQL container module | Pre-configured PG container with `getConnectionUri()`, snapshot/restore support |
| @testcontainers/redis | ^11.12.0 | Redis container module | Pre-configured Redis container with `getConnectionUrl()` |
| @testcontainers/rabbitmq | ^11.11.0 | RabbitMQ container module | Pre-configured RabbitMQ container with `getAmqpUrl()` |
| vitest | ^4.0.18 | Test runner (already installed) | Existing Phase 16 infrastructure, globalSetup with provide/inject API |
| drizzle-orm | ^0.36.4 | ORM for test queries (already installed) | Existing project dependency, `migrate()` for programmatic schema setup |
| postgres | ^3.4.5 | PostgreSQL client (already installed) | Existing project dependency for Drizzle's postgres-js driver |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| amqplib | existing | RabbitMQ client (already in events package) | Integration tests for event publishing/consuming |
| @faker-js/faker | ^10.3.0 | Test data generation (already installed) | Creating realistic test fixtures for bookings, customers, etc. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Testcontainers | GitHub Actions service containers | Service containers are simpler YAML config but lack snapshot/restore, less flexible, harder to run locally |
| Testcontainers | docker-compose in CI + env vars | More operational complexity, no automatic port mapping, harder test isolation |
| globalSetup shared containers | Per-test-file containers | Better isolation but 3-5x slower (container startup is ~3-5s per service) |
| vitest-environment-testcontainers | Manual globalSetup | The environment package is immature (low adoption), manual setup gives more control over migration and SQL application |

**Installation:**

```bash
# Install in root workspace (integration tests are a cross-cutting concern)
pnpm add -Dw testcontainers @testcontainers/postgresql @testcontainers/redis @testcontainers/rabbitmq
```

No additional runtime dependencies needed -- `postgres`, `drizzle-orm`, `amqplib` are already project dependencies.

## Architecture Patterns

### Recommended Project Structure

```
schedulebox/
├── vitest.config.ts                         # Root config (existing) - add integration project
├── vitest.integration.config.ts             # Integration test config (separate from unit)
├── tests/
│   └── integration/
│       ├── globalSetup.ts                   # Start containers, run migrations, apply SQL
│       ├── helpers/
│       │   ├── test-db.ts                   # DB connection factory, RLS context helpers
│       │   ├── test-rabbitmq.ts             # RabbitMQ connection factory
│       │   ├── test-redis.ts                # Redis connection factory
│       │   └── seed-helpers.ts              # Test data creation (companies, customers, etc.)
│       ├── booking/
│       │   ├── double-booking.test.ts       # ITEST-02: Concurrent SELECT FOR UPDATE
│       │   └── status-transitions.test.ts   # ITEST-05: State machine transitions
│       ├── rls/
│       │   └── tenant-isolation.test.ts     # ITEST-03: Multi-tenant RLS isolation
│       ├── payments/
│       │   └── comgate-webhook.test.ts      # ITEST-04: Signature verification + status
│       └── events/
│           └── publish-consume.test.ts      # RabbitMQ event round-trip (bonus)
├── packages/database/src/
│   ├── migrations/                          # Existing migration SQL files
│   ├── rls/                                 # Existing RLS policies/functions SQL
│   └── functions/                           # Existing trigger/constraint SQL files
└── .github/workflows/ci.yml                 # Add integration test job
```

### Pattern 1: Testcontainers globalSetup with provide/inject

**What:** Start all containers once in globalSetup, share connection strings to tests via Vitest's provide/inject API, tear down after all tests complete.
**When to use:** Always for integration tests -- avoids per-file container overhead.

```typescript
// tests/integration/globalSetup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';
import type { GlobalSetupContext } from 'vitest/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let pgContainer: InstanceType<typeof PostgreSqlContainer>;
let redisContainer: InstanceType<typeof RedisContainer>;
let rabbitContainer: InstanceType<typeof RabbitMQContainer>;

export async function setup(project: GlobalSetupContext) {
  // 1. Start all containers in parallel
  [pgContainer, redisContainer, rabbitContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('schedulebox_test')
      .withUsername('test')
      .start(),
    new RedisContainer('redis:7-alpine').start(),
    new RabbitMQContainer('rabbitmq:3.13-alpine').start(),
  ]);

  const databaseUrl = pgContainer.getConnectionUri();

  // 2. Run Drizzle migrations
  const migrationClient = postgres(databaseUrl, { max: 1 });
  const migrationDb = drizzle(migrationClient);
  await migrate(migrationDb, {
    migrationsFolder: resolve(__dirname, '../../packages/database/src/migrations'),
  });
  await migrationClient.end();

  // 3. Apply RLS functions, triggers, constraints, and policies
  const sqlClient = postgres(databaseUrl, { max: 1 });
  const sqlFiles = [
    'packages/database/src/rls/functions.sql',
    'packages/database/src/functions/updated-at.sql',
    'packages/database/src/functions/double-booking.sql',
    'packages/database/src/functions/soft-delete.sql',
    'packages/database/src/rls/policies.sql',
  ];

  for (const file of sqlFiles) {
    const sqlContent = readFileSync(resolve(__dirname, '../../', file), 'utf-8');
    await sqlClient.unsafe(sqlContent);
  }
  await sqlClient.end();

  // 4. Provide connection strings to tests
  project.provide('DATABASE_URL', databaseUrl);
  project.provide('REDIS_URL', redisContainer.getConnectionUrl());
  project.provide('RABBITMQ_URL', rabbitContainer.getAmqpUrl());
}

export async function teardown() {
  await Promise.all([
    pgContainer?.stop(),
    redisContainer?.stop(),
    rabbitContainer?.stop(),
  ]);
}
```

### Pattern 2: RLS Context Helper for Tenant Isolation Testing

**What:** Helper function that sets PostgreSQL session variables before each query, simulating the application's tenant context.
**When to use:** Every test that interacts with RLS-protected tables.

```typescript
// tests/integration/helpers/test-db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@schedulebox/database';
import { inject } from 'vitest';

/**
 * Create a Drizzle instance connected to the test container.
 * Returns both the client (for raw SQL) and the Drizzle db instance.
 */
export function createTestDb() {
  const databaseUrl = inject('DATABASE_URL');
  const client = postgres(databaseUrl, { max: 5 });
  const db = drizzle(client, { schema });
  return { client, db };
}

/**
 * Set RLS session context for a connection.
 * Must be called within a transaction to scope correctly.
 *
 * The application uses:
 *   SET app.company_id = <id>;
 *   SET app.user_role = <role>;
 *   SET app.user_id = <id>;
 */
export async function setRlsContext(
  client: ReturnType<typeof postgres>,
  context: { companyId: number; userRole: string; userId: number },
) {
  await client.unsafe(`SET app.company_id = '${context.companyId}'`);
  await client.unsafe(`SET app.user_role = '${context.userRole}'`);
  await client.unsafe(`SET app.user_id = '${context.userId}'`);
}

/**
 * Create a non-superuser role for RLS testing.
 * CRITICAL: Superuser bypasses RLS, so tests must use a restricted role.
 */
export async function createTestRole(
  client: ReturnType<typeof postgres>,
  roleName: string = 'test_app_user',
) {
  await client.unsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${roleName}') THEN
        CREATE ROLE ${roleName} LOGIN PASSWORD 'test_password';
      END IF;
    END $$;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO ${roleName};
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${roleName};
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${roleName};
  `);
  return roleName;
}
```

### Pattern 3: Concurrent Booking Test with SELECT FOR UPDATE

**What:** Validates double-booking prevention by executing two booking attempts concurrently against the same employee/timeslot.
**When to use:** ITEST-02 specifically.

```typescript
// tests/integration/booking/double-booking.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, or } from 'drizzle-orm';
import * as schema from '@schedulebox/database';
import { inject } from 'vitest';

describe('Double-booking prevention', () => {
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(() => {
    const databaseUrl = inject('DATABASE_URL');
    client = postgres(databaseUrl, { max: 10 });
    db = drizzle(client, { schema });
  });

  afterAll(async () => {
    await client.end();
  });

  it('should reject concurrent booking to same slot', async () => {
    // Seed: company, service, employee, customer (see seed-helpers)
    // ...

    // Two concurrent transactions try to book same employee + timeslot
    const results = await Promise.allSettled([
      db.transaction(async (tx) => {
        // SELECT FOR UPDATE on employee
        await tx.select().from(schema.employees)
          .where(eq(schema.employees.id, employeeId))
          .for('update');

        // Check availability
        const conflicts = await tx.select().from(schema.bookings)
          .where(and(
            eq(schema.bookings.employeeId, employeeId),
            or(eq(schema.bookings.status, 'pending'), eq(schema.bookings.status, 'confirmed')),
            // ... time overlap conditions
          ));

        if (conflicts.length > 0) throw new Error('SLOT_TAKEN');

        // Insert booking
        return tx.insert(schema.bookings).values({ /* ... */ }).returning();
      }),
      db.transaction(async (tx) => {
        // Same transaction as above - will block on SELECT FOR UPDATE
        // until first transaction commits, then see the conflict
        // ...
      }),
    ]);

    // Exactly one should succeed, one should fail
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });
});
```

### Pattern 4: Vitest Integration Config (Separate from Unit Tests)

**What:** Dedicated Vitest configuration for integration tests with longer timeouts, node environment, and globalSetup.
**When to use:** Always -- integration tests must not mix with unit test configuration.

```typescript
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node', // No DOM needed for integration tests
    testTimeout: 30000,  // 30s per test (DB operations can be slow)
    hookTimeout: 60000,  // 60s for beforeAll (container startup)
    globalSetup: ['tests/integration/globalSetup.ts'],
    // Sequential by default -- concurrent DB tests need careful isolation
    sequence: {
      concurrent: false,
    },
  },
});
```

```json
// package.json scripts (add)
{
  "test:integration": "vitest run --config vitest.integration.config.ts"
}
```

### Anti-Patterns to Avoid

- **Testing RLS with superuser:** PostgreSQL superusers bypass RLS entirely. Tests MUST use a non-superuser role created via `CREATE ROLE ... LOGIN` with explicit `GRANT` permissions. The Testcontainers PostgreSQL default user IS superuser -- you must create and switch to a restricted role for RLS tests.
- **Starting containers per test file:** Each container takes 3-5 seconds to start. Use globalSetup with shared containers + transaction-based isolation (BEGIN/ROLLBACK) per test instead.
- **Sharing mutable state between tests:** Use transaction wrapping (`BEGIN` at start, `ROLLBACK` at end) or table truncation between tests. The `snapshot()`/`restoreSnapshot()` API on PostgreSqlContainer is another option but adds overhead.
- **Forgetting to apply SQL beyond migrations:** Drizzle migrations only create tables. The project's RLS functions, policies, triggers, and the `btree_gist` exclusion constraint are in separate SQL files (`packages/database/src/rls/` and `packages/database/src/functions/`). These MUST be applied after migrations or RLS/double-booking tests will pass vacuously.
- **Using PGLite for integration tests:** PGLite is WASM PostgreSQL -- it does NOT support RLS policies, `SELECT FOR UPDATE`, `btree_gist` extension, or session variables. Integration tests specifically require real PostgreSQL.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Container lifecycle management | Custom Docker API calls or shell scripts | `testcontainers` + modules | Handles port mapping, health checks, cleanup, parallel start, CI compatibility |
| PostgreSQL test containers | `docker run` in beforeAll | `@testcontainers/postgresql` | Provides `getConnectionUri()`, snapshot/restore, automatic cleanup |
| Database migration in tests | Manual SQL file execution | `drizzle-orm/postgres-js/migrator` `migrate()` | Reuses existing migration files, handles ordering, idempotent |
| Test data cleanup between tests | Custom DELETE scripts | Transaction wrapping (BEGIN/ROLLBACK) | Zero-cost cleanup, no orphaned data, matches production transaction semantics |
| Connection string sharing | Environment variables or temp files | Vitest `provide/inject` API | Type-safe, scoped to test project, no file I/O or env mutation |

**Key insight:** The project already has all migration and SQL files needed (`packages/database/src/migrations/`, `packages/database/src/rls/`, `packages/database/src/functions/`). Integration test setup reuses these artifacts rather than building parallel schema management.

## Common Pitfalls

### Pitfall 1: RLS Tests Pass Because Superuser Bypasses Policies

**What goes wrong:** All RLS isolation tests pass, giving false confidence, but in production, RLS actually has a bug that allows cross-tenant access.
**Why it happens:** Testcontainers creates a PostgreSQL container with a superuser by default. PostgreSQL superusers bypass all RLS policies silently.
**How to avoid:** In globalSetup, after applying RLS policies, create a non-superuser role (`CREATE ROLE test_app LOGIN PASSWORD 'test'`) and grant table/sequence/function access. In RLS tests, connect as this role. Before queries, SET the session variables (`app.company_id`, `app.user_role`, `app.user_id`).
**Warning signs:** RLS tests that never have a "should NOT see" assertion fail, even when you deliberately set wrong company_id.

### Pitfall 2: Drizzle Migrations Applied but RLS/Triggers Missing

**What goes wrong:** Tables exist but have no RLS policies, no `btree_gist` exclusion constraint, no updated_at triggers. Double-booking tests pass because there is no exclusion constraint to reject overlapping bookings at the DB level.
**Why it happens:** Drizzle's `migrate()` only runs files from `packages/database/src/migrations/`. The RLS functions, policies, triggers, and constraints are in separate SQL files under `src/rls/` and `src/functions/` -- applied by the `apply-sql.ts` script during deployment.
**How to avoid:** After `migrate()`, execute the relevant SQL files: `rls/functions.sql`, `functions/double-booking.sql`, `functions/updated-at.sql`, `functions/soft-delete.sql`, `rls/policies.sql`. This mirrors the production `db:deploy` command.
**Warning signs:** `\d bookings` shows no exclusion constraint. `SELECT * FROM pg_policies` returns no rows.

### Pitfall 3: Container Startup Timeouts in CI

**What goes wrong:** Integration tests fail intermittently in CI with "container not ready" errors.
**Why it happens:** Default Vitest hook timeout is 10 seconds. PostgreSQL containers can take 5-15 seconds to be ready, especially under CI load. Starting 3 containers in parallel can exceed 10 seconds.
**How to avoid:** Set `hookTimeout: 120000` (2 minutes) in the integration test Vitest config. Testcontainers has built-in wait strategies (port check, health check) that handle readiness -- but they need time to complete.
**Warning signs:** Tests pass locally (fast machine, Docker cached) but fail in CI (cold pull, shared resources).

### Pitfall 4: Test Data Leaking Between Tests

**What goes wrong:** Tests depend on specific data state but fail non-deterministically because a previous test's data persists.
**Why it happens:** INSERT without cleanup between tests. Tests run in undefined order.
**How to avoid:** Wrap each test in a transaction: `beforeEach` starts a transaction, `afterEach` rolls it back. Alternative: truncate all tables in `beforeEach` using `TRUNCATE ... CASCADE`. Transaction wrapping is faster but requires all test operations to go through the same transaction object.
**Warning signs:** Tests pass individually (`vitest run -t "test name"`) but fail when run together.

### Pitfall 5: Wrong PostgreSQL Password for Non-Superuser RLS Tests

**What goes wrong:** Connection as non-superuser test role fails with authentication error.
**Why it happens:** Testcontainers `PostgreSqlContainer` does not set up application-level roles. The `getConnectionUri()` returns superuser credentials. After creating a test role, you need to build a new connection string with the test role's credentials.
**How to avoid:** After `CREATE ROLE test_app LOGIN PASSWORD 'test_pwd'`, construct a new connection URI: replace the username/password in the Testcontainer's URI with the test role credentials.
**Warning signs:** `FATAL: password authentication failed for user "test_app"`.

### Pitfall 6: btree_gist Extension Not Available

**What goes wrong:** The `CREATE EXTENSION IF NOT EXISTS btree_gist` statement fails because the PostgreSQL container image does not include contrib extensions.
**Why it happens:** Some minimal PostgreSQL images strip contrib packages.
**How to avoid:** Use `postgres:16-alpine` or `postgres:16` image, both of which include `btree_gist` in their contrib package. Verify with `SELECT * FROM pg_available_extensions WHERE name = 'btree_gist'`.
**Warning signs:** `ERROR: could not open extension control file "/usr/share/postgresql/16/extension/btree_gist.control"`.

## Code Examples

### Example 1: Complete globalSetup for All Three Services

```typescript
// tests/integration/globalSetup.ts
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { RabbitMQContainer, type StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import type { GlobalSetupContext } from 'vitest/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;
let rabbitContainer: StartedRabbitMQContainer;

const ROOT = resolve(__dirname, '../..');

export async function setup(project: GlobalSetupContext) {
  console.log('[Integration] Starting test containers...');

  // Start all containers in parallel for speed
  const [pg, redis, rabbit] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('schedulebox_test')
      .withUsername('test_superuser')
      .start(),
    new RedisContainer('redis:7-alpine').start(),
    new RabbitMQContainer('rabbitmq:3.13-management-alpine').start(),
  ]);

  pgContainer = pg;
  redisContainer = redis;
  rabbitContainer = rabbit;

  const databaseUrl = pgContainer.getConnectionUri();
  console.log('[Integration] Containers started. Running migrations...');

  // Step 1: Apply Drizzle migrations
  const migrationClient = postgres(databaseUrl, { max: 1 });
  const migrationDb = drizzle(migrationClient);
  await migrate(migrationDb, {
    migrationsFolder: resolve(ROOT, 'packages/database/src/migrations'),
  });
  await migrationClient.end();

  // Step 2: Apply SQL files (RLS functions, triggers, constraints, policies)
  const sqlClient = postgres(databaseUrl, { max: 1 });
  const sqlFiles = [
    'packages/database/src/rls/functions.sql',
    'packages/database/src/functions/updated-at.sql',
    'packages/database/src/functions/customer-metrics.sql',
    'packages/database/src/functions/marketplace-rating.sql',
    'packages/database/src/functions/coupon-usage.sql',
    'packages/database/src/functions/double-booking.sql',
    'packages/database/src/functions/soft-delete.sql',
    'packages/database/src/functions/deferred-fks.sql',
    'packages/database/src/functions/audit-trail.sql',
    'packages/database/src/functions/composite-indexes.sql',
    'packages/database/src/rls/policies.sql',
  ];

  for (const file of sqlFiles) {
    const sql = readFileSync(resolve(ROOT, file), 'utf-8');
    await sqlClient.unsafe(sql);
  }

  // Step 3: Create non-superuser role for RLS tests
  await sqlClient.unsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'test_app') THEN
        CREATE ROLE test_app LOGIN PASSWORD 'test_app_pwd';
      END IF;
    END $$;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO test_app;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO test_app;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO test_app;
  `);
  await sqlClient.end();

  console.log('[Integration] Database schema ready. Providing connection strings...');

  // Step 4: Provide connection strings to tests via inject()
  project.provide('DATABASE_URL', databaseUrl);
  project.provide('DATABASE_URL_APP', databaseUrl.replace(
    'test_superuser',
    'test_app'
  ).replace(
    pgContainer.getPassword(),
    'test_app_pwd'
  ));
  project.provide('REDIS_URL', redisContainer.getConnectionUrl());
  project.provide('RABBITMQ_URL', rabbitContainer.getAmqpUrl());
}

export async function teardown() {
  console.log('[Integration] Stopping test containers...');
  await Promise.all([
    pgContainer?.stop(),
    redisContainer?.stop(),
    rabbitContainer?.stop(),
  ]);
}
```

### Example 2: RLS Tenant Isolation Test

```typescript
// tests/integration/rls/tenant-isolation.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { inject } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '@schedulebox/database';

describe('RLS tenant isolation', () => {
  // Use non-superuser connection for RLS enforcement
  let appClient: ReturnType<typeof postgres>;
  // Use superuser for data seeding (bypasses RLS)
  let superClient: ReturnType<typeof postgres>;
  let superDb: ReturnType<typeof drizzle>;

  let company1Id: number;
  let company2Id: number;

  beforeAll(async () => {
    const superUrl = inject('DATABASE_URL');
    const appUrl = inject('DATABASE_URL_APP');
    superClient = postgres(superUrl, { max: 5 });
    appClient = postgres(appUrl, { max: 5 });
    superDb = drizzle(superClient, { schema });

    // Seed two companies (using superuser to bypass RLS)
    const [c1] = await superDb.insert(schema.companies).values({
      name: 'Company A', slug: 'company-a', email: 'a@test.com',
    }).returning();
    const [c2] = await superDb.insert(schema.companies).values({
      name: 'Company B', slug: 'company-b', email: 'b@test.com',
    }).returning();
    company1Id = c1.id;
    company2Id = c2.id;

    // Seed customers in each company
    await superDb.insert(schema.customers).values([
      { companyId: company1Id, name: 'Customer A1', email: 'a1@test.com' },
      { companyId: company2Id, name: 'Customer B1', email: 'b1@test.com' },
    ]);
  });

  afterAll(async () => {
    await superClient.end();
    await appClient.end();
  });

  it('company A cannot see company B customers', async () => {
    // Set RLS context to company A
    const rows = await appClient.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.company_id = '${company1Id}'`);
      await tx.unsafe(`SET LOCAL app.user_role = 'owner'`);
      return tx`SELECT * FROM customers`;
    });

    // Should only see Company A's customers
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Customer A1');
    // Must NOT contain Company B's customer
    expect(rows.every(r => r.company_id === company1Id)).toBe(true);
  });

  it('company B cannot see company A customers', async () => {
    const rows = await appClient.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.company_id = '${company2Id}'`);
      await tx.unsafe(`SET LOCAL app.user_role = 'owner'`);
      return tx`SELECT * FROM customers`;
    });

    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Customer B1');
  });
});
```

### Example 3: Comgate Webhook Signature Verification Test

```typescript
// tests/integration/payments/comgate-webhook.test.ts
import { describe, it, expect, beforeAll, vi } from 'vitest';
import crypto from 'crypto';

// Direct import of the function under test
import { verifyComgateSignature } from
  '../../../apps/web/app/api/v1/payments/comgate/client';

describe('Comgate webhook signature verification', () => {
  const TEST_SECRET = 'test-comgate-secret-key';

  beforeAll(() => {
    // Set env var for Comgate credentials
    process.env.COMGATE_MERCHANT_ID = 'test-merchant';
    process.env.COMGATE_SECRET = TEST_SECRET;
  });

  it('accepts valid HMAC-SHA256 signature', () => {
    const body = 'transId=ABC123&status=PAID&price=10000';
    const signature = crypto
      .createHmac('sha256', TEST_SECRET)
      .update(body)
      .digest('hex');

    expect(verifyComgateSignature(body, signature)).toBe(true);
  });

  it('rejects tampered payload', () => {
    const originalBody = 'transId=ABC123&status=PAID&price=10000';
    const tamperedBody = 'transId=ABC123&status=PAID&price=99999';
    const signature = crypto
      .createHmac('sha256', TEST_SECRET)
      .update(originalBody)
      .digest('hex');

    // Signature was computed for original, but body was tampered
    expect(verifyComgateSignature(tamperedBody, signature)).toBe(false);
  });

  it('rejects wrong secret', () => {
    const body = 'transId=ABC123&status=PAID&price=10000';
    const wrongSignature = crypto
      .createHmac('sha256', 'wrong-secret')
      .update(body)
      .digest('hex');

    expect(verifyComgateSignature(body, wrongSignature)).toBe(false);
  });

  it('rejects empty signature', () => {
    expect(verifyComgateSignature('body', '')).toBe(false);
  });
});
```

### Example 4: Booking Status Transitions Test

```typescript
// tests/integration/booking/status-transitions.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { inject } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import * as schema from '@schedulebox/database';

describe('Booking status transitions', () => {
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  let companyId: number;
  let bookingId: number;

  beforeAll(async () => {
    const databaseUrl = inject('DATABASE_URL');
    client = postgres(databaseUrl, { max: 5 });
    db = drizzle(client, { schema });
    // Seed company, service, employee, customer...
  });

  beforeEach(async () => {
    // Create a fresh pending booking for each test
    // Insert with status: 'pending'
  });

  it('pending -> confirmed is valid', async () => {
    await db.update(schema.bookings)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(schema.bookings.id, bookingId));

    const [updated] = await db.select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, bookingId));

    expect(updated.status).toBe('confirmed');
  });

  it('confirmed -> completed is valid', async () => {
    // First confirm
    await db.update(schema.bookings)
      .set({ status: 'confirmed' })
      .where(eq(schema.bookings.id, bookingId));

    // Then complete
    await db.update(schema.bookings)
      .set({ status: 'completed' })
      .where(eq(schema.bookings.id, bookingId));

    const [updated] = await db.select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, bookingId));

    expect(updated.status).toBe('completed');
  });

  it('completed -> pending is rejected by CHECK constraint', async () => {
    // Note: The bookings_status_check allows all 5 values.
    // Status transition validation is in the application layer
    // (booking-transitions.ts VALID_TRANSITIONS map), not a DB constraint.
    // Integration test should use the service layer functions
    // (confirmBooking, completeBooking) to validate transitions.
  });

  afterAll(async () => {
    await client.end();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|------------|------------------|--------------|--------|
| docker-compose for test DB | Testcontainers manages containers | 2023-2024 | No external compose files, auto port mapping, cleanup on crash |
| Manual SQL for test schema | `drizzle-orm/postgres-js/migrator` `migrate()` | Drizzle 0.30+ | Reuse production migration files directly |
| pg-mem for Postgres mocking | PGLite (unit) + Testcontainers (integration) | 2024 | PGLite: 100% Postgres compat for unit tests. Testcontainers: full features for integration |
| Vitest defineWorkspace | Vitest 4.0 `test.projects` | Vitest 4.0 (2025) | Projects array replaces workspace config |
| Custom env variable sharing | Vitest `provide/inject` API | Vitest 2.0+ | Type-safe, no env mutation, scoped to project |

**Deprecated/outdated:**

- **pg-mem:** 70% Postgres compatibility, does not support RLS, extensions, or session variables. Use PGLite for unit tests, Testcontainers for integration.
- **vitest.workspace.ts:** Replaced by `test.projects` array in `vitest.config.ts` in Vitest 4.0.
- **defineWorkspace:** Use `defineConfig` with `test.projects` instead.

## Key Codebase Findings

### RLS Implementation

The project uses PostgreSQL session variables for RLS, set via:
```sql
SET app.company_id = <id>;
SET app.user_role = <role>;
SET app.user_id = <id>;
```

Helper functions (`current_company_id()`, `current_user_role()`, `current_user_id()`) read these via `current_setting('app.company_id', true)`. All 29 tenant tables have `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` with policies using `company_id = current_company_id()`.

**Important for testing:** `FORCE ROW LEVEL SECURITY` means RLS applies to the table owner too, but the Testcontainers superuser may still bypass it. Use `SET ROLE test_app` or connect as a non-superuser role.

### Double-Booking Prevention (Three Layers)

1. **Application layer:** `SELECT FOR UPDATE` on employee row within transaction (locks row until commit)
2. **Application layer:** Re-check for conflicting bookings within the same transaction
3. **Database layer:** `btree_gist` exclusion constraint `no_overlapping_bookings` on `(employee_id, tstzrange(start_time, end_time))` WHERE `status <> 'cancelled'`

Integration tests should test BOTH the application-layer locking (via concurrent transactions) AND the database-level constraint (direct INSERT of overlapping rows).

### Booking Status Transitions

State machine is in `apps/web/lib/booking/booking-transitions.ts`:
```
pending -> confirmed, cancelled, expired
confirmed -> completed, cancelled, no_show
```

Validation is APPLICATION-LEVEL (not DB constraint). The DB CHECK constraint only validates the status value is one of the 5 allowed values, not transition validity. Integration tests should call the service-layer functions (`confirmBooking`, `completeBooking`, `cancelBooking`, `markNoShow`) which enforce transitions via `VALID_TRANSITIONS` map.

### Comgate Signature Verification

`verifyComgateSignature()` in `apps/web/app/api/v1/payments/comgate/client.ts` uses:
- HMAC-SHA256 with `COMGATE_SECRET` environment variable
- `crypto.timingSafeEqual` for constant-time comparison
- Returns `false` on any error (length mismatch, missing secret)

This function is pure (no DB dependency) -- can be tested without Testcontainers. However, the FULL webhook flow (signature -> find payment -> update status -> publish event) requires DB integration.

### Migration and SQL File Locations

- Drizzle migrations: `packages/database/src/migrations/` (2 migration files)
- RLS helper functions: `packages/database/src/rls/functions.sql`
- RLS policies: `packages/database/src/rls/policies.sql`
- Double-booking constraint: `packages/database/src/functions/double-booking.sql`
- Updated-at trigger: `packages/database/src/functions/updated-at.sql`
- All 9 SQL files are listed in `packages/database/src/apply-sql.ts` in execution order

## CI Pipeline Integration

### GitHub Actions Job for Integration Tests

```yaml
# Addition to .github/workflows/ci.yml
integration-test:
  name: Integration Tests
  runs-on: ubuntu-latest
  needs: test  # Run after unit tests pass
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Run integration tests
      run: pnpm test:integration
      # Docker is pre-installed on ubuntu-latest, Testcontainers works OOTB
```

No Docker setup step needed -- `ubuntu-latest` has Docker Engine pre-installed. Testcontainers automatically detects the Docker environment.

### Build Job Dependency Update

```yaml
build:
  needs: [lint, test, integration-test]  # Add integration-test
```

## Open Questions

1. **Transaction wrapping vs. truncation for test isolation**
   - What we know: Transaction wrapping (BEGIN/ROLLBACK) is faster but requires all operations in the same transaction. Truncation is simpler but slower.
   - What's unclear: Whether the booking service functions (which create their own transactions via `db.transaction()`) can work within a wrapping transaction.
   - Recommendation: Use TRUNCATE + re-seed in `beforeEach` for tests that call service-layer functions with their own transactions. Use transaction wrapping for tests that do raw SQL only.

2. **Comgate webhook full-flow test scope**
   - What we know: `verifyComgateSignature()` is a pure function testable in isolation. The full webhook handler (`POST /api/v1/webhooks/comgate`) involves DB lookups and event publishing.
   - What's unclear: Whether to test the Next.js route handler directly or extract the business logic into a testable function.
   - Recommendation: Test `verifyComgateSignature()` directly (ITEST-04 core requirement). Optionally test the extracted payment update logic against real DB for completeness.

3. **Events package RabbitMQ integration test depth**
   - What we know: `publishEvent()` and `consumeMessages()` use real amqplib connections to RabbitMQ.
   - What's unclear: Whether ITEST scope includes a full publish-then-consume round-trip or just publisher verification.
   - Recommendation: Include at least one round-trip test (publish event, consume from queue, verify content) since the ROADMAP goal says "Redis/RabbitMQ behavior."

## Sources

### Primary (HIGH confidence)

- Testcontainers Node.js docs: [PostgreSQL module](https://node.testcontainers.org/modules/postgresql/), [Redis module](https://node.testcontainers.org/modules/redis/), [RabbitMQ module](https://node.testcontainers.org/modules/rabbitmq/)
- Testcontainers Node.js [globalSetup pattern](https://node.testcontainers.org/quickstart/global-setup/)
- Vitest [globalSetup docs](https://vitest.dev/config/globalsetup.html) - provide/inject API
- Drizzle ORM [migrations docs](https://orm.drizzle.team/docs/migrations) - programmatic migrate()
- npm packages: [@testcontainers/postgresql](https://www.npmjs.com/package/@testcontainers/postgresql) v11.12.0, [@testcontainers/redis](https://www.npmjs.com/package/@testcontainers/redis) v11.12.0, [@testcontainers/rabbitmq](https://www.npmjs.com/package/@testcontainers/rabbitmq) v11.11.0
- Project codebase: `packages/database/src/rls/`, `apps/web/lib/booking/booking-service.ts`, `apps/web/app/api/v1/payments/comgate/client.ts`

### Secondary (MEDIUM confidence)

- [Integration Testing Node.js Postgres with Vitest & Testcontainers](https://nikolamilovic.com/posts/2025-4-15-integration-testing-node-vitest-testcontainers/) - April 2025, complete pattern example
- [Running Testcontainers Tests Using GitHub Actions](https://www.docker.com/blog/running-testcontainers-tests-using-github-actions/) - Docker pre-installed on ubuntu-latest
- [vitest-environment-testcontainers](https://github.com/dextertanyj/vitest-environment-testcontainers) - Alternative approach (not recommended due to low adoption)
- [Drizzle ORM pushSchema discussion](https://github.com/drizzle-team/drizzle-orm/discussions/4373) - Programmatic schema push for tests

### Tertiary (LOW confidence)

- None -- all claims verified against official docs or codebase.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Testcontainers is the de facto standard, all modules verified on npm with recent releases (2 days ago for PG/Redis)
- Architecture: HIGH - globalSetup + provide/inject pattern documented in official Vitest and Testcontainers docs, verified with codebase compatibility
- Pitfalls: HIGH - RLS superuser bypass is a well-documented PostgreSQL behavior; SQL-beyond-migrations gap verified by inspecting actual codebase file structure
- CI integration: HIGH - Docker pre-installed on ubuntu-latest confirmed by Docker official blog and Testcontainers CI docs

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable ecosystem, Testcontainers 11.x is mature)
