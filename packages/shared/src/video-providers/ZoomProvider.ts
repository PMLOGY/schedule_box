/**
 * Zoom Video Provider
 *
 * Implements video meeting creation/deletion using Zoom's Server-to-Server OAuth API.
 * Uses raw fetch() calls, no SDK dependencies.
 */

import {
  type VideoProvider,
  type CreateMeetingParams,
  type VideoMeetingResult,
  VideoProviderError,
} from './VideoProvider.interface';

interface ZoomAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ZoomMeetingResponse {
  id: number;
  join_url: string;
  start_url: string;
  password?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * In-memory cache for access token
 */
interface TokenCache {
  token: string;
  expiresAt: number;
}

export class ZoomProvider implements VideoProvider {
  private readonly accountId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private tokenCache: TokenCache | null = null;

  constructor(accountId: string, clientId: string, clientSecret: string) {
    this.accountId = accountId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Get access token using Server-to-Server OAuth
   * Caches token for 55 minutes (tokens last 1 hour)
   */
  private async getAccessToken(): Promise<string> {
    // Check cache
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    // Request new token
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new VideoProviderError(
        'ZOOM_AUTH_FAILED',
        `Zoom authentication failed: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as ZoomAccessTokenResponse;

    // Cache token for 55 minutes (expires_in is 3600 seconds = 60 minutes)
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + 55 * 60 * 1000,
    };

    return data.access_token;
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(params: CreateMeetingParams): Promise<VideoMeetingResult> {
    const accessToken = await this.getAccessToken();

    const body = {
      topic: params.topic,
      type: 2, // Scheduled meeting
      start_time: params.startTime.toISOString(),
      duration: params.durationMinutes,
      timezone: 'Europe/Prague',
      settings: {
        waiting_room: true,
        join_before_host: false,
        mute_upon_entry: true,
      },
    };

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new VideoProviderError(
        'ZOOM_CREATE_FAILED',
        `Failed to create Zoom meeting: ${response.status} ${errorText}`,
      );
    }

    const meeting = (await response.json()) as ZoomMeetingResponse;

    return {
      meetingUrl: meeting.join_url,
      hostUrl: meeting.start_url,
      meetingId: String(meeting.id),
      password: meeting.password ?? null,
      providerResponse: meeting,
    };
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new VideoProviderError(
        'ZOOM_DELETE_FAILED',
        `Failed to delete Zoom meeting: ${response.status} ${errorText}`,
      );
    }

    // 404 is acceptable - meeting already deleted or doesn't exist
  }
}
