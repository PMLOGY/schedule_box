/**
 * Availability Domain Types
 *
 * TypeScript types for availability domain matching API response format.
 * Per API spec lines 4561-4569 in schedulebox_complete_documentation.md
 */

import type { z } from 'zod';
import type { availabilityRequestSchema } from '../schemas/availability';

// ============================================================================
// AVAILABILITY SLOT TYPE
// ============================================================================

/**
 * Availability slot matching API response format
 * API spec: lines 4561-4569
 */
export type AvailabilitySlot = {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  employeeId: number;
  employeeName: string;
  isAvailable: boolean;
};

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

/**
 * Type inferred from availabilityRequestSchema
 */
export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;

/**
 * API response format for availability endpoint
 */
export type AvailabilityResponse = {
  slots: AvailabilitySlot[];
};
