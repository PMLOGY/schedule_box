/**
 * OpenTelemetry Tracer Initialization
 *
 * Configures OpenTelemetry SDK with OTLP gRPC exporter for distributed tracing.
 * Gracefully degrades when tracing backend is unavailable (no crash).
 *
 * Usage:
 *   import { initTracer, shutdownTracer } from '@schedulebox/shared';
 *   await initTracer('my-service');
 *   // ... application code ...
 *   await shutdownTracer();
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK with OTLP gRPC exporter
 *
 * Features:
 * - OTLP gRPC exporter pointing to OTEL_EXPORTER_OTLP_ENDPOINT (defaults to localhost:4317)
 * - HTTP/HTTPS auto-instrumentation for all incoming and outgoing requests
 * - Graceful degradation if Jaeger backend is unavailable
 * - Resource attributes: SERVICE_NAME, SERVICE_VERSION
 *
 * @param serviceName - Name of the service (e.g., 'schedulebox-web', 'schedulebox-worker')
 * @returns Promise that resolves when tracer is initialized
 */
export async function initTracer(serviceName: string): Promise<void> {
  try {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';

    // Create OTLP trace exporter (gRPC protocol)
    const traceExporter = new OTLPTraceExporter({
      url: endpoint,
    });

    // Configure resource attributes
    const customResource = resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
    });
    const resource = defaultResource().merge(customResource);

    // Initialize OpenTelemetry SDK
    sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        // Auto-instrument HTTP/HTTPS requests
        new HttpInstrumentation({
          ignoreIncomingRequestHook: (request) => {
            // Optionally ignore health check endpoints to reduce trace noise
            const url = request.url || '';
            return url.includes('/health') || url.includes('/metrics');
          },
        }),
      ],
    });

    await sdk.start();

    console.log(
      `[Tracer] OpenTelemetry initialized for service: ${serviceName}, endpoint: ${endpoint}`,
    );
  } catch (error) {
    // Graceful degradation: log warning but do NOT crash the application
    // This matches the project pattern from AI circuit breakers (Phase 10/11)
    console.warn(
      '[Tracer] Failed to initialize OpenTelemetry SDK. Tracing disabled.',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Shutdown OpenTelemetry SDK gracefully
 *
 * Flushes pending spans and closes connections to the tracing backend.
 * Should be called during application shutdown (SIGTERM handler).
 *
 * @returns Promise that resolves when shutdown is complete
 */
export async function shutdownTracer(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
      console.log('[Tracer] OpenTelemetry SDK shutdown complete');
    } catch (error) {
      console.error(
        '[Tracer] Error during shutdown',
        error instanceof Error ? error.message : error,
      );
    }
  }
}

// Register SIGTERM handler for graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Tracer] Received SIGTERM, shutting down tracer...');
  await shutdownTracer();
  process.exit(0);
});
