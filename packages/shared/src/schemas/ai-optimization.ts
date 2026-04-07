/**
 * Zod Validation Schemas for AI Optimization Endpoints
 *
 * Schemas for upselling, dynamic pricing, capacity forecasting, and reminder timing.
 * All numeric fields use z.coerce.number() for automatic string-to-number conversion.
 */

import { z } from 'zod';

// ============================================================================
// Upselling
// ============================================================================

export const upsellRequestSchema = z.object({
  customer_id: z.coerce.number().int().nonnegative(),
  current_service_id: z.coerce.number().int().positive(),
  customer_history: z.array(z.coerce.number().int().positive()).optional(),
});

// ============================================================================
// Dynamic Pricing
// ============================================================================

export const dynamicPricingRequestSchema = z
  .object({
    service_id: z.coerce.number().int().positive(),
    price_min: z.coerce.number().positive(),
    price_max: z.coerce.number().positive(),
    base_price: z.coerce.number().positive().optional(),
    hour_of_day: z.coerce.number().int().min(0).max(23),
    day_of_week: z.coerce.number().int().min(0).max(6),
    utilization: z.coerce.number().min(0).max(1),
  })
  .refine((data) => data.price_max >= data.price_min, {
    message: 'price_max must be >= price_min',
    path: ['price_max'],
  });

// ============================================================================
// Capacity Forecast
// ============================================================================

export const capacityForecastRequestSchema = z.object({
  company_id: z.coerce.number().int().positive(),
  days_ahead: z.coerce.number().int().min(1).max(30).default(7),
  current_capacity: z.coerce.number().int().min(1).default(8),
});

// ============================================================================
// Reminder Timing
// ============================================================================

export const reminderTimingRequestSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  notification_channel: z.enum(['email', 'sms', 'push']).default('email'),
});
