/**
 * Webhook Retry Cron Endpoint
 * GET /api/v1/webhook-endpoints/retry - Process pending retry deliveries
 *
 * Vercel Cron compatible — protect with Authorization: Bearer {CRON_SECRET}
 * Should be called every minute by a cron scheduler.
 *
 * Vercel cron config (add to vercel.json):
 * { "path": "/api/v1/webhook-endpoints/retry", "schedule": "* * * * *" }
 */

import { eq, lte, and, gt } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { db, webhookEndpoints, webhookDeliveries } from '@schedulebox/database';
import { decrypt, getEncryptionKey } from '@/lib/security/encryption';

const RETRY_BATCH_SIZE = 50;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify cron secret (Vercel Cron sends Authorization: Bearer {CRON_SECRET})
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Query pending retries where scheduledAt <= now and attempt > 1
  const pendingRetries = await db
    .select({
      id: webhookDeliveries.id,
      uuid: webhookDeliveries.uuid,
      endpointId: webhookDeliveries.endpointId,
      eventType: webhookDeliveries.eventType,
      payload: webhookDeliveries.payload,
      attempt: webhookDeliveries.attempt,
      maxAttempts: webhookDeliveries.maxAttempts,
    })
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.status, 'pending'),
        lte(webhookDeliveries.scheduledAt, now),
        gt(webhookDeliveries.attempt, 1),
      ),
    )
    .limit(RETRY_BATCH_SIZE);

  if (pendingRetries.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const masterKey = getEncryptionKey();
  let processedCount = 0;
  let failedCount = 0;

  for (const delivery of pendingRetries) {
    try {
      // Fetch parent endpoint
      const [endpoint] = await db
        .select({
          id: webhookEndpoints.id,
          uuid: webhookEndpoints.uuid,
          url: webhookEndpoints.url,
          encryptedSecret: webhookEndpoints.encryptedSecret,
          isActive: webhookEndpoints.isActive,
        })
        .from(webhookEndpoints)
        .where(eq(webhookEndpoints.id, delivery.endpointId))
        .limit(1);

      if (!endpoint || !endpoint.isActive) {
        // Endpoint deleted or deactivated — mark as failed
        await db
          .update(webhookDeliveries)
          .set({ status: 'failed', responseBody: 'Endpoint not found or inactive' })
          .where(eq(webhookDeliveries.id, delivery.id));
        failedCount++;
        continue;
      }

      // Decrypt secret
      const rawSecret = decrypt(endpoint.encryptedSecret, masterKey);
      const payloadObj = (delivery.payload ?? {}) as Record<string, unknown>;
      const payloadJson = JSON.stringify(payloadObj);

      // Compute HMAC signature
      const hmac = createHmac('sha256', rawSecret).update(payloadJson).digest('hex');

      // Send HTTP POST
      const startTime = Date.now();
      let responseStatus: number | null = null;
      let responseBody: string | null = null;
      let responseTimeMs: number | null = null;
      let deliveryStatus: string;

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ScheduleBox-Signature': `sha256=${hmac}`,
            'X-ScheduleBox-Event': delivery.eventType,
            'X-ScheduleBox-Delivery': delivery.uuid,
          },
          body: payloadJson,
          signal: AbortSignal.timeout(10_000),
        });

        responseTimeMs = Date.now() - startTime;
        responseStatus = response.status;
        const text = await response.text();
        responseBody = text.slice(0, 5000);
        deliveryStatus = response.ok ? 'delivered' : 'failed';
      } catch (err) {
        responseTimeMs = Date.now() - startTime;
        responseBody = err instanceof Error ? err.message : 'Network error';
        deliveryStatus = 'failed';
      }

      // Update delivery record
      await db
        .update(webhookDeliveries)
        .set({
          responseStatus,
          responseBody,
          responseTimeMs,
          status: deliveryStatus,
          deliveredAt: deliveryStatus === 'delivered' ? new Date() : null,
        })
        .where(eq(webhookDeliveries.id, delivery.id));

      // If failed and there's still an attempt left, schedule next retry
      if (deliveryStatus === 'failed' && delivery.attempt < delivery.maxAttempts) {
        await db.insert(webhookDeliveries).values({
          endpointId: delivery.endpointId,
          eventType: delivery.eventType,
          payload: payloadObj,
          attempt: delivery.attempt + 1,
          maxAttempts: delivery.maxAttempts,
          status: 'pending',
          // Exponential backoff: attempt 3 = +30 minutes from now
          scheduledAt: new Date(Date.now() + 30 * 60 * 1000),
        });
      }

      processedCount++;
    } catch (error) {
      console.error(`[Webhook Retry] Error processing delivery ${delivery.uuid}:`, error);
      failedCount++;
    }
  }

  return NextResponse.json({ processed: processedCount, failed: failedCount });
}
