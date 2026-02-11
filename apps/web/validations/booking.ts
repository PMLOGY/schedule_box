/**
 * Booking validation schemas for API routes
 * Re-exports from shared package with route-specific param schemas
 */

import { z } from 'zod';

// Re-export shared booking schemas
export {
  bookingCreateSchema,
  bookingUpdateSchema,
  bookingListQuerySchema,
  bookingStatusEnum,
  bookingSourceEnum,
  type BookingCreate,
  type BookingUpdate,
  type BookingListQuery,
} from '@schedulebox/shared';

/**
 * Booking ID parameter schema
 * For route parameters like /api/v1/bookings/[id]
 */
export const bookingIdParamSchema = z.object({
  id: z.string().uuid('Invalid booking ID format'),
});

export type BookingIdParam = z.infer<typeof bookingIdParamSchema>;
