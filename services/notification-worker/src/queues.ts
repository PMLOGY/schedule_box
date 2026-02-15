/**
 * BullMQ Queue instances for notification delivery
 */

import { Queue } from 'bullmq';
import { config } from './config.js';

/**
 * Queue name constants
 */
export const QUEUE_NAMES = {
  EMAIL: 'notification-email',
  SMS: 'notification-sms',
  PUSH: 'notification-push',
} as const;

/**
 * Redis connection configuration for BullMQ
 */
const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  ...('password' in config.redis && { password: config.redis.password }),
  ...('username' in config.redis && { username: config.redis.username }),
};

/**
 * Email notification queue
 */
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: redisConnection,
});

/**
 * SMS notification queue
 */
export const smsQueue = new Queue(QUEUE_NAMES.SMS, {
  connection: redisConnection,
});

/**
 * Push notification queue
 */
export const pushQueue = new Queue(QUEUE_NAMES.PUSH, {
  connection: redisConnection,
});
