/**
 * Resource detail, update, and delete endpoints
 * GET /api/v1/resources/:id - Get resource by UUID
 * PUT /api/v1/resources/:id - Update resource by UUID
 * DELETE /api/v1/resources/:id - Delete resource by UUID
 */

import { z } from 'zod';
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { successResponse, noContentResponse } from '@/lib/utils/response.js';
import { resourceUpdateSchema } from '@/validations/resource.js';
import { db, resources, resourceTypes } from '@schedulebox/database';
import { eq, and } from 'drizzle-orm';
import { NotFoundError } from '@schedulebox/shared';

// Params schema for UUID validation
const paramsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/v1/resources/:id
 * Get resource by UUID, scoped to company
 */
export const GET = createRouteHandler({
  paramsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.RESOURCES_MANAGE],
  handler: async ({ params, user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Query resource with type join
    const [resource] = await db
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
      .where(and(eq(resources.uuid, params.id), eq(resources.companyId, companyId)))
      .limit(1);

    if (!resource) {
      throw new NotFoundError('Resource not found');
    }

    // Transform to API format
    const transformedResource = {
      uuid: resource.uuid,
      name: resource.name,
      description: resource.description,
      quantity: resource.quantity,
      is_active: resource.is_active,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
      resource_type: resource.resource_type?.id ? resource.resource_type : null,
    };

    return successResponse({ data: transformedResource });
  },
});

/**
 * PUT /api/v1/resources/:id
 * Update resource by UUID, scoped to company
 */
export const PUT = createRouteHandler({
  paramsSchema,
  bodySchema: resourceUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.RESOURCES_MANAGE],
  handler: async ({ params, body, user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Build update object with only defined values
    const updateData: Record<string, unknown> = {};
    if (body!.name !== undefined) updateData.name = body!.name;
    if (body!.description !== undefined) updateData.description = body!.description;
    if (body!.resource_type_id !== undefined) updateData.resourceTypeId = body!.resource_type_id;
    if (body!.quantity !== undefined) updateData.quantity = body!.quantity;
    if (body!.is_active !== undefined) updateData.isActive = body!.is_active;

    // Update resource
    const [updatedResource] = await db
      .update(resources)
      .set(updateData)
      .where(and(eq(resources.uuid, params.id), eq(resources.companyId, companyId)))
      .returning({
        uuid: resources.uuid,
        name: resources.name,
        description: resources.description,
        quantity: resources.quantity,
        is_active: resources.isActive,
        created_at: resources.createdAt,
        updated_at: resources.updatedAt,
      });

    if (!updatedResource) {
      throw new NotFoundError('Resource not found');
    }

    return successResponse({ data: updatedResource });
  },
});

/**
 * DELETE /api/v1/resources/:id
 * Hard delete resource by UUID, scoped to company
 * FK constraints will prevent deletion if resource is assigned to services
 */
export const DELETE = createRouteHandler({
  paramsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.RESOURCES_MANAGE],
  handler: async ({ params, user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Delete resource
    const [deletedResource] = await db
      .delete(resources)
      .where(and(eq(resources.uuid, params.id), eq(resources.companyId, companyId)))
      .returning({ uuid: resources.uuid });

    if (!deletedResource) {
      throw new NotFoundError('Resource not found');
    }

    return noContentResponse();
  },
});
