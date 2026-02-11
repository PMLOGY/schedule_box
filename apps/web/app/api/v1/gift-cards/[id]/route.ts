/**
 * Gift Card Detail and Update Endpoints
 * GET /api/v1/gift-cards/[id] - Get gift card details with transaction history
 * PUT /api/v1/gift-cards/[id] - Update gift card metadata (not balance/code)
 */

import { eq, and, desc } from 'drizzle-orm';
import { db, giftCards, giftCardTransactions } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { giftCardIdParamSchema, giftCardUpdateSchema } from '@/validations/gift-card';

/**
 * GET /api/v1/gift-cards/[id]
 * Get gift card details with recent transaction history
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

    // Query recent transactions (last 20)
    const transactions = await db
      .select({
        id: giftCardTransactions.id,
        booking_id: giftCardTransactions.bookingId,
        type: giftCardTransactions.type,
        amount: giftCardTransactions.amount,
        balance_after: giftCardTransactions.balanceAfter,
        created_at: giftCardTransactions.createdAt,
      })
      .from(giftCardTransactions)
      .where(eq(giftCardTransactions.giftCardId, giftCard.id))
      .orderBy(desc(giftCardTransactions.createdAt))
      .limit(20);

    // Map transactions to response format
    const mappedTransactions = transactions.map((tx) => ({
      id: tx.id,
      booking_id: tx.booking_id,
      type: tx.type,
      amount: Number(tx.amount),
      balance_after: Number(tx.balance_after),
      created_at: tx.created_at,
    }));

    // Return gift card with transactions
    return successResponse({
      id: giftCard.uuid,
      code: giftCard.code,
      initial_balance: Number(giftCard.initialBalance),
      current_balance: Number(giftCard.currentBalance),
      currency: giftCard.currency,
      recipient_email: giftCard.recipientEmail,
      recipient_name: giftCard.recipientName,
      message: giftCard.message,
      valid_until: giftCard.validUntil,
      is_active: giftCard.isActive,
      created_at: giftCard.createdAt,
      updated_at: giftCard.updatedAt,
      transactions: mappedTransactions,
    });
  },
});

/**
 * PUT /api/v1/gift-cards/[id]
 * Update gift card metadata (is_active, recipient info, validity)
 * NOTE: balance and code cannot be updated for security
 */
export const PUT = createRouteHandler({
  paramsSchema: giftCardIdParamSchema,
  bodySchema: giftCardUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE],
  handler: async ({ params, body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Find gift card by UUID and company
    const [existing] = await db
      .select({ id: giftCards.id })
      .from(giftCards)
      .where(and(eq(giftCards.uuid, params.id), eq(giftCards.companyId, companyId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Gift card not found');
    }

    // Update gift card
    const [updated] = await db
      .update(giftCards)
      .set({
        ...(body.is_active !== undefined && { isActive: body.is_active }),
        ...(body.recipient_email && { recipientEmail: body.recipient_email }),
        ...(body.recipient_name && { recipientName: body.recipient_name }),
        ...(body.message !== undefined && { message: body.message }),
        ...(body.valid_until && { validUntil: new Date(body.valid_until) }),
        updatedAt: new Date(),
      })
      .where(eq(giftCards.id, existing.id))
      .returning();

    // Return updated gift card
    return successResponse({
      id: updated.uuid,
      code: updated.code,
      initial_balance: Number(updated.initialBalance),
      current_balance: Number(updated.currentBalance),
      currency: updated.currency,
      recipient_email: updated.recipientEmail,
      recipient_name: updated.recipientName,
      message: updated.message,
      valid_until: updated.validUntil,
      is_active: updated.isActive,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    });
  },
});
