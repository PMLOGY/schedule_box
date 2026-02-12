import { z } from 'zod';

// Voice booking -- audio comes via FormData, these validate the metadata
export const voiceBookingSchema = z.object({
  language: z.enum(['cs', 'sk', 'en']).default('cs'),
});

// Follow-up generation
export const followUpRequestSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  type: z.enum(['post_visit', 're_engagement', 'upsell', 'birthday']),
  customer_context: z.object({
    customer_name: z.string().min(1),
    business_name: z.string().min(1),
    last_visit_date: z.string().optional(),
    last_service: z.string().optional(),
    total_visits: z.coerce.number().int().optional(),
    total_spent: z.coerce.number().optional(),
    health_score: z.coerce.number().int().min(0).max(100).optional(),
    health_category: z.string().optional(),
    preferred_services: z.string().optional(),
    days_inactive: z.coerce.number().int().optional(),
    recommended_service: z.string().optional(),
    recommendation_reason: z.string().optional(),
    loyalty_tier: z.string().optional(),
  }),
});

// Competitor intelligence -- trigger scrape
export const competitorScrapeRequestSchema = z.object({
  competitor_name: z.string().min(1).max(255),
  competitor_url: z.string().url().max(500),
  data_types: z.array(z.enum(['pricing', 'services', 'reviews'])).default(['pricing', 'services']),
});

// Competitor intelligence -- query stored data
export const competitorQuerySchema = z.object({
  competitor_name: z.string().optional(),
  data_type: z.enum(['pricing', 'services', 'reviews', 'availability']).optional(),
});
