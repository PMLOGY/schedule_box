/**
 * Loyalty Tiers Endpoints
 * GET  /api/v1/loyalty/tiers - List tiers for company's program
 * POST /api/v1/loyalty/tiers - Create a new tier
 */

import { eq } from 'drizzle-orm';
import { db, loyaltyPrograms, loyaltyTiers } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { tierCreateSchema } from '@schedulebox/shared';

/**
 * GET /api/v1/loyalty/tiers
 * List tiers for the company's loyalty program
 * Returns array ordered by sortOrder ASC
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Get company's program
    const [program] = await db
      .select({ id: loyaltyPrograms.id })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, companyId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('No loyalty program found for this company');
    }

    // Fetch tiers
    const tiers = await db
      .select({
        id: loyaltyTiers.id,
        name: loyaltyTiers.name,
        minPoints: loyaltyTiers.minPoints,
        benefits: loyaltyTiers.benefits,
        color: loyaltyTiers.color,
        sortOrder: loyaltyTiers.sortOrder,
      })
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.programId, program.id))
      .orderBy(loyaltyTiers.sortOrder);

    return successResponse(tiers);
  },
});

/**
 * POST /api/v1/loyalty/tiers
 * Create a new tier for the company's program
 * Returns 201 with created tier
 */
export const POST = createRouteHandler({
  bodySchema: tierCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Get company's program
    const [program] = await db
      .select({ id: loyaltyPrograms.id })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, companyId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('No loyalty program found for this company');
    }

    // Create tier
    const [tier] = await db
      .insert(loyaltyTiers)
      .values({
        programId: program.id,
        name: body.name,
        minPoints: body.min_points,
        benefits: body.benefits ?? {},
        color: body.color,
        sortOrder: body.sort_order,
      })
      .returning({
        id: loyaltyTiers.id,
        name: loyaltyTiers.name,
        minPoints: loyaltyTiers.minPoints,
        benefits: loyaltyTiers.benefits,
        color: loyaltyTiers.color,
        sortOrder: loyaltyTiers.sortOrder,
      });

    return createdResponse(tier);
  },
});
