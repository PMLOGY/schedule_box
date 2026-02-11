/**
 * Notification Validation Schemas
 *
 * Zod schemas for notification template and notification list API validation
 */

import { z } from 'zod';

/**
 * Notification template type enum
 * Matches DB check constraint
 */
export const notificationTemplateTypeEnum = z.enum([
  'booking_confirmation',
  'booking_reminder',
  'booking_cancellation',
  'payment_confirmation',
  'payment_reminder',
  'review_request',
  'welcome',
  'loyalty_update',
  'follow_up',
  'custom',
]);

/**
 * Notification channel enum
 * Matches DB check constraint
 */
export const notificationChannelEnum = z.enum(['email', 'sms', 'push']);

/**
 * Notification status enum
 * Matches DB check constraint
 */
export const notificationStatusEnum = z.enum([
  'pending',
  'sent',
  'delivered',
  'failed',
  'opened',
  'clicked',
]);

/**
 * Schema for creating a notification template
 */
export const notificationTemplateCreateSchema = z.object({
  type: notificationTemplateTypeEnum,
  channel: notificationChannelEnum,
  subject: z.string().max(255).optional(),
  bodyTemplate: z.string().min(1),
  isActive: z.boolean().optional().default(true),
});

/**
 * Schema for updating a notification template
 * All fields optional (partial update)
 */
export const notificationTemplateUpdateSchema = notificationTemplateCreateSchema.partial();

/**
 * Schema for notification list query parameters
 */
export const notificationListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  channel: notificationChannelEnum.optional(),
  status: notificationStatusEnum.optional(),
  customerId: z.coerce.number().int().positive().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

/**
 * Schema for notification template preview request
 * Used to test template rendering with sample data
 */
export const notificationTemplatePreviewSchema = z.object({
  templateId: z.number().int().positive(),
  testData: z.record(z.string(), z.any()),
});
