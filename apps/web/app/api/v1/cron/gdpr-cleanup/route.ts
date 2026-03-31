/**
 * GDPR Auto-Deletion Cron Endpoint
 * POST /api/v1/cron/gdpr-cleanup
 *
 * Bulk-anonymizes customer PII for records older than 3 years.
 * GDPR compliance requires automated data lifecycle management.
 * Customer records older than 3 years have PII anonymized while
 * preserving aggregate business statistics for analytics.
 *
 * Protected by CRON_SECRET bearer token (timing-safe comparison).
 *
 * Required environment variables:
 *   CRON_SECRET — shared secret for cron invocation authentication
 */

import crypto from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { and, isNull, lt, isNotNull, inArray, sql } from 'drizzle-orm';
import { db, customers, customerTags } from '@schedulebox/database';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Maximum customers anonymized per cron run to prevent timeout */
const BATCH_SIZE = 500;

/** Retention period in years before anonymization */
const RETENTION_YEARS = 3;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // --- Auth: Validate CRON_SECRET ---
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  // Timing-safe comparison to prevent timing attacks
  let isValid = false;
  try {
    const expectedBuffer = Buffer.from(cronSecret, 'utf8');
    const tokenBuffer = Buffer.from(token, 'utf8');
    if (expectedBuffer.length === tokenBuffer.length) {
      isValid = crypto.timingSafeEqual(expectedBuffer, tokenBuffer);
    }
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 });
  }

  // --- GDPR Cleanup ---
  try {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);

    // Find customers older than 3 years that haven't been anonymized yet
    // Already-anonymized records have null email and non-null deletedAt
    const targetCustomers = await db
      .select({ id: customers.id, uuid: customers.uuid })
      .from(customers)
      .where(
        and(
          lt(customers.createdAt, cutoffDate),
          isNull(customers.deletedAt),
          isNotNull(customers.email),
        ),
      )
      .limit(BATCH_SIZE);

    if (targetCustomers.length === 0) {
      console.log('[CronGDPRCleanup] No customers eligible for anonymization');
      return NextResponse.json({
        anonymized: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const targetIds = targetCustomers.map((c) => c.id);
    const now = new Date();

    // Bulk anonymize: replace name with "Deleted User {uuid}", nullify PII
    // Aggregate fields (totalBookings, totalSpent, healthScore) are preserved
    await db
      .update(customers)
      .set({
        name: sql`'Deleted User ' || ${customers.uuid}::text`,
        email: null,
        phone: null,
        dateOfBirth: null,
        notes: null,
        marketingConsent: false,
        deletedAt: now,
        updatedAt: now,
      })
      .where(inArray(customers.id, targetIds));

    // Bulk delete tag associations for anonymized customers
    await db.delete(customerTags).where(inArray(customerTags.customerId, targetIds));

    console.log(
      `[CronGDPRCleanup] Anonymized ${targetCustomers.length} customers older than ${RETENTION_YEARS} years`,
    );

    return NextResponse.json({
      anonymized: targetCustomers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CronGDPRCleanup] Failed to run GDPR cleanup:', error);
    return NextResponse.json(
      { error: 'GDPR cleanup failed', details: String(error) },
      { status: 500 },
    );
  }
}
