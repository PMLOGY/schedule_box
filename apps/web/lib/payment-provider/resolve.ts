/**
 * Payment Provider Credential Resolver
 *
 * Resolves Comgate credentials for a given company:
 * 1. Per-company credentials from payment_providers table (encrypted at rest)
 * 2. Platform-wide credentials from environment variables (fallback)
 *
 * PAY-04: Platform subscription billing MUST use getPlatformComgateCredentials()
 * to explicitly bypass per-company credentials.
 */

import { eq, and } from 'drizzle-orm';
import { db, paymentProviders } from '@schedulebox/database';
import { decrypt, getEncryptionKey } from '@/lib/security/encryption';
import { AppError } from '@schedulebox/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface ComgateCredentials {
  merchantId: string;
  secret: string;
  testMode: boolean;
  source: 'company' | 'platform';
}

// ============================================================================
// RESOLVE PER-COMPANY OR PLATFORM CREDENTIALS
// ============================================================================

/**
 * Resolve Comgate credentials for a specific company.
 *
 * Lookup order:
 * 1. Per-company: payment_providers WHERE company_id AND provider='comgate' AND is_active=true
 * 2. Platform fallback: COMGATE_MERCHANT_ID / COMGATE_SECRET env vars
 *
 * @param companyId - Internal company ID (SERIAL)
 * @returns Comgate credentials with source indicator
 * @throws AppError if neither company nor platform credentials are configured
 */
export async function resolveComgateCredentials(companyId: number): Promise<ComgateCredentials> {
  // Try per-company credentials first
  const [config] = await db
    .select({
      credentials: paymentProviders.credentials,
      testMode: paymentProviders.testMode,
    })
    .from(paymentProviders)
    .where(
      and(
        eq(paymentProviders.companyId, companyId),
        eq(paymentProviders.provider, 'comgate'),
        eq(paymentProviders.isActive, true),
      ),
    )
    .limit(1);

  if (config) {
    try {
      const key = getEncryptionKey();
      const decrypted = JSON.parse(decrypt(config.credentials, key)) as {
        merchantId: string;
        secret: string;
      };

      return {
        merchantId: decrypted.merchantId,
        secret: decrypted.secret,
        testMode: config.testMode,
        source: 'company',
      };
    } catch {
      // If decryption fails, fall through to platform credentials
    }
  }

  // Fallback to platform env vars
  const merchantId = process.env.COMGATE_MERCHANT_ID;
  const secret = process.env.COMGATE_SECRET;

  if (!merchantId || !secret) {
    throw new AppError('PAYMENT_GATEWAY_ERROR', 'No Comgate credentials configured', 500);
  }

  const testMode = process.env.COMGATE_TEST_MODE !== 'false';

  return {
    merchantId,
    secret,
    testMode,
    source: 'platform',
  };
}

// ============================================================================
// PLATFORM-ONLY CREDENTIALS (PAY-04)
// ============================================================================

/**
 * Get platform Comgate credentials from environment variables.
 *
 * Used by subscription billing to EXPLICITLY bypass per-company credentials.
 * This ensures platform subscription payments always go through the platform
 * merchant account, regardless of whether the company has their own Comgate setup.
 *
 * PAY-04: Platform subscription billing uses platform account.
 *
 * @returns Comgate credentials from env vars with source='platform'
 * @throws AppError if platform credentials are not configured
 */
export function getPlatformComgateCredentials(): ComgateCredentials {
  const merchantId = process.env.COMGATE_MERCHANT_ID;
  const secret = process.env.COMGATE_SECRET;

  if (!merchantId || !secret) {
    throw new AppError(
      'PAYMENT_GATEWAY_ERROR',
      'Platform Comgate credentials not configured (COMGATE_MERCHANT_ID, COMGATE_SECRET)',
      500,
    );
  }

  const testMode = process.env.COMGATE_TEST_MODE !== 'false';

  return {
    merchantId,
    secret,
    testMode,
    source: 'platform',
  };
}
