/**
 * PUT /api/v1/service-categories/[id]
 * Update service category by ID (SERIAL)
 *
 * DELETE /api/v1/service-categories/[id]
 * Hard delete service category by ID (SERIAL)
 */

import { eq, and } from 'drizzle-orm';
import { db, serviceCategories } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { successResponse, noContentResponse } from '@/lib/utils/response.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import {
  serviceCategoryUpdateSchema,
  serviceCategoryIdParamSchema,
} from '@/validations/service.js';
import { NotFoundError } from '@schedulebox/shared';

/**
 * Update service category
 */
export const PUT = createRouteHandler({
  paramsSchema: serviceCategoryIdParamSchema,
  bodySchema: serviceCategoryUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_UPDATE],
  handler: async ({ params, body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;

    // Update category
    const [updated] = await db
      .update(serviceCategories)
      .set(updateData)
      .where(and(eq(serviceCategories.id, params.id), eq(serviceCategories.companyId, companyId)))
      .returning({
        id: serviceCategories.id,
        name: serviceCategories.name,
        description: serviceCategories.description,
        sort_order: serviceCategories.sortOrder,
      });

    if (!updated) {
      throw new NotFoundError('Service category not found');
    }

    return successResponse(updated);
  },
});

/**
 * Hard delete service category
 */
export const DELETE = createRouteHandler({
  paramsSchema: serviceCategoryIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_DELETE],
  handler: async ({ params, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Hard delete category
    const [deleted] = await db
      .delete(serviceCategories)
      .where(and(eq(serviceCategories.id, params.id), eq(serviceCategories.companyId, companyId)))
      .returning({ id: serviceCategories.id });

    if (!deleted) {
      throw new NotFoundError('Service category not found');
    }

    return noContentResponse();
  },
});
