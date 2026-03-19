import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (dotenv for local dev, Railway provides env directly)
config({ path: resolve(__dirname, '../../../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Detect whether SSL is needed (Neon requires it, self-hosted typically doesn't)
const isNeon = DATABASE_URL.includes('neon.tech');
const sslConfig = isNeon ? 'require' : DATABASE_URL.includes('sslmode=') ? undefined : false;

// Create single-connection client for migrations
const migrationClient = postgres(DATABASE_URL, {
  max: 1,
  ...(sslConfig !== undefined && { ssl: sslConfig }),
});
const db = drizzle(migrationClient);

async function runMigrations() {
  console.log('Running migrations...');

  try {
    await migrate(db, { migrationsFolder: resolve(__dirname, 'migrations') });
    console.log('Migrations complete');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
