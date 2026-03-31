/**
 * Membership validation schemas
 * Zod schemas for membership types and customer membership assignment
 */

import { z } from 'zod';

/**
 * Membership type creation schema
 * Note: punch_card validation (punchesIncluded required) is enforced in the service layer
 * to avoid ZodEffects type incompatibility with createRouteHandler.
 */
export const membershipTypeCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  type: z.enum(['monthly', 'annual', 'punch_card']),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid positive number'),
  currency: z.string().length(3).optional(),
  punchesIncluded: z.number().int().positive().optional(),
  durationDays: z.number().int().positive().optional(),
  serviceIds: z.array(z.string().uuid()).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type MembershipTypeCreate = z.infer<typeof membershipTypeCreateSchema>;

/**
 * Membership type update schema (partial)
 */
export const membershipTypeUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['monthly', 'annual', 'punch_card']).optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid positive number')
    .optional(),
  currency: z.string().length(3).optional(),
  punchesIncluded: z.number().int().positive().optional().nullable(),
  durationDays: z.number().int().positive().optional().nullable(),
  serviceIds: z.array(z.string().uuid()).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type MembershipTypeUpdate = z.infer<typeof membershipTypeUpdateSchema>;

/**
 * Customer membership assignment schema
 */
export const customerMembershipAssignSchema = z.object({
  membershipTypeId: z.string().uuid('Invalid membership type ID'),
  startDate: z.string().date('Invalid date format (expected YYYY-MM-DD)'),
  endDate: z.string().date('Invalid date format (expected YYYY-MM-DD)').optional(),
});

export type CustomerMembershipAssign = z.infer<typeof customerMembershipAssignSchema>;

/**
 * Membership type ID parameter schema
 */
export const membershipTypeIdParamSchema = z.object({
  id: z.string().uuid('Invalid membership type ID format'),
});

export type MembershipTypeIdParam = z.infer<typeof membershipTypeIdParamSchema>;

/**
 * Customer ID parameter schema (reuse pattern)
 */
export const customerIdParamSchema = z.object({
  id: z.string().uuid('Invalid customer ID format'),
});

export type CustomerIdParam = z.infer<typeof customerIdParamSchema>;
