import { captureRequestError } from '@sentry/nextjs';

export async function register() {
  // OpenTelemetry: only register if an OTLP endpoint is explicitly configured.
  // @vercel/otel was removed — it requires Vercel infrastructure and crashes on Coolify.
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    try {
      const { registerOTel } = await import('@vercel/otel');
      registerOTel({
        serviceName: 'schedulebox',
        attributes: {
          'service.version': process.env.SOURCE_COMMIT ?? 'dev',
        },
      });
    } catch {
      console.warn('[otel] OpenTelemetry registration failed — continuing without tracing');
    }
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    const { validateEnv } = await import('./lib/env');
    validateEnv();
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = captureRequestError;
