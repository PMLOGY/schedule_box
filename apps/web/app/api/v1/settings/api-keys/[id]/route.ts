/**
 * API Key Deletion
 * DELETE /api/v1/settings/api-keys/{id}
 *
 * Revokes an API key by setting is_active=false (soft delete).
 * Ensures tenant isolation by verifying company_id matches user's company.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { noContentResponse } from '@/lib/utils/response';
import { db, apiKeys } from '@schedulebox/database';
import { eq, and } from 'drizzle-orm';
import { NotFoundError } from '@schedulebox/shared';

/**
 * DELETE /api/v1/settings/api-keys/{id}
 * Revoke (soft delete) an API key
 *
 * Sets is_active=false. Key becomes unusable immediately.
 * Tenant-scoped by company_id to prevent cross-tenant deletion.
 */
export const DELETE = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ req, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Extract and parse ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const idStr = pathParts[pathParts.length - 1];
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      throw new NotFoundError('Invalid API key ID');
    }

    // Find company ID from user UUID
    const { companyId } = await findCompanyId(user.sub);

    // Soft delete: set is_active=false
    const result = await db
      .update(apiKeys)
      .set({ isActive: false })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.companyId, companyId)))
      .returning({ id: apiKeys.id });

    // If no rows affected, key doesn't exist or belongs to different company
    if (result.length === 0) {
      throw new NotFoundError('API key not found');
    }

    return noContentResponse();
  },
});
