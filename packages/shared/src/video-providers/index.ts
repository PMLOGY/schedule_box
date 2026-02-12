/**
 * Video Provider Factory
 *
 * Factory function to create video provider instances based on configuration.
 * Reads credentials from environment variables and instantiates the correct provider.
 */

import { type VideoProvider, VideoProviderError } from './VideoProvider.interface.js';
import { ZoomProvider } from './ZoomProvider.js';
import { GoogleMeetProvider } from './GoogleMeetProvider.js';
import { MSTeamsProvider } from './MSTeamsProvider.js';

export type VideoProviderType = 'zoom' | 'google_meet' | 'ms_teams';

/**
 * Create a video provider instance based on type
 * Reads credentials from environment variables
 *
 * @param provider - Provider type
 * @returns Configured video provider instance
 * @throws VideoProviderError if credentials are not configured
 */
export function createVideoProvider(provider: VideoProviderType): VideoProvider {
  switch (provider) {
    case 'zoom': {
      const accountId = process.env.ZOOM_ACCOUNT_ID;
      const clientId = process.env.ZOOM_CLIENT_ID;
      const clientSecret = process.env.ZOOM_CLIENT_SECRET;

      if (!accountId || !clientId || !clientSecret) {
        throw new VideoProviderError(
          'PROVIDER_NOT_CONFIGURED',
          'zoom credentials not configured (missing ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, or ZOOM_CLIENT_SECRET)',
        );
      }

      return new ZoomProvider(accountId, clientId, clientSecret);
    }

    case 'google_meet': {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY;

      if (!clientEmail || !privateKey) {
        throw new VideoProviderError(
          'PROVIDER_NOT_CONFIGURED',
          'google_meet credentials not configured (missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY)',
        );
      }

      // Handle escaped newlines in private key from env var
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

      return new GoogleMeetProvider(clientEmail, formattedPrivateKey);
    }

    case 'ms_teams': {
      const tenantId = process.env.MS_TEAMS_TENANT_ID;
      const clientId = process.env.MS_TEAMS_CLIENT_ID;
      const clientSecret = process.env.MS_TEAMS_CLIENT_SECRET;

      if (!tenantId || !clientId || !clientSecret) {
        throw new VideoProviderError(
          'PROVIDER_NOT_CONFIGURED',
          'ms_teams credentials not configured (missing MS_TEAMS_TENANT_ID, MS_TEAMS_CLIENT_ID, or MS_TEAMS_CLIENT_SECRET)',
        );
      }

      return new MSTeamsProvider(tenantId, clientId, clientSecret);
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = provider;
      throw new VideoProviderError('INVALID_PROVIDER', `Unknown provider: ${_exhaustive}`);
    }
  }
}

// Re-export all interfaces and providers
export * from './VideoProvider.interface.js';
export { ZoomProvider } from './ZoomProvider.js';
export { GoogleMeetProvider } from './GoogleMeetProvider.js';
export { MSTeamsProvider } from './MSTeamsProvider.js';
