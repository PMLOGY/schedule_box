/**
 * Notification TypeScript Types
 *
 * Type definitions for notification templates and notifications
 */

import { type z } from 'zod';
import {
  type notificationTemplateCreateSchema,
  type notificationTemplateUpdateSchema,
  type notificationListQuerySchema,
  type notificationTemplatePreviewSchema,
  type notificationTemplateTypeEnum,
  type notificationChannelEnum,
  type notificationStatusEnum,
} from '../schemas/notification';

/**
 * Notification template type
 */
export type NotificationTemplateType = z.infer<typeof notificationTemplateTypeEnum>;

/**
 * Notification channel
 */
export type NotificationChannel = z.infer<typeof notificationChannelEnum>;

/**
 * Notification status
 */
export type NotificationStatus = z.infer<typeof notificationStatusEnum>;

/**
 * Notification template create input
 */
export type NotificationTemplateCreate = z.infer<typeof notificationTemplateCreateSchema>;

/**
 * Notification template update input
 */
export type NotificationTemplateUpdate = z.infer<typeof notificationTemplateUpdateSchema>;

/**
 * Notification list query parameters
 */
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

/**
 * Notification template preview input
 */
export type NotificationTemplatePreview = z.infer<typeof notificationTemplatePreviewSchema>;
