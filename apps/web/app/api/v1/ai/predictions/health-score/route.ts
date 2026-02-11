/**
 * Customer Health Score Prediction Endpoint
 * POST /api/v1/ai/predictions/health-score - Predict customer health score (churn risk)
 *
 * Uses circuit breaker pattern: returns fallback values when AI service is unavailable.
 */

import { z } from 'zod';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { predictHealthScore } from '@/lib/ai/client';
import { getHealthScoreFallback } from '@/lib/ai/fallback';
import { NextResponse } from 'next/server';

// Request body validation schema
const healthScoreRequestSchema = z.object({
  customer_id: z.number().int().positive('customer_id must be a positive integer'),
  recency_days: z.number().min(0, 'recency_days must be >= 0'),
  frequency: z.number().min(0, 'frequency must be >= 0'),
  monetary: z.number().min(0, 'monetary must be >= 0'),
});

/**
 * POST /api/v1/ai/predictions/health-score
 * Predict customer health score via AI service circuit breaker.
 * Returns fallback prediction (score 50, good category) when AI service is down.
 */
export const POST = createRouteHandler({
  bodySchema: healthScoreRequestSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ body }) => {
    try {
      const prediction = await predictHealthScore.fire(body);
      return successResponse(prediction);
    } catch {
      // Circuit breaker open or AI service error - return fallback
      const fallback = getHealthScoreFallback(body);
      return NextResponse.json({ data: fallback }, { status: 503 });
    }
  },
});
