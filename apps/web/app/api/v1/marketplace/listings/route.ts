/**
 * Marketplace Public Catalog Endpoint
 * GET /api/v1/marketplace/listings - Public marketplace search with geo-distance
 */

import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { db, marketplaceListings } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { paginatedResponse } from '@/lib/utils/response';
import { marketplaceSearchQuerySchema, type MarketplaceSearchQuery } from '@schedulebox/shared';

/**
 * GET /api/v1/marketplace/listings
 * Public catalog search with optional geo-distance filtering
 * NO AUTH REQUIRED - Public endpoint per API spec
 */
export const GET = createRouteHandler({
  requiresAuth: false,
  handler: async ({ req }) => {
    // Parse and validate query parameters
    const query = validateQuery(marketplaceSearchQuerySchema, req) as MarketplaceSearchQuery;
    const { page, limit, search, category, city, lat, lng, radius_km, sort_by } = query;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build base WHERE conditions (only active listings)
    const baseConditions = [eq(marketplaceListings.isActive, true)];

    // Add category filter
    if (category) {
      baseConditions.push(eq(marketplaceListings.category, category));
    }

    // Add city filter
    if (city) {
      baseConditions.push(ilike(marketplaceListings.addressCity, city));
    }

    // Add text search (search in title OR description)
    if (search) {
      const searchTerm = `%${search}%`;
      const searchCondition = or(
        ilike(marketplaceListings.title, searchTerm),
        ilike(marketplaceListings.description, searchTerm),
      );
      if (searchCondition) {
        baseConditions.push(searchCondition);
      }
    }

    // Geo-distance query when lat/lng provided
    if (lat !== undefined && lng !== undefined) {
      // Haversine formula for distance calculation (fallback without PostGIS)
      // Distance in km: 6371 * acos(cos(radians(lat)) * cos(radians(latitude)) * cos(radians(longitude) - radians(lng)) + sin(radians(lat)) * sin(radians(latitude)))
      const distanceFormula = sql<number>`(6371 * acos(
        cos(radians(${lat})) * cos(radians(${marketplaceListings.latitude})) *
        cos(radians(${marketplaceListings.longitude}) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(${marketplaceListings.latitude}))
      ))`;

      // Build SELECT with distance calculation
      let orderByClause;
      if (sort_by === 'distance') {
        orderByClause = distanceFormula;
      } else if (sort_by === 'rating') {
        orderByClause = sql`${marketplaceListings.averageRating} DESC`;
      } else {
        orderByClause = sql`${marketplaceListings.title} ASC`;
      }

      // Query with distance calculation
      const data = await db
        .select({
          id: marketplaceListings.id,
          uuid: marketplaceListings.uuid,
          company_id: marketplaceListings.companyId,
          title: marketplaceListings.title,
          description: marketplaceListings.description,
          category: marketplaceListings.category,
          subcategory: marketplaceListings.subcategory,
          address_street: marketplaceListings.addressStreet,
          address_city: marketplaceListings.addressCity,
          address_zip: marketplaceListings.addressZip,
          latitude: marketplaceListings.latitude,
          longitude: marketplaceListings.longitude,
          images: marketplaceListings.images,
          average_rating: marketplaceListings.averageRating,
          review_count: marketplaceListings.reviewCount,
          price_range: marketplaceListings.priceRange,
          featured: marketplaceListings.featured,
          verified: marketplaceListings.verified,
          is_active: marketplaceListings.isActive,
          created_at: marketplaceListings.createdAt,
          updated_at: marketplaceListings.updatedAt,
          distance_km: distanceFormula.as('distance_km'),
        })
        .from(marketplaceListings)
        .where(and(...baseConditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Filter by radius if provided
      const filteredData = radius_km
        ? data.filter((listing) => listing.distance_km <= radius_km)
        : data;

      // Get total count for pagination (must recalculate with radius filter)
      const totalCount = filteredData.length;

      // Map to response format (use UUID, never expose SERIAL)
      const responseData = filteredData.map((listing) => ({
        id: listing.uuid,
        title: listing.title,
        description: listing.description,
        category: listing.category,
        subcategory: listing.subcategory,
        address_street: listing.address_street,
        address_city: listing.address_city,
        address_zip: listing.address_zip,
        latitude: listing.latitude,
        longitude: listing.longitude,
        images: listing.images,
        average_rating: listing.average_rating,
        review_count: listing.review_count,
        price_range: listing.price_range,
        featured: listing.featured,
        verified: listing.verified,
        is_active: listing.is_active,
        created_at: listing.created_at?.toISOString(),
        updated_at: listing.updated_at?.toISOString(),
        distance: listing.distance_km, // Include distance field when lat/lng provided
      }));

      const totalPages = Math.ceil(totalCount / limit);

      return paginatedResponse(responseData, {
        total: totalCount,
        page,
        limit,
        total_pages: totalPages,
      });
    }

    // Standard query without geo-distance
    let orderByClause;
    if (sort_by === 'rating') {
      orderByClause = sql`${marketplaceListings.averageRating} DESC`;
    } else if (sort_by === 'name') {
      orderByClause = sql`${marketplaceListings.title} ASC`;
    } else {
      // Default: rating
      orderByClause = sql`${marketplaceListings.averageRating} DESC`;
    }

    const data = await db
      .select()
      .from(marketplaceListings)
      .where(and(...baseConditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination metadata
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(marketplaceListings)
      .where(and(...baseConditions));

    const totalCount = countResult.count;

    // Map to response format (use UUID, never expose SERIAL)
    const responseData = data.map((listing) => ({
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
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return paginatedResponse(responseData, {
      total: totalCount,
      page,
      limit,
      total_pages: totalPages,
    });
  },
});
