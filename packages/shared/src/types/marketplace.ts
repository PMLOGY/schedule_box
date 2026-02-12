/**
 * Marketplace Domain Types
 *
 * TypeScript types for marketplace domain matching API response format.
 * Per DB schema in packages/database/src/schema/marketplace.ts
 */

import type { z } from 'zod';
import type {
  marketplaceListingCreateSchema,
  marketplaceListingUpdateSchema,
  marketplaceSearchQuerySchema,
} from '../schemas/marketplace';

// ============================================================================
// INFERRED INPUT TYPES
// ============================================================================

export type MarketplaceListingCreate = z.infer<typeof marketplaceListingCreateSchema>;
export type MarketplaceListingUpdate = z.infer<typeof marketplaceListingUpdateSchema>;
export type MarketplaceSearchQuery = z.infer<typeof marketplaceSearchQuerySchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Marketplace listing response type with computed fields
 */
export type MarketplaceListing = {
  id: number;
  uuid: string;
  companyId: number;
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressZip: string | null;
  latitude: string | null; // PostgreSQL NUMERIC returned as string
  longitude: string | null; // PostgreSQL NUMERIC returned as string
  images: string[];
  averageRating: string | null; // PostgreSQL NUMERIC returned as string
  reviewCount: number;
  priceRange: string | null;
  featured: boolean;
  verified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  distance?: number; // Optional computed field for geo-search results
};

export type PriceRange = '$' | '$$' | '$$$' | '$$$$';
export type SortBy = 'rating' | 'distance' | 'name';
