import { registerOTel } from '@vercel/otel';
import { captureRequestError } from '@sentry/nextjs';

export async function register() {
  // Register OpenTelemetry BEFORE any runtime-specific setup.
  // @vercel/otel handles both nodejs and edge internally — no runtime guard needed.
  // Env vars OTEL_TRACES_SAMPLER=parentbased_traceidratio and OTEL_TRACES_SAMPLER_ARG=0.1
  // configure 10% sampling at the platform level. The attributes below attach version metadata.
  registerOTel({
    serviceName: 'schedulebox',
    attributes: {
      'service.version': process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
    },
  });

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
