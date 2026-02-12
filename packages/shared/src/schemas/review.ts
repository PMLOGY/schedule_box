/**
 * Review Validation Schemas
 *
 * Zod schemas for review domain validation across API routes and frontend forms.
 * Per DB schema in packages/database/src/schema/reviews.ts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const reviewStatusEnum = z.enum(['pending', 'approved', 'rejected']);

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

/**
 * Schema for creating a new review
 */
export const reviewCreateSchema = z.object({
  bookingUuid: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000).optional(),
});

/**
 * Schema for replying to a review
 */
export const reviewReplySchema = z.object({
  reply: z.string().min(1).max(2000),
});

/**
 * Schema for review list query parameters
 */
export const reviewListQuerySchema = z.object({
  rating_min: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: reviewStatusEnum.optional(),
});
