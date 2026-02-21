/**
 * Monitoring Scheduler
 * BullMQ repeatable job that checks delivery stats every 5 minutes and triggers alerts
 * when thresholds are breached.
 *
 * MON-01: Email bounce rate above 5% in rolling 1-hour window
 * MON-02: Estimated SMS monthly cost approaching monthly limit
 * MON-03: Payment webhook failures above threshold in rolling 1-hour window
 */

import { Queue, Worker } from 'bullmq';
import { sql } from 'drizzle-orm';
import { db, notifications, processedWebhooks } from '@schedulebox/database';
import { sendAlert } from './alert-sender.js';
import { config } from '../config.js';
import { smsSegmentsTotal, smsEstimatedMonthlyCostCzk } from './metrics.js';

const MONITORING_QUEUE = 'monitoring-checks';

/**
 * Resources returned by startMonitoringScheduler for graceful shutdown
 */
export interface MonitoringResources {
  queue: Queue;
  worker: Worker;
}

/**
 * Query result row for email bounce stats
 */
interface EmailStatsRow {
  delivered: string | number;
  failed: string | number;
  total: string | number;
}

/**
 * Handle a single monitoring check cycle.
 *
 * Checks both email bounce rate (MON-01) and SMS cost (MON-02).
 * Never throws — errors are caught and logged per monitoring best practice.
 */
async function handleMonitoringCheck(): Promise<void> {
  let emailFailureRate = 0;
  let smsEstimatedCost = 0;
  let webhookFailures = 0;

  // ─── MON-01: Email bounce rate check ────────────────────────────────────
  try {
    const rows = await db
      .select({
        delivered: sql<string>`COUNT(*) FILTER (WHERE ${notifications.status} IN ('sent', 'delivered', 'opened', 'clicked'))`,
        failed: sql<string>`COUNT(*) FILTER (WHERE ${notifications.status} = 'failed')`,
        total: sql<string>`COUNT(*)`,
      })
      .from(notifications)
      .where(
        sql`${notifications.channel} = 'email' AND ${notifications.createdAt} > NOW() - INTERVAL '1 hour'`,
      );

    const row = rows[0] as EmailStatsRow | undefined;

    if (row) {
      const delivered = Number(row.delivered ?? 0);
      const failed = Number(row.failed ?? 0);
      const total = delivered + failed;

      if (total > 0) {
        emailFailureRate = failed / total;

        if (emailFailureRate > config.monitoring.emailBounceThreshold) {
          const ratePct = (emailFailureRate * 100).toFixed(1);
          const thresholdPct = (config.monitoring.emailBounceThreshold * 100).toFixed(0);
          await sendAlert({
            subject: 'Email bounce rate above threshold',
            body: `Current rate: ${ratePct}% (threshold: ${thresholdPct}%). Failed: ${failed}, Delivered: ${delivered} in last hour.`,
            severity: emailFailureRate > 0.15 ? 'critical' : 'warning',
          });
        }
      }
    }
  } catch (error) {
    console.error(
      '[Monitor] Failed to check email bounce rate:',
      error instanceof Error ? error.message : error,
    );
  }

  // ─── MON-02: SMS cost check ──────────────────────────────────────────────
  try {
    // Get current cumulative segment count from the in-process prom counter
    const segmentMetric = await smsSegmentsTotal.get();
    const totalSegments = segmentMetric.values.reduce((sum, v) => sum + v.value, 0);

    // Estimate monthly cost from segments this process has tracked
    smsEstimatedCost = totalSegments * config.monitoring.smsCostPerSegmentCzk;

    // Update the gauge so /metrics endpoint reflects current estimate
    smsEstimatedMonthlyCostCzk.set(smsEstimatedCost);

    // Query DB for SMS message count this calendar month (for context in alert body)
    const rows = await db
      .select({
        total: sql<string>`COUNT(*)`,
      })
      .from(notifications)
      .where(
        sql`${notifications.channel} = 'sms' AND ${notifications.createdAt} >= date_trunc('month', NOW())`,
      );

    const monthTotal = Number(rows[0]?.total ?? 0);
    const costLimit = config.monitoring.smsMonthlyCostLimitCzk;

    if (smsEstimatedCost > costLimit * 0.8) {
      await sendAlert({
        subject: 'SMS cost approaching monthly limit',
        body: `Estimated: ${smsEstimatedCost.toFixed(2)} CZK, Limit: ${costLimit} CZK, Messages this month: ${monthTotal}`,
        severity: smsEstimatedCost > costLimit ? 'critical' : 'warning',
      });
    }
  } catch (error) {
    console.error(
      '[Monitor] Failed to check SMS cost:',
      error instanceof Error ? error.message : error,
    );
  }

  // ─── MON-03: Webhook failure check ───────────────────────────────────────
  try {
    const rows = await db
      .select({
        failed: sql<string>`COUNT(*) FILTER (WHERE ${processedWebhooks.status} = 'failed')`,
        total: sql<string>`COUNT(*)`,
      })
      .from(processedWebhooks)
      .where(sql`${processedWebhooks.processedAt} > NOW() - INTERVAL '1 hour'`);

    const row = rows[0] as { failed: string | number; total: string | number } | undefined;

    if (row) {
      webhookFailures = Number(row.failed ?? 0);

      if (webhookFailures >= 5) {
        const total = Number(row.total ?? 0);
        await sendAlert({
          subject: 'Payment webhook failures detected',
          body: `Failed: ${webhookFailures}, Total: ${total} in last hour.`,
          severity: webhookFailures >= 10 ? 'critical' : 'warning',
        });
      }
    }
  } catch (error) {
    console.error(
      '[Monitor] Failed to check webhook failures:',
      error instanceof Error ? error.message : error,
    );
  }

  console.log('[Monitor] Health check completed', {
    emailFailureRate: emailFailureRate.toFixed(4),
    smsEstimatedCost: smsEstimatedCost.toFixed(2),
    webhookFailures,
  });
}

/**
 * Start the monitoring scheduler as a BullMQ repeatable job.
 *
 * Creates a monitoring queue, adds a repeatable job that runs every
 * config.monitoring.checkIntervalMs milliseconds (default: 5 minutes),
 * and creates a Worker to process the checks.
 *
 * @param redisConnection Redis connection options for BullMQ
 * @returns Queue and Worker instances for graceful shutdown
 */
export async function startMonitoringScheduler(redisConnection: {
  host: string;
  port: number;
  password?: string;
  username?: string;
}): Promise<MonitoringResources> {
  const queue = new Queue(MONITORING_QUEUE, {
    connection: redisConnection,
  });

  // Add repeatable job — BullMQ deduplicates by jobId so restarts don't create duplicates
  await queue.add(
    'check-delivery-stats',
    {},
    {
      repeat: { every: config.monitoring.checkIntervalMs },
      jobId: 'delivery-stats-check',
    },
  );

  const worker = new Worker(MONITORING_QUEUE, handleMonitoringCheck, {
    connection: redisConnection,
    concurrency: 1, // Monitoring checks are sequential
  });

  worker.on('completed', () => {
    console.log('[Monitor Worker] Check job completed');
  });

  worker.on('failed', (job, err) => {
    console.error('[Monitor Worker] Check job failed:', err.message);
  });

  console.log(
    `[Monitor Worker] Monitoring scheduler started (interval: ${config.monitoring.checkIntervalMs}ms)`,
  );

  return { queue, worker };
}
