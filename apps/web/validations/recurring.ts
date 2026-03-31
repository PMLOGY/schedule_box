/**
 * Recurring Booking Validation Schemas
 * Zod schemas for recurring series create/update and occurrence edit
 */

import { z } from 'zod';

// ============================================================================
// REPEAT PATTERN ENUM
// ============================================================================

export const repeatPatternEnum = z.enum(['weekly', 'biweekly', 'monthly']);

// ============================================================================
// RECURRING SERIES CREATE SCHEMA
// ============================================================================

/**
 * Schema for creating a recurring booking series
 * Accepts UUIDs for service, employee, customer — resolved to internal IDs in service layer
 */
export const recurringSeriesCreateSchema = z
  .object({
    serviceId: z.string().uuid('Invalid service ID format'),
    employeeId: z.string().uuid('Invalid employee ID format').optional(),
    customerId: z.string().uuid('Invalid customer ID format'),
    repeatPattern: repeatPatternEnum,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be ISO date (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be ISO date (YYYY-MM-DD)')
      .optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
    durationMinutes: z.number().int().min(5).max(480),
    maxOccurrences: z.number().int().min(1).max(52).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    (_data) => {
      // Either endDate or maxOccurrences must be provided (or we default maxOccurrences to 12)
      return true; // We handle defaults in service layer
    },
    { message: 'Either endDate or maxOccurrences should be provided' },
  );

export type RecurringSeriesCreate = z.infer<typeof recurringSeriesCreateSchema>;

// ============================================================================
// RECURRING SERIES UPDATE SCHEMA
// ============================================================================

/**
 * Schema for updating an existing recurring series
 * All fields optional — only provided fields are updated
 */
export const recurringSeriesUpdateSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID format').optional(),
  repeatPattern: repeatPatternEnum.optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format')
    .optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be ISO date (YYYY-MM-DD)')
    .optional(),
  maxOccurrences: z.number().int().min(1).max(52).optional(),
  notes: z.string().max(2000).optional(),
});

export type RecurringSeriesUpdate = z.infer<typeof recurringSeriesUpdateSchema>;

// ============================================================================
// OCCURRENCE EDIT SCHEMA
// ============================================================================

/**
 * Schema for editing a single occurrence of a recurring series
 */
export const occurrenceEditSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
  startTime: z.string().datetime().optional(),
  employeeId: z.string().uuid('Invalid employee ID format').optional(),
  notes: z.string().max(2000).optional(),
});

export type OccurrenceEdit = z.infer<typeof occurrenceEditSchema>;

// ============================================================================
// OCCURRENCE CANCEL SCHEMA
// ============================================================================

/**
 * Schema for cancelling a single occurrence
 */
export const occurrenceCancelSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
  reason: z.string().max(500).optional(),
});

export type OccurrenceCancel = z.infer<typeof occurrenceCancelSchema>;

// ============================================================================
// RECURRING SERIES LIST QUERY SCHEMA
// ============================================================================

export const recurringSeriesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

export type RecurringSeriesListQuery = z.infer<typeof recurringSeriesListQuerySchema>;

// ============================================================================
// RECURRING SERIES ID PARAM
// ============================================================================

export const recurringSeriesIdParamSchema = z.object({
  id: z.string().uuid('Invalid recurring series ID format'),
});

export type RecurringSeriesIdParam = z.infer<typeof recurringSeriesIdParamSchema>;
