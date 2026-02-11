/**
 * No-Show Prediction Endpoint
 * POST /api/v1/ai/predictions/no-show - Predict no-show probability for a booking
 *
 * Uses circuit breaker pattern: returns fallback values when AI service is unavailable.
 */

import { z } from 'zod';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { predictNoShow } from '@/lib/ai/client';
import { getNoShowFallback } from '@/lib/ai/fallback';
import { NextResponse } from 'next/server';

// Request body validation schema
const noShowRequestSchema = z.object({
  booking_id: z.number().int().positive('booking_id must be a positive integer'),
  features: z
    .object({
      booking_lead_time_hours: z.number().optional(),
      customer_no_show_rate: z.number().optional(),
      customer_total_bookings: z.number().optional(),
      day_of_week: z.number().optional(),
      hour_of_day: z.number().optional(),
      is_weekend: z.number().optional(),
      service_duration_minutes: z.number().optional(),
      service_price: z.number().optional(),
      is_first_visit: z.number().optional(),
      has_payment: z.number().optional(),
      days_since_last_visit: z.number().optional(),
    })
    .optional(),
});

/**
 * POST /api/v1/ai/predictions/no-show
 * Predict no-show probability for a booking via AI service circuit breaker.
 * Returns fallback prediction (15% probability, low risk) when AI service is down.
 */
export const POST = createRouteHandler({
  bodySchema: noShowRequestSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ body }) => {
    try {
      const prediction = await predictNoShow.fire(body);
      return successResponse(prediction);
    } catch {
      // Circuit breaker open or AI service error - return fallback
      const fallback = getNoShowFallback(body);
      return NextResponse.json({ data: fallback }, { status: 503 });
    }
  },
});
