/**
 * Tag List and Create Endpoints
 * GET  /api/v1/tags - List all tags for the company
 * POST /api/v1/tags - Create new tag
 */

import { eq } from 'drizzle-orm';
import { db, tags } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { tagCreateSchema, type TagCreate } from '@/validations/customer';

/**
 * GET /api/v1/tags
 * List all tags for the authenticated user's company
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Query tags for this company
    const data = await db
      .select()
      .from(tags)
      .where(eq(tags.companyId, companyId))
      .orderBy(tags.name);

    // Return tags with consistent naming
    return successResponse({
      data: data.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        created_at: tag.createdAt,
      })),
    });
  },
});

/**
 * POST /api/v1/tags
 * Create a new tag for the company
 */
export const POST = createRouteHandler<TagCreate>({
  bodySchema: tagCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_CREATE],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Insert tag
    const [tag] = await db
      .insert(tags)
      .values({
        companyId,
        name: body.name,
        color: body.color,
      })
      .returning();

    // Return created tag
    return createdResponse({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      created_at: tag.createdAt,
    });
  },
});
