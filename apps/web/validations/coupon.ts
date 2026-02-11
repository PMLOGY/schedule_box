/**
 * Coupon validation schemas
 * Zod schemas for coupon CRUD and validation endpoints matching OpenAPI specification
 */

import { z } from 'zod';

/**
 * Coupon creation schema
 * Matches CouponCreate from OpenAPI specification
 */
export const couponCreateSchema = z.object({
  code: z
    .string()
    .min(3, 'Coupon code must be at least 3 characters')
    .max(50, 'Coupon code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  description: z.string().max(255, 'Description cannot exceed 255 characters').optional(),
  discount_type: z.enum(['percentage', 'fixed'], {
    errorMap: () => ({ message: "Discount type must be 'percentage' or 'fixed'" }),
  }),
  discount_value: z.number().positive('Discount value must be positive'),
  min_booking_amount: z.number().min(0, 'Minimum booking amount cannot be negative').default(0),
  max_uses: z.number().int('Max uses must be an integer').positive().optional(),
  max_uses_per_customer: z
    .number()
    .int('Max uses per customer must be an integer')
    .positive()
    .default(1),
  applicable_service_ids: z.array(z.number().int('Service IDs must be integers')).optional(),
  valid_from: z.string().datetime('Invalid datetime format').optional(),
  valid_until: z.string().datetime('Invalid datetime format').optional(),
  is_active: z.boolean().default(true),
});

export type CouponCreate = z.infer<typeof couponCreateSchema>;

/**
 * Coupon update schema
 * All fields optional for PATCH-style updates
 */
export const couponUpdateSchema = z.object({
  code: z
    .string()
    .min(3, 'Coupon code must be at least 3 characters')
    .max(50, 'Coupon code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase())
    .optional(),
  description: z.string().max(255, 'Description cannot exceed 255 characters').optional(),
  discount_type: z
    .enum(['percentage', 'fixed'], {
      errorMap: () => ({ message: "Discount type must be 'percentage' or 'fixed'" }),
    })
    .optional(),
  discount_value: z.number().positive('Discount value must be positive').optional(),
  min_booking_amount: z.number().min(0, 'Minimum booking amount cannot be negative').optional(),
  max_uses: z.number().int('Max uses must be an integer').positive().optional(),
  max_uses_per_customer: z
    .number()
    .int('Max uses per customer must be an integer')
    .positive()
    .optional(),
  applicable_service_ids: z.array(z.number().int('Service IDs must be integers')).optional(),
  valid_from: z.string().datetime('Invalid datetime format').optional(),
  valid_until: z.string().datetime('Invalid datetime format').optional(),
  is_active: z.boolean().optional(),
});

export type CouponUpdate = z.infer<typeof couponUpdateSchema>;

/**
 * Coupon query parameters schema
 * For GET /api/v1/coupons list endpoint with pagination, search, and filtering
 */
export const couponQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  search: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
});

export type CouponQuery = z.infer<typeof couponQuerySchema>;

/**
 * Coupon validation schema
 * For POST /api/v1/coupons/validate endpoint
 */
export const couponValidateSchema = z.object({
  code: z.string().transform((val) => val.toUpperCase()),
  service_id: z.number().int('Service ID must be an integer').positive(),
  customer_id: z.string().uuid('Invalid customer ID format'),
});

export type CouponValidate = z.infer<typeof couponValidateSchema>;

/**
 * Coupon UUID parameter schema
 * For route parameters like /api/v1/coupons/[id]
 */
export const couponIdParamSchema = z.object({
  id: z.string().uuid('Invalid coupon ID format'),
});

export type CouponIdParam = z.infer<typeof couponIdParamSchema>;
