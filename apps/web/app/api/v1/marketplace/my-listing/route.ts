/**
 * Owner Marketplace Listing Management Endpoints
 * GET /api/v1/marketplace/my-listing - Get own company's listing
 * PUT /api/v1/marketplace/my-listing - Create or update own company's listing
 */

import { eq } from 'drizzle-orm';
import { db, marketplaceListings } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { marketplaceListingUpdateSchema, type MarketplaceListingUpdate } from '@schedulebox/shared';

/**
 * GET /api/v1/marketplace/my-listing
 * Get own company's marketplace listing
 * Returns null if no listing exists yet
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.MARKETPLACE_MANAGE],
  handler: async ({ user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Query company's marketplace listing
    const [listing] = await db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.companyId, companyId))
      .limit(1);

    // Return null if no listing exists (company hasn't created one yet)
    if (!listing) {
      return successResponse(null);
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

/**
 * PUT /api/v1/marketplace/my-listing
 * Create or update own company's marketplace listing (upsert pattern)
 */
export const PUT = createRouteHandler({
  bodySchema: marketplaceListingUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.MARKETPLACE_MANAGE],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Check if listing already exists for this company
    const [existingListing] = await db
      .select({ id: marketplaceListings.id })
      .from(marketplaceListings)
      .where(eq(marketplaceListings.companyId, companyId))
      .limit(1);

    let listing;

    if (existingListing) {
      // Update existing listing
      const updateData: Partial<MarketplaceListingUpdate> & { updatedAt: Date } = {
        ...body,
        updatedAt: new Date(),
      };

      // Convert lat/lng from numbers to strings (PostgreSQL NUMERIC)
      const dbUpdateData = {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.subcategory !== undefined && { subcategory: body.subcategory }),
        ...(body.addressStreet !== undefined && { addressStreet: body.addressStreet }),
        ...(body.addressCity !== undefined && { addressCity: body.addressCity }),
        ...(body.addressZip !== undefined && { addressZip: body.addressZip }),
        ...(body.latitude !== undefined && { latitude: body.latitude.toString() }),
        ...(body.longitude !== undefined && { longitude: body.longitude.toString() }),
        ...(body.images !== undefined && { images: body.images }),
        ...(body.priceRange !== undefined && { priceRange: body.priceRange }),
        ...(body.featured !== undefined && { featured: body.featured }),
        ...(body.verified !== undefined && { verified: body.verified }),
        updatedAt: updateData.updatedAt,
      };

      [listing] = await db
        .update(marketplaceListings)
        .set(dbUpdateData)
        .where(eq(marketplaceListings.id, existingListing.id))
        .returning();
    } else {
      // Create new listing (first time)
      const insertData = {
        companyId,
        title: body.title ?? 'My Business',
        description: body.description,
        category: body.category,
        subcategory: body.subcategory,
        addressStreet: body.addressStreet,
        addressCity: body.addressCity,
        addressZip: body.addressZip,
        latitude: body.latitude?.toString(),
        longitude: body.longitude?.toString(),
        images: body.images ?? [],
        priceRange: body.priceRange,
        featured: body.featured ?? false,
        verified: body.verified ?? false,
        isActive: true, // Default to active
      };

      [listing] = await db.insert(marketplaceListings).values(insertData).returning();
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
