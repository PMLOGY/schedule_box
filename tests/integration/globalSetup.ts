/**
 * Integration Test Global Setup
 *
 * Starts PostgreSQL 16, Redis 7, and RabbitMQ 3.13 Testcontainers,
 * applies Drizzle migrations and all SQL files (RLS, triggers, constraints),
 * creates a non-superuser role for RLS testing, and provides connection
 * strings to all test files via Vitest provide/inject.
 */

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';
import type { TestProject } from 'vitest/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Augment Vitest's ProvidedContext so inject() calls are type-safe in tests
declare module 'vitest' {
  export interface ProvidedContext {
    DATABASE_URL: string;
    DATABASE_URL_APP: string;
    REDIS_URL: string;
    RABBITMQ_URL: string;
  }
}

// Container references kept in module scope for teardown
let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
let redisContainer: Awaited<ReturnType<RedisContainer['start']>>;
let rabbitContainer: Awaited<ReturnType<RabbitMQContainer['start']>>;

// SQL files to apply after migrations, in execution order (mirrors apply-sql.ts)
const SQL_FILES = [
  // 1. RLS helper functions (must be first)
  resolve(__dirname, '../../packages/database/src/rls/functions.sql'),
  // 2. Database functions and triggers
  resolve(__dirname, '../../packages/database/src/functions/updated-at.sql'),
  resolve(__dirname, '../../packages/database/src/functions/customer-metrics.sql'),
  resolve(__dirname, '../../packages/database/src/functions/marketplace-rating.sql'),
  resolve(__dirname, '../../packages/database/src/functions/coupon-usage.sql'),
  resolve(__dirname, '../../packages/database/src/functions/double-booking.sql'),
  resolve(__dirname, '../../packages/database/src/functions/soft-delete.sql'),
  resolve(__dirname, '../../packages/database/src/functions/deferred-fks.sql'),
  resolve(__dirname, '../../packages/database/src/functions/audit-trail.sql'),
  // 3. Composite indexes for query performance
  resolve(__dirname, '../../packages/database/src/functions/composite-indexes.sql'),
  // 4. RLS policies (must come after helper functions)
  resolve(__dirname, '../../packages/database/src/rls/policies.sql'),
];

const MIGRATIONS_FOLDER = resolve(__dirname, '../../packages/database/src/migrations');

export async function setup(project: TestProject) {
  console.log('\n[Integration] Starting containers...');

  // Start all three containers in parallel
  [pgContainer, redisContainer, rabbitContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('schedulebox_test')
      .withUsername('test_superuser')
      .start(),
    new RedisContainer('redis:7-alpine').start(),
    new RabbitMQContainer('rabbitmq:3.13-management-alpine').start(),
  ]);

  const databaseUrl = pgContainer.getConnectionUri();

  console.log('[Integration] Running migrations...');

  // Run Drizzle migrations with a single-connection migration client
  const migrationClient = postgres(databaseUrl, { max: 1 });
  await migrate(drizzle(migrationClient), { migrationsFolder: MIGRATIONS_FOLDER });
  await migrationClient.end();

  console.log('[Integration] Applying SQL files...');

  // Apply all SQL files (RLS, functions, triggers, indexes, policies)
  const sqlClient = postgres(databaseUrl, { max: 1 });
  for (const sqlFilePath of SQL_FILES) {
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');
    await sqlClient.unsafe(sqlContent);
  }

  // Create non-superuser role for RLS tests (superusers bypass RLS)
  await sqlClient.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'test_app') THEN
        CREATE ROLE test_app LOGIN PASSWORD 'test_app_pwd';
      END IF;
    END $$;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO test_app;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO test_app;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO test_app;
  `);

  await sqlClient.end();

  // Construct DATABASE_URL_APP: same host/port/db but with test_app credentials
  // databaseUrl format: postgres://test_superuser:password@host:port/schedulebox_test
  const appUrl = databaseUrl
    .replace('test_superuser', 'test_app')
    .replace(/:[^:@]+@/, ':test_app_pwd@');

  const redisUrl = redisContainer.getConnectionUrl();
  const rabbitmqUrl = rabbitContainer.getAmqpUrl();

  // Provide connection strings to all test files via inject()
  project.provide('DATABASE_URL', databaseUrl);
  project.provide('DATABASE_URL_APP', appUrl);
  project.provide('REDIS_URL', redisUrl);
  project.provide('RABBITMQ_URL', rabbitmqUrl);

  console.log('[Integration] Ready.');
}

export async function teardown() {
  // Stop all containers in parallel
  await Promise.all([pgContainer?.stop(), redisContainer?.stop(), rabbitContainer?.stop()]);
}
