/**
 * Loyalty Tier by ID Endpoint
 * DELETE /api/v1/loyalty/tiers/:id - Delete a tier
 */

import { eq, and } from 'drizzle-orm';
import { db, loyaltyPrograms, loyaltyTiers } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';

/**
 * DELETE /api/v1/loyalty/tiers/:id
 * Delete a tier from the company's loyalty program
 */
export const DELETE = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const tierId = parseInt(req.nextUrl.pathname.split('/').pop() ?? '', 10);
    if (isNaN(tierId)) {
      throw new NotFoundError('Invalid tier ID');
    }

    // Get company's program
    const [program] = await db
      .select({ id: loyaltyPrograms.id })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, companyId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('No loyalty program found for this company');
    }

    // Delete tier (only if it belongs to this program)
    const deleted = await db
      .delete(loyaltyTiers)
      .where(and(eq(loyaltyTiers.id, tierId), eq(loyaltyTiers.programId, program.id)))
      .returning({ id: loyaltyTiers.id });

    if (deleted.length === 0) {
      throw new NotFoundError('Tier not found');
    }

    return successResponse({ deleted: true });
  },
});
