---
phase: 15-devops-launch
plan: 03
subsystem: observability
tags:
  - distributed-tracing
  - opentelemetry
  - jaeger
  - structured-logging
  - winston
  - monitoring
dependency_graph:
  requires:
    - 15-02 (Monitoring stack - Prometheus/Grafana for metrics visualization)
  provides:
    - OpenTelemetry SDK initialization module with OTLP gRPC exporter
    - Structured JSON logger with trace_id/span_id correlation
    - Jaeger all-in-one Helm deployment configuration
  affects:
    - packages/shared (telemetry and logger modules)
    - k8s/monitoring (Jaeger Helm values)
tech_stack:
  added:
    - "@opentelemetry/sdk-node@0.211.0"
    - "@opentelemetry/exporter-trace-otlp-grpc@0.211.0"
    - "@opentelemetry/resources@2.5.0"
    - "@opentelemetry/semantic-conventions@1.39.0"
    - "@opentelemetry/instrumentation-http@0.211.0"
    - "@opentelemetry/api@1.9.0"
    - "winston@3.19.0"
  patterns:
    - "OpenTelemetry SDK with resourceFromAttributes and defaultResource merge"
    - "Winston JSON logger with OpenTelemetry context API integration"
    - "Graceful degradation pattern for optional observability (no crash on failure)"
    - "Jaeger all-in-one for MVP, distributed mode for production"
key_files:
  created:
    - packages/shared/src/telemetry/tracer.ts
    - packages/shared/src/telemetry/index.ts
    - packages/shared/src/logger/index.ts
    - k8s/monitoring/jaeger-values.yaml
  modified:
    - packages/shared/src/index.ts
decisions:
  - "Use OTLP gRPC exporter over HTTP for better performance"
  - "Merge custom resource with defaultResource() for automatic host/process detection"
  - "Ignore /health and /metrics endpoints in HTTP instrumentation to reduce trace noise"
  - "Use winston over pino for consistency with existing logging patterns"
  - "Return empty trace context on error (graceful degradation) instead of crashing"
  - "Badger storage for MVP (embedded, no external dependencies) over Cassandra/ClickHouse"
  - "7-day trace retention balances storage costs with debugging needs"
  - "100% sampling in staging, 10% in production (configurable via Helm override)"
metrics:
  duration_seconds: 1125
  tasks_completed: 2
  files_created: 4
  files_modified: 1
  commits: 2
  completed_at: "2026-02-12T18:14:12Z"
---

# Phase 15 Plan 03: Distributed Tracing with OpenTelemetry & Jaeger Summary

**One-liner:** OpenTelemetry SDK with OTLP gRPC exporter, HTTP auto-instrumentation, structured JSON logger with trace_id/span_id correlation, and Jaeger all-in-one Helm deployment for MVP distributed tracing.

## What Was Built

### Task 1: OpenTelemetry SDK Tracer and Structured JSON Logger

**Created modules:**

1. **`packages/shared/src/telemetry/tracer.ts`** - OpenTelemetry SDK initialization
   - `initTracer(serviceName)` function creates NodeSDK with OTLP gRPC exporter
   - Resource attributes: `SEMRESATTRS_SERVICE_NAME` and `SEMRESATTRS_SERVICE_VERSION`
   - Endpoint: `process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'`
   - HTTP/HTTPS auto-instrumentation via `HttpInstrumentation`
   - Ignores `/health` and `/metrics` endpoints to reduce trace noise
   - **Graceful degradation:** try/catch around SDK initialization, logs warning on failure
   - `shutdownTracer()` function for graceful cleanup
   - SIGTERM handler calls shutdownTracer automatically
   - Commit: `9a1a644`

2. **`packages/shared/src/logger/index.ts`** - Structured JSON logger with trace correlation
   - Winston logger with JSON format, timestamp, and error stack traces
   - Log level from `process.env.LOG_LEVEL` (defaults to `info`)
   - Service name from `process.env.SERVICE_NAME` (defaults to `schedulebox`)
   - `getTraceContext()` extracts `trace_id` and `span_id` from active OpenTelemetry span
   - Uses `trace.getSpan(context.active())` from `@opentelemetry/api`
   - Graceful degradation: returns empty object if tracing not initialized
   - Convenience functions: `logInfo`, `logError`, `logWarn`, `logDebug`
   - Exports raw `logger` instance for advanced usage
   - Commit: `9a1a644`

3. **`packages/shared/src/index.ts`** - Barrel exports
   - Added `export * from './telemetry/index.js'`
   - Added `export * from './logger/index.js'`
   - Commit: `9a1a644`

**Package installations:**
- OpenTelemetry SDK packages: `@opentelemetry/sdk-node`, `exporter-trace-otlp-grpc`, `resources`, `semantic-conventions`, `instrumentation-http`, `api`
- Winston: `winston@3.19.0`

### Task 2: Jaeger Helm Values for Distributed Trace Collection

**Created configuration:**

1. **`k8s/monitoring/jaeger-values.yaml`** - Jaeger all-in-one deployment
   - **Deployment mode:** `allInOne.enabled: true` (suitable for MVP/staging)
   - **Storage:** Badger with 20Gi PersistentVolumeClaim
   - **Retention:** 168h (7 days) TTL via `ttl: 168h` in badger options
   - **OTLP receivers:**
     - gRPC on port 4317 (matches tracer.ts default endpoint)
     - HTTP on port 4318 (alternative for browser/HTTP clients)
   - **Sampling:** 100% in staging, 10% in production (commented override instructions)
   - **Ingress:** Enabled for Jaeger UI at `/` path on configurable host
   - **Resource limits:** 250m/256Mi requests, 1000m/1Gi limits
   - **Service type:** ClusterIP (internal cluster access only)
   - **Security:** Non-root user (10001) with fsGroup
   - **Comprehensive comments:**
     - Installation: `helm install jaeger jaegertracing/jaeger --namespace monitoring --values ...`
     - Access UI: `kubectl port-forward svc/jaeger-query 16686:16686 -n monitoring`
     - App config: `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger-collector.monitoring:4317`
     - Production upgrade path: when to switch to distributed mode, external storage
   - Commit: `637c1ba`

## Deviations from Plan

None - plan executed exactly as written. All must-have truths and artifacts delivered.

## Key Implementation Details

### OpenTelemetry SDK Initialization Pattern

The tracer uses the `resourceFromAttributes()` helper to create a custom resource, then merges it with `defaultResource()` for automatic host/process/OS detection:

```typescript
const customResource = resourceFromAttributes({
  [SEMRESATTRS_SERVICE_NAME]: serviceName,
  [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
});
const resource = defaultResource().merge(customResource);
```

This pattern was chosen over direct `Resource` class instantiation because:
- The `Resource` class is not directly exported from `@opentelemetry/resources` in ESM
- `resourceFromAttributes()` is the recommended factory function
- `defaultResource()` provides automatic host/process metadata detection

### Trace Context Extraction

The logger extracts trace context using OpenTelemetry's context API:

```typescript
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
```

This enables automatic log-trace correlation when the tracer is active, but gracefully degrades (returns `{}`) when tracing is disabled.

### HTTP Instrumentation Filtering

The tracer filters out `/health` and `/metrics` endpoints from auto-instrumentation to reduce trace noise:

```typescript
new HttpInstrumentation({
  ignoreIncomingRequestHook: (request) => {
    const url = request.url || '';
    return url.includes('/health') || url.includes('/metrics');
  },
}),
```

This prevents high-frequency health checks from Kubernetes and Prometheus from flooding the trace backend.

### Jaeger Storage Strategy

**MVP (All-in-One + Badger):**
- Single pod with collector, query, and storage
- Embedded Badger database (no external dependencies)
- 20Gi persistent volume
- 7-day retention (168h)
- Suitable for < 10k spans/second

**Production Upgrade Path:**
- Switch to distributed deployment (`allInOne.enabled: false`)
- Separate collector (3 replicas), query (2 replicas), ingester services
- External storage: Cassandra (high throughput) or ClickHouse (analytics)
- Horizontal scaling for collectors
- 10% sampling to reduce storage costs

## Integration Wiring

**Not included in this plan** (per plan note: "tracer module is created here; wiring it into app startup is an incremental task"):

- Calling `initTracer('schedulebox-web')` in `apps/web/app/layout.tsx` or entry point
- Calling `initTracer('schedulebox-worker')` in `services/notification-worker/src/index.ts`
- Setting `OTEL_EXPORTER_OTLP_ENDPOINT` in Kubernetes deployment manifests
- Deploying Jaeger to cluster via Helm

The modules are ready to be imported and activated when needed without code changes to business logic.

## Verification Checklist

- [x] OpenTelemetry SDK packages installed in `packages/shared/package.json`
- [x] Winston installed in `packages/shared/package.json`
- [x] `tracer.ts` has try/catch around SDK initialization (graceful degradation)
- [x] `logger.ts` imports from `@opentelemetry/api` for trace context
- [x] `pnpm type-check` passes across all packages
- [x] Jaeger values configure OTLP receiver on port 4317 (matches tracer default)
- [x] Jaeger values configure 7-day retention (168h TTL)
- [x] All file exports properly barrel-exported from `packages/shared`

## Success Criteria Met

- [x] `initTracer()` creates OpenTelemetry SDK with OTLP exporter
- [x] Structured logger produces JSON with trace correlation fields
- [x] Jaeger all-in-one Helm values ready for deployment
- [x] `pnpm type-check` passes across all packages

## Self-Check: PASSED

**Created files exist:**
```bash
[FOUND] packages/shared/src/telemetry/tracer.ts
[FOUND] packages/shared/src/telemetry/index.ts
[FOUND] packages/shared/src/logger/index.ts
[FOUND] k8s/monitoring/jaeger-values.yaml
```

**Commits exist:**
```bash
[FOUND] 9a1a644 (Task 1: tracer and logger)
[FOUND] 637c1ba (Task 2: Jaeger Helm values)
```

**Key validations:**
- OpenTelemetry SDK initializes with resource attributes (service name, version)
- OTLP exporter points to configurable endpoint (defaults to localhost:4317)
- HTTP instrumentation enabled with health/metrics filtering
- Graceful degradation on SDK initialization failure
- Logger extracts trace_id/span_id from active span context
- Jaeger all-in-one mode enabled with Badger storage
- OTLP receivers on ports 4317 (gRPC) and 4318 (HTTP)
- 7-day trace retention configured

## Next Steps

1. **Deploy Jaeger to Kubernetes cluster:**
   ```bash
   helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
   helm install jaeger jaegertracing/jaeger \
     --namespace monitoring --create-namespace \
     --values k8s/monitoring/jaeger-values.yaml
   ```

2. **Initialize tracer in app entry points:**
   - Web app: Add `await initTracer('schedulebox-web')` before Next.js startup
   - Worker: Add `await initTracer('schedulebox-worker')` in worker entrypoint
   - AI service: Add `await initTracer('schedulebox-ai')` in FastAPI startup

3. **Configure environment variables in Kubernetes:**
   - Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger-collector.monitoring:4317`
   - Set `APP_VERSION` to release version for resource tagging
   - Set `LOG_LEVEL=info` (or `debug` for staging)

4. **Replace console.log with structured logger:**
   - Import `logInfo`, `logError` from `@schedulebox/shared`
   - Replace `console.log` → `logInfo(message, metadata)`
   - Replace `console.error` → `logError(message, metadata)`

5. **Verify distributed tracing:**
   - Port-forward Jaeger UI: `kubectl port-forward svc/jaeger-query 16686:16686 -n monitoring`
   - Open http://localhost:16686
   - Trigger a booking creation flow (spans across web → API → worker → notification)
   - Verify trace appears with all spans correlated
   - Verify logs include `trace_id` and `span_id` matching Jaeger traces

6. **Test graceful degradation:**
   - Stop Jaeger pod
   - Restart web app
   - Verify app starts successfully (tracer logs warning but doesn't crash)
   - Verify logs still output (without trace_id/span_id fields)

## Notes

- Tracer and logger are **passive modules** - they export functions but don't auto-initialize
- This design allows services to opt-in to tracing incrementally
- The `/api/metrics` endpoint from 15-02 and the tracer from this plan are independent observability layers (metrics vs traces)
- Prometheus metrics provide aggregate statistics (request count, latency percentiles)
- Jaeger traces provide request-level debugging (trace individual booking through system)
- Together they enable complete observability: metrics (what's happening) + traces (why it's happening)

---

**Plan execution time:** 1125 seconds (18 minutes 45 seconds)
**Tasks completed:** 2/2
**Commits:** 2 (9a1a644, 637c1ba)
**Files created:** 4
**Files modified:** 1
