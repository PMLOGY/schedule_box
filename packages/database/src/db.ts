import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import type { Sql as PostgresSql } from 'postgres';
import * as schema from './schema/index';

// Lazy connection instances
let _db: ReturnType<typeof drizzleHttp<typeof schema>> | null = null;
let _dbTx: ReturnType<typeof drizzleWs<typeof schema>> | null = null;

function getConnectionUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is required');
  return url;
}

function isNeonUrl(): boolean {
  return !!process.env.VERCEL || getConnectionUrl().includes('neon.tech');
}

/**
 * Standard query client — Neon HTTP transport (stateless, zero connection overhead)
 * Use for all read queries, simple writes, and non-transactional operations.
 * Falls back to Neon WebSocket Pool for local PostgreSQL development.
 */
export const db = new Proxy({} as ReturnType<typeof drizzleHttp<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!_db) {
      const url = getConnectionUrl();
      if (isNeonUrl()) {
        const sql = neon(url);
        _db = drizzleHttp(sql, { schema });
      } else {
        // Local PostgreSQL — use Neon Pool for compatible API
        const pool = new Pool({ connectionString: url });
        _db = drizzleWs({ client: pool, schema }) as unknown as ReturnType<
          typeof drizzleHttp<typeof schema>
        >;
      }
    }
    return Reflect.get(_db, prop, receiver);
  },
});

/**
 * Transaction-capable query client — Neon WebSocket Pool transport
 * MUST be used for db.transaction() calls that use SELECT FOR UPDATE.
 * Examples: booking double-booking prevention, refresh token rotation.
 * Neon HTTP transport does NOT support interactive transactions.
 */
export const dbTx = new Proxy({} as ReturnType<typeof drizzleWs<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!_dbTx) {
      const pool = new Pool({ connectionString: getConnectionUrl() });
      _dbTx = drizzleWs({ client: pool, schema });
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
  // postgres is a devDependency — only available locally, never bundled for production
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const factory = require('postgres') as (url: string, opts: { max: number }) => PostgresSql;
  return factory(getConnectionUrl(), { max: 1 });
}
