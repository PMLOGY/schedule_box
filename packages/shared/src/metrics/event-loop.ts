/**
 * Event loop utilization metric for HPA (Horizontal Pod Autoscaler)
 *
 * Measures event loop saturation as a 0-1 float, which is a better
 * indicator of Node.js app health than CPU usage alone.
 */

import { performance } from 'node:perf_hooks';
import { Gauge } from 'prom-client';
import { register } from './index';

// Event loop utilization gauge (0-1 float)
const eventLoopUtilization = new Gauge({
  name: 'nodejs_eventloop_utilization',
  help: 'Event loop utilization (0=idle, 1=saturated)',
  registers: [register],
});

let started = false;
let previousELU: ReturnType<typeof performance.eventLoopUtilization> | undefined;

/**
 * Start event loop utilization metrics collection
 * Runs every 1 second and measures delta ELU
 * Idempotent - safe to call multiple times
 */
export function startEventLoopMetrics(): void {
  if (started) {
    return; // Already started, prevent duplicate intervals
  }

  started = true;

  // Initialize baseline
  previousELU = performance.eventLoopUtilization();

  // Collect metrics every second
  setInterval(() => {
    const currentELU = performance.eventLoopUtilization(previousELU);
    eventLoopUtilization.set(currentELU.utilization);
    previousELU = currentELU;
  }, 1000);
}
