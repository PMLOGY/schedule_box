/**
 * Webhook Endpoint Delete
 * DELETE /api/v1/webhook-endpoints/:id - Delete a webhook endpoint by UUID
 */

import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, webhookEndpoints } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { NotFoundError } from '@schedulebox/shared';
import { noContentResponse } from '@/lib/utils/response';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const webhookEndpointParamSchema = z.object({
  id: z.string().uuid('Invalid endpoint ID'),
});

type WebhookEndpointParam = z.infer<typeof webhookEndpointParamSchema>;

// ============================================================================
// DELETE /api/v1/webhook-endpoints/:id
// ============================================================================

export const DELETE = createRouteHandler<undefined, WebhookEndpointParam>({
  requiresAuth: true,
  paramsSchema: webhookEndpointParamSchema,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Verify endpoint belongs to this company
    const [endpoint] = await db
      .select({ id: webhookEndpoints.id })
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.uuid, params.id), eq(webhookEndpoints.companyId, companyId)))
      .limit(1);

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    // Delete (cascade removes deliveries)
    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, endpoint.id));

    return noContentResponse();
  },
});
