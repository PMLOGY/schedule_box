/**
 * SMS Job Handler
 * BullMQ worker for SMS notification delivery
 */

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues.js';
import { sendSMS } from '../services/sms-sender.js';
import {
  createNotificationRecord,
  logNotificationSent,
  logNotificationFailed,
} from '../services/notification-logger.js';
import { smsDeliveryTotal } from '../monitoring/metrics.js';

/**
 * SMS job data interface
 */
export interface SmsJobData {
  companyId: number;
  customerId?: number;
  bookingId?: number;
  recipient: string;
  body: string;
  notificationId?: number;
  eventId?: string;
  templateId?: number;
  metadata?: Record<string, unknown>;
}

/**
 * SMS job handler
 */
async function handleSmsJob(job: Job<SmsJobData>): Promise<void> {
  const { data } = job;

  console.log(`[SMS Job] Processing job ${job.id} for ${data.recipient}`);

  try {
    // Create notification record if not provided
    let notificationId = data.notificationId;
    if (!notificationId) {
      notificationId = await createNotificationRecord({
        companyId: data.companyId,
        customerId: data.customerId,
        bookingId: data.bookingId,
        channel: 'sms',
        recipient: data.recipient,
        body: data.body,
      });
    }

    // Send SMS
    const messageSid = await sendSMS({
      to: data.recipient,
      body: data.body,
    });

    // Update notification status
    await logNotificationSent(notificationId, messageSid);

    // Track delivery metric
    smsDeliveryTotal.inc({ status: 'sent' });

    console.log(`[SMS Job] Completed job ${job.id}`);
  } catch (error) {
    console.error(`[SMS Job] Failed job ${job.id}:`, error);

    // Track delivery failure metric (always, regardless of whether DB record exists)
    smsDeliveryTotal.inc({ status: 'failed' });

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
 * Create SMS worker
 * @param redisConnection Redis connection config
 */
export function createSmsWorker(redisConnection: { host: string; port: number }): Worker {
  const worker = new Worker<SmsJobData>(QUEUE_NAMES.SMS, handleSmsJob, {
    connection: redisConnection,
    concurrency: 3, // SMS more expensive, lower throughput
  });

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`[SMS Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[SMS Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err);
  });

  console.log('[SMS Worker] Started');

  return worker;
}
