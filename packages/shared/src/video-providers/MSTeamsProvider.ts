/**
 * Microsoft Teams Video Provider
 *
 * Implements video meeting creation/deletion using Microsoft Graph API.
 * Uses client credentials OAuth flow, no SDK dependencies.
 */

import {
  type VideoProvider,
  type CreateMeetingParams,
  type VideoMeetingResult,
  VideoProviderError,
} from './VideoProvider.interface';

interface MSAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MSOnlineMeeting {
  id: string;
  joinWebUrl: string;
  subject: string;
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

export class MSTeamsProvider implements VideoProvider {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private tokenCache: TokenCache | null = null;

  constructor(tenantId: string, clientId: string, clientSecret: string) {
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Get access token using client credentials flow
   * Caches token for 55 minutes (tokens last 1 hour)
   */
  private async getAccessToken(): Promise<string> {
    // Check cache
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    // Request new token
    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new VideoProviderError(
        'MS_TEAMS_AUTH_FAILED',
        `MS Teams authentication failed: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as MSAccessTokenResponse;

    // Cache token for 55 minutes
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + 55 * 60 * 1000,
    };

    return data.access_token;
  }

  /**
   * Create a Microsoft Teams online meeting
   */
  async createMeeting(params: CreateMeetingParams): Promise<VideoMeetingResult> {
    const accessToken = await this.getAccessToken();

    const endTime = new Date(params.startTime.getTime() + params.durationMinutes * 60 * 1000);

    const body = {
      subject: params.topic,
      startDateTime: params.startTime.toISOString(),
      endDateTime: endTime.toISOString(),
      lobbyBypassSettings: {
        scope: 'organization',
        isDialInBypassEnabled: false,
      },
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
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
        'MS_TEAMS_CREATE_FAILED',
        `Failed to create MS Teams meeting: ${response.status} ${errorText}`,
      );
    }

    const meeting = (await response.json()) as MSOnlineMeeting;

    return {
      meetingUrl: meeting.joinWebUrl,
      hostUrl: meeting.joinWebUrl, // MS Teams uses same URL for host and participants
      meetingId: meeting.id,
      password: null, // MS Teams doesn't use passwords for meetings
      providerResponse: meeting,
    };
  }

  /**
   * Delete a Microsoft Teams online meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new VideoProviderError(
        'MS_TEAMS_DELETE_FAILED',
        `Failed to delete MS Teams meeting: ${response.status} ${errorText}`,
      );
    }

    // 404 is acceptable - meeting already deleted or doesn't exist
  }
}
