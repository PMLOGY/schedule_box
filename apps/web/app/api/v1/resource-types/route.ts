/**
 * Resource type list and create endpoints
 * GET /api/v1/resource-types - List resource types
 * POST /api/v1/resource-types - Create resource type
 */

import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { successResponse, createdResponse } from '@/lib/utils/response.js';
import { resourceTypeCreateSchema } from '@/validations/resource.js';
import { db, resourceTypes } from '@schedulebox/database';
import { eq } from 'drizzle-orm';

/**
 * GET /api/v1/resource-types
 * List all resource types for the authenticated user's company
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.RESOURCES_MANAGE],
  handler: async ({ user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Query resource types
    const typesList = await db
      .select({
        id: resourceTypes.id,
        name: resourceTypes.name,
        description: resourceTypes.description,
        created_at: resourceTypes.createdAt,
      })
      .from(resourceTypes)
      .where(eq(resourceTypes.companyId, companyId));

    return successResponse({ data: typesList });
  },
});

/**
 * POST /api/v1/resource-types
 * Create a new resource type
 */
export const POST = createRouteHandler({
  bodySchema: resourceTypeCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.RESOURCES_MANAGE],
  handler: async ({ body, user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Insert resource type with company ID
    const [newType] = await db
      .insert(resourceTypes)
      .values({
        companyId,
        name: body!.name,
        description: body!.description,
      })
      .returning({
        id: resourceTypes.id,
        name: resourceTypes.name,
        description: resourceTypes.description,
        created_at: resourceTypes.createdAt,
      });

    return createdResponse({ data: newType });
  },
});
