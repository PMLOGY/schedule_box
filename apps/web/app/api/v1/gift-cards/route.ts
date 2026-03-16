/**
 * Gift Card List and Create Endpoints
 * GET  /api/v1/gift-cards - List gift cards with pagination, search, and filtering
 * POST /api/v1/gift-cards - Create new gift card with auto-generated code
 */

import crypto from 'crypto';
import { eq, and, ilike, or, desc, sql } from 'drizzle-orm';
import { db, dbTx, giftCards, giftCardTransactions, customers } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { createdResponse, paginatedResponse } from '@/lib/utils/response';
import {
  giftCardCreateSchema,
  giftCardQuerySchema,
  type GiftCardCreate,
  type GiftCardQuery,
} from '@/validations/gift-card';

/**
 * Generate a unique gift card code in format XXXX-XXXX-XXXX-XXXX
 */
function generateGiftCardCode(): string {
  const hexString = crypto.randomBytes(8).toString('hex').toUpperCase();
  // Take 16 hex chars, split into groups of 4, join with '-'
  return hexString.match(/.{1,4}/g)?.join('-') || hexString;
}

/**
 * GET /api/v1/gift-cards
 * List gift cards with pagination, search (code, recipient_name), and is_active filter
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE], // Gift cards share coupons.manage permission
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(giftCardQuerySchema, req) as GiftCardQuery;
    const { page, limit, is_active, search } = query;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build WHERE conditions (company scoped)
    const baseConditions = [eq(giftCards.companyId, companyId)];

    // Add is_active filter if provided
    if (is_active !== undefined) {
      baseConditions.push(eq(giftCards.isActive, is_active));
    }

    // Add search condition (search in code and recipient_name)
    if (search) {
      const searchTerm = `%${search}%`;
      const searchCondition = or(
        ilike(giftCards.code, searchTerm),
        ilike(giftCards.recipientName, searchTerm),
      );
      if (searchCondition) {
        baseConditions.push(searchCondition);
      }
    }

    // Query gift cards with pagination
    const data = await db
      .select()
      .from(giftCards)
      .where(and(...baseConditions))
      .orderBy(desc(giftCards.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination metadata
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(giftCards)
      .where(and(...baseConditions));

    const totalCount = countResult.count;

    // Map to response format (use UUID as public ID, convert numeric to number)
    const responseData = data.map((card) => ({
      id: card.uuid,
      code: card.code,
      initial_balance: Number(card.initialBalance),
      current_balance: Number(card.currentBalance),
      currency: card.currency,
      recipient_email: card.recipientEmail,
      recipient_name: card.recipientName,
      message: card.message,
      valid_until: card.validUntil,
      is_active: card.isActive,
      created_at: card.createdAt,
      updated_at: card.updatedAt,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return paginatedResponse(responseData, {
      total: totalCount,
      page,
      limit,
      total_pages: totalPages,
    });
  },
});

/**
 * POST /api/v1/gift-cards
 * Create new gift card with auto-generated secure code
 */
export const POST = createRouteHandler({
  bodySchema: giftCardCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE],
  handler: async ({ body: rawBody, user }) => {
    const body = rawBody as GiftCardCreate;

    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Generate unique gift card code
    const code = generateGiftCardCode();

    // Resolve customer UUID to internal ID if provided
    let purchasedByCustomerId: number | null = null;
    if (body.purchased_by_customer_id) {
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.uuid, body.purchased_by_customer_id),
            eq(customers.companyId, companyId),
          ),
        )
        .limit(1);

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      purchasedByCustomerId = customer.id;
    }

    // Insert gift card and purchase transaction in a single transaction
    const result = await dbTx.transaction(async (tx) => {
      // Insert gift card
      const [giftCard] = await tx
        .insert(giftCards)
        .values({
          companyId,
          code,
          initialBalance: String(body.initial_balance),
          currentBalance: String(body.initial_balance),
          currency: body.currency ?? 'CZK',
          purchasedByCustomerId,
          recipientEmail: body.recipient_email,
          recipientName: body.recipient_name,
          message: body.message,
          validUntil: body.valid_until ? new Date(body.valid_until) : null,
        })
        .returning();

      // Insert purchase transaction
      await tx.insert(giftCardTransactions).values({
        giftCardId: giftCard.id,
        type: 'purchase',
        amount: String(body.initial_balance),
        balanceAfter: String(body.initial_balance),
      });

      return giftCard;
    });

    // Return created gift card (including the generated code)
    return createdResponse({
      id: result.uuid,
      code: result.code,
      initial_balance: Number(result.initialBalance),
      current_balance: Number(result.currentBalance),
      currency: result.currency,
      recipient_email: result.recipientEmail,
      recipient_name: result.recipientName,
      message: result.message,
      valid_until: result.validUntil,
      is_active: result.isActive,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    });
  },
});
