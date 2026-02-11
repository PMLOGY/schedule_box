/**
 * Loyalty Card Transactions Endpoint
 * GET /api/v1/loyalty/cards/:id/transactions - List transaction history for a card
 */

import { eq, and } from 'drizzle-orm';
import { db, loyaltyCards, loyaltyPrograms, loyaltyTransactions } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { paginatedResponse } from '@/lib/utils/response';
import { transactionListQuerySchema } from '@schedulebox/shared';
import { z } from 'zod';

// Params schema for card UUID
const cardIdParamSchema = z.object({
  id: z.string().uuid('Invalid card ID format'),
});

/**
 * GET /api/v1/loyalty/cards/:id/transactions
 * List transactions for a card with pagination and type filter
 */
export const GET = createRouteHandler({
  paramsSchema: cardIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ req, params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse query parameters
    const query = validateQuery(transactionListQuerySchema, req) as {
      page: number;
      limit: number;
      type?: string;
    };

    // Verify card exists and belongs to company (via program)
    const [card] = await db
      .select({ id: loyaltyCards.id })
      .from(loyaltyCards)
      .innerJoin(loyaltyPrograms, eq(loyaltyCards.programId, loyaltyPrograms.id))
      .where(and(eq(loyaltyCards.uuid, params.id), eq(loyaltyPrograms.companyId, companyId)))
      .limit(1);

    if (!card) {
      throw new NotFoundError('Loyalty card not found');
    }

    // Build query with optional type filter
    const conditions = [eq(loyaltyTransactions.cardId, card.id)];
    if (query.type) {
      conditions.push(eq(loyaltyTransactions.type, query.type));
    }

    // Calculate offset
    const offset = (query.page - 1) * query.limit;

    // Fetch transactions
    const transactions = await db
      .select({
        id: loyaltyTransactions.id,
        type: loyaltyTransactions.type,
        points: loyaltyTransactions.points,
        balanceAfter: loyaltyTransactions.balanceAfter,
        description: loyaltyTransactions.description,
        createdAt: loyaltyTransactions.createdAt,
        bookingId: loyaltyTransactions.bookingId,
      })
      .from(loyaltyTransactions)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(loyaltyTransactions.createdAt)
      .limit(query.limit)
      .offset(offset);

    // Count total for pagination
    const [countResult] = await db
      .select({ count: loyaltyTransactions.id })
      .from(loyaltyTransactions)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    const total = countResult ? Number(countResult.count) : 0;
    const total_pages = Math.ceil(total / query.limit);

    // Format response (bookingId is SERIAL, don't expose in API)
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      points: tx.points,
      balanceAfter: tx.balanceAfter,
      description: tx.description,
      bookingUuid: null, // TODO: Join with bookings table to get UUID when needed
      createdAt: tx.createdAt,
    }));

    return paginatedResponse(formattedTransactions, {
      page: query.page,
      limit: query.limit,
      total,
      total_pages,
    });
  },
});
