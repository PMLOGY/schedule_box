/**
 * Smart Reminder Timing Endpoint
 * POST /api/v1/ai/optimization/reminder-timing
 *
 * Returns AI-powered optimal reminder timing for a customer.
 * Uses circuit breaker: returns 1440min/24h default (200) when AI unavailable.
 * Optimization is advisory - reminder timing suggestion only.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { predictReminderTiming } from '@/lib/ai/client';
import { getReminderTimingFallback } from '@/lib/ai/fallback';
import { reminderTimingRequestSchema } from '@schedulebox/shared';

/**
 * POST /api/v1/ai/optimization/reminder-timing
 * Get optimal reminder timing for a customer.
 * Permission: settings.manage (admin optimization).
 * Returns 200 with fallback on AI failure (advisory).
 */
export const POST = createRouteHandler({
  bodySchema: reminderTimingRequestSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body }) => {
    const request = {
      customer_id: body.customer_id,
      notification_channel: body.notification_channel ?? ('email' as const),
    };
    try {
      const prediction = await predictReminderTiming.fire(request);
      return successResponse(prediction);
    } catch {
      // Optimization is advisory - return 200 with fallback
      const fallback = getReminderTimingFallback(request);
      return successResponse(fallback);
    }
  },
});
