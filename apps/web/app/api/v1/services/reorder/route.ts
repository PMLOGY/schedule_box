/**
 * Service Reorder Endpoint
 * PATCH /api/v1/services/reorder - Reorder services by sort_order
 */

import { z } from 'zod';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { db, dbTx, services } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';

const reorderBodySchema = z.object({
  orderedIds: z
    .array(z.string().uuid('Each ID must be a valid UUID'))
    .min(1, 'At least one service ID is required'),
});

type ReorderBody = z.infer<typeof reorderBodySchema>;

/**
 * PATCH /api/v1/services/reorder
 * Update sort_order for services based on array position.
 *
 * @body orderedIds - Array of service UUIDs in desired display order
 * @returns { success: true }
 * @throws 422 if any service UUID does not belong to user's company
 */
export const PATCH = createRouteHandler<ReorderBody>({
  bodySchema: reorderBodySchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_UPDATE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const { orderedIds } = body;

    // Verify all services belong to this company
    const existingServices = await db
      .select({ uuid: services.uuid })
      .from(services)
      .where(
        and(
          eq(services.companyId, companyId),
          isNull(services.deletedAt),
          inArray(services.uuid, orderedIds),
        ),
      );

    if (existingServices.length !== orderedIds.length) {
      throw new AppError(
        'INVALID_SERVICES',
        'One or more service IDs do not belong to your company',
        422,
      );
    }

    // Update sort_order in a transaction
    await dbTx.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(services)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(services.uuid, orderedIds[i]), eq(services.companyId, companyId)));
      }
    });

    return successResponse({ success: true });
  },
});
