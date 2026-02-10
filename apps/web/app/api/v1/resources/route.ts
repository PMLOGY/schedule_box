/**
 * Resource list and create endpoints
 * GET /api/v1/resources - List resources with type join
 * POST /api/v1/resources - Create resource
 */

import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { successResponse, createdResponse } from '@/lib/utils/response.js';
import { resourceCreateSchema } from '@/validations/resource.js';
import { db, resources, resourceTypes } from '@schedulebox/database';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/v1/resources
 * List all resources for the authenticated user's company
 * Includes resource type via left join
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.RESOURCES_MANAGE],
  handler: async ({ user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Query resources with type join
    const resourcesList = await db
      .select({
        uuid: resources.uuid,
        name: resources.name,
        description: resources.description,
        quantity: resources.quantity,
        is_active: resources.isActive,
        created_at: resources.createdAt,
        updated_at: resources.updatedAt,
        resource_type: {
          id: resourceTypes.id,
          name: resourceTypes.name,
          description: resourceTypes.description,
        },
      })
      .from(resources)
      .leftJoin(resourceTypes, eq(resources.resourceTypeId, resourceTypes.id))
      .where(eq(resources.companyId, companyId));

    // Transform to API format (flatten null resource_type to null)
    const transformedResources = resourcesList.map((r) => ({
      uuid: r.uuid,
      name: r.name,
      description: r.description,
      quantity: r.quantity,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
      resource_type: r.resource_type?.id ? r.resource_type : null,
    }));

    return successResponse({ data: transformedResources });
  },
});

/**
 * POST /api/v1/resources
 * Create a new resource
 */
export const POST = createRouteHandler({
  bodySchema: resourceCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.RESOURCES_MANAGE],
  handler: async ({ body, user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Insert resource with company ID
    const [newResource] = await db
      .insert(resources)
      .values({
        companyId,
        name: body!.name,
        description: body!.description,
        resourceTypeId: body!.resource_type_id,
        quantity: body!.quantity ?? 1,
      })
      .returning({
        uuid: resources.uuid,
        name: resources.name,
        description: resources.description,
        quantity: resources.quantity,
        is_active: resources.isActive,
        created_at: resources.createdAt,
        updated_at: resources.updatedAt,
      });

    return createdResponse({ data: newResource });
  },
});
