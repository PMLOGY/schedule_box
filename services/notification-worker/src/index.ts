/**
 * Notification Worker Entrypoint
 * Starts BullMQ workers, RabbitMQ consumers, schedulers, and health server
 */

import { type Worker } from 'bullmq';
import type { Server } from 'node:http';
import * as amqplib from 'amqplib';
import type { Channel } from 'amqplib';
import { createEmailWorker } from './jobs/email-job.js';
import { createSmsWorker } from './jobs/sms-job.js';
import { createPushWorker } from './jobs/push-job.js';
import { emailQueue, smsQueue, pushQueue, QUEUE_NAMES } from './queues.js';
import { startConsumers } from './consumers/index.js';
import { startSchedulers, type SchedulerResources } from './schedulers/index.js';
import { config } from './config.js';
import { startHealthServer, healthState } from './health.js';

// Worker instances
let emailWorker: Worker | null = null;
let smsWorker: Worker | null = null;
let pushWorker: Worker | null = null;

// RabbitMQ connection
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let rabbitConnection: any = null;
let rabbitChannel: Channel | null = null;

// Scheduler resources
let schedulerResources: SchedulerResources | null = null;

// Health server
let healthServer: Server | null = null;

/**
 * Start all notification workers, consumers, and schedulers
 */
async function startWorkers() {
  // Start health server first so probes respond during startup
  healthServer = startHealthServer();

  const redisConnection = {
    host: config.redis.host,
    port: config.redis.port,
    ...('password' in config.redis && { password: config.redis.password }),
    ...('username' in config.redis && { username: config.redis.username }),
  };

  // 1. Create BullMQ workers
  emailWorker = createEmailWorker(redisConnection);
  smsWorker = createSmsWorker(redisConnection);
  pushWorker = createPushWorker(redisConnection);

  console.log('[Notification Worker] BullMQ workers started');

  // 2. Start RabbitMQ consumers (non-fatal if unavailable)
  try {
    await startRabbitMQConsumers();
  } catch (error) {
    console.warn('[Notification Worker] RabbitMQ unavailable — running without event consumers');
    console.warn(
      '[Notification Worker] RabbitMQ error:',
      error instanceof Error ? error.message : error,
    );
    console.warn('[Notification Worker] BullMQ workers will still process jobs from Redis queues');
  }

  // 3. Start schedulers (reminder scheduler + automation engine)
  schedulerResources = await startSchedulers({ emailQueue, smsQueue, pushQueue }, redisConnection);

  // Mark as ready for Kubernetes readiness probe
  healthState.ready = true;

  console.log('[Notification Worker] Started successfully');
  console.log(`[Notification Worker] Queue names:`, QUEUE_NAMES);
  console.log(`[Notification Worker] Timestamp: ${new Date().toISOString()}`);
}

/**
 * Start RabbitMQ consumers
 */
async function startRabbitMQConsumers(): Promise<void> {
  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://schedulebox:schedulebox@localhost:5672';

  // Connect to RabbitMQ using promise-based API
  rabbitConnection = await amqplib.connect(rabbitmqUrl);

  rabbitConnection.on('error', (error: Error) => {
    console.error('[Notification Worker] RabbitMQ connection error:', error);
  });

  rabbitConnection.on('close', () => {
    console.log('[Notification Worker] RabbitMQ connection closed');
  });

  // Create channel
  const channel = await rabbitConnection.createChannel();
  rabbitChannel = channel;

  channel.on('error', (error: Error) => {
    console.error('[Notification Worker] RabbitMQ channel error:', error);
  });

  channel.on('close', () => {
    console.log('[Notification Worker] RabbitMQ channel closed');
  });

  // Assert the exchange
  await channel.assertExchange('schedulebox.events', 'topic', { durable: true });

  // Start consumers
  await startConsumers(channel, { emailQueue, smsQueue, pushQueue });

  console.log('[Notification Worker] RabbitMQ consumers started');
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  console.log(`[Notification Worker] Received ${signal}, shutting down gracefully...`);

  // Mark as not alive so liveness probe fails and K8s stops sending traffic
  healthState.alive = false;
  healthState.ready = false;

  try {
    // 1. Close RabbitMQ channel and connection
    if (rabbitChannel) {
      await rabbitChannel.close();
      console.log('[Notification Worker] RabbitMQ channel closed');
    }

    if (rabbitConnection) {
      await rabbitConnection.close();
      console.log('[Notification Worker] RabbitMQ connection closed');
    }

    // 2. Close scheduler resources
    if (schedulerResources) {
      await schedulerResources.reminderWorker.close();
      await schedulerResources.reminderQueue.close();
      console.log('[Notification Worker] Schedulers closed');
    }

    // 3. Close BullMQ workers
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

    // 4. Close BullMQ queues
    await emailQueue.close();
    await smsQueue.close();
    await pushQueue.close();
    console.log('[Notification Worker] All queues closed');

    // 5. Close health server
    if (healthServer) {
      healthServer.close();
      console.log('[Notification Worker] Health server closed');
    }

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
