/**
 * Gift Card Balance Check Endpoint
 * GET /api/v1/gift-cards/[id]/balance - Check current balance for a gift card
 */

import { eq, and } from 'drizzle-orm';
import { db, giftCards } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { giftCardIdParamSchema } from '@/validations/gift-card';

/**
 * GET /api/v1/gift-cards/[id]/balance
 * Check current balance for a gift card by ID
 */
export const GET = createRouteHandler({
  paramsSchema: giftCardIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Find gift card by UUID and company
    const [giftCard] = await db
      .select()
      .from(giftCards)
      .where(and(eq(giftCards.uuid, params.id), eq(giftCards.companyId, companyId)))
      .limit(1);

    if (!giftCard) {
      throw new NotFoundError('Gift card not found');
    }

    // Return balance information
    return successResponse({
      id: giftCard.uuid,
      code: giftCard.code,
      initial_balance: Number(giftCard.initialBalance),
      current_balance: Number(giftCard.currentBalance),
      currency: giftCard.currency,
      is_active: giftCard.isActive,
      valid_until: giftCard.validUntil,
    });
  },
});
