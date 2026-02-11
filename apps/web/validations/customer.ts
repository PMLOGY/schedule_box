/**
 * Customer validation schemas
 * Zod schemas for customer and tag endpoints matching OpenAPI specification
 */

import { z } from 'zod';

/**
 * Customer creation schema
 * Matches CustomerCreate from OpenAPI (lines 4593-4603)
 */
export const customerCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(50).optional(),
  date_of_birth: z.string().date('Invalid date format').optional(),
  notes: z.string().optional(),
  tag_ids: z.array(z.number().int('Tag IDs must be integers')).optional(),
  marketing_consent: z.boolean().default(false),
});

export type CustomerCreate = z.infer<typeof customerCreateSchema>;

/**
 * Customer update schema
 * Matches CustomerUpdate from OpenAPI (lines 4605-4613)
 * All fields optional for PATCH-style updates
 */
export const customerUpdateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(50).optional(),
  date_of_birth: z.string().date('Invalid date format').optional(),
  notes: z.string().optional(),
  marketing_consent: z.boolean().optional(),
});

export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;

/**
 * Customer query parameters schema
 * For GET /api/v1/customers list endpoint with pagination, search, and filtering
 */
export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  search: z.string().optional(),
  tag_id: z.coerce.number().int().optional(),
  sort_by: z
    .enum(['name', 'total_bookings', 'total_spent', 'health_score', 'last_visit_at'])
    .optional()
    .default('name'),
});

export type CustomerQuery = z.infer<typeof customerQuerySchema>;

/**
 * Tag creation schema
 */
export const tagCreateSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #3B82F6)')
    .optional(),
});

export type TagCreate = z.infer<typeof tagCreateSchema>;

/**
 * Tag update schema
 */
export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional(),
});

export type TagUpdate = z.infer<typeof tagUpdateSchema>;

/**
 * Customer tags assignment schema
 * PUT /api/v1/customers/{id}/tags — replaces all tags atomically
 */
export const customerTagsSchema = z.object({
  tag_ids: z.array(z.number().int('Tag IDs must be integers')),
});

export type CustomerTags = z.infer<typeof customerTagsSchema>;

/**
 * Customer UUID parameter schema
 * For route parameters like /api/v1/customers/[id]
 */
export const customerIdParamSchema = z.object({
  id: z.string().uuid('Invalid customer ID format'),
});

export type CustomerIdParam = z.infer<typeof customerIdParamSchema>;

/**
 * Tag ID parameter schema
 * For route parameters like /api/v1/tags/[id]
 */
export const tagIdParamSchema = z.object({
  id: z.coerce.number().int('Invalid tag ID'),
});

export type TagIdParam = z.infer<typeof tagIdParamSchema>;

/**
 * Customer import row schema
 * For CSV import - validates each row with optional fields that transform empty strings to undefined
 */
export const customerImportRowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z
    .string()
    .email('Invalid email')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  phone: z
    .string()
    .max(50)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  date_of_birth: z
    .string()
    .date('Invalid date')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  notes: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
});

export type CustomerImportRow = z.infer<typeof customerImportRowSchema>;
