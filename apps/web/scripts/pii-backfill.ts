/**
 * PII Back-fill Script
 *
 * Encrypts existing customer email and phone fields in 500-row batches.
 * Run after deploying the schema migration (0003_glossy_vermin.sql).
 *
 * DISABLED: encryption columns (email_ciphertext, phone_ciphertext,
 *    email_hmac) are not yet in the production database. Re-add the
 *    schema columns in customers.ts and apply the migration first.
 *
 * Usage:
 *   ENCRYPTION_KEY=<your-key> pnpm tsx apps/web/scripts/pii-backfill.ts
 *
 * The script is idempotent — rows that already have email_ciphertext set are skipped.
 */

async function main() {
  console.error(
    'DISABLED: PII encryption columns are not yet in the production database.\n' +
      'Re-add the columns in packages/database/src/schema/customers.ts,\n' +
      'apply the migration, then re-enable this script.',
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('Back-fill failed with error:', err);
  process.exit(1);
});
