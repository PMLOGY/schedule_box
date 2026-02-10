import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Migration client - single connection for transactional migrations
export const migrationClient = postgres(DATABASE_URL, {
  max: 1,
});

// Query client - connection pool for application queries
const queryClient = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Database instance with full schema for relations and query builder
export const db = drizzle(queryClient, { schema });

// Export database type for use in application code
export type Database = typeof db;
