/**
 * Webhook Trigger Utility
 *
 * Fire-and-forget delivery engine for outbound webhooks.
 * Queries active endpoints for the given company and event type,
 * delivers the payload with HMAC-SHA256 signature, and schedules retries on failure.
 *
 * IMPORTANT: Always call as `void triggerWebhooks(...)` — never await.
 * This function must never block the calling route.
 */

import { eq, and, sql } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { db, webhookEndpoints, webhookDeliveries } from '@schedulebox/database';
import { decrypt, getEncryptionKey } from '@/lib/security/encryption';

// ============================================================================
// TYPES
// ============================================================================

type WebhookPayload = Record<string, unknown>;

// ============================================================================
// TRIGGER WEBHOOKS
// ============================================================================

/**
 * Fire outbound webhooks for a company event.
 * Must be called fire-and-forget: `void triggerWebhooks(...)`
 *
 * @param companyId - Internal company ID
 * @param eventType - Event type (e.g. 'booking.created')
 * @param payload - Event payload to deliver
 */
export async function triggerWebhooks(
  companyId: number,
  eventType: string,
  payload: WebhookPayload,
): Promise<void> {
  try {
    // Query active webhook endpoints for this company that subscribe to this event
    const endpoints = await db
      .select({
        id: webhookEndpoints.id,
        uuid: webhookEndpoints.uuid,
        url: webhookEndpoints.url,
        encryptedSecret: webhookEndpoints.encryptedSecret,
      })
      .from(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.companyId, companyId),
          eq(webhookEndpoints.isActive, true),
          // Check that the events array contains this event type
          sql`${webhookEndpoints.events} @> ARRAY[${eventType}]::text[]`,
        ),
      );

    if (endpoints.length === 0) return;

    const masterKey = getEncryptionKey();
    const payloadJson = JSON.stringify(payload);

    // Deliver to each matching endpoint
    for (const endpoint of endpoints) {
      void deliverToEndpoint(endpoint, eventType, payload, payloadJson, masterKey);
    }
  } catch (error) {
    // Never let webhook failures affect the calling route
    console.error('[Webhooks] triggerWebhooks error:', error);
  }
}

// ============================================================================
// INTERNAL DELIVERY
// ============================================================================

async function deliverToEndpoint(
  endpoint: { id: number; uuid: string; url: string; encryptedSecret: string },
  eventType: string,
  payload: WebhookPayload,
  payloadJson: string,
  masterKey: string,
): Promise<void> {
  try {
    // Decrypt HMAC secret for this delivery
    const rawSecret = decrypt(endpoint.encryptedSecret, masterKey);

    // Compute HMAC-SHA256 signature
    const hmac = createHmac('sha256', rawSecret).update(payloadJson).digest('hex');

    // Create a pending delivery record
    const deliveryUuid = crypto.randomUUID();
    const [deliveryRecord] = await db
      .insert(webhookDeliveries)
      .values({
        endpointId: endpoint.id,
        eventType,
        payload: payload as Record<string, unknown>,
        attempt: 1,
        maxAttempts: 3,
        status: 'pending',
      })
      .returning({ id: webhookDeliveries.id, uuid: webhookDeliveries.uuid });

    const resolvedUuid = deliveryRecord.uuid ?? deliveryUuid;

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
          'X-ScheduleBox-Event': eventType,
          'X-ScheduleBox-Delivery': resolvedUuid,
        },
        body: payloadJson,
        signal: AbortSignal.timeout(10_000),
      });

      responseTimeMs = Date.now() - startTime;
      responseStatus = response.status;
      const text = await response.text();
      responseBody = text.slice(0, 5000);
      deliveryStatus = response.ok ? 'delivered' : 'failed';
    } catch (error) {
      responseTimeMs = Date.now() - startTime;
      responseBody = error instanceof Error ? error.message : 'Network error';
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
      .where(eq(webhookDeliveries.id, deliveryRecord.id));

    // On failure, schedule retries (attempt 2 at +60s, attempt 3 at +300s)
    if (deliveryStatus === 'failed') {
      const now = new Date();
      await db.insert(webhookDeliveries).values([
        {
          endpointId: endpoint.id,
          eventType,
          payload: payload as Record<string, unknown>,
          attempt: 2,
          maxAttempts: 3,
          status: 'pending',
          scheduledAt: new Date(now.getTime() + 60 * 1000), // +1 minute
        },
        {
          endpointId: endpoint.id,
          eventType,
          payload: payload as Record<string, unknown>,
          attempt: 3,
          maxAttempts: 3,
          status: 'pending',
          scheduledAt: new Date(now.getTime() + 5 * 60 * 1000), // +5 minutes
        },
      ]);
    }
  } catch (error) {
    console.error(`[Webhooks] Delivery error for endpoint ${endpoint.uuid}:`, error);
  }
}
