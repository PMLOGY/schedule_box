/**
 * Payment Expiration Endpoint
 * POST /api/v1/payments/expire-pending
 *
 * Expires pending payments older than 30 minutes (configurable)
 *
 * Protected endpoint - owner/admin only
 * Can be triggered manually or by cron job
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { expirePendingPayments } from '@/app/api/v1/payments/saga/payment-timeout';
import { z } from 'zod';

/**
 * POST /api/v1/payments/expire-pending
 * Expire old pending payments
 *
 * Request body (optional):
 * {
 *   "timeout_minutes": 30
 * }
 *
 * Response:
 * {
 *   "data": {
 *     "expired_count": 5
 *   }
 * }
 */
export const POST = createRouteHandler({
  bodySchema: z
    .object({
      timeout_minutes: z.number().positive().optional(),
    })
    .optional(),
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE], // Admin/owner permission
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Execute payment expiration
    const timeoutMinutes = body?.timeout_minutes;
    const expiredCount = await expirePendingPayments(timeoutMinutes);

    return successResponse({
      expired_count: expiredCount,
    });
  },
});
