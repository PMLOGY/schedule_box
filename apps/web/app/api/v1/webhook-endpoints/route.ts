/**
 * Webhook Endpoints CRUD
 * GET  /api/v1/webhook-endpoints - List webhook endpoints for the current company
 * POST /api/v1/webhook-endpoints - Create a new webhook endpoint
 */

import { eq, count } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db, webhookEndpoints } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { validateWebhookUrl } from '@/lib/security/ssrf';
import { encrypt, getEncryptionKey } from '@/lib/security/encryption';
import { ValidationError } from '@schedulebox/shared';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_ENDPOINTS_PER_COMPANY = 5;

const VALID_EVENTS = [
  'booking.created',
  'booking.confirmed',
  'booking.cancelled',
  'booking.completed',
  'booking.no_show',
  'payment.received',
  'payment.refunded',
] as const;

// ============================================================================
// SCHEMAS
// ============================================================================

const createWebhookEndpointSchema = z.object({
  url: z.string().url('Invalid URL format').max(2048),
  events: z.array(z.enum(VALID_EVENTS)).min(1, 'At least one event must be selected'),
});

type CreateWebhookEndpoint = z.infer<typeof createWebhookEndpointSchema>;

// ============================================================================
// GET /api/v1/webhook-endpoints
// ============================================================================

export const GET = createRouteHandler<undefined, undefined>({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const endpoints = await db
      .select({
        id: webhookEndpoints.uuid,
        url: webhookEndpoints.url,
        events: webhookEndpoints.events,
        isActive: webhookEndpoints.isActive,
        createdAt: webhookEndpoints.createdAt,
      })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.companyId, companyId))
      .orderBy(webhookEndpoints.createdAt);

    return successResponse(endpoints);
  },
});

// ============================================================================
// POST /api/v1/webhook-endpoints
// ============================================================================

export const POST = createRouteHandler<CreateWebhookEndpoint, undefined>({
  requiresAuth: true,
  bodySchema: createWebhookEndpointSchema,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Enforce 5-endpoint limit
    const [{ value: endpointCount }] = await db
      .select({ value: count() })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.companyId, companyId));

    if (Number(endpointCount) >= MAX_ENDPOINTS_PER_COMPANY) {
      throw new ValidationError(
        `Maximum ${MAX_ENDPOINTS_PER_COMPANY} webhook endpoints allowed per company`,
      );
    }

    // SSRF validation — block private/internal IP addresses
    validateWebhookUrl(body.url);

    // Generate HMAC secret (64-char hex)
    const plaintextSecret = randomBytes(32).toString('hex');

    // Encrypt secret with AES-256-GCM before storing
    const encryptedSecret = encrypt(plaintextSecret, getEncryptionKey());

    // Insert the endpoint
    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        companyId,
        url: body.url,
        encryptedSecret,
        events: body.events as string[],
        isActive: true,
      })
      .returning({
        id: webhookEndpoints.uuid,
        url: webhookEndpoints.url,
        events: webhookEndpoints.events,
        isActive: webhookEndpoints.isActive,
        createdAt: webhookEndpoints.createdAt,
      });

    // Return plaintext secret ONCE in creation response
    return createdResponse({
      ...endpoint,
      secret: plaintextSecret,
    });
  },
});
