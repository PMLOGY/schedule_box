/**
 * API Key Management
 * GET /api/v1/settings/api-keys - List API keys
 * POST /api/v1/settings/api-keys - Create API key
 *
 * API keys enable external integrations and programmatic access.
 * Keys are SHA-256 hashed in DB, only returned once on creation.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { successResponse, createdResponse } from '@/lib/utils/response.js';
import { db, apiKeys } from '@schedulebox/database';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { z } from 'zod';

/**
 * GET /api/v1/settings/api-keys
 * List all active API keys for the company
 *
 * Returns key metadata but NEVER the full key or hash.
 * Only shows key prefix (first 10 characters) for identification.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Find company ID from user UUID
    const { companyId } = await findCompanyId(user.sub);

    // Query all active API keys for the company
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        key_prefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        created_at: apiKeys.createdAt,
        last_used_at: apiKeys.lastUsedAt,
        expires_at: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.companyId, companyId), eq(apiKeys.isActive, true)))
      .orderBy(apiKeys.createdAt);

    return successResponse(
      keys.map((key) => ({
        id: key.id,
        name: key.name,
        key_prefix: key.key_prefix,
        scopes: key.scopes ?? [],
        created_at: key.created_at,
        last_used_at: key.last_used_at,
        expires_at: key.expires_at,
      })),
    );
  },
});

/**
 * POST /api/v1/settings/api-keys
 * Create a new API key
 *
 * Generates a random API key with format: sb_live_{32-char-nanoid}
 * Returns the full key ONLY ONCE - it cannot be retrieved later.
 * Stores SHA-256 hash in database for verification.
 */
export const POST = createRouteHandler({
  bodySchema: z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.string()).optional().default([]),
  }),
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Find company ID from user UUID
    const { companyId } = await findCompanyId(user.sub);

    // Generate API key: sb_live_{32-char-random}
    const key = `sb_live_${nanoid(32)}`;

    // Extract key prefix (first 10 characters for display)
    const keyPrefix = key.substring(0, 10);

    // Hash key with SHA-256 for storage
    const keyHash = createHash('sha256').update(key).digest('hex');

    // Insert API key record
    const [newKey] = await db
      .insert(apiKeys)
      .values({
        companyId,
        name: body.name,
        keyHash,
        keyPrefix,
        scopes: body.scopes,
        isActive: true,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        key_prefix: apiKeys.keyPrefix,
        created_at: apiKeys.createdAt,
      });

    // Return full key ONLY on creation
    return createdResponse({
      id: newKey.id,
      name: newKey.name,
      key: key, // IMPORTANT: Full key returned only once!
      key_prefix: newKey.key_prefix,
      created_at: newKey.created_at,
    });
  },
});
