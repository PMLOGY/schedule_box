/**
 * Google Wallet Pass URL Endpoint
 * GET /api/v1/loyalty/cards/:id/google-pass - Generate Google Wallet save URL
 *
 * Generates a save-to-wallet URL for Google Wallet containing loyalty card data,
 * points balance, tier, and QR code for identification.
 *
 * Returns: JSON with { data: { saveUrl: string } }
 */

import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, loyaltyCards, loyaltyPrograms } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';
import { generateGooglePassUrl } from '@/lib/loyalty/wallet/google-wallet';
import { ConfigurationError } from '@/lib/loyalty/wallet/apple-wallet';

// Params schema for card UUID
const cardIdParamSchema = z.object({
  id: z.string().uuid('Invalid card ID format'),
});

/**
 * GET /api/v1/loyalty/cards/:id/google-pass
 *
 * Generate a Google Wallet save URL for the specified loyalty card.
 * The card must belong to the authenticated user's company.
 *
 * Returns JSON with saveUrl that can be used in "Add to Google Wallet" button.
 * Also stores the URL in loyaltyCards.googlePassUrl for future reference.
 * Returns 503 if Google Wallet credentials are not configured.
 */
export const GET = createRouteHandler({
  paramsSchema: cardIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Fetch card by UUID with company ownership validation
    const [card] = await db
      .select({
        id: loyaltyCards.id,
        uuid: loyaltyCards.uuid,
        cardNumber: loyaltyCards.cardNumber,
      })
      .from(loyaltyCards)
      .innerJoin(loyaltyPrograms, eq(loyaltyCards.programId, loyaltyPrograms.id))
      .where(and(eq(loyaltyCards.uuid, params.id), eq(loyaltyPrograms.companyId, companyId)))
      .limit(1);

    if (!card) {
      throw new NotFoundError('Loyalty card not found');
    }

    try {
      // Generate Google Wallet save URL
      const saveUrl = await generateGooglePassUrl(card.id);

      // Store the Google pass URL in the card for future updates
      await db
        .update(loyaltyCards)
        .set({
          googlePassUrl: saveUrl.substring(0, 500), // Truncate to field limit
          updatedAt: new Date(),
        })
        .where(eq(loyaltyCards.id, card.id));

      return successResponse({ saveUrl });
    } catch (error) {
      // Handle configuration errors (missing credentials) with 503
      if (error instanceof ConfigurationError) {
        return NextResponse.json(
          {
            error: 'SERVICE_UNAVAILABLE',
            code: 'WALLET_NOT_CONFIGURED',
            message: error.message,
          },
          { status: 503 },
        );
      }

      // Re-throw other errors for the route handler error handler
      throw error;
    }
  },
});
