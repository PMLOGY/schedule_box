/**
 * Video Meeting Validation Schemas
 *
 * Zod schemas for video meeting domain validation across API routes and frontend forms.
 * Per DB schema in packages/database/src/schema/video.ts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const videoProviderEnum = z.enum(['zoom', 'google_meet', 'ms_teams']);

// ============================================================================
// VIDEO MEETING SCHEMAS
// ============================================================================

/**
 * Schema for creating a new video meeting
 */
export const videoMeetingCreateSchema = z.object({
  bookingUuid: z.string().uuid(),
  provider: videoProviderEnum,
});

/**
 * Schema for video meeting list query parameters
 */
export const videoMeetingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
