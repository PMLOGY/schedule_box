/**
 * Apple Wallet Pass Download Endpoint
 * GET /api/v1/loyalty/cards/:id/apple-pass - Generate and download .pkpass file
 *
 * Generates an Apple Wallet loyalty pass on-demand containing card data,
 * points balance, tier, and QR code for identification.
 *
 * Returns: application/vnd.apple.pkpass binary file
 */

import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, loyaltyCards, loyaltyPrograms } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { z } from 'zod';
import { generateApplePass, ConfigurationError } from '@/lib/loyalty/wallet/apple-wallet';

// Params schema for card UUID
const cardIdParamSchema = z.object({
  id: z.string().uuid('Invalid card ID format'),
});

/**
 * GET /api/v1/loyalty/cards/:id/apple-pass
 *
 * Generate and download an Apple Wallet .pkpass file for the specified loyalty card.
 * The card must belong to the authenticated user's company.
 *
 * Returns binary .pkpass file with Content-Type: application/vnd.apple.pkpass
 * Returns 503 if Apple Wallet certificates are not configured
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
      // Generate .pkpass buffer
      const passBuffer = await generateApplePass(card.id);

      // Return as binary file download using NextResponse
      // Convert Buffer to Uint8Array for Response body compatibility
      return new NextResponse(new Uint8Array(passBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.pkpass',
          'Content-Disposition': `attachment; filename="${card.cardNumber}.pkpass"`,
          'Content-Length': String(passBuffer.length),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error) {
      // Handle configuration errors (missing certificates) with 503
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
