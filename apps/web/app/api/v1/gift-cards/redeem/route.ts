/**
 * Gift Card Redemption Endpoint
 * POST /api/v1/gift-cards/redeem - Redeem gift card with atomic balance deduction
 */

import { eq, and } from 'drizzle-orm';
import { dbTx, giftCards, giftCardTransactions } from '@schedulebox/database';
import { NotFoundError, ValidationError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { giftCardRedeemSchema } from '@/validations/gift-card';

/**
 * POST /api/v1/gift-cards/redeem
 * Redeem gift card with atomic balance deduction using SELECT FOR UPDATE
 *
 * CRITICAL: Uses SELECT FOR UPDATE within transaction to prevent race conditions
 * where two concurrent redemptions could overdraw the balance.
 */
export const POST = createRouteHandler({
  bodySchema: giftCardRedeemSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Execute redemption in atomic transaction with row locking
    const result = await dbTx.transaction(async (tx) => {
      // 1. SELECT gift card with row lock (FOR UPDATE)
      const [giftCard] = await tx
        .select()
        .from(giftCards)
        .where(
          and(
            eq(giftCards.code, body.code), // Already uppercase from Zod transform
            eq(giftCards.companyId, companyId),
            eq(giftCards.isActive, true),
          ),
        )
        .for('update')
        .limit(1);

      // 2. Validate gift card exists
      if (!giftCard) {
        throw new NotFoundError('Gift card not found');
      }

      // 3. Check expiration
      if (giftCard.validUntil && new Date() > new Date(giftCard.validUntil)) {
        throw new ValidationError('Gift card has expired');
      }

      // 4. Check balance
      const currentBalance = Number(giftCard.currentBalance);
      if (currentBalance < body.amount) {
        throw new ValidationError('Insufficient gift card balance');
      }

      // 5. Calculate new balance
      const newBalance = currentBalance - body.amount;

      // 6. Update gift card balance
      await tx
        .update(giftCards)
        .set({
          currentBalance: String(newBalance),
          updatedAt: new Date(),
        })
        .where(eq(giftCards.id, giftCard.id));

      // 7. Insert redemption transaction
      await tx.insert(giftCardTransactions).values({
        giftCardId: giftCard.id,
        bookingId: body.booking_id ?? null,
        type: 'redemption',
        amount: String(body.amount),
        balanceAfter: String(newBalance),
      });

      return {
        uuid: giftCard.uuid,
        currency: giftCard.currency,
        newBalance,
      };
    });

    // Return redemption result
    return successResponse({
      id: result.uuid,
      current_balance: result.newBalance,
      amount_redeemed: body.amount,
      currency: result.currency,
    });
  },
});
