/**
 * Loyalty Cards Endpoints
 * GET  /api/v1/loyalty/cards - List loyalty cards with pagination and filters
 * POST /api/v1/loyalty/cards - Issue a new loyalty card
 */

import { eq, and } from 'drizzle-orm';
import {
  db,
  loyaltyCards,
  loyaltyPrograms,
  loyaltyTiers,
  customers,
} from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse, paginatedResponse } from '@/lib/utils/response';
import { loyaltyCardCreateSchema, loyaltyCardListQuerySchema } from '@schedulebox/shared';
import crypto from 'crypto';

/**
 * Generate a unique card number in format SB-XXXX-XXXX-XXXX
 */
function generateCardNumber(): string {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SB-${part1}-${part2}-${part3}`;
}

/**
 * GET /api/v1/loyalty/cards
 * List loyalty cards with pagination and customer filter
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse query parameters
    const query = validateQuery(loyaltyCardListQuerySchema, req) as {
      page: number;
      limit: number;
      customer_id?: string;
    };

    // Get company's program
    const [program] = await db
      .select({ id: loyaltyPrograms.id })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, companyId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('No loyalty program found for this company');
    }

    // Build query with optional customer filter
    const conditions = [eq(loyaltyCards.programId, program.id)];
    if (query.customer_id) {
      // Convert customer UUID to internal ID
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.uuid, query.customer_id), eq(customers.companyId, companyId)))
        .limit(1);

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
      conditions.push(eq(loyaltyCards.customerId, customer.id));
    }

    // Calculate offset
    const offset = (query.page - 1) * query.limit;

    // Fetch cards with customer, tier info
    const cards = await db
      .select({
        id: loyaltyCards.id,
        uuid: loyaltyCards.uuid,
        cardNumber: loyaltyCards.cardNumber,
        pointsBalance: loyaltyCards.pointsBalance,
        stampsBalance: loyaltyCards.stampsBalance,
        isActive: loyaltyCards.isActive,
        createdAt: loyaltyCards.createdAt,
        updatedAt: loyaltyCards.updatedAt,
        customerName: customers.name,
        customerEmail: customers.email,
        customerUuid: customers.uuid,
        tierId: loyaltyTiers.id,
        tierName: loyaltyTiers.name,
        tierColor: loyaltyTiers.color,
        tierMinPoints: loyaltyTiers.minPoints,
      })
      .from(loyaltyCards)
      .innerJoin(customers, eq(loyaltyCards.customerId, customers.id))
      .leftJoin(loyaltyTiers, eq(loyaltyCards.tierId, loyaltyTiers.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(query.limit)
      .offset(offset);

    // Count total for pagination
    const [countResult] = await db
      .select({ count: loyaltyCards.id })
      .from(loyaltyCards)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    const total = countResult ? Number(countResult.count) : 0;
    const total_pages = Math.ceil(total / query.limit);

    // Format response
    const formattedCards = cards.map((card) => ({
      id: card.id,
      uuid: card.uuid,
      cardNumber: card.cardNumber,
      pointsBalance: card.pointsBalance,
      stampsBalance: card.stampsBalance,
      isActive: card.isActive,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      customer: {
        uuid: card.customerUuid,
        name: card.customerName,
        email: card.customerEmail,
      },
      currentTier: card.tierId
        ? {
            id: card.tierId,
            name: card.tierName!,
            color: card.tierColor!,
            minPoints: card.tierMinPoints!,
          }
        : null,
    }));

    return paginatedResponse(formattedCards, {
      page: query.page,
      limit: query.limit,
      total,
      total_pages,
    });
  },
});

/**
 * POST /api/v1/loyalty/cards
 * Issue a loyalty card to a customer
 * Returns 201 with created card
 */
export const POST = createRouteHandler({
  bodySchema: loyaltyCardCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Get company's program
    const [program] = await db
      .select({ id: loyaltyPrograms.id, type: loyaltyPrograms.type })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, companyId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('No loyalty program found for this company');
    }

    // Verify customer exists and belongs to company
    const [customer] = await db
      .select({ id: customers.id, name: customers.name, email: customers.email })
      .from(customers)
      .where(and(eq(customers.uuid, body.customer_id), eq(customers.companyId, companyId)))
      .limit(1);

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Find default tier (tier with minPoints = 0, or lowest minPoints)
    const [defaultTier] = await db
      .select({ id: loyaltyTiers.id })
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.programId, program.id))
      .orderBy(loyaltyTiers.minPoints)
      .limit(1);

    // Generate unique card number
    let cardNumber = generateCardNumber();
    // Ensure uniqueness (very unlikely collision, but check anyway)
    let attempts = 0;
    while (attempts < 5) {
      const [existing] = await db
        .select({ id: loyaltyCards.id })
        .from(loyaltyCards)
        .where(eq(loyaltyCards.cardNumber, cardNumber))
        .limit(1);

      if (!existing) break;
      cardNumber = generateCardNumber();
      attempts++;
    }

    // Create card
    const [card] = await db
      .insert(loyaltyCards)
      .values({
        programId: program.id,
        customerId: customer.id,
        cardNumber,
        pointsBalance: 0,
        stampsBalance: 0,
        tierId: defaultTier?.id ?? null,
        isActive: true,
      })
      .returning({
        id: loyaltyCards.id,
        uuid: loyaltyCards.uuid,
        cardNumber: loyaltyCards.cardNumber,
        pointsBalance: loyaltyCards.pointsBalance,
        stampsBalance: loyaltyCards.stampsBalance,
        isActive: loyaltyCards.isActive,
        createdAt: loyaltyCards.createdAt,
        updatedAt: loyaltyCards.updatedAt,
      });

    // TODO: Publish LoyaltyCardCreatedEvent via RabbitMQ
    // Event publishing added in Phase 9 Plan 5

    return createdResponse({
      ...card,
      customer: {
        uuid: body.customer_id,
        name: customer.name,
        email: customer.email,
      },
    });
  },
});
