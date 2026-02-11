/**
 * Scheduler Orchestrator
 * Starts all schedulers (reminder scheduler + automation engine)
 */

import type { Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { startReminderScheduler } from './reminder-scheduler.js';

/**
 * Queues interface
 */
interface Queues {
  emailQueue: Queue;
  smsQueue: Queue;
  pushQueue: Queue;
}

/**
 * Scheduler resources (for graceful shutdown)
 */
export interface SchedulerResources {
  reminderQueue: Queue;
  reminderWorker: Worker;
}

/**
 * Start all schedulers
 */
export async function startSchedulers(
  queues: Queues,
  redisConnection: ConnectionOptions,
): Promise<SchedulerResources> {
  console.log('[Schedulers] Starting all schedulers...');

  // Start reminder scheduler
  const { queue: reminderQueue, worker: reminderWorker } = await startReminderScheduler(
    queues.emailQueue,
    queues.smsQueue,
    redisConnection,
  );

  console.log('[Schedulers] All schedulers started successfully');

  return {
    reminderQueue,
    reminderWorker,
  };
}
