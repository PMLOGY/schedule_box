/**
 * Customer Lifetime Value Prediction Endpoint
 * POST /api/v1/ai/predictions/clv - Predict CLV for a customer
 *
 * Uses circuit breaker pattern: returns fallback values when AI service is unavailable.
 */

import { z } from 'zod';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { predictCLV } from '@/lib/ai/client';
import { getCLVFallback } from '@/lib/ai/fallback';
import { NextResponse } from 'next/server';

// Request body validation schema
const clvRequestSchema = z.object({
  customer_id: z.number().int().positive('customer_id must be a positive integer'),
  features: z
    .object({
      total_bookings: z.number().optional(),
      total_spent: z.number().optional(),
      avg_booking_value: z.number().optional(),
      days_since_first_visit: z.number().optional(),
      days_since_last_visit: z.number().optional(),
      booking_frequency: z.number().optional(),
      no_show_rate: z.number().optional(),
      service_diversity: z.number().optional(),
    })
    .optional(),
});

/**
 * POST /api/v1/ai/predictions/clv
 * Predict customer lifetime value via AI service circuit breaker.
 * Returns fallback prediction (0 CLV, low segment) when AI service is down.
 */
export const POST = createRouteHandler({
  bodySchema: clvRequestSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ body }) => {
    try {
      const prediction = await predictCLV.fire(body);
      return successResponse(prediction);
    } catch {
      // Circuit breaker open or AI service error - return fallback
      const fallback = getCLVFallback(body);
      return NextResponse.json({ data: fallback }, { status: 503 });
    }
  },
});
