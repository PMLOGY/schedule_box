/**
 * Notification Worker Entrypoint
 * Starts BullMQ workers for email, SMS, and push notifications
 */

import { type Worker } from 'bullmq';
import { createEmailWorker } from './jobs/email-job.js';
import { createSmsWorker } from './jobs/sms-job.js';
import { createPushWorker } from './jobs/push-job.js';
import { emailQueue, smsQueue, pushQueue, QUEUE_NAMES } from './queues.js';
import { config } from './config.js';

// Worker instances
let emailWorker: Worker | null = null;
let smsWorker: Worker | null = null;
let pushWorker: Worker | null = null;

/**
 * Start all notification workers
 */
async function startWorkers() {
  const redisConnection = {
    host: config.redis.host,
    port: config.redis.port,
  };

  // Create workers
  emailWorker = createEmailWorker(redisConnection);
  smsWorker = createSmsWorker(redisConnection);
  pushWorker = createPushWorker(redisConnection);

  console.log('[Notification Worker] Started successfully');
  console.log(`[Notification Worker] Queue names:`, QUEUE_NAMES);
  console.log(`[Notification Worker] Timestamp: ${new Date().toISOString()}`);
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  console.log(`[Notification Worker] Received ${signal}, shutting down gracefully...`);

  try {
    // Close all workers
    if (emailWorker) {
      await emailWorker.close();
      console.log('[Notification Worker] Email worker closed');
    }
    if (smsWorker) {
      await smsWorker.close();
      console.log('[Notification Worker] SMS worker closed');
    }
    if (pushWorker) {
      await pushWorker.close();
      console.log('[Notification Worker] Push worker closed');
    }

    // Close all queues
    await emailQueue.close();
    await smsQueue.close();
    await pushQueue.close();
    console.log('[Notification Worker] All queues closed');

    console.log('[Notification Worker] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Notification Worker] Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start workers
startWorkers().catch((error) => {
  console.error('[Notification Worker] Failed to start:', error);
  process.exit(1);
});
