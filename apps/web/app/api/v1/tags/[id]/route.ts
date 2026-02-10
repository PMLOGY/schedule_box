/**
 * Tag Detail, Update, and Delete Endpoints
 * GET    /api/v1/tags/[id] - Get tag details
 * PUT    /api/v1/tags/[id] - Update tag
 * DELETE /api/v1/tags/[id] - Delete tag
 */

import { eq, and } from 'drizzle-orm';
import { db, tags } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { successResponse, noContentResponse } from '@/lib/utils/response.js';
import {
  tagUpdateSchema,
  tagIdParamSchema,
  type TagUpdate,
  type TagIdParam,
} from '@/validations/customer.js';

/**
 * GET /api/v1/tags/[id]
 * Get tag details (tenant isolated)
 */
export const GET = createRouteHandler<undefined, TagIdParam>({
  paramsSchema: tagIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Query tag with tenant isolation
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, params!.id), eq(tags.companyId, companyId)))
      .limit(1);

    if (!tag) {
      throw new NotFoundError('Tag not found');
    }

    return successResponse({
      data: {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        created_at: tag.createdAt,
      },
    });
  },
});

/**
 * PUT /api/v1/tags/[id]
 * Update tag (tenant isolated)
 */
export const PUT = createRouteHandler<TagUpdate, TagIdParam>({
  bodySchema: tagUpdateSchema,
  paramsSchema: tagIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_UPDATE],
  handler: async ({ body, params, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Update tag with tenant isolation
    const [tag] = await db
      .update(tags)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.color && { color: body.color }),
      })
      .where(and(eq(tags.id, params!.id), eq(tags.companyId, companyId)))
      .returning();

    if (!tag) {
      throw new NotFoundError('Tag not found');
    }

    return successResponse({
      data: {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        created_at: tag.createdAt,
      },
    });
  },
});

/**
 * DELETE /api/v1/tags/[id]
 * Delete tag (tenant isolated)
 */
export const DELETE = createRouteHandler<undefined, TagIdParam>({
  paramsSchema: tagIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_DELETE],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Delete tag with tenant isolation (CASCADE deletes customer_tags associations)
    const result = await db
      .delete(tags)
      .where(and(eq(tags.id, params!.id), eq(tags.companyId, companyId)))
      .returning({ id: tags.id });

    if (result.length === 0) {
      throw new NotFoundError('Tag not found');
    }

    return noContentResponse();
  },
});
