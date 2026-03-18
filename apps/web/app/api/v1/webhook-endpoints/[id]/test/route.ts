/**
 * Webhook Endpoint Test
 * POST /api/v1/webhook-endpoints/:id/test - Send a test event to a webhook endpoint
 */

import { eq, and } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { z } from 'zod';
import { db, webhookEndpoints, webhookDeliveries } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { NotFoundError } from '@schedulebox/shared';
import { decrypt, getEncryptionKey } from '@/lib/security/encryption';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const webhookEndpointParamSchema = z.object({
  id: z.string().uuid('Invalid endpoint ID'),
});

type WebhookEndpointParam = z.infer<typeof webhookEndpointParamSchema>;

// ============================================================================
// POST /api/v1/webhook-endpoints/:id/test
// ============================================================================

export const POST = createRouteHandler<undefined, WebhookEndpointParam>({
  requiresAuth: true,
  paramsSchema: webhookEndpointParamSchema,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Fetch endpoint with encrypted secret — verify ownership
    const [endpoint] = await db
      .select({
        id: webhookEndpoints.id,
        uuid: webhookEndpoints.uuid,
        url: webhookEndpoints.url,
        encryptedSecret: webhookEndpoints.encryptedSecret,
      })
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.uuid, params.id), eq(webhookEndpoints.companyId, companyId)))
      .limit(1);

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    // Decrypt the HMAC secret for this delivery
    const rawSecret = decrypt(endpoint.encryptedSecret, getEncryptionKey());

    // Build test payload
    const payload = {
      event: 'test',
      data: {
        message: 'Test webhook from ScheduleBox',
        timestamp: new Date().toISOString(),
      },
    };

    const payloadJson = JSON.stringify(payload);

    // Compute HMAC-SHA256 signature
    const hmac = createHmac('sha256', rawSecret).update(payloadJson).digest('hex');

    // Create a pending delivery record
    const deliveryUuid = crypto.randomUUID();
    const [deliveryRecord] = await db
      .insert(webhookDeliveries)
      .values({
        endpointId: endpoint.id,
        eventType: 'test',
        payload: payload as Record<string, unknown>,
        attempt: 1,
        maxAttempts: 1, // Test deliveries do not retry
        status: 'pending',
      })
      .returning({ id: webhookDeliveries.id, uuid: webhookDeliveries.uuid });

    // Send HTTP POST to the webhook URL
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
          'X-ScheduleBox-Event': 'test',
          'X-ScheduleBox-Delivery': deliveryRecord.uuid ?? deliveryUuid,
        },
        body: payloadJson,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      responseTimeMs = Date.now() - startTime;
      responseStatus = response.status;
      const responseText = await response.text();
      responseBody = responseText.slice(0, 5000);

      deliveryStatus = response.ok ? 'delivered' : 'failed';
    } catch (error) {
      responseTimeMs = Date.now() - startTime;
      responseBody = error instanceof Error ? error.message : 'Network error';
      deliveryStatus = 'failed';
    }

    // Update delivery record with result
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

    return successResponse({
      status: deliveryStatus,
      response_status: responseStatus,
      response_time_ms: responseTimeMs,
      response_body: responseBody,
    });
  },
});
