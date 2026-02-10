/**
 * Resource validation schemas
 * Zod schemas for resource and resource type endpoints
 */

import { z } from 'zod';

/**
 * Resource creation schema
 * Matches OpenAPI ResourceCreate (lines 4786-4793)
 */
export const resourceCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  resource_type_id: z.number().int().optional(),
  quantity: z.number().int().min(1).optional().default(1),
});

/**
 * Resource update schema
 * All fields optional for partial updates
 */
export const resourceUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  resource_type_id: z.number().int().optional(),
  quantity: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});

/**
 * Resource type creation schema
 */
export const resourceTypeCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export type ResourceCreate = z.infer<typeof resourceCreateSchema>;
export type ResourceUpdate = z.infer<typeof resourceUpdateSchema>;
export type ResourceTypeCreate = z.infer<typeof resourceTypeCreateSchema>;
