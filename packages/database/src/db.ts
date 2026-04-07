import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { Sql as PostgresSql } from 'postgres';
import { createRequire } from 'node:module';
import * as schema from './schema/index';

const _require = createRequire(import.meta.url);

// Use postgres.js drizzle type as the canonical type — all drivers are compatible at query level
type DrizzleDb = ReturnType<typeof drizzlePostgres<typeof schema>>;

// Lazy connection instances
let _db: DrizzleDb | null = null;
let _dbTx: DrizzleDb | null = null;

function getConnectionUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is required');
  return url;
}

function isNeonUrl(): boolean {
  return getConnectionUrl().includes('neon.tech');
}

function getSslConfig(): Record<string, unknown> {
  const url = getConnectionUrl();
  if (url.includes('sslmode=')) return {}; // explicit in URL — let postgres.js handle it
  if (isNeonUrl()) return { ssl: 'require' };
  return { ssl: false }; // self-hosted (Coolify, Docker) — no TLS
}

/**
 * Standard query client
 * - Vercel/Neon: HTTP transport (stateless, zero connection overhead)
 * - Local dev: postgres.js TCP transport (standard PostgreSQL)
 */
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    if (!_db) {
      const url = getConnectionUrl();
      if (isNeonUrl()) {
        const sql = neon(url);
        _db = drizzleHttp(sql, { schema }) as unknown as DrizzleDb;
      } else {
        // Local PostgreSQL — use postgres.js (devDependency)
        const postgres = _require('postgres') as (
          url: string,
          opts: Record<string, unknown>,
        ) => PostgresSql;
        const queryClient = postgres(url, {
          max: 10,
          idle_timeout: 20,
          connect_timeout: 10,
          // Ensure UTF-8 encoding for Czech/Slovak diacritics (Windows may default to WIN1250)
          connection: { client_encoding: 'UTF8' },
          ...getSslConfig(),
        });
        _db = drizzlePostgres(queryClient, { schema });
      }
    }
    return Reflect.get(_db, prop, receiver);
  },
});

/**
 * Transaction-capable query client
 * - Vercel/Neon: WebSocket Pool transport (supports SELECT FOR UPDATE)
 * - Local dev: postgres.js TCP transport (supports all transactions natively)
 * MUST be used for db.transaction() calls that use SELECT FOR UPDATE.
 */
export const dbTx = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    if (!_dbTx) {
      const url = getConnectionUrl();
      if (isNeonUrl()) {
        const pool = new Pool({ connectionString: url });
        _dbTx = drizzleWs({ client: pool, schema }) as unknown as DrizzleDb;
      } else {
        // Local PostgreSQL — use postgres.js (same driver, transactions work natively)
        const postgres = _require('postgres') as (
          url: string,
          opts: Record<string, unknown>,
        ) => PostgresSql;
        const txClient = postgres(url, {
          max: 5,
          idle_timeout: 20,
          connect_timeout: 10,
          // Ensure UTF-8 encoding for Czech/Slovak diacritics (Windows may default to WIN1250)
          connection: { client_encoding: 'UTF8' },
          ...getSslConfig(),
        });
        _dbTx = drizzlePostgres(txClient, { schema });
      }
    }
    return Reflect.get(_dbTx, prop, receiver);
  },
});

// Export database type for use in application code
export type Database = typeof db;

/**
 * Raw postgres client for dev-only scripts (apply-sql, seeds).
 * Uses postgres.js which is only available as a devDependency.
 * DO NOT import this in application code — it is not available in production.
 *
 * @internal Dev scripts only
 */
export function getMigrationClient(): PostgresSql {
  const factory = _require('postgres') as (
    url: string,
    opts: Record<string, unknown>,
  ) => PostgresSql;
  return factory(getConnectionUrl(), {
    max: 1,
    // Ensure UTF-8 encoding for Czech/Slovak diacritics (Windows may default to WIN1250)
    connection: { client_encoding: 'UTF8' },
    ...getSslConfig(),
  });
}
