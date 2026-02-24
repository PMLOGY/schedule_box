/**
 * Analytics Snapshot Scheduler
 *
 * BullMQ-based hourly job that pre-computes daily analytics KPIs per company.
 * Populates the analytics_snapshots table with aggregated booking/revenue data
 * so dashboard queries load in under 2 seconds.
 *
 * Uses ON CONFLICT (company_id, snapshot_date) DO UPDATE for idempotent upserts.
 */

import { Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { db, companies, bookings, customers, analyticsSnapshots } from '@schedulebox/database';

// ============================================================================
// CONSTANTS
// ============================================================================

const ANALYTICS_QUEUE_NAME = 'analytics-snapshots';

// ============================================================================
// PROCESS ANALYTICS SNAPSHOTS
// ============================================================================

/**
 * Compute and upsert daily analytics snapshots for all active companies.
 *
 * For each company:
 * 1. Query today's bookings (total, completed, cancelled, no_show)
 * 2. Calculate revenue from completed bookings
 * 3. Count unique and new customers
 * 4. Determine top service by booking count
 * 5. UPSERT into analytics_snapshots
 */
async function processAnalyticsSnapshots(): Promise<void> {
  // Get all active companies
  const activeCompanies = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.isActive, true));

  console.log(
    `[Analytics Scheduler] Processing snapshots for ${activeCompanies.length} active companies`,
  );

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const todayStart = new Date(`${today}T00:00:00.000Z`);
  const todayEnd = new Date(`${today}T23:59:59.999Z`);

  for (const company of activeCompanies) {
    try {
      // Query booking stats for today
      const [bookingStats] = await db
        .select({
          totalBookings: sql<number>`COUNT(*)::int`,
          completedBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'completed')::int`,
          cancelledBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')::int`,
          noShows: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'no_show')::int`,
          totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'completed' THEN (${bookings.price} - ${bookings.discountAmount})::numeric ELSE 0 END), 0)`,
          uniqueCustomers: sql<number>`COUNT(DISTINCT ${bookings.customerId})::int`,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.companyId, company.id),
            sql`${bookings.startTime} >= ${todayStart}`,
            sql`${bookings.startTime} <= ${todayEnd}`,
            isNull(bookings.deletedAt),
          ),
        );

      // Count new customers (created today for this company)
      const [newCustomerStats] = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(customers)
        .where(
          and(eq(customers.companyId, company.id), sql`DATE(${customers.createdAt}) = ${today}`),
        );

      // Find top service by booking count today
      const topServiceResult = await db
        .select({
          serviceId: bookings.serviceId,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.companyId, company.id),
            sql`${bookings.startTime} >= ${todayStart}`,
            sql`${bookings.startTime} <= ${todayEnd}`,
            isNull(bookings.deletedAt),
          ),
        )
        .groupBy(bookings.serviceId)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(1);

      const completedCount = bookingStats?.completedBookings ?? 0;
      const revenue = Number(bookingStats?.totalRevenue ?? 0);
      const avgValue = completedCount > 0 ? revenue / completedCount : 0;
      const topServiceId = topServiceResult.length > 0 ? topServiceResult[0].serviceId : null;

      // UPSERT into analytics_snapshots
      await db
        .insert(analyticsSnapshots)
        .values({
          companyId: company.id,
          snapshotDate: today,
          totalBookings: bookingStats?.totalBookings ?? 0,
          completedBookings: completedCount,
          cancelledBookings: bookingStats?.cancelledBookings ?? 0,
          noShows: bookingStats?.noShows ?? 0,
          totalRevenue: revenue.toFixed(2),
          uniqueCustomers: bookingStats?.uniqueCustomers ?? 0,
          newCustomers: newCustomerStats?.count ?? 0,
          avgBookingValue: avgValue.toFixed(2),
          topServiceId,
        })
        .onConflictDoUpdate({
          target: [analyticsSnapshots.companyId, analyticsSnapshots.snapshotDate],
          set: {
            totalBookings: bookingStats?.totalBookings ?? 0,
            completedBookings: completedCount,
            cancelledBookings: bookingStats?.cancelledBookings ?? 0,
            noShows: bookingStats?.noShows ?? 0,
            totalRevenue: revenue.toFixed(2),
            uniqueCustomers: bookingStats?.uniqueCustomers ?? 0,
            newCustomers: newCustomerStats?.count ?? 0,
            avgBookingValue: avgValue.toFixed(2),
            topServiceId,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error(`[Analytics Scheduler] Error processing company ${company.id}:`, error);
    }
  }
}

// ============================================================================
// START ANALYTICS SCHEDULER
// ============================================================================

/**
 * Start the analytics snapshot scheduler.
 *
 * Creates a BullMQ queue with an hourly job scheduler (every hour on the hour)
 * that computes daily analytics snapshots for all active companies.
 *
 * Uses upsertJobScheduler (BullMQ 5.16+) instead of deprecated Queue.add with repeat.
 *
 * @param redisConnection Redis connection options for BullMQ
 * @returns Queue and Worker for graceful shutdown
 */
export async function startAnalyticsScheduler(
  redisConnection: ConnectionOptions,
): Promise<{ queue: Queue; worker: Worker }> {
  // Create analytics queue
  const analyticsQueue = new Queue(ANALYTICS_QUEUE_NAME, {
    connection: redisConnection,
  });

  // Schedule hourly snapshot refresh using upsertJobScheduler (BullMQ 5.16+)
  await analyticsQueue.upsertJobScheduler(
    'hourly-analytics-snapshot',
    { pattern: '0 * * * *' },
    {
      name: 'refresh-snapshots',
      data: {},
      opts: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnFail: 100,
      },
    },
  );

  console.log('[Analytics Scheduler] Hourly snapshot job scheduled (every hour on the hour)');

  // Create worker with concurrency 1 (single snapshot computation at a time)
  const worker = new Worker(
    ANALYTICS_QUEUE_NAME,
    async () => {
      console.log('[Analytics Scheduler] Starting hourly analytics snapshot refresh...');
      const startTime = Date.now();

      await processAnalyticsSnapshots();

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[Analytics Scheduler] Hourly analytics snapshot refresh completed in ${durationSec}s`,
      );
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[Analytics Scheduler] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Analytics Scheduler] Job ${job?.id} failed:`, error);
  });

  console.log('[Analytics Scheduler] Worker started');

  return { queue: analyticsQueue, worker };
}
