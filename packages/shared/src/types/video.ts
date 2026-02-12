/**
 * Video Meeting Domain Types
 *
 * TypeScript types for video meeting domain matching API response format.
 * Per DB schema in packages/database/src/schema/video.ts
 */

import type { z } from 'zod';
import type { videoMeetingCreateSchema, videoMeetingListQuerySchema } from '../schemas/video';

// ============================================================================
// INFERRED INPUT TYPES
// ============================================================================

export type VideoMeetingCreate = z.infer<typeof videoMeetingCreateSchema>;
export type VideoMeetingListQuery = z.infer<typeof videoMeetingListQuerySchema>;

// ============================================================================
// ENUMS
// ============================================================================

export type VideoProvider = 'zoom' | 'google_meet' | 'ms_teams';
export type VideoMeetingStatus = 'scheduled' | 'started' | 'ended' | 'cancelled';

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Video meeting response type with all fields from database
 */
export type VideoMeeting = {
  id: number;
  uuid: string;
  companyId: number;
  bookingId: number;
  provider: VideoProvider;
  meetingUrl: string;
  meetingId: string | null;
  hostUrl: string | null;
  password: string | null;
  startTime: string;
  durationMinutes: number;
  status: VideoMeetingStatus;
  createdAt: string;
  updatedAt: string;
};
