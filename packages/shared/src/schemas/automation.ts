/**
 * Automation Validation Schemas
 *
 * Zod schemas for automation rule CRUD API validation
 */

import { z } from 'zod';

/**
 * Automation trigger type enum
 * Matches DB check constraint
 */
export const automationTriggerTypeEnum = z.enum([
  'booking_created',
  'booking_confirmed',
  'booking_completed',
  'booking_cancelled',
  'booking_no_show',
  'payment_received',
  'customer_created',
  'time_before_booking',
  'time_after_booking',
  'customer_inactive',
  'review_received',
]);

/**
 * Automation action type enum
 * Matches DB check constraint
 */
export const automationActionTypeEnum = z.enum([
  'send_email',
  'send_sms',
  'send_push',
  'update_booking_status',
  'add_loyalty_points',
  'create_task',
  'webhook',
  'ai_follow_up',
]);

/**
 * Schema for creating an automation rule
 */
export const automationRuleCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  triggerType: automationTriggerTypeEnum,
  triggerConfig: z.record(z.string(), z.any()).optional().default({}),
  actionType: automationActionTypeEnum,
  actionConfig: z.record(z.string(), z.any()).optional().default({}),
  delayMinutes: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().optional().default(true),
});

/**
 * Schema for updating an automation rule
 * All fields optional (partial update)
 */
export const automationRuleUpdateSchema = automationRuleCreateSchema.partial();

/**
 * Schema for automation rule list query parameters
 */
export const automationRuleListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  triggerType: automationTriggerTypeEnum.optional(),
  isActive: z.coerce.boolean().optional(),
});
