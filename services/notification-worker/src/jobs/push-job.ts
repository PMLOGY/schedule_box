/**
 * Push Notification Job Handler
 * BullMQ worker for web push notification delivery
 */

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues.js';
import { sendPushNotification } from '../services/push-sender.js';
import {
  createNotificationRecord,
  logNotificationSent,
  logNotificationFailed,
} from '../services/notification-logger.js';

/**
 * Push job data interface
 */
export interface PushJobData {
  companyId: number;
  customerId?: number;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  title: string;
  body: string;
  icon?: string;
  url?: string;
  notificationId?: number;
  eventId?: string;
}

/**
 * Push job handler
 */
async function handlePushJob(job: Job<PushJobData>): Promise<void> {
  const { data } = job;

  console.log(
    `[Push Job] Processing job ${job.id} for endpoint ${data.subscription.endpoint.substring(0, 50)}...`,
  );

  try {
    // Create notification record if not provided
    let notificationId = data.notificationId;
    if (!notificationId) {
      notificationId = await createNotificationRecord({
        companyId: data.companyId,
        customerId: data.customerId,
        channel: 'push',
        recipient: data.subscription.endpoint,
        subject: data.title,
        body: data.body,
      });
    }

    // Send push notification
    await sendPushNotification(data.subscription, {
      title: data.title,
      body: data.body,
      icon: data.icon,
      url: data.url,
    });

    // Update notification status
    await logNotificationSent(notificationId, data.subscription.endpoint);

    console.log(`[Push Job] Completed job ${job.id}`);
  } catch (error) {
    console.error(`[Push Job] Failed job ${job.id}:`, error);

    // Log failure if notification record exists
    if (data.notificationId) {
      await logNotificationFailed(
        data.notificationId,
        error instanceof Error ? error.message : String(error),
      );
    }

    // Re-throw for BullMQ retry mechanism
    throw error;
  }
}

/**
 * Create push worker
 * @param redisConnection Redis connection config
 */
export function createPushWorker(redisConnection: { host: string; port: number }): Worker {
  const worker = new Worker<PushJobData>(QUEUE_NAMES.PUSH, handlePushJob, {
    connection: redisConnection,
    concurrency: 10, // Push is fast
  });

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`[Push Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Push Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err);
  });

  console.log('[Push Worker] Started');

  return worker;
}
