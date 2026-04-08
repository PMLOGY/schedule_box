/**
 * Runtime migration script for production Docker container.
 * Uses @neondatabase/serverless Pool (already in standalone output)
 * to run Drizzle migrations before the server starts.
 *
 * This avoids needing postgres.js (devDependency) or tsx in production.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.log('No DATABASE_URL — skipping migrations');
  process.exit(0);
}

// Find migrations directory (relative to where this script is copied in Docker)
const migrationsDir = resolve(__dirname, 'packages/database/src/migrations');
if (!existsSync(migrationsDir)) {
  console.log(`Migrations directory not found at ${migrationsDir} — skipping`);
  process.exit(0);
}

// Read the journal to know which migrations to run
const journalPath = resolve(migrationsDir, 'meta/_journal.json');
if (!existsSync(journalPath)) {
  console.log('No migration journal found — skipping');
  process.exit(0);
}

const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
const migrations = journal.entries || [];

async function runMigrations() {
  // Dynamic import — @neondatabase/serverless is in node_modules via standalone tracing
  let Pool;
  try {
    const neon = await import('@neondatabase/serverless');
    Pool = neon.Pool;
  } catch {
    // Fallback: try pg
    try {
      const pg = await import('pg');
      Pool = pg.default?.Pool || pg.Pool;
    } catch {
      console.log('No database driver available — skipping migrations');
      process.exit(0);
    }
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Create migrations tracking table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `);

    // Get already-applied migrations
    const { rows: applied } = await pool.query('SELECT hash FROM "__drizzle_migrations"');
    const appliedHashes = new Set(applied.map(r => r.hash));

    let count = 0;
    for (const entry of migrations) {
      const hash = entry.tag;
      if (appliedHashes.has(hash)) continue;

      const sqlFile = resolve(migrationsDir, `${hash}.sql`);
      if (!existsSync(sqlFile)) {
        console.log(`  Migration file not found: ${hash}.sql — skipping`);
        continue;
      }

      const sql = readFileSync(sqlFile, 'utf-8');
      // Split by statement breakpoint (Drizzle convention)
      const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

      console.log(`  Applying: ${hash} (${statements.length} statements)`);

      for (const stmt of statements) {
        try {
          await pool.query(stmt);
        } catch (err) {
          // Skip "already exists" errors (idempotent)
          if (err.code === '42P07' || err.code === '42710' || err.code === '42701') {
            continue;
          }
          throw err;
        }
      }

      // Record migration as applied
      await pool.query(
        'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
        [hash, Date.now()]
      );
      count++;
    }

    if (count > 0) {
      console.log(`  ${count} migration(s) applied successfully`);
    } else {
      console.log('  All migrations already applied');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
    // Non-fatal — let the server start anyway
  } finally {
    await pool.end();
  }
}

console.log('Running database migrations...');
await runMigrations();
