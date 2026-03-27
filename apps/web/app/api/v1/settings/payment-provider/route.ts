/**
 * Payment Provider Settings API
 * GET /api/v1/settings/payment-provider - Get company's payment provider config (masked)
 * PUT /api/v1/settings/payment-provider - Save/update payment provider credentials (encrypted)
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { successResponse } from '@/lib/utils/response';
import { encrypt, decrypt, getEncryptionKey } from '@/lib/security/encryption';
import { db, paymentProviders } from '@schedulebox/database';

// ============================================================================
// VALIDATION
// ============================================================================

const putBodySchema = z.object({
  provider: z.literal('comgate'),
  merchant_id: z.string().min(1, 'merchant_id is required'),
  secret: z.string().min(1, 'secret is required'),
  test_mode: z.boolean().optional().default(true),
});

// ============================================================================
// GET /api/v1/settings/payment-provider
// ============================================================================

export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    const { companyId } = await findCompanyId(user!.sub);

    const [config] = await db
      .select()
      .from(paymentProviders)
      .where(
        and(eq(paymentProviders.companyId, companyId), eq(paymentProviders.provider, 'comgate')),
      )
      .limit(1);

    if (!config) {
      return successResponse({
        provider: 'comgate',
        is_active: false,
        test_mode: true,
        has_credentials: false,
        merchant_id: null,
      });
    }

    // Decrypt credentials to extract merchant_id for masked display
    let maskedMerchantId: string | null = null;
    try {
      const key = getEncryptionKey();
      const decrypted = JSON.parse(decrypt(config.credentials, key));
      const mid = decrypted.merchantId as string;
      if (mid && mid.length > 4) {
        maskedMerchantId = '****' + mid.slice(-4);
      } else if (mid) {
        maskedMerchantId = '****';
      }
    } catch {
      // If decryption fails, still return the config without merchant_id
    }

    return successResponse({
      provider: 'comgate',
      is_active: config.isActive,
      test_mode: config.testMode,
      has_credentials: true,
      merchant_id: maskedMerchantId,
    });
  },
});

// ============================================================================
// PUT /api/v1/settings/payment-provider
// ============================================================================

export const PUT = createRouteHandler({
  bodySchema: putBodySchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    const { companyId } = await findCompanyId(user!.sub);
    const { merchant_id, secret, test_mode } = body!;

    // Encrypt credentials
    const key = getEncryptionKey();
    const encryptedCredentials = encrypt(JSON.stringify({ merchantId: merchant_id, secret }), key);

    // Upsert: INSERT ... ON CONFLICT (company_id, provider) DO UPDATE
    await db
      .insert(paymentProviders)
      .values({
        companyId,
        provider: 'comgate',
        isActive: true,
        credentials: encryptedCredentials,
        testMode: test_mode ?? true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [paymentProviders.companyId, paymentProviders.provider],
        set: {
          isActive: true,
          credentials: encryptedCredentials,
          testMode: test_mode ?? true,
          updatedAt: new Date(),
        },
      });

    return successResponse({
      provider: 'comgate',
      is_active: true,
      test_mode: test_mode ?? true,
      has_credentials: true,
    });
  },
});
