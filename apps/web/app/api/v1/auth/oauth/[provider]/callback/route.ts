/**
 * OAuth2 Provider Callback
 * GET /api/v1/auth/oauth/{provider}/callback
 *
 * Handles OAuth2 callback after user authorization.
 * Currently returns 501 Not Implemented - full callback handling
 * will be implemented in the integration phase.
 *
 * Supported providers: google, facebook, apple
 */

import { type NextRequest } from 'next/server';
import { errorResponse } from '@/lib/utils/response.js';
import { NotImplementedError, ValidationError } from '@schedulebox/shared';

const SUPPORTED_PROVIDERS = ['google', 'facebook', 'apple'] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await context.params;

    // Validate provider
    if (!SUPPORTED_PROVIDERS.includes(provider as Provider)) {
      throw new ValidationError(
        `Invalid OAuth provider. Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}`,
      );
    }

    // TODO: Full OAuth2 callback handling will be added in integration phase
    // This will include:
    // 1. Extract authorization code and state from query params
    // 2. Validate state parameter against stored value
    // 3. Retrieve PKCE code verifier from Redis
    // 4. Exchange authorization code for access token (with code_verifier)
    // 5. Fetch user profile from provider API
    // 6. Create or link user account
    // 7. Generate JWT tokens and redirect to app

    throw new NotImplementedError(`OAuth2 ${provider} callback is not yet available`);
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return errorResponse(error as any);
    }
    return errorResponse(new NotImplementedError('OAuth2 callback is not yet available'));
  }
}
