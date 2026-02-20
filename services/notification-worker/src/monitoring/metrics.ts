/**
 * Worker-local Prometheus metrics
 *
 * IMPORTANT: This uses a worker-local Registry, NOT the shared package registry.
 * The notification worker is a separate Node.js process from apps/web.
 * Metrics defined here are only visible within this process.
 *
 * Exposed via GET /metrics on the health server (port 3001) for manual debugging.
 */

import { Counter, Gauge, Registry } from 'prom-client';

/**
 * Worker-local Prometheus registry
 * Separate from @schedulebox/shared to avoid cross-process metric confusion
 */
export const workerRegister = new Registry();

/**
 * Total email delivery attempts, labeled by status ('sent' | 'failed')
 * Incremented in email-job.ts on every send attempt
 */
export const emailDeliveryTotal = new Counter({
  name: 'schedulebox_email_delivery_total',
  help: 'Total email delivery attempts by status',
  labelNames: ['status'] as const,
  registers: [workerRegister],
});

/**
 * Total SMS delivery attempts, labeled by status ('sent' | 'failed')
 * Incremented in sms-job.ts on every send attempt
 */
export const smsDeliveryTotal = new Counter({
  name: 'schedulebox_sms_delivery_total',
  help: 'Total SMS delivery attempts by status',
  labelNames: ['status'] as const,
  registers: [workerRegister],
});

/**
 * Total SMS segments sent (used for cost estimation)
 * Only incremented for real Twilio sends (not mock SID in dev)
 */
export const smsSegmentsTotal = new Counter({
  name: 'schedulebox_sms_segments_total',
  help: 'Total SMS segments sent for cost estimation',
  registers: [workerRegister],
});

/**
 * Current estimated monthly SMS cost in CZK
 * Updated by monitoring-scheduler on each check cycle
 */
export const smsEstimatedMonthlyCostCzk = new Gauge({
  name: 'schedulebox_sms_estimated_monthly_cost_czk',
  help: 'Estimated monthly SMS cost in CZK',
  registers: [workerRegister],
});

/**
 * Return all worker metrics in Prometheus text exposition format
 * Used by the health server /metrics endpoint
 */
export async function getWorkerMetrics(): Promise<string> {
  return workerRegister.metrics();
}
