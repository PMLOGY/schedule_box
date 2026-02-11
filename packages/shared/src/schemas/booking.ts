/**
 * Booking Validation Schemas
 *
 * Zod schemas for booking domain validation across API routes and frontend forms.
 * Per API spec lines 4532-4553 and 2489-2508 in schedulebox_complete_documentation.md
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const bookingStatusEnum = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
]);

export const bookingSourceEnum = z.enum([
  'online',
  'admin',
  'phone',
  'walk_in',
  'voice_ai',
  'marketplace',
  'api',
  'widget',
]);

// ============================================================================
// BOOKING CREATE SCHEMA
// ============================================================================

/**
 * Schema for creating a new booking
 * API spec: lines 4532-4544
 */
export const bookingCreateSchema = z.object({
  customer_id: z.number().int().positive(),
  service_id: z.number().int().positive(),
  employee_id: z.number().int().positive().optional(),
  start_time: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  source: bookingSourceEnum.default('online'),
  coupon_code: z.string().optional(),
  gift_card_code: z.string().optional(),
  resource_ids: z.array(z.number().int().positive()).optional(),
});

// ============================================================================
// BOOKING UPDATE SCHEMA
// ============================================================================

/**
 * Schema for updating an existing booking
 * API spec: lines 4546-4553
 */
export const bookingUpdateSchema = z.object({
  employee_id: z.number().int().positive().optional(),
  start_time: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  internal_notes: z.string().max(2000).optional(),
  status: bookingStatusEnum.optional(),
});

// ============================================================================
// BOOKING CANCEL SCHEMA
// ============================================================================

/**
 * Schema for canceling a booking
 */
export const bookingCancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ============================================================================
// BOOKING RESCHEDULE SCHEMA
// ============================================================================

/**
 * Schema for rescheduling a booking
 */
export const bookingRescheduleSchema = z.object({
  start_time: z.string().datetime(),
  employee_id: z.number().int().positive().optional(),
});

// ============================================================================
// BOOKING LIST QUERY SCHEMA
// ============================================================================

/**
 * Schema for booking list query parameters
 * API spec: lines 2489-2508
 */
export const bookingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: bookingStatusEnum.optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  employee_id: z.coerce.number().int().positive().optional(),
  service_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  source: bookingSourceEnum.optional(),
});
