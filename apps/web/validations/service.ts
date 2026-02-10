/**
 * Zod validation schemas for service and service category endpoints
 * Matches OpenAPI spec (lines 4660-4690)
 */

import { z } from 'zod';

/**
 * Service creation schema
 * POST /api/v1/services
 */
export const serviceCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category_id: z.number().int().optional(),
  duration_minutes: z.number().int().min(5),
  buffer_before_minutes: z.number().int().min(0).optional().default(0),
  buffer_after_minutes: z.number().int().min(0).optional().default(0),
  price: z.number().min(0),
  dynamic_pricing_enabled: z.boolean().optional().default(false),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  max_capacity: z.number().int().min(1).optional().default(1),
  online_booking_enabled: z.boolean().optional().default(true),
  requires_payment: z.boolean().optional().default(false),
  is_online: z.boolean().optional().default(false),
  video_provider: z.enum(['zoom', 'google_meet', 'ms_teams']).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  resource_ids: z.array(z.number().int()).optional(),
});

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;

/**
 * Service update schema
 * PUT /api/v1/services/[id]
 */
export const serviceUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category_id: z.number().int().optional(),
  duration_minutes: z.number().int().min(5).optional(),
  buffer_before_minutes: z.number().int().min(0).optional(),
  buffer_after_minutes: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
  dynamic_pricing_enabled: z.boolean().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  max_capacity: z.number().int().min(1).optional(),
  online_booking_enabled: z.boolean().optional(),
  requires_payment: z.boolean().optional(),
  is_online: z.boolean().optional(),
  video_provider: z.enum(['zoom', 'google_meet', 'ms_teams']).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  is_active: z.boolean().optional(),
});

export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;

/**
 * Service category creation schema
 * POST /api/v1/service-categories
 */
export const serviceCategoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sort_order: z.number().int().optional(),
});

export type ServiceCategoryCreateInput = z.infer<typeof serviceCategoryCreateSchema>;

/**
 * Service category update schema
 * PUT /api/v1/service-categories/[id]
 */
export const serviceCategoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  sort_order: z.number().int().optional(),
});

export type ServiceCategoryUpdateInput = z.infer<typeof serviceCategoryUpdateSchema>;

/**
 * Service query parameters schema
 * GET /api/v1/services
 */
export const serviceQuerySchema = z.object({
  category_id: z.coerce.number().int().optional(),
  is_active: z.enum(['true', 'false']).optional(),
});

export type ServiceQueryInput = z.infer<typeof serviceQuerySchema>;

/**
 * Service ID param schema (UUID)
 */
export const serviceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ServiceIdParam = z.infer<typeof serviceIdParamSchema>;

/**
 * Service category ID param schema (SERIAL)
 */
export const serviceCategoryIdParamSchema = z.object({
  id: z.coerce.number().int(),
});

export type ServiceCategoryIdParam = z.infer<typeof serviceCategoryIdParamSchema>;
