/**
 * Webhook Delivery Log
 * GET /api/v1/webhook-endpoints/deliveries - Paginated delivery log for the current company
 */

import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, webhookEndpoints, webhookDeliveries } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { paginatedResponse } from '@/lib/utils/response';

// ============================================================================
// QUERY SCHEMA
// ============================================================================

const deliveryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  endpoint_id: z.string().uuid().optional(),
});

type DeliveryQuery = z.infer<typeof deliveryQuerySchema>;

// ============================================================================
// GET /api/v1/webhook-endpoints/deliveries
// ============================================================================

export const GET = createRouteHandler<undefined, undefined>({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query params
    const rawQuery = Object.fromEntries(req.nextUrl.searchParams.entries());
    const queryResult = deliveryQuerySchema.safeParse(rawQuery);
    const query: DeliveryQuery = queryResult.success
      ? queryResult.data
      : { page: 1, limit: 20, endpoint_id: undefined };

    const { page, limit } = query;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [eq(webhookEndpoints.companyId, companyId)];

    // Optional filter by endpoint UUID
    if (query.endpoint_id) {
      conditions.push(eq(webhookEndpoints.uuid, query.endpoint_id));
    }

    // Join deliveries with endpoints to filter by company
    const deliveries = await db
      .select({
        id: webhookDeliveries.uuid,
        endpointUrl: webhookEndpoints.url,
        eventType: webhookDeliveries.eventType,
        status: webhookDeliveries.status,
        responseStatus: webhookDeliveries.responseStatus,
        responseTimeMs: webhookDeliveries.responseTimeMs,
        attempt: webhookDeliveries.attempt,
        // Truncate payload and response_body for list view
        payload: webhookDeliveries.payload,
        responseBody: webhookDeliveries.responseBody,
        createdAt: webhookDeliveries.createdAt,
        deliveredAt: webhookDeliveries.deliveredAt,
      })
      .from(webhookDeliveries)
      .innerJoin(webhookEndpoints, eq(webhookDeliveries.endpointId, webhookEndpoints.id))
      .where(and(...conditions))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)
      .offset(offset);

    // Truncate payload for list view (first 500 chars)
    const formattedDeliveries = deliveries.map((d) => ({
      ...d,
      payload: d.payload !== null ? JSON.stringify(d.payload).slice(0, 500) : null,
      responseBody: d.responseBody ? d.responseBody.slice(0, 500) : null,
    }));

    // Total count estimation: if we got fewer than limit, we know the actual total
    const hasMore = formattedDeliveries.length === limit;
    const estimatedTotal = hasMore ? -1 : offset + formattedDeliveries.length;

    return paginatedResponse(formattedDeliveries, {
      page,
      limit,
      total: estimatedTotal,
      total_pages: hasMore ? page + 1 : page,
    });
  },
});
