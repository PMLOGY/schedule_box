/**
 * Prometheus metrics registry and core metric definitions
 *
 * Custom registry avoids conflicts with other libraries and provides
 * full control over exposed metrics.
 */

import { Registry, Histogram, Counter, Gauge, collectDefaultMetrics } from 'prom-client';

// Create custom registry (do NOT use default global registry)
export const register = new Registry();

// Core HTTP metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10],
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register],
});

// Database metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query_type'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 3],
  registers: [register],
});

export const pgConnectionsActive = new Gauge({
  name: 'pg_connections_active',
  help: 'Number of active PostgreSQL connections',
  registers: [register],
});

export const redisConnectionsActive = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections',
  registers: [register],
});

// Collect default Node.js metrics (heap, GC, event loop lag)
// Configured with custom registry and nodejs_ prefix
collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
});

/**
 * Get metrics in Prometheus text exposition format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}
