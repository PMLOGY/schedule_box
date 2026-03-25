/**
 * Apply SQL Files Script
 *
 * Executes raw SQL files (RLS policies, triggers, constraints, functions)
 * after migrations have been applied.
 *
 * Execution order:
 * 1. RLS helper functions (current_company_id, etc.)
 * 2. Database functions (triggers, constraints, views)
 * 3. RLS policies (must come after helper functions)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load .env before any DB imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../../.env') });

interface SqlFile {
  name: string;
  path: string;
  description: string;
}

// Define SQL files in execution order
const SQL_FILES: SqlFile[] = [
  // 1. RLS helper functions (must be first)
  {
    name: 'RLS Helper Functions',
    path: join(__dirname, 'rls', 'functions.sql'),
    description: 'Session variable helper functions for Row Level Security',
  },

  // 2. Database functions and triggers
  {
    name: 'Updated At Trigger',
    path: join(__dirname, 'functions', 'updated-at.sql'),
    description: 'Auto-update updated_at timestamp on row changes',
  },
  {
    name: 'Customer Metrics Trigger',
    path: join(__dirname, 'functions', 'customer-metrics.sql'),
    description: 'Auto-compute customer health scores and CLV',
  },
  {
    name: 'Marketplace Rating Trigger',
    path: join(__dirname, 'functions', 'marketplace-rating.sql'),
    description: 'Auto-update marketplace average rating on review changes',
  },
  {
    name: 'Coupon Usage Trigger',
    path: join(__dirname, 'functions', 'coupon-usage.sql'),
    description: 'Track coupon usage counts and enforce max usage limits',
  },
  {
    name: 'Double Booking Constraint',
    path: join(__dirname, 'functions', 'double-booking.sql'),
    description: 'Exclusion constraint to prevent overlapping bookings',
  },
  {
    name: 'Soft Delete Indexes',
    path: join(__dirname, 'functions', 'soft-delete.sql'),
    description: 'Partial indexes for efficient soft-delete queries',
  },
  {
    name: 'Deferred Foreign Keys',
    path: join(__dirname, 'functions', 'deferred-fks.sql'),
    description: 'Add deferred foreign key constraints for parallel Wave 2',
  },
  {
    name: 'Audit Trail Trigger',
    path: join(__dirname, 'functions', 'audit-trail.sql'),
    description: 'Auto-log changes to critical tables in audit_logs',
  },

  // 3. Data migrations (idempotent — safe to re-run)
  {
    name: 'Subscription Plan Name Migration',
    path: join(__dirname, 'sql', '28-01-subscription-plan-migration.sql'),
    description:
      'Rename old plan names (starter→essential, professional→growth, enterprise→ai_powered) and create invoice sequence',
  },
  {
    name: 'Booking Status Expired Constraint',
    path: join(__dirname, 'sql', 'booking-status-expired.sql'),
    description: 'Add expired to bookings_status_check constraint',
  },

  // 4. Composite indexes for query performance
  {
    name: 'Composite Indexes',
    path: join(__dirname, 'functions', 'composite-indexes.sql'),
    description: 'Composite indexes for common query patterns (IF NOT EXISTS)',
  },

  // 5. RLS policies (must come after helper functions)
  {
    name: 'Row Level Security Policies',
    path: join(__dirname, 'rls', 'policies.sql'),
    description: 'Multi-tenant isolation policies on all tenant tables',
  },
];

/**
 * Apply all SQL files to the database within a single transaction.
 * If any file fails, the entire set of changes is rolled back,
 * preventing a partially-configured database.
 */
async function applySql(): Promise<void> {
  // Dynamic import after dotenv is loaded
  const { getMigrationClient } = await import('./db');
  const client = getMigrationClient();

  console.log('Applying SQL files to database (in single transaction)...\n');

  await client.begin(async (tx) => {
    let successCount = 0;

    for (const sqlFile of SQL_FILES) {
      console.log(`  ${sqlFile.name}`);
      console.log(`   ${sqlFile.description}`);

      try {
        // Read SQL file
        const sqlContent = readFileSync(sqlFile.path, 'utf-8');

        // Execute SQL within the transaction — any failure rolls back everything
        await tx.unsafe(sqlContent);

        console.log(`   Applied successfully\n`);
        successCount++;
      } catch (error) {
        console.error(`   FAILED: ${sqlFile.name} (${sqlFile.path})`);
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
        throw error; // Re-throw to trigger transaction rollback
      }
    }

    // Summary (only reached if all succeeded — otherwise transaction is rolled back)
    console.log('='.repeat(60));
    console.log(`Success: ${successCount}/${SQL_FILES.length} (committed)`);
    console.log('='.repeat(60));
    console.log('\nAll SQL files applied successfully!');
  });

  await client.end();
}

// Run the script
applySql().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
