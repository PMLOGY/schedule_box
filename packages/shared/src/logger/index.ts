/**
 * Structured JSON Logger with OpenTelemetry Trace Correlation
 *
 * Winston-based logger that automatically injects trace_id and span_id
 * from active OpenTelemetry span context for distributed tracing correlation.
 *
 * Usage:
 *   import { logInfo, logError } from '@schedulebox/shared';
 *   logInfo('User logged in', { userId: '123' });
 *   logError('Payment failed', { bookingId: 'abc', error: err.message });
 */

import winston from 'winston';
import { trace, context, type Span } from '@opentelemetry/api';

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'schedulebox',
  },
  transports: [
    // Console transport (stdout) - Docker/Kubernetes will collect logs
    new winston.transports.Console(),
  ],
});

/**
 * Extract trace context from active OpenTelemetry span
 *
 * @returns Object with trace_id and span_id if tracing is active, empty object otherwise
 */
function getTraceContext(): { trace_id?: string; span_id?: string } {
  try {
    const activeSpan: Span | undefined = trace.getSpan(context.active());
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      if (spanContext) {
        return {
          trace_id: spanContext.traceId,
          span_id: spanContext.spanId,
        };
      }
    }
  } catch {
    // Graceful degradation: if OpenTelemetry is not initialized, return empty object
    // This prevents crashes when tracer is disabled or failed to initialize
  }
  return {};
}

/**
 * Log a message with trace correlation
 *
 * @param level - Log level (info, error, warn, debug)
 * @param message - Log message
 * @param meta - Additional metadata to include in log entry
 */
function log(level: string, message: string, meta?: Record<string, unknown>): void {
  const traceContext = getTraceContext();
  winstonLogger.log(level, message, { ...meta, ...traceContext });
}

/**
 * Log info message with trace correlation
 */
export function logInfo(message: string, meta?: Record<string, unknown>): void {
  log('info', message, meta);
}

/**
 * Log error message with trace correlation
 */
export function logError(message: string, meta?: Record<string, unknown>): void {
  log('error', message, meta);
}

/**
 * Log warning message with trace correlation
 */
export function logWarn(message: string, meta?: Record<string, unknown>): void {
  log('warn', message, meta);
}

/**
 * Log debug message with trace correlation
 */
export function logDebug(message: string, meta?: Record<string, unknown>): void {
  log('debug', message, meta);
}

/**
 * Export the winston logger instance directly for advanced usage
 *
 * Use this when you need Winston-specific features like streams or custom formats.
 * For most use cases, prefer the convenience functions (logInfo, logError, etc.)
 */
export { winstonLogger as logger };
