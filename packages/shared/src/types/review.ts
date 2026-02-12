/**
 * Review Domain Types
 *
 * TypeScript types for review domain matching API response format.
 * Per DB schema in packages/database/src/schema/reviews.ts
 */

import type { z } from 'zod';
import type {
  reviewCreateSchema,
  reviewReplySchema,
  reviewListQuerySchema,
} from '../schemas/review';

// ============================================================================
// INFERRED INPUT TYPES
// ============================================================================

export type ReviewCreate = z.infer<typeof reviewCreateSchema>;
export type ReviewReply = z.infer<typeof reviewReplySchema>;
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

// ============================================================================
// ENUMS
// ============================================================================

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Review response type with all fields from database
 */
export type Review = {
  id: number;
  uuid: string;
  companyId: number;
  customerId: number;
  bookingId: number | null;
  serviceId: number | null;
  employeeId: number | null;
  rating: number;
  comment: string | null;
  redirectedTo: string | null;
  isPublished: boolean;
  reply: string | null;
  repliedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
