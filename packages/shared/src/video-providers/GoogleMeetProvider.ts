/**
 * Google Meet Video Provider
 *
 * Implements video meeting creation/deletion using Google Calendar API with conferenceData.
 * Uses service account JWT authentication, no SDK dependencies.
 */

import { randomUUID, createSign } from 'crypto';
import {
  type VideoProvider,
  type CreateMeetingParams,
  type VideoMeetingResult,
  VideoProviderError,
} from './VideoProvider.interface';

interface GoogleAccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
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

export class GoogleMeetProvider implements VideoProvider {
  private readonly clientEmail: string;
  private readonly privateKey: string;
  private tokenCache: TokenCache | null = null;

  constructor(clientEmail: string, privateKey: string) {
    this.clientEmail = clientEmail;
    this.privateKey = privateKey;
  }

  /**
   * Generate JWT for service account authentication
   */
  private createJWT(): string {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: this.clientEmail,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expiry,
      iat: now,
    };

    const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signatureInput = `${base64Header}.${base64Payload}`;

    // Sign using private key
    const signature = createSign('RSA-SHA256');
    signature.update(signatureInput);
    signature.end();

    const base64Signature = signature.sign(this.privateKey, 'base64url');

    return `${signatureInput}.${base64Signature}`;
  }

  /**
   * Get access token using service account JWT
   * Caches token for 55 minutes (tokens last 1 hour)
   */
  private async getAccessToken(): Promise<string> {
    // Check cache
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    // Create JWT assertion
    const jwt = this.createJWT();

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new VideoProviderError(
        'GOOGLE_AUTH_FAILED',
        `Google authentication failed: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as GoogleAccessTokenResponse;

    // Cache token for 55 minutes
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + 55 * 60 * 1000,
    };

    return data.access_token;
  }

  /**
   * Create a Google Meet meeting via Calendar API
   */
  async createMeeting(params: CreateMeetingParams): Promise<VideoMeetingResult> {
    const accessToken = await this.getAccessToken();

    const endTime = new Date(params.startTime.getTime() + params.durationMinutes * 60 * 1000);

    const body = {
      summary: params.topic,
      start: {
        dateTime: params.startTime.toISOString(),
        timeZone: 'Europe/Prague',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Prague',
      },
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new VideoProviderError(
        'GOOGLE_CREATE_FAILED',
        `Failed to create Google Meet: ${response.status} ${errorText}`,
      );
    }

    const event = (await response.json()) as GoogleCalendarEvent;

    // Extract meeting URL from conferenceData
    const meetingUrl =
      event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ?? '';

    if (!meetingUrl) {
      throw new VideoProviderError(
        'GOOGLE_NO_MEETING_URL',
        'Google Meet URL not found in response',
      );
    }

    return {
      meetingUrl,
      hostUrl: meetingUrl, // Google Meet doesn't have separate host URL
      meetingId: event.id,
      password: null, // Google Meet doesn't use passwords
      providerResponse: event,
    };
  }

  /**
   * Delete a Google Calendar event (and associated Meet)
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${meetingId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok && response.status !== 404 && response.status !== 410) {
      const errorText = await response.text();
      throw new VideoProviderError(
        'GOOGLE_DELETE_FAILED',
        `Failed to delete Google Meet: ${response.status} ${errorText}`,
      );
    }

    // 404/410 is acceptable - event already deleted or doesn't exist
  }
}
