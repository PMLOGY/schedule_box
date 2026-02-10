/**
 * GET /api/v1/service-categories
 * List service categories ordered by sort_order
 *
 * POST /api/v1/service-categories
 * Create a new service category
 */

import { eq } from 'drizzle-orm';
import { db, serviceCategories } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { successResponse, createdResponse } from '@/lib/utils/response.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { serviceCategoryCreateSchema } from '@/validations/service.js';

/**
 * List service categories
 * Ordered by sort_order, then name
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_READ],
  handler: async ({ user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Query categories for this company
    const categories = await db
      .select({
        id: serviceCategories.id,
        name: serviceCategories.name,
        description: serviceCategories.description,
        sort_order: serviceCategories.sortOrder,
        is_active: serviceCategories.isActive,
        created_at: serviceCategories.createdAt,
      })
      .from(serviceCategories)
      .where(eq(serviceCategories.companyId, companyId))
      .orderBy(serviceCategories.sortOrder, serviceCategories.name);

    return successResponse({ data: categories });
  },
});

/**
 * Create service category
 */
export const POST = createRouteHandler({
  bodySchema: serviceCategoryCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_CREATE],
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Insert category
    const [category] = await db
      .insert(serviceCategories)
      .values({
        companyId,
        name: body.name,
        description: body.description,
        sortOrder: body.sort_order ?? 0,
      })
      .returning({
        id: serviceCategories.id,
        name: serviceCategories.name,
        description: serviceCategories.description,
        sort_order: serviceCategories.sortOrder,
      });

    return createdResponse(category);
  },
});
