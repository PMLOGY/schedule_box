/**
 * OAuth2 Provider Login Initiation
 * GET /api/v1/auth/oauth/{provider}
 *
 * Initiates OAuth2 login flow for supported providers.
 * Currently returns 501 Not Implemented - full OAuth2 with PKCE flow
 * will be implemented in the integration phase.
 *
 * Supported providers: google, facebook, apple
 */

import { type NextRequest } from 'next/server';
import { errorResponse } from '@/lib/utils/response';
import { NotImplementedError, ValidationError } from '@schedulebox/shared';

const SUPPORTED_PROVIDERS = ['google', 'facebook', 'apple'] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

export async function GET(req: NextRequest, context: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await context.params;

    // Validate provider
    if (!SUPPORTED_PROVIDERS.includes(provider as Provider)) {
      throw new ValidationError(
        `Invalid OAuth provider. Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}`,
      );
    }

    // TODO: Full OAuth2 implementation with PKCE flow will be added in integration phase
    // This will include:
    // 1. Generate PKCE code verifier and challenge
    // 2. Store verifier in Redis with short TTL
    // 3. Build OAuth2 authorization URL with state parameter
    // 4. Redirect to provider's OAuth endpoint

    throw new NotImplementedError(`OAuth2 ${provider} login is not yet available`);
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return errorResponse(error as Error & { statusCode: number });
    }
    return errorResponse(new NotImplementedError('OAuth2 login is not yet available'));
  }
}
