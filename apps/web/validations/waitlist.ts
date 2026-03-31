/**
 * Waitlist validation schemas for API routes
 * Zod schemas for waitlist join and query operations
 */

import { z } from 'zod';

/**
 * Schema for joining a waitlist
 * Customer joins waitlist when a group class is full
 */
export const waitlistJoinSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID format'),
  employeeId: z.string().uuid('Invalid employee ID format').optional(),
  customerId: z.string().uuid('Invalid customer ID format'),
  preferredTime: z.string().datetime({ message: 'preferredTime must be a valid ISO datetime' }),
});

export type WaitlistJoinInput = z.infer<typeof waitlistJoinSchema>;

/**
 * Schema for waitlist list query parameters
 */
export const waitlistListQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  status: z.enum(['waiting', 'promoted', 'expired', 'cancelled']).optional(),
});

export type WaitlistListQuery = z.infer<typeof waitlistListQuerySchema>;

/**
 * Schema for waitlist entry ID parameter
 */
export const waitlistIdParamSchema = z.object({
  id: z.string().uuid('Invalid waitlist entry ID format'),
});

export type WaitlistIdParam = z.infer<typeof waitlistIdParamSchema>;
