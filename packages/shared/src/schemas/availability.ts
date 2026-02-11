/**
 * Availability Validation Schemas
 *
 * Zod schemas for availability query validation.
 * Per API spec lines 2663-2685 in schedulebox_complete_documentation.md
 */

import { z } from 'zod';

// ============================================================================
// AVAILABILITY REQUEST SCHEMA
// ============================================================================

/**
 * Schema for availability slot query parameters
 * API spec: lines 2663-2685
 */
export const availabilityRequestSchema = z
  .object({
    company_slug: z.string().min(1),
    service_id: z.coerce.number().int().positive(),
    employee_id: z.coerce.number().int().positive().optional(),
    date_from: z.string().date(),
    date_to: z.string().date(),
  })
  .refine(
    (data) => {
      const from = new Date(data.date_from);
      const to = new Date(data.date_to);
      return to >= from;
    },
    {
      message: 'date_to must be greater than or equal to date_from',
      path: ['date_to'],
    },
  )
  .refine(
    (data) => {
      const from = new Date(data.date_from);
      const to = new Date(data.date_to);
      const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 31;
    },
    {
      message: 'date range must not exceed 31 days',
      path: ['date_to'],
    },
  );
