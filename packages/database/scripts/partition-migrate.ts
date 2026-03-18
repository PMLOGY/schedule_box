/**
 * ============================================================================
 * partition-migrate.ts
 * DB Partitioning Migration Script — MAINTENANCE WINDOW REQUIRED
 * ============================================================================
 *
 * WARNING: This script performs live table renames that affect the running
 * application. It MUST be run during a scheduled maintenance window when the
 * application is scaled to zero (or put in read-only mode) to avoid data loss
 * or integrity errors.
 *
 * Strategy: Create shadow partitioned table → batch-migrate data → RENAME swap
 *   - The DDL (shadow table creation) and batch migration can be interrupted
 *     and resumed safely without data loss.
 *   - The RENAME swap is fast (catalog-only) but irreversible without rollback.
 *   - Use --dry-run to run DDL + migration without the final swap.
 *   - Use rollback_partitions.sql to reverse the swap if needed.
 *
 * Usage:
 *   npx tsx packages/database/scripts/partition-migrate.ts
 *   npx tsx packages/database/scripts/partition-migrate.ts --dry-run
 *   npx tsx packages/database/scripts/partition-migrate.ts --table bookings
 *   npx tsx packages/database/scripts/partition-migrate.ts --rollback
 *
 * Prerequisites:
 *   - DATABASE_URL env var set (postgres.js format: postgres://user:pass@host/db)
 *   - Maintenance window active (application scaled to zero)
 *   - Neon branch tested first before production
 * ============================================================================
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { config } from 'dotenv';
import type { Sql } from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Load .env from repo root
config({ path: resolve(__dirname, '../../../.env') });

// ============================================================================
// Configuration
// ============================================================================

const BATCH_SIZE = 500;

interface TableConfig {
  name: string;
  partitionKey: string;
  ddlFile: string;
  sampleExplain: string;
}

const TABLES: TableConfig[] = [
  {
    name: 'bookings',
    partitionKey: 'start_time',
    ddlFile: resolve(__dirname, '../src/migrations/0004_partition_bookings.sql'),
    sampleExplain:
      "SELECT * FROM bookings WHERE company_id = 1 AND start_time >= '2026-03-01' AND start_time < '2026-04-01'",
  },
  {
    name: 'notifications',
    partitionKey: 'created_at',
    ddlFile: resolve(__dirname, '../src/migrations/0005_partition_notifications.sql'),
    sampleExplain:
      "SELECT * FROM notifications WHERE company_id = 1 AND created_at >= '2026-03-01' AND created_at < '2026-04-01'",
  },
  {
    name: 'audit_logs',
    partitionKey: 'created_at',
    ddlFile: resolve(__dirname, '../src/migrations/0006_partition_audit_logs.sql'),
    sampleExplain:
      "SELECT * FROM audit_logs WHERE company_id = 1 AND created_at >= '2026-03-01' AND created_at < '2026-04-01'",
  },
];

// ============================================================================
// Parse CLI flags
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ROLLBACK = args.includes('--rollback');
const TABLE_FLAG_IDX = args.indexOf('--table');
const TABLE_FILTER: string | null =
  TABLE_FLAG_IDX >= 0 && args[TABLE_FLAG_IDX + 1] ? args[TABLE_FLAG_IDX + 1] : null;

// ============================================================================
// Logging helpers
// ============================================================================

function log(msg: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function logError(msg: string) {
  const ts = new Date().toISOString();
  console.error(`[${ts}] ERROR: ${msg}`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    logError('DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  if (DRY_RUN) {
    log('DRY-RUN mode: DDL + batch migration will run. RENAME swap will be SKIPPED.');
  }
  if (ROLLBACK) {
    log('ROLLBACK mode: Running rollback_partitions.sql...');
  }
  if (TABLE_FILTER) {
    const valid = TABLES.map((t) => t.name);
    if (!valid.includes(TABLE_FILTER)) {
      logError(`Unknown table "${TABLE_FILTER}". Valid values: ${valid.join(', ')}`);
      process.exit(1);
    }
    log(`Table filter: only migrating "${TABLE_FILTER}"`);
  }

  // postgres.js client — in devDependencies, used only for local/manual scripts
  const postgresFactory = require('postgres') as (
    url: string,
    opts: { max: number; idle_timeout?: number },
  ) => Sql;
  const sql = postgresFactory(url, { max: 1, idle_timeout: 30 });

  try {
    if (ROLLBACK) {
      await runRollback(sql);
      return;
    }

    const tables = TABLE_FILTER ? TABLES.filter((t) => t.name === TABLE_FILTER) : TABLES;

    for (const table of tables) {
      await migrateTable(sql, table, DRY_RUN);
    }

    if (!DRY_RUN) {
      log('All tables migrated. Running EXPLAIN to verify partition pruning...');
      for (const table of tables) {
        await verifyPartitionPruning(sql, table);
      }
      log('Migration complete. Verify application behaviour before dropping _old tables.');
      log(
        'After verification period (recommended 7 days): DROP TABLE {table}_old CASCADE; for each table.',
      );
    } else {
      log(
        'Dry-run complete. No RENAME swaps performed. Re-run without --dry-run to apply the swap.',
      );
    }
  } finally {
    await sql.end();
  }
}

// ============================================================================
// Migrate a single table
// ============================================================================

async function migrateTable(sql: Sql, table: TableConfig, dryRun: boolean) {
  const { name, ddlFile } = table;
  const shadowName = `${name}_partitioned`;

  log(`[${name}] Starting migration...`);

  // Step 1: Apply DDL (idempotent with IF NOT EXISTS conceptually — but we use
  // a shadow name so running twice creates a second attempt; check first)
  const [existsRow] = await sql<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = ${shadowName}
        AND n.nspname = 'public'
    ) AS exists
  `;

  if (existsRow.exists) {
    log(`[${name}] Shadow table "${shadowName}" already exists — skipping DDL step.`);
  } else {
    log(`[${name}] Applying DDL from ${ddlFile}...`);
    const ddl = readFileSync(ddlFile, 'utf-8');
    await sql.unsafe(ddl);
    log(`[${name}] DDL applied.`);
  }

  // Step 2: Count total rows for progress reporting
  const [countRow] = await sql<[{ total: string }]>`
    SELECT COUNT(*)::text AS total FROM ${sql(name)}
  `;
  const total = parseInt(countRow.total, 10);
  log(`[${name}] Total rows to migrate: ${total}`);

  if (total === 0) {
    log(`[${name}] No rows to migrate. Proceeding to RENAME swap.`);
  } else {
    // Step 3: Batch migration — INSERT ... SELECT with LIMIT/OFFSET
    // NOTE: OFFSET-based pagination is inefficient at large offsets; however,
    // for a one-time migration this is acceptable. The process is interruptible:
    // already-inserted rows won't cause duplicate key errors because the shadow
    // table starts empty and we track progress by counting existing rows.
    const [alreadyMigratedRow] = await sql<[{ migrated: string }]>`
      SELECT COUNT(*)::text AS migrated FROM ${sql(shadowName)}
    `;
    let offset = parseInt(alreadyMigratedRow.migrated, 10);

    if (offset > 0) {
      log(`[${name}] Resuming migration: ${offset}/${total} rows already migrated.`);
    }

    while (offset < total) {
      await sql`
        INSERT INTO ${sql(shadowName)}
        SELECT * FROM ${sql(name)}
        ORDER BY id
        LIMIT ${BATCH_SIZE} OFFSET ${offset}
        ON CONFLICT DO NOTHING
      `;
      offset += BATCH_SIZE;
      const migrated = Math.min(offset, total);
      log(`[${name}] Migrated ${migrated}/${total} rows`);
      // Yield to event loop to avoid blocking
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    log(`[${name}] Batch migration complete.`);
  }

  // Step 4: RENAME swap (skipped in dry-run mode)
  if (dryRun) {
    log(`[${name}] DRY-RUN: Skipping RENAME swap.`);
    return;
  }

  log(`[${name}] Performing RENAME swap (this is fast — catalog changes only)...`);
  await sql.begin(async (txSql) => {
    await txSql`ALTER TABLE ${txSql(name)} RENAME TO ${txSql(`${name}_old`)}`;
    await txSql`ALTER TABLE ${txSql(shadowName)} RENAME TO ${txSql(name)}`;
  });

  log(`[${name}] RENAME swap complete. "${name}" is now the partitioned table.`);
  log(`[${name}] Original table is preserved as "${name}_old".`);
}

// ============================================================================
// Verify partition pruning via EXPLAIN
// ============================================================================

async function verifyPartitionPruning(sql: Sql, table: TableConfig) {
  const { name, sampleExplain } = table;
  log(`[${name}] Running EXPLAIN to verify partition pruning...`);

  const rows = await sql<Array<{ 'QUERY PLAN': string }>>`
    EXPLAIN (FORMAT TEXT) ${sql.unsafe(sampleExplain)}
  `;

  const plan = rows.map((r) => r['QUERY PLAN']).join('\n');
  log(`[${name}] EXPLAIN output:\n${plan}`);

  // Look for evidence of partition pruning: if the plan mentions a specific
  // partition name (e.g., "bookings_2026_03") that is a strong signal.
  const pruningSignal = new RegExp(`${name}_\\d{4}_\\d{2}`);
  if (pruningSignal.test(plan)) {
    log(`[${name}] Partition pruning CONFIRMED — query scans specific partition(s).`);
  } else {
    log(
      `[${name}] WARNING: Partition pruning not detected in EXPLAIN. This may be expected ` +
        'if no data exists in the target partition or if the sample date is out of range. ' +
        'Verify manually with a production-representative query.',
    );
  }
}

// ============================================================================
// Rollback
// ============================================================================

async function runRollback(sql: Sql) {
  const rollbackFile = resolve(__dirname, '../src/migrations/rollback_partitions.sql');
  const rollbackSql = readFileSync(rollbackFile, 'utf-8');

  log('Running rollback_partitions.sql...');
  log('WARNING: This will rename {table}_partitioned back to {table} and {table}_old to {table}.');
  log('Make sure the application is scaled to zero before proceeding or writes may be lost.');

  // Execute each BEGIN...COMMIT block separately for clarity
  // Split on double newlines between BEGIN...COMMIT blocks
  const blocks = rollbackSql
    .split(/\n(?=BEGIN;)/gm)
    .map((b) => b.trim())
    .filter((b) => b.startsWith('BEGIN;'));

  for (const block of blocks) {
    try {
      await sql.unsafe(block);
      log(`Rollback block executed: ${block.split('\n')[1]?.trim()}`);
    } catch (e) {
      logError(`Rollback block failed: ${(e as Error).message}`);
      logError('Stopping rollback. Review database state manually.');
      process.exit(1);
    }
  }

  log('Rollback complete. Original unpartitioned tables are restored.');
}

// ============================================================================
// Entry point
// ============================================================================

main().catch((e) => {
  logError((e as Error).message);
  process.exit(1);
});
