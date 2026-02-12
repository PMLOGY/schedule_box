import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

const DATABASE_URL = process.env.DATABASE_URL;

// Lazy connection - don't crash at import time (allows Next.js build without DB)
let _migrationClient: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getConnectionUrl(): string {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return DATABASE_URL;
}

// Migration client - single connection for transactional migrations
export function getMigrationClient() {
  if (!_migrationClient) {
    _migrationClient = postgres(getConnectionUrl(), { max: 1 });
  }
  return _migrationClient;
}

/** @deprecated Use getMigrationClient() instead */
export const migrationClient = DATABASE_URL
  ? postgres(DATABASE_URL, { max: 1 })
  : (null as unknown as ReturnType<typeof postgres>);

// Query client - connection pool for application queries
function createDb() {
  const queryClient = postgres(getConnectionUrl(), {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(queryClient, { schema });
}

// Lazy database instance - created on first access
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!_db) {
      _db = createDb();
    }
    return Reflect.get(_db, prop, receiver);
  },
});

// Export database type for use in application code
export type Database = ReturnType<typeof drizzle<typeof schema>>;
