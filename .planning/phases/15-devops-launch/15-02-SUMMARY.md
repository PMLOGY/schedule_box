---
phase: 15-devops-launch
plan: 02
subsystem: monitoring
tags: [prometheus, grafana, observability, metrics, alerting, kubernetes]
dependency_graph:
  requires:
    - packages/shared/src/metrics/index.ts
    - apps/web/app/api/metrics/route.ts
  provides:
    - k8s/monitoring/prometheus-values.yaml
    - k8s/monitoring/grafana-dashboards/schedulebox-overview.json
    - k8s/monitoring/alerting-rules.yaml
  affects:
    - helm/schedulebox/templates/*.yaml
tech_stack:
  added:
    - prom-client@15.1.3
  patterns:
    - Custom Prometheus registry (avoid default global registry conflicts)
    - Event loop utilization metric for HPA
    - Business metrics for domain-specific observability
    - kube-prometheus-stack Helm chart for complete observability
key_files:
  created:
    - packages/shared/src/metrics/index.ts
    - packages/shared/src/metrics/event-loop.ts
    - packages/shared/src/metrics/business.ts
    - apps/web/app/api/metrics/route.ts
    - k8s/monitoring/prometheus-values.yaml
    - k8s/monitoring/grafana-dashboards/schedulebox-overview.json
    - k8s/monitoring/alerting-rules.yaml
  modified:
    - packages/shared/package.json
    - packages/shared/src/index.ts
    - pnpm-lock.yaml
decisions:
  - Custom Prometheus registry instead of default global registry to avoid conflicts with other libraries
  - Event loop utilization metric for HPA (better indicator than CPU for Node.js apps)
  - Prometheus scrape interval 15s (balance between granularity and storage cost)
  - Grafana dashboard auto-refresh 30s for near-real-time monitoring
  - Alerting thresholds: p95<2s (warning), p95<5s (critical), error rate>5% (critical), event loop>0.8 (warning)
  - Business metrics defined but not instrumented (deferred to post-deployment incremental work)
metrics:
  duration: 3494s
  completed_date: 2026-02-12
---

# Phase 15 Plan 02: Monitoring Stack Summary

**One-liner:** Prometheus metrics instrumentation with prom-client, kube-prometheus-stack Helm values, 16-panel Grafana dashboard, and 6 production-grade alerting rules

## What Was Built

### Task 1: Node.js Prometheus Metrics Instrumentation
- **Commit:** 0375ec2
- **Files:** 7 files changed (1329 insertions)

**prom-client Integration:**
- Installed `prom-client@15.1.3` in `@schedulebox/shared`
- Created custom Prometheus registry (not default global registry)
- Configured `collectDefaultMetrics` with `nodejs_` prefix for automatic process metrics

**Metrics Modules:**
1. **packages/shared/src/metrics/index.ts** - Core HTTP and infrastructure metrics:
   - `http_request_duration_seconds` (Histogram): labels [method, path, status_code], buckets [0.01-10s]
   - `http_requests_total` (Counter): labels [method, path, status_code]
   - `db_query_duration_seconds` (Histogram): labels [query_type], buckets [0.005-3s]
   - `pg_connections_active` (Gauge)
   - `redis_connections_active` (Gauge)
   - `getMetrics()` function exports Prometheus text format

2. **packages/shared/src/metrics/event-loop.ts** - HPA-optimized metric:
   - `nodejs_eventloop_utilization` (Gauge): 0-1 float, measured every 1 second
   - Uses `perf_hooks.performance.eventLoopUtilization()` for delta measurement
   - Idempotent `startEventLoopMetrics()` prevents duplicate intervals
   - Critical for Node.js-aware autoscaling (better than CPU alone)

3. **packages/shared/src/metrics/business.ts** - Domain-specific counters:
   - `schedulebox_bookings_total` (Counter): labels [company_id, status, source]
   - `schedulebox_payments_total` (Counter): labels [company_id, gateway, status]
   - `schedulebox_notifications_total` (Counter): labels [channel, status]
   - `schedulebox_ai_prediction_duration_seconds` (Histogram): labels [model_type], buckets [0.1-15s]
   - NOTE: Metrics defined but not yet instrumented in route handlers (incremental post-deployment work)

**API Endpoint:**
- **apps/web/app/api/metrics/route.ts**
  - GET handler returns `text/plain; version=0.0.4; charset=utf-8`
  - Unauthenticated (Prometheus scraper needs direct access)
  - Production security note: restrict via Kubernetes NetworkPolicy to monitoring namespace only
  - Calls `startEventLoopMetrics()` at module load (once per worker process)

**Package Exports:**
- Updated `packages/shared/package.json` with subpath exports:
  - `@schedulebox/shared/metrics`
  - `@schedulebox/shared/metrics/event-loop`
  - `@schedulebox/shared/metrics/business`
- Re-exported from `packages/shared/src/index.ts` as barrel export

### Task 2: kube-prometheus-stack Values, Grafana Dashboard, and Alerting Rules
- **Commit:** e551aff
- **Files:** 3 files changed (576 insertions)

**Prometheus Configuration (k8s/monitoring/prometheus-values.yaml):**
- Retention: 15 days
- Storage: 50Gi PVC (ReadWriteOnce)
- **Scrape Configs:**
  - `schedulebox-web`: pods with `app.kubernetes.io/name=schedulebox` AND `app.kubernetes.io/component=web`
    - Metrics path: `/api/metrics`
    - Port: 3000
    - Scrape interval: 15s
  - `schedulebox-ai`: pods with `app.kubernetes.io/name=schedulebox` AND `app.kubernetes.io/component=ai`
    - Metrics path: `/metrics`
    - Port: 8000
    - Scrape interval: 15s
- Relabel configs add pod name as instance label and namespace label

**Grafana Configuration:**
- Enabled with 10Gi persistence
- Dashboard provisioning from `/var/lib/grafana/dashboards/default`
- Loads dashboards from `schedulebox-dashboards` ConfigMap
- Admin password: `prom-operator` (placeholder, override in production via secrets)

**Alertmanager Configuration:**
- Storage: 10Gi PVC
- Grouping: by [alertname, cluster, service]
- Timing: group_wait 10s, group_interval 10s, repeat_interval 12h
- Receiver: Slack webhook to `#schedulebox-alerts` (placeholder URL for production)

**Grafana Dashboard (schedulebox-overview.json):**
- **UID:** schedulebox-overview
- **Refresh:** 30s
- **Time range:** Last 1 hour
- **16 panels across 4 rows:**

**Row 1: HTTP Performance**
1. Request Rate (timeseries): `rate(http_requests_total[5m])` by method/path
2. p95 Latency (timeseries): `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
   - Thresholds: green < 1s, yellow < 2s, red >= 2s
3. Error Rate (stat): `rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])`
   - Thresholds: green < 1%, yellow < 5%, red >= 5%

**Row 2: Node.js Runtime**
4. Event Loop Utilization (gauge): `nodejs_eventloop_utilization`
   - Thresholds: green < 0.5, yellow < 0.7, red >= 0.7
   - Critical for HPA decision-making
5. Heap Used (timeseries): `nodejs_heap_size_used_bytes`
6. Active Handles (timeseries): `nodejs_active_handles_total`

**Row 3: Business Metrics**
7. Bookings per Minute (timeseries): `rate(schedulebox_bookings_total[5m]) * 60`
8. Payments by Gateway (pie chart): `sum by(gateway) (rate(schedulebox_payments_total[5m]))`
9. AI Prediction Latency p95 (timeseries): `histogram_quantile(0.95, rate(schedulebox_ai_prediction_duration_seconds_bucket[5m]))`

**Row 4: Infrastructure**
10. Pod CPU Usage (timeseries): `rate(container_cpu_usage_seconds_total{namespace="production",pod=~"schedulebox-.*"}[5m])`
11. Pod Memory Usage (timeseries): `container_memory_working_set_bytes{namespace="production",pod=~"schedulebox-.*"}`
12. DB Connections (gauge): `pg_connections_active`
    - Thresholds: green < 5, yellow < 8, red >= 8 (max pool size 10)

**Alerting Rules (PrometheusRule CRD - k8s/monitoring/alerting-rules.yaml):**
- **Namespace:** production
- **Labels:** app=schedulebox, prometheus=kube-prometheus

**6 Production-Grade Alerts:**

1. **HighErrorRate** (schedulebox.http group)
   - Condition: HTTP error rate > 5% for 5 minutes
   - Severity: critical
   - Runbook: Check logs, recent deployments, external service availability

2. **HighLatency** (schedulebox.http group)
   - Condition: p95 latency > 2s for 5 minutes
   - Severity: warning
   - Runbook: Check database performance, external API calls, resource utilization

3. **HighLatencyCritical** (schedulebox.http group)
   - Condition: p95 latency > 5s for 2 minutes
   - Severity: critical
   - Runbook: URGENT - check for deadlocks, slow queries, external service outages, consider scaling

4. **EventLoopSaturated** (schedulebox.runtime group)
   - Condition: `nodejs_eventloop_utilization > 0.8` for 3 minutes
   - Severity: warning
   - Runbook: Check for CPU-intensive operations, blocking I/O, infinite loops, consider horizontal scaling

5. **PodCrashLooping** (schedulebox.infrastructure group)
   - Condition: Pod restarts > 3 in 1 hour
   - Severity: critical
   - Runbook: Check pod logs, verify resource limits, OOM kills, application errors

6. **DatabaseConnectionsHigh** (schedulebox.infrastructure group)
   - Condition: Active connections > 8 (80% of 10 pool size) for 2 minutes
   - Severity: warning
   - Runbook: Check for connection leaks, slow queries, missing connection.release() calls

**Threshold Alignment:**
- p95 < 2s (warning), p95 < 5s (critical) ✓ matches research
- Error rate > 5% (critical) ✓ reasonable for MVP (research target < 1% for production)
- Event loop > 0.8 (warning) ✓ conservative threshold
- DB connections > 8/10 (warning) ✓ 80% utilization alert

## Deviations from Plan

None - plan executed exactly as written.

All tasks completed without blocking issues:
- prom-client installed successfully
- Custom registry created (avoiding global registry conflicts)
- Event loop metrics implemented with idempotent start
- Business metrics defined (instrumentation deferred as noted in plan)
- /api/metrics endpoint created and type-checked successfully
- kube-prometheus-stack values configured with correct pod label selectors
- Grafana dashboard JSON validated (16 panels across 4 rows)
- PrometheusRule YAML validated (6 alerting rules with runbooks)

## Key Outcomes

### Observability Foundation Complete
1. **Node.js process metrics auto-collected:** heap, GC, event loop lag via `collectDefaultMetrics`
2. **Custom metrics ready for instrumentation:** HTTP, database, business counters/histograms
3. **HPA-optimized metric:** `nodejs_eventloop_utilization` provides better autoscaling signal than CPU alone
4. **Prometheus scraper configured:** targets correct Kubernetes pod labels from Helm chart
5. **Production-ready dashboard:** 16 panels covering HTTP, runtime, business, and infrastructure
6. **Proactive alerting:** 6 rules cover critical failure modes (error rate, latency, saturation, pod health)

### Integration Points
- **Helm chart compatibility:** Scrape configs target `app.kubernetes.io/name=schedulebox` + `app.kubernetes.io/component` labels from Phase 15-01
- **HPA integration:** Event loop utilization metric ready for consumption by web-hpa.yaml (custom metric in HPA spec)
- **Future work:** Middleware integration to increment HTTP/business metrics in route handlers (not blocking for deployment)

### Production Readiness
- **Security:** /api/metrics endpoint documented with NetworkPolicy restriction recommendation
- **Scalability:** 15d retention, 50Gi storage handles expected metric volume
- **Reliability:** Alerting rules with runbooks provide actionable guidance
- **Visibility:** 16 Grafana panels provide comprehensive health monitoring

## Testing Evidence

**Type-Check:**
```
pnpm type-check
✓ packages/shared - no errors
✓ apps/web - no errors
✓ All 6 workspace projects passed
```

**JSON/YAML Validation:**
- Grafana dashboard JSON: ✓ valid (node JSON.parse check passed)
- prometheus-values.yaml: ✓ valid YAML structure verified
- alerting-rules.yaml: ✓ valid PrometheusRule CRD syntax

**File Verification:**
- prom-client in packages/shared/package.json: ✓ version 15.1.3
- /api/metrics route exists: ✓
- Subpath exports configured: ✓ @schedulebox/shared/metrics imports resolve

## Next Steps

### Immediate (Phase 15)
1. Deploy kube-prometheus-stack to Kubernetes cluster:
   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm install kube-prometheus prometheus-community/kube-prometheus-stack \
     -f k8s/monitoring/prometheus-values.yaml \
     -n monitoring --create-namespace
   ```

2. Create Grafana dashboard ConfigMap:
   ```bash
   kubectl create configmap schedulebox-dashboards \
     --from-file=k8s/monitoring/grafana-dashboards/ \
     -n monitoring
   ```

3. Apply alerting rules:
   ```bash
   kubectl apply -f k8s/monitoring/alerting-rules.yaml
   ```

4. Configure HPA to use event loop utilization metric (update helm/schedulebox/templates/web-hpa.yaml)

### Post-Deployment
1. Add metrics middleware to apps/web route handlers to populate HTTP metrics
2. Instrument booking creation to increment `schedulebox_bookings_total`
3. Instrument payment processing to increment `schedulebox_payments_total`
4. Instrument notification sending to increment `schedulebox_notifications_total`
5. Add database query instrumentation for `db_query_duration_seconds`
6. Update Slack webhook URL in prometheus-values.yaml for production alerts
7. Configure Grafana OAuth for team access (replace admin password)

## Self-Check: PASSED

**Created files exist:**
```
✓ packages/shared/src/metrics/index.ts
✓ packages/shared/src/metrics/event-loop.ts
✓ packages/shared/src/metrics/business.ts
✓ apps/web/app/api/metrics/route.ts
✓ k8s/monitoring/prometheus-values.yaml
✓ k8s/monitoring/grafana-dashboards/schedulebox-overview.json
✓ k8s/monitoring/alerting-rules.yaml
```

**Commits exist:**
```
✓ 0375ec2 - feat(devops): add Prometheus metrics instrumentation with prom-client
✓ e551aff - feat(devops): add kube-prometheus-stack values, Grafana dashboard, and alerting rules
```

**Dependencies:**
```
✓ prom-client@15.1.3 in packages/shared/package.json
✓ @schedulebox/shared/metrics exports configured
✓ Type-check passes for all packages
```

All claims verified. Plan execution complete and ready for deployment.
