/**
 * Integration Test DB Helpers
 *
 * Provides DB connection factories and utility functions for integration tests:
 * - createTestDb: Superuser connection (bypasses RLS) for seeding and setup
 * - createTestAppDb: Non-superuser connection for RLS tests
 * - setRlsContext: Sets session variables for RLS policy evaluation
 * - truncateAllTables: Fast cleanup via TRUNCATE companies CASCADE
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@schedulebox/database';
import { inject } from 'vitest';

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Creates a superuser DB connection that bypasses RLS.
 * Use for seeding test data and verifying DB state across tenants.
 *
 * @returns Object with `client` (postgres connection) and `db` (Drizzle instance)
 */
export function createTestDb() {
  const url = inject('DATABASE_URL');
  const client = postgres(url, { max: 10 });
  const db = drizzle(client, { schema });
  return { client, db };
}

/**
 * Creates a non-superuser DB connection using the test_app role.
 * RLS policies are enforced for this role — use for testing tenant isolation.
 *
 * @returns Object with `client` (postgres connection) and `db` (Drizzle instance)
 */
export function createTestAppDb() {
  const url = inject('DATABASE_URL_APP');
  const client = postgres(url, { max: 10 });
  const db = drizzle(client, { schema });
  return { client, db };
}

/**
 * Sets RLS session variables for the current transaction.
 * Uses SET LOCAL so context is scoped to the active transaction only.
 *
 * Must be called inside a transaction (client.begin() block).
 *
 * @param client - postgres.js SQL client
 * @param context - RLS context variables
 */
export async function setRlsContext(
  client: postgres.Sql,
  context: {
    companyId: number;
    userRole: 'admin' | 'owner' | 'employee' | 'customer';
    userId: number;
  },
) {
  await client.unsafe(`SET LOCAL app.company_id = '${context.companyId}'`);
  await client.unsafe(`SET LOCAL app.user_role = '${context.userRole}'`);
  await client.unsafe(`SET LOCAL app.user_id = '${context.userId}'`);
}

/**
 * Truncates all tenant tables by cascading from the companies root table.
 * This is the fastest cleanup method since all tables ultimately reference companies.
 *
 * @param client - postgres.js SQL client (superuser)
 */
export async function truncateAllTables(client: postgres.Sql) {
  await client.unsafe('TRUNCATE companies CASCADE');
}
