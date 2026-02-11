/**
 * Booking Domain Types
 *
 * TypeScript types for booking domain matching API response format.
 * Per API spec lines 4512-4530 in schedulebox_complete_documentation.md
 */

import type { z } from 'zod';
import type {
  bookingCreateSchema,
  bookingUpdateSchema,
  bookingListQuerySchema,
} from '../schemas/booking';

// ============================================================================
// ENUMS
// ============================================================================

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export type BookingSource =
  | 'online'
  | 'admin'
  | 'phone'
  | 'walk_in'
  | 'voice_ai'
  | 'marketplace'
  | 'api'
  | 'widget';

export type CancelledBy = 'customer' | 'employee' | 'admin' | 'system';

// ============================================================================
// NESTED TYPES
// ============================================================================

export type BookingCustomer = {
  id: number;
  uuid: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type BookingService = {
  id: number;
  uuid: string;
  name: string;
  durationMinutes: number;
  price: string;
  color: string | null;
};

export type BookingEmployee = {
  id: number;
  uuid: string;
  name: string;
  color: string | null;
};

// ============================================================================
// MAIN BOOKING TYPE
// ============================================================================

/**
 * Full booking object matching API response format
 * API spec: lines 4512-4530
 */
export type Booking = {
  id: number;
  uuid: string;
  customer: BookingCustomer;
  service: BookingService;
  employee: BookingEmployee | null;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  status: BookingStatus;
  source: BookingSource;
  price: string;
  currency: string;
  discountAmount: string;
  notes: string | null;
  internalNotes: string | null;
  noShowProbability: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelledBy: CancelledBy | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

/**
 * Type inferred from bookingCreateSchema
 */
export type BookingCreate = z.infer<typeof bookingCreateSchema>;

/**
 * Type inferred from bookingUpdateSchema
 */
export type BookingUpdate = z.infer<typeof bookingUpdateSchema>;

/**
 * Type inferred from bookingListQuerySchema
 */
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
