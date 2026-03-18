/**
 * PII Back-fill Script
 *
 * Encrypts existing customer email and phone fields in 500-row batches.
 * Run after deploying the schema migration (0003_glossy_vermin.sql).
 *
 * Usage:
 *   ENCRYPTION_KEY=<your-key> pnpm tsx apps/web/scripts/pii-backfill.ts
 *
 * The script is idempotent — rows that already have email_ciphertext set are skipped.
 */

import { db } from '@schedulebox/database';
import { customers } from '@schedulebox/database';
import { isNull, isNotNull, and, eq } from 'drizzle-orm';
import { encrypt, hmacIndex } from '../lib/security/encryption';

// ============================================================================
// CONSTANTS
// ============================================================================

const BATCH = 500;

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    console.error(
      'Error: ENCRYPTION_KEY environment variable is not set.\n' +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
    process.exit(1);
  }

  console.log('Starting PII back-fill...');

  let processed = 0;

  while (true) {
    // Fetch rows that have not yet been encrypted
    const rows = await db
      .select({
        id: customers.id,
        email: customers.email,
        phone: customers.phone,
      })
      .from(customers)
      .where(isNull(customers.emailCiphertext))
      .limit(BATCH);

    if (!rows.length) break;

    for (const row of rows) {
      await db
        .update(customers)
        .set({
          emailCiphertext: row.email ? encrypt(row.email, masterKey) : null,
          phoneCiphertext: row.phone ? encrypt(row.phone, masterKey) : null,
          emailHmac: row.email ? hmacIndex(row.email, masterKey) : null,
        })
        .where(eq(customers.id, row.id));
    }

    processed += rows.length;
    console.log(`Processed ${processed} rows...`);
  }

  console.log(`Back-fill complete. Total rows processed: ${processed}`);

  // ============================================================================
  // VERIFICATION STEP
  // ============================================================================

  console.log('\nRunning verification...');

  const [verifyResult] = await db
    .select({
      count: db.$count(
        customers,
        and(isNotNull(customers.email), isNull(customers.emailCiphertext)),
      ),
    })
    .from(customers);

  const unencryptedCount = Number(verifyResult?.count ?? 0);

  if (unencryptedCount > 0) {
    console.error(
      `VERIFICATION FAILED: ${unencryptedCount} rows have email but no email_ciphertext.`,
    );
    console.error('Review the back-fill logs above and re-run the script.');
    process.exit(1);
  }

  console.log('Verification passed — all customer emails are encrypted.');
}

main().catch((err) => {
  console.error('Back-fill failed with error:', err);
  process.exit(1);
});
