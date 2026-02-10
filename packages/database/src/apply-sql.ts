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
import { migrationClient } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  // 3. RLS policies (must come after helper functions)
  {
    name: 'Row Level Security Policies',
    path: join(__dirname, 'rls', 'policies.sql'),
    description: 'Multi-tenant isolation policies on all tenant tables',
  },
];

/**
 * Apply all SQL files to the database
 */
async function applySql(): Promise<void> {
  console.log('🚀 Applying SQL files to database...\n');

  let successCount = 0;
  let failureCount = 0;

  for (const sqlFile of SQL_FILES) {
    try {
      console.log(`📄 ${sqlFile.name}`);
      console.log(`   ${sqlFile.description}`);

      // Read SQL file
      const sql = readFileSync(sqlFile.path, 'utf-8');

      // Execute SQL (using unsafe for raw SQL execution)
      await migrationClient.unsafe(sql);

      console.log(`   ✅ Applied successfully\n`);
      successCount++;
    } catch (error) {
      console.error(
        `   ❌ Failed to apply: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      failureCount++;
    }
  }

  // Summary
  console.log('═'.repeat(60));
  console.log(`✅ Success: ${successCount}/${SQL_FILES.length}`);
  if (failureCount > 0) {
    console.log(`❌ Failures: ${failureCount}/${SQL_FILES.length}`);
  }
  console.log('═'.repeat(60));

  // Exit with error code if any failures
  if (failureCount > 0) {
    console.error('\n⚠️  Some SQL files failed to apply. Check errors above.');
    process.exit(1);
  }

  console.log('\n🎉 All SQL files applied successfully!');
}

// Run the script
applySql()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    // Close the migration client
    await migrationClient.end();
  });
