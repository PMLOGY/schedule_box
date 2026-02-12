/**
 * Marketplace Listing Detail Endpoint
 * GET /api/v1/marketplace/listings/[id] - Public listing detail by UUID
 */

import { eq, and } from 'drizzle-orm';
import { db, marketplaceListings } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

/**
 * Params validation schema
 */
const paramsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/v1/marketplace/listings/[id]
 * Public listing detail endpoint
 * NO AUTH REQUIRED - Public endpoint per API spec
 */
export const GET = createRouteHandler({
  requiresAuth: false,
  paramsSchema,
  handler: async ({ params }) => {
    const { id } = params;

    // Find active listing by UUID
    const [listing] = await db
      .select()
      .from(marketplaceListings)
      .where(and(eq(marketplaceListings.uuid, id), eq(marketplaceListings.isActive, true)))
      .limit(1);

    if (!listing) {
      throw new NotFoundError('Marketplace listing not found');
    }

    // Map to response format (use UUID, never expose SERIAL)
    const response = {
      id: listing.uuid,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      subcategory: listing.subcategory,
      address_street: listing.addressStreet,
      address_city: listing.addressCity,
      address_zip: listing.addressZip,
      latitude: listing.latitude,
      longitude: listing.longitude,
      images: listing.images,
      average_rating: listing.averageRating,
      review_count: listing.reviewCount,
      price_range: listing.priceRange,
      featured: listing.featured,
      verified: listing.verified,
      is_active: listing.isActive,
      created_at: listing.createdAt?.toISOString(),
      updated_at: listing.updatedAt?.toISOString(),
    };

    return successResponse(response);
  },
});
