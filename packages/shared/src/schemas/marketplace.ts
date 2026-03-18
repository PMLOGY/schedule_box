/**
 * Marketplace Validation Schemas
 *
 * Zod schemas for marketplace listing domain validation across API routes and frontend forms.
 * Per DB schema in packages/database/src/schema/marketplace.ts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const priceRangeEnum = z.enum(['$', '$$', '$$$', '$$$$']);

export const sortByEnum = z.enum(['rating', 'distance', 'name', 'featured']);

// ============================================================================
// MARKETPLACE LISTING SCHEMAS
// ============================================================================

/**
 * Schema for creating a new marketplace listing
 */
export const marketplaceListingCreateSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  addressStreet: z.string().max(255).optional(),
  addressCity: z.string().max(100).optional(),
  addressZip: z.string().max(20).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  images: z.array(z.string()).optional(),
  priceRange: priceRangeEnum.optional(),
  featured: z.boolean().optional(),
  verified: z.boolean().optional(),
});

/**
 * Schema for updating a marketplace listing
 */
export const marketplaceListingUpdateSchema = marketplaceListingCreateSchema.partial();

/**
 * Schema for marketplace search query parameters
 */
export const marketplaceSearchQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius_km: z.coerce.number().min(1).max(100).default(10),
  sort_by: sortByEnum.default('rating'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
