/**
 * Loyalty Program Endpoints
 * GET  /api/v1/loyalty/programs - Get company's loyalty program
 * POST /api/v1/loyalty/programs - Create loyalty program
 * PUT  /api/v1/loyalty/programs - Update loyalty program
 */

import { eq } from 'drizzle-orm';
import { db, loyaltyPrograms, loyaltyTiers } from '@schedulebox/database';
import { NotFoundError, AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { loyaltyProgramCreateSchema, loyaltyProgramUpdateSchema } from '@schedulebox/shared';

/**
 * GET /api/v1/loyalty/programs
 * Fetch the company's loyalty program with tiers
 * Since UNIQUE(company_id), there's at most one program per company
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Fetch program with tiers
    const [program] = await db
      .select({
        id: loyaltyPrograms.id,
        uuid: loyaltyPrograms.uuid,
        name: loyaltyPrograms.name,
        description: loyaltyPrograms.description,
        type: loyaltyPrograms.type,
        pointsPerCurrency: loyaltyPrograms.pointsPerCurrency,
        isActive: loyaltyPrograms.isActive,
        createdAt: loyaltyPrograms.createdAt,
        updatedAt: loyaltyPrograms.updatedAt,
      })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, companyId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('No loyalty program found for this company');
    }

    // Fetch tiers for this program
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

    return successResponse({
      ...program,
      pointsPerCurrency: Number(program.pointsPerCurrency),
      tiers,
    });
  },
});

/**
 * POST /api/v1/loyalty/programs
 * Create a loyalty program for the company
 * Returns 201 with created program
 */
export const POST = createRouteHandler({
  bodySchema: loyaltyProgramCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Check if company already has a program (UNIQUE constraint)
    const [existing] = await db
      .select({ id: loyaltyPrograms.id })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, companyId))
      .limit(1);

    if (existing) {
      throw new AppError(
        'DUPLICATE_RESOURCE',
        'Company already has a loyalty program. Use PUT to update.',
        409,
      );
    }

    // Create program
    const [program] = await db
      .insert(loyaltyPrograms)
      .values({
        companyId,
        name: body.name,
        description: body.description ?? null,
        type: body.type,
        pointsPerCurrency: String(body.points_per_currency),
        isActive: true,
      })
      .returning({
        id: loyaltyPrograms.id,
        uuid: loyaltyPrograms.uuid,
        name: loyaltyPrograms.name,
        description: loyaltyPrograms.description,
        type: loyaltyPrograms.type,
        pointsPerCurrency: loyaltyPrograms.pointsPerCurrency,
        isActive: loyaltyPrograms.isActive,
        createdAt: loyaltyPrograms.createdAt,
        updatedAt: loyaltyPrograms.updatedAt,
      });

    return createdResponse({
      ...program,
      pointsPerCurrency: Number(program.pointsPerCurrency),
      tiers: [],
    });
  },
});

/**
 * PUT /api/v1/loyalty/programs
 * Update the company's loyalty program
 * Returns 200 with updated program
 */
export const PUT = createRouteHandler({
  bodySchema: loyaltyProgramUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Check if program exists
    const [existing] = await db
      .select({ id: loyaltyPrograms.id })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, companyId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('No loyalty program found for this company');
    }

    // Update program
    const [updated] = await db
      .update(loyaltyPrograms)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type && { type: body.type }),
        ...(body.points_per_currency !== undefined && {
          pointsPerCurrency: String(body.points_per_currency),
        }),
        ...(body.is_active !== undefined && { isActive: body.is_active }),
        updatedAt: new Date(),
      })
      .where(eq(loyaltyPrograms.id, existing.id))
      .returning({
        id: loyaltyPrograms.id,
        uuid: loyaltyPrograms.uuid,
        name: loyaltyPrograms.name,
        description: loyaltyPrograms.description,
        type: loyaltyPrograms.type,
        pointsPerCurrency: loyaltyPrograms.pointsPerCurrency,
        isActive: loyaltyPrograms.isActive,
        createdAt: loyaltyPrograms.createdAt,
        updatedAt: loyaltyPrograms.updatedAt,
      });

    // Fetch tiers for response
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
      .where(eq(loyaltyTiers.programId, updated.id))
      .orderBy(loyaltyTiers.sortOrder);

    return successResponse({
      ...updated,
      pointsPerCurrency: Number(updated.pointsPerCurrency),
      tiers,
    });
  },
});
