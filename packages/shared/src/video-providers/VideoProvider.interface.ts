/**
 * Video Provider Interface
 *
 * Common abstraction for video conferencing providers (Zoom, Google Meet, MS Teams).
 * Allows swapping providers without changing API routes.
 */

/**
 * Result of creating a video meeting
 */
export interface VideoMeetingResult {
  meetingUrl: string;
  hostUrl: string;
  meetingId: string;
  password: string | null;
  providerResponse: Record<string, unknown>;
}

/**
 * Parameters for creating a video meeting
 */
export interface CreateMeetingParams {
  topic: string;
  startTime: Date;
  durationMinutes: number;
  hostEmail: string;
}

/**
 * Video provider interface
 * All providers must implement this interface for consistent API usage
 */
export interface VideoProvider {
  /**
   * Create a video meeting
   * @param params Meeting parameters
   * @returns Meeting URLs and metadata
   * @throws VideoProviderError on API failure
   */
  createMeeting(params: CreateMeetingParams): Promise<VideoMeetingResult>;

  /**
   * Delete/cancel a video meeting
   * @param meetingId Provider-specific meeting ID
   * @throws VideoProviderError on API failure
   */
  deleteMeeting(meetingId: string): Promise<void>;
}

/**
 * Custom error for video provider operations
 * Includes provider-specific error codes for better error handling
 */
export class VideoProviderError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'VideoProviderError';
    this.code = code;
    Object.setPrototypeOf(this, VideoProviderError.prototype);
  }
}
