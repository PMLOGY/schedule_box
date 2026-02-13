/**
 * Health check HTTP server for the notification worker.
 *
 * Exposes /health and /ready endpoints so Kubernetes can
 * verify the worker is alive and processing messages.
 */

import { createServer, type Server } from 'node:http';

const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || '3001', 10);

/** Shared health state updated by the worker entrypoint */
export const healthState = {
  /** Set to true once BullMQ workers + RabbitMQ consumers are connected */
  ready: false,
  /** Set to false during graceful shutdown */
  alive: true,
  /** Timestamp of last successfully processed message (any channel) */
  lastProcessedAt: null as string | null,
};

/**
 * Start the health check HTTP server.
 *
 * GET /health  — liveness: returns 200 if process is alive
 * GET /ready   — readiness: returns 200 if workers and consumers are connected
 */
export function startHealthServer(): Server {
  const server = createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      if (healthState.alive) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({ status: 'healthy', lastProcessedAt: healthState.lastProcessedAt }),
        );
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'shutting_down' }));
      }
      return;
    }

    if (req.url === '/ready' && req.method === 'GET') {
      if (healthState.ready) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ready' }));
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'not_ready' }));
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(HEALTH_PORT, () => {
    console.log(`[Notification Worker] Health server listening on port ${HEALTH_PORT}`);
  });

  return server;
}
