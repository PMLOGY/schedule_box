/**
 * Email Job Handler
 * BullMQ worker for email notification delivery
 */

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues.js';
import { sendEmail, injectTrackingPixel } from '../services/email-sender.js';
import {
  createNotificationRecord,
  logNotificationSent,
  logNotificationFailed,
} from '../services/notification-logger.js';
import { emailDeliveryTotal } from '../monitoring/metrics.js';

/**
 * Email job data interface
 */
export interface EmailJobData {
  companyId: number;
  bookingId?: number;
  customerId?: number;
  templateId?: number;
  recipient: string;
  subject: string;
  html: string;
  notificationId?: number;
  eventId?: string;
}

/**
 * Email job handler
 */
async function handleEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { data } = job;

  console.log(`[Email Job] Processing job ${job.id} for ${data.recipient}`);

  try {
    // Create notification record if not provided
    let notificationId = data.notificationId;
    if (!notificationId) {
      notificationId = await createNotificationRecord({
        companyId: data.companyId,
        customerId: data.customerId,
        bookingId: data.bookingId,
        templateId: data.templateId,
        channel: 'email',
        recipient: data.recipient,
        subject: data.subject,
        body: data.html,
      });
    }

    // Inject tracking pixel
    const htmlWithTracking = injectTrackingPixel(data.html, notificationId);

    // Send email
    const messageId = await sendEmail({
      to: data.recipient,
      subject: data.subject,
      html: htmlWithTracking,
    });

    // Update notification status
    await logNotificationSent(notificationId, messageId);

    // Track delivery metric
    emailDeliveryTotal.inc({ status: 'sent' });

    console.log(`[Email Job] Completed job ${job.id}`);
  } catch (error) {
    console.error(`[Email Job] Failed job ${job.id}:`, error);

    // Track delivery failure metric (always, regardless of whether DB record exists)
    emailDeliveryTotal.inc({ status: 'failed' });

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
 * Create email worker
 * @param redisConnection Redis connection config
 */
export function createEmailWorker(redisConnection: { host: string; port: number }): Worker {
  const worker = new Worker<EmailJobData>(QUEUE_NAMES.EMAIL, handleEmailJob, {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 60000, // 100 emails per 60s
    },
  });

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`[Email Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Email Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err);
  });

  console.log('[Email Worker] Started');

  return worker;
}
