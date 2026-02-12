# Phase 15: DevOps & Launch - Research

**Researched:** 2026-02-12
**Domain:** Kubernetes Production Deployment, Observability, Load Testing, Security Auditing
**Confidence:** MEDIUM-HIGH

## Summary

Phase 15 focuses on deploying ScheduleBox to production Kubernetes with comprehensive monitoring, load testing, security auditing, and beta testing. This is a multi-faceted deployment phase that transforms the Docker Compose development environment into a production-ready, observable, and scalable Kubernetes cluster.

The research reveals that the 2026 DevOps landscape has matured around several dominant standards: **kube-prometheus-stack** for monitoring (Prometheus + Grafana), **OpenTelemetry + Jaeger v2** for distributed tracing, **k6** for load testing, **OWASP ZAP Docker** for security scanning, and **Helm charts** for Kubernetes package management. Node.js-specific considerations include DNS caching issues and event loop-aware autoscaling rather than traditional CPU-based metrics.

The project's existing infrastructure (Docker Compose with PostgreSQL 16, Redis 7, RabbitMQ 3.13, GitHub Actions CI/CD with Trivy scanning) provides a solid foundation. The documentation (lines 7154-7683) already defines a clear deployment strategy with Blue/Green deployments, comprehensive monitoring metrics, and structured logging.

**Primary recommendation:** Use Helm charts with kube-prometheus-stack for the complete observability stack, implement Node.js event loop metrics for HPA, run distributed k6 tests from Kubernetes, integrate OWASP ZAP into the existing GitHub Actions pipeline, and establish a structured beta program with 3-5 Czech/Slovak SMBs using NPS/feedback collection tools.

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Kubernetes | 1.32-1.34 | Container orchestration | Industry standard for production microservices |
| Helm | 3.x | Package management | De facto standard for Kubernetes deployments in 2026 |
| kube-prometheus-stack | v0.16.0+ (55.0+) | Monitoring & alerting | Official CNCF monitoring solution, includes Prometheus Operator + Grafana |
| Prometheus | 2.x | Metrics collection | Industry standard time-series database |
| Grafana | Latest | Visualization & dashboards | Standard observability platform, integrates with Prometheus |
| Jaeger | v2.15+ | Distributed tracing | CNCF graduated project, OpenTelemetry-native |
| OpenTelemetry | Latest | Instrumentation standard | 2026 de facto standard for observability data |
| k6 | Latest | Load testing | Modern, developer-friendly load testing (Grafana Labs) |
| OWASP ZAP | Latest (Docker) | Security scanning | Industry standard DAST tool |
| Sentry | Latest | Error tracking | Leading error monitoring for Node.js |

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|------------|---------|---------|------------|
| Terraform | 1.x | Infrastructure as Code | Provision Kubernetes clusters, manage infrastructure |
| Bitnami Helm Charts | Latest | PostgreSQL, Redis, RabbitMQ | Production-ready charts for stateful services |
| KEDA | 2.x | Event-driven autoscaling | Advanced autoscaling beyond CPU/memory (optional) |
| Loki | Latest | Log aggregation | Lightweight alternative to ELK stack |
| Node Exporter | Latest | Node metrics | Included in kube-prometheus-stack |
| kube-state-metrics | Latest | Kubernetes object metrics | Included in kube-prometheus-stack |
| Metrics Server | Latest | HPA resource metrics | Required for basic HPA functionality |
| Trivy | Latest | Container security scanning | Already in CI/CD, continue using |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|-----------|-----------|----------|
| kube-prometheus-stack | Datadog/New Relic | Commercial APM has better UI but costs $$, vendor lock-in |
| Jaeger | Zipkin | Zipkin is older, less actively developed, no v2 OpenTelemetry-native version |
| k6 | JMeter/Gatling | JMeter is heavyweight GUI tool, k6 is code-first and cloud-native |
| Helm | Kustomize | Kustomize is lower-level, Helm has package ecosystem and templating |
| OpenTelemetry | Proprietary SDKs | OpenTelemetry is vendor-neutral, future-proof standard |

**Installation:**

```bash
# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update

# k6 (for load testing)
# Download from https://k6.io or use Docker

# OWASP ZAP (Docker)
docker pull zaproxy/zap-stable:latest

# Terraform (for IaC)
# Install from https://www.terraform.io/downloads
```

## Architecture Patterns

### Recommended Project Structure

```
schedulebox/
├── k8s/
│   ├── base/                          # Kubernetes base manifests
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   └── secrets.yaml
│   ├── apps/                          # Application deployments
│   │   ├── web/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── hpa.yaml
│   │   │   └── ingress.yaml
│   │   ├── ai-service/
│   │   └── notification-worker/
│   ├── stateful/                      # Stateful services
│   │   ├── postgres-values.yaml       # Bitnami Helm values
│   │   ├── redis-values.yaml
│   │   └── rabbitmq-values.yaml
│   └── monitoring/                    # Observability stack
│       ├── prometheus-values.yaml
│       └── jaeger-values.yaml
├── terraform/
│   ├── main.tf                        # Kubernetes cluster provisioning
│   ├── variables.tf
│   └── modules/
│       ├── kubernetes/
│       └── networking/
├── helm/
│   └── schedulebox/                   # Custom Helm chart
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-staging.yaml
│       ├── values-production.yaml
│       └── templates/
├── load-tests/
│   ├── scenarios/
│   │   ├── booking-flow.js            # k6 test scripts
│   │   ├── api-load.js
│   │   └── spike-test.js
│   └── k6-config.yaml
├── security/
│   └── zap/
│       ├── zap-baseline.yaml          # OWASP ZAP configs
│       └── zap-api-scan.yaml
└── .github/workflows/
    ├── ci.yml                         # Existing
    ├── deploy-staging.yml
    ├── deploy-production.yml
    └── load-test.yml
```

### Pattern 1: Helm-Based Deployment with GitOps

**What:** Use Helm charts for all Kubernetes deployments, with environment-specific values files. Store Helm values in Git and apply via CI/CD pipeline.

**When to use:** Production Kubernetes deployments where repeatability, versioning, and rollback are critical.

**Example:**

```yaml
# helm/schedulebox/values-production.yaml
replicaCount: 3

image:
  repository: ghcr.io/[org]/schedulebox
  tag: "{{ .Values.imageTag }}" # Injected from CI/CD
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: app.schedulebox.cz
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: schedulebox-tls
      hosts:
        - app.schedulebox.cz

resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

env:
  - name: NODE_ENV
    value: production
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: schedulebox-secrets
        key: database-url

healthCheck:
  liveness:
    path: /health
    initialDelaySeconds: 30
    periodSeconds: 10
  readiness:
    path: /readiness
    initialDelaySeconds: 5
    periodSeconds: 5
```

**Deploy command:**

```bash
helm upgrade --install schedulebox ./helm/schedulebox \
  --namespace production \
  --values helm/schedulebox/values-production.yaml \
  --set imageTag=$GITHUB_SHA \
  --wait --timeout 5m
```

### Pattern 2: kube-prometheus-stack Installation

**What:** Deploy complete monitoring stack (Prometheus + Grafana + Alertmanager + exporters) via single Helm chart.

**When to use:** Production clusters requiring comprehensive monitoring and alerting.

**Example:**

```bash
# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values k8s/monitoring/prometheus-values.yaml
```

**prometheus-values.yaml:**

```yaml
# k8s/monitoring/prometheus-values.yaml
prometheus:
  prometheusSpec:
    retention: 15d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    additionalScrapeConfigs:
      - job_name: 'schedulebox-web'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - production
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            regex: schedulebox-web
            action: keep

grafana:
  enabled: true
  adminPassword: "{{ .Values.grafanaPassword }}"
  persistence:
    enabled: true
    size: 10Gi
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
        - name: 'default'
          orgId: 1
          folder: 'ScheduleBox'
          type: file
          disableDeletion: false
          options:
            path: /var/lib/grafana/dashboards/default

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
  config:
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'slack'
    receivers:
      - name: 'slack'
        slack_configs:
          - api_url: '{{ .Values.slackWebhookUrl }}'
            channel: '#alerts'
            title: 'ScheduleBox Alert'
```

### Pattern 3: OpenTelemetry + Jaeger Distributed Tracing

**What:** Instrument Node.js services with OpenTelemetry SDK, export traces to Jaeger via OTLP.

**When to use:** Microservices architecture where request flow spans multiple services.

**Example:**

```typescript
// packages/shared/src/telemetry/tracer.ts
// Source: OpenTelemetry Node.js documentation
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4317',
});

export const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'schedulebox-web',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
  }),
  traceExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});

// Initialize in app entry point
sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

**Jaeger deployment:**

```bash
helm install jaeger jaegertracing/jaeger \
  --namespace monitoring \
  --set provisionDataStore.cassandra=false \
  --set allInOne.enabled=true \
  --set storage.type=badger \
  --set allInOne.ingress.enabled=true
```

### Pattern 4: Node.js Event Loop Metrics for HPA

**What:** Export event loop utilization (ELU) metrics to Prometheus and use for custom HPA autoscaling.

**When to use:** Node.js services where CPU doesn't accurately reflect load (event loop blocking is the bottleneck).

**Example:**

```typescript
// packages/shared/src/metrics/event-loop.ts
// Source: NearForm research on Node.js HPA
import { performance } from 'perf_hooks';
import { Registry, Gauge } from 'prom-client';

const register = new Registry();

const eventLoopUtilizationGauge = new Gauge({
  name: 'nodejs_eventloop_utilization',
  help: 'Event loop utilization (0-1)',
  registers: [register],
});

let lastELU = performance.eventLoopUtilization();

setInterval(() => {
  const currentELU = performance.eventLoopUtilization();
  const utilization = performance.eventLoopUtilization(currentELU, lastELU);
  eventLoopUtilizationGauge.set(utilization.utilization);
  lastELU = currentELU;
}, 1000);

export { register };
```

**HPA with custom metrics:**

```yaml
# k8s/apps/web/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: schedulebox-web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: schedulebox-web
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Pods
      pods:
        metric:
          name: nodejs_eventloop_utilization
        target:
          type: AverageValue
          averageValue: "0.6" # Scale when ELU > 60%
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300 # 5 min cooldown
```

### Pattern 5: k6 Load Testing Strategy

**What:** Define load test scenarios as JavaScript code, run distributed tests via k6 Operator on Kubernetes.

**When to use:** Pre-production load testing to validate performance under 1000+ concurrent users.

**Example:**

```javascript
// load-tests/scenarios/booking-flow.js
// Source: k6 official documentation
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load test data (credentials, etc.)
const users = new SharedArray('users', function () {
  return JSON.parse(open('./fixtures/users.json'));
});

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 1000 },  // Ramp up to 1000 users
    { duration: '10m', target: 1000 }, // Stay at 1000 for 10 min
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95th percentile < 2s
    http_req_failed: ['rate<0.05'], // Error rate < 5%
  },
};

export default function () {
  const user = users[__VU % users.length];

  // 1. Get available slots
  const availabilityRes = http.get(
    `${__ENV.BASE_URL}/api/v1/availability?service_id=1&date=2026-02-15`,
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(availabilityRes, {
    'availability loaded': (r) => r.status === 200,
    'has slots': (r) => JSON.parse(r.body).length > 0,
  });

  sleep(1);

  // 2. Create booking
  const bookingPayload = JSON.stringify({
    service_id: 1,
    start_time: '2026-02-15T14:00:00Z',
    customer_name: user.name,
    customer_email: user.email,
    customer_phone: user.phone,
  });

  const bookingRes = http.post(
    `${__ENV.BASE_URL}/api/v1/bookings`,
    bookingPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(bookingRes, {
    'booking created': (r) => r.status === 201,
    'booking has ID': (r) => JSON.parse(r.body).id > 0,
  });

  sleep(2);
}
```

**Run test:**

```bash
# Local run
k6 run --env BASE_URL=https://staging.schedulebox.cz load-tests/scenarios/booking-flow.js

# Distributed run via k6 Operator (Kubernetes)
kubectl apply -f load-tests/k6-job.yaml
```

### Pattern 6: OWASP ZAP Security Scanning in CI/CD

**What:** Run automated DAST scans using OWASP ZAP Docker images in GitHub Actions.

**When to use:** Every deployment to staging/production to catch security vulnerabilities.

**Example:**

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * 1' # Weekly Monday 2am

jobs:
  zap-baseline:
    name: OWASP ZAP Baseline Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'https://staging.schedulebox.cz'
          rules_file_name: 'security/zap/zap-baseline.yaml'
          cmd_options: '-a'
          fail_action: true

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: zap-baseline-report
          path: report_html.html

  zap-api-scan:
    name: OWASP ZAP API Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: ZAP API Scan
        uses: zaproxy/action-api-scan@v0.8.0
        with:
          target: 'https://staging.schedulebox.cz/api/v1/openapi.json'
          rules_file_name: 'security/zap/zap-api-scan.yaml'
          cmd_options: '-a'
          fail_action: true

      - name: Upload ZAP API Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: zap-api-report
          path: report_html.html
```

### Anti-Patterns to Avoid

- **CPU-only HPA for Node.js:** CPU doesn't reflect Node.js load; use event loop utilization metrics.
- **No DNS caching:** Node.js doesn't cache DNS by default, causing service mesh DNS overload under high traffic.
- **Monolithic Helm chart:** Don't put all services in one chart; separate stateful (PostgreSQL, Redis) from stateless (app services).
- **Secrets in Helm values:** Never commit secrets to Git; use external secret management (Sealed Secrets, External Secrets Operator, or Vault).
- **No resource limits:** Leads to OOMKilled pods and node failures; always set requests and limits.
- **Ignoring readiness probes:** Leads to traffic sent to unready pods; implement distinct liveness and readiness checks.
- **Manual kubectl apply:** Use Helm or GitOps tools (ArgoCD/Flux) for repeatable, versioned deployments.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|------------|-------------|-----|
| Metrics collection | Custom metrics aggregation service | Prometheus + kube-prometheus-stack | Battle-tested, handles high cardinality, integrates with Kubernetes |
| Distributed tracing | Custom correlation ID tracking | OpenTelemetry + Jaeger | Vendor-neutral standard, automatic instrumentation, cross-service propagation |
| Kubernetes package management | Bash scripts with kubectl | Helm charts | Versioning, rollback, templating, ecosystem of community charts |
| Load testing | Custom Python/Node.js scripts | k6 | Modern API, JavaScript DSL, distributed execution, cloud integration |
| Security scanning | Manual OWASP testing | OWASP ZAP Docker automation | Automated DAST, CI/CD integration, comprehensive reporting |
| Secret management | Environment variables in Deployments | Kubernetes Secrets + External Secrets Operator | Encrypted at rest, RBAC, integrates with Vault/AWS Secrets Manager |
| Autoscaling | Manual pod scaling | Horizontal Pod Autoscaler (HPA) | Native Kubernetes, custom metrics support, proven algorithm |
| Blue/Green deployments | Custom deployment scripts | Helm hooks + readiness probes | Atomic rollout, automatic rollback on failure |

**Key insight:** Kubernetes and cloud-native ecosystem solved these problems at scale. Custom solutions lack edge case handling (DNS caching, metric cardinality explosion, secret rotation, distributed trace sampling) and create maintenance burden.

## Common Pitfalls

### Pitfall 1: DNS Resolution Overload in Node.js

**What goes wrong:** Under high traffic, Kubernetes DNS resolver (CoreDNS) becomes bottleneck. Node.js makes fresh DNS lookup for every HTTP request between microservices, causing 5xx errors and latency spikes.

**Why it happens:** Node.js doesn't cache DNS lookups by default, unlike Java/Go. Every `http.request()` triggers new DNS resolution.

**How to avoid:**
1. Enable local DNS cache on Kubernetes nodes (NodeLocal DNSCache)
2. Use connection pooling with `keepAlive: true` in Node.js HTTP agents
3. Configure DNS TTL caching in Node.js:

```javascript
// packages/shared/src/http/client.ts
import http from 'http';
import https from 'https';
import dns from 'dns';

// Cache DNS lookups
dns.setDefaultResultOrder('ipv4first');
const dnsCacheTTL = 60000; // 60 seconds
const lookup = dns.lookup;
const cache = new Map();

dns.lookup = (hostname, options, callback) => {
  const key = `${hostname}:${JSON.stringify(options)}`;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < dnsCacheTTL) {
    return callback(null, cached.address, cached.family);
  }

  lookup(hostname, options, (err, address, family) => {
    if (!err) {
      cache.set(key, { address, family, timestamp: Date.now() });
    }
    callback(err, address, family);
  });
};

// HTTP agent with connection pooling
export const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
});
```

**Warning signs:** High DNS query rate in CoreDNS metrics, 5xx spike during load tests, `ENOTFOUND` errors in logs.

### Pitfall 2: Insufficient Load Test Resource Allocation

**What goes wrong:** k6 load generator consumes 100% CPU, throttling tests and inflating response time metrics. Test shows 5s p99 latency but production handles same load with 1s p99.

**Why it happens:** Each k6 VU consumes 1-5MB RAM and CPU cycles. 1000 VUs need 1-5GB RAM + significant CPU, but test runs on small CI runner.

**How to avoid:**
1. Size test machine: 1000 VUs → 8GB RAM, 4+ CPU cores, 20% idle CPU target
2. Use distributed k6 execution (k6 Operator on Kubernetes with multiple pods)
3. Monitor load generator metrics during tests:

```bash
# Run k6 with resource monitoring
k6 run --out prometheus=namespace=k6 \
  --summary-export=summary.json \
  scenarios/booking-flow.js
```

4. Calculate VU requirements before testing:

```javascript
// load-tests/calculate-vus.js
// Source: k6 documentation on concurrent users
const targetRPS = 100; // Requests per second
const avgIterationDuration = 3; // seconds (measured from trial run)
const requiredVUs = Math.ceil(targetRPS * avgIterationDuration);
console.log(`Required VUs: ${requiredVUs}`);
```

**Warning signs:** k6 reports 100% CPU in logs, test results inconsistent across runs, load generator network saturation (1Gbit/s limit).

### Pitfall 3: HPA Thrashing (Rapid Scale Up/Down)

**What goes wrong:** HPA scales pods up and down every 1-2 minutes, causing instability. Pods scale to 10, then back to 2, then to 8, continuously cycling.

**Why it happens:** Metric fluctuations cross the threshold frequently, no stabilization window, or tolerance too tight (default 10% may be too sensitive).

**How to avoid:**
1. Configure stabilization window to prevent rapid scale-down:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: schedulebox-web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: schedulebox-web
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0 # Scale up immediately
      policies:
        - type: Percent
          value: 100 # Double pods at once
          periodSeconds: 15
        - type: Pods
          value: 2
          periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300 # 5 min cooldown before scale down
      policies:
        - type: Percent
          value: 10 # Max 10% pods removed per interval
          periodSeconds: 60
```

2. Use percentile metrics (p95, p99) instead of average latency
3. Set realistic targets based on load testing (don't guess)

**Warning signs:** Frequent HPA events in `kubectl describe hpa`, pods constantly in `Pending` or `Terminating` state, logs show connection errors during scale events.

### Pitfall 4: Insufficient Readiness Probe Configuration

**What goes wrong:** Traffic sent to pods that haven't finished initialization (database connections not ready, cache not warmed). Results in 5xx errors during deployments.

**Why it happens:** Liveness and readiness probes are identical, or readiness probe doesn't check actual dependencies (just responds 200 without validating DB connection).

**How to avoid:**
1. Separate liveness and readiness probes:

```yaml
# k8s/apps/web/deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: schedulebox-web
          livenessProbe:
            httpGet:
              path: /health # Simple: "is process alive?"
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /readiness # Complex: "can I serve traffic?"
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 2
```

2. Implement comprehensive readiness endpoint:

```typescript
// apps/web/src/app/api/readiness/route.ts
import { NextResponse } from 'next/server';
import { db } from '@schedulebox/database';
import { redis } from '@schedulebox/shared/redis';

export async function GET() {
  try {
    // Check database connection
    await db.execute('SELECT 1');

    // Check Redis connection
    await redis.ping();

    // Check RabbitMQ (if critical)
    // await rabbitmq.checkConnection();

    return NextResponse.json({ status: 'ready' }, { status: 200 });
  } catch (error) {
    console.error('Readiness check failed:', error);
    return NextResponse.json(
      { status: 'not ready', error: error.message },
      { status: 503 }
    );
  }
}
```

**Warning signs:** 5xx errors during rolling deployments, "upstream connect error" in logs, successful deployment but immediate user-reported errors.

### Pitfall 5: Missing OWASP ZAP False Positive Configuration

**What goes wrong:** OWASP ZAP reports 50+ critical findings, but 90% are false positives for your SaaS application. CI/CD pipeline fails on every run, team ignores security reports.

**Why it happens:** Default ZAP rules are tuned for generic web apps, not API-first SaaS. False positives include CSP warnings for third-party widgets, CORS findings for public API endpoints.

**How to avoid:**
1. Create ZAP configuration file to ignore known false positives:

```yaml
# security/zap/zap-baseline.yaml
env:
  contexts:
    - name: ScheduleBox
      urls:
        - https://staging.schedulebox.cz
      includePaths:
        - https://staging.schedulebox.cz/api/v1/.*
      excludePaths:
        - https://staging.schedulebox.cz/widget/.* # Public widget, different CSP
      authentication:
        method: "scriptBasedAuthentication"
      users:
        - name: "test-user"
          credentials: "test@schedulebox.cz:password"

rules:
  # Ignore rules that don't apply
  - id: 10038 # Content Security Policy Header Not Set
    action: ignore
    reason: "Widget embedding requires relaxed CSP"

  - id: 10098 # Cross-Domain JavaScript Source File Inclusion
    action: ignore
    reason: "Using CDN for libraries (Cloudflare, Google Fonts)"

  - id: 10202 # Absence of Anti-CSRF Tokens
    threshold: medium # Lower severity for API-first design
    reason: "Using JWT in headers, not cookie-based sessions"
```

2. Establish baseline on first run, then fail on new findings only:

```yaml
# .github/workflows/security-scan.yml
- name: ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.12.0
  with:
    target: 'https://staging.schedulebox.cz'
    rules_file_name: 'security/zap/zap-baseline.yaml'
    cmd_options: '-a -j' # -j = compare with baseline
    fail_action: true
    artifact_name: 'zap-baseline'
```

**Warning signs:** ZAP reports never acted upon, security scan step always fails, developers add `continue-on-error: true` to bypass checks.

### Pitfall 6: Beta Tester Selection Bias

**What goes wrong:** Beta testers are all tech-savvy early adopters who tolerate bugs and complex UI. Launch to general market reveals usability issues that beta testing missed.

**Why it happens:** Beta recruitment targets users similar to the development team (tech-literate, patient), not representative of target SMB owners (busy, non-technical).

**How to avoid:**
1. Define beta tester personas matching target market:

| Persona | Profile | Why Important |
|---------|---------|---------------|
| Busy Salon Owner | 45-60 years old, non-technical, uses smartphone only | Tests mobile UX, validates onboarding simplicity |
| Tech-Savvy Fitness Studio | 30-40 years old, uses multiple SaaS tools | Finds integration issues, API feedback |
| Traditional Medical Practice | 50+ years old, desktop-first, security-conscious | Tests compliance features, validates trust signals |

2. Recruit 3-5 businesses per persona (9-15 total beta testers)
3. Structured feedback collection schedule:

```
Week 1: Onboarding & setup (collect feedback via call + survey)
Week 2: First bookings (in-app NPS survey after 5 bookings)
Week 3: Payment integration (survey after first payment)
Week 4: Full flow (video interview + comprehensive survey)
```

4. Use tools designed for beta feedback:
   - **Zonka Feedback** for event-based in-app NPS surveys
   - **Usersnap** for visual bug reporting (screenshot + annotation)
   - **Calendly** for scheduling feedback calls

**Warning signs:** All beta testers give 9-10 NPS scores (not realistic), no usability issues reported (they're being polite or don't represent market), feature requests are highly technical.

## Code Examples

Verified patterns from official sources:

### Prometheus Metrics Instrumentation (Node.js)

```typescript
// packages/shared/src/metrics/index.ts
// Source: prom-client documentation
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// Business metrics (per documentation lines 7625-7631)
export const bookingsTotalCounter = new Counter({
  name: 'schedulebox_bookings_total',
  help: 'Total number of bookings',
  labelNames: ['company_id', 'status', 'source'],
  registers: [register],
});

export const paymentsTotalCounter = new Counter({
  name: 'schedulebox_payments_total',
  help: 'Total number of payments',
  labelNames: ['company_id', 'gateway', 'status'],
  registers: [register],
});

// Performance metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3],
  registers: [register],
});

// Infrastructure metrics
export const pgConnectionsActive = new Gauge({
  name: 'pg_connections_active',
  help: 'Active PostgreSQL connections',
  registers: [register],
});

// Expose metrics endpoint
export function getMetrics(): Promise<string> {
  return register.metrics();
}
```

**Usage in API route:**

```typescript
// apps/web/src/app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { getMetrics } from '@schedulebox/shared/metrics';

export async function GET() {
  const metrics = await getMetrics();
  return new NextResponse(metrics, {
    headers: { 'Content-Type': 'text/plain; version=0.0.4' },
  });
}
```

### Terraform Kubernetes Cluster Provisioning

```hcl
# terraform/main.tf
# Source: Terraform Kubernetes provider documentation
terraform {
  required_version = ">= 1.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
  }

  backend "s3" {
    bucket = "schedulebox-terraform-state"
    key    = "production/kubernetes.tfstate"
    region = "us-east-1"
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

# Namespace
resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"
    labels = {
      environment = "production"
      app         = "schedulebox"
    }
  }
}

# Secrets (from external secret manager)
resource "kubernetes_secret" "schedulebox_secrets" {
  metadata {
    name      = "schedulebox-secrets"
    namespace = kubernetes_namespace.production.metadata[0].name
  }

  data = {
    database-url = var.database_url
    redis-url    = var.redis_url
    rabbitmq-url = var.rabbitmq_url
    jwt-secret   = var.jwt_secret
    sentry-dsn   = var.sentry_dsn
  }

  type = "Opaque"
}

# ConfigMap
resource "kubernetes_config_map" "schedulebox_config" {
  metadata {
    name      = "schedulebox-config"
    namespace = kubernetes_namespace.production.metadata[0].name
  }

  data = {
    NODE_ENV    = "production"
    LOG_LEVEL   = "info"
    LOG_FORMAT  = "json"
    APP_URL     = "https://app.schedulebox.cz"
    API_URL     = "https://api.schedulebox.cz"
  }
}

# Horizontal Pod Autoscaler
resource "kubernetes_horizontal_pod_autoscaler_v2" "schedulebox_web_hpa" {
  metadata {
    name      = "schedulebox-web-hpa"
    namespace = kubernetes_namespace.production.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "schedulebox-web"
    }

    min_replicas = 2
    max_replicas = 10

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }

    behavior {
      scale_down {
        stabilization_window_seconds = 300
        policy {
          type           = "Percent"
          value          = 10
          period_seconds = 60
        }
      }
    }
  }
}
```

### Structured Logging with Trace Context

```typescript
// packages/shared/src/logger/index.ts
// Source: OpenTelemetry Node.js documentation + project docs line 7666
import winston from 'winston';
import { trace, context } from '@opentelemetry/api';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'schedulebox',
  },
  transports: [
    new winston.transports.Console(),
  ],
});

// Add trace context to all logs
export function log(level: string, message: string, meta: Record<string, any> = {}) {
  const span = trace.getSpan(context.active());
  const spanContext = span?.spanContext();

  logger.log(level, message, {
    ...meta,
    trace_id: spanContext?.traceId,
    span_id: spanContext?.spanId,
  });
}

export const logInfo = (message: string, meta?: Record<string, any>) => log('info', message, meta);
export const logError = (message: string, meta?: Record<string, any>) => log('error', message, meta);
export const logWarn = (message: string, meta?: Record<string, any>) => log('warn', message, meta);
```

**Example structured log output (per docs line 7666):**

```json
{
  "timestamp": "2026-02-12T14:30:00.123Z",
  "level": "info",
  "service": "booking-service",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "company_id": 42,
  "user_id": 123,
  "message": "Booking created successfully",
  "booking_id": 12345,
  "duration_ms": 45,
  "method": "POST",
  "path": "/api/v1/bookings",
  "status_code": 201
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|-------------|-----------------|--------------|--------|
| Jaeger native exporters | OpenTelemetry OTLP exporters | Jaeger v1.35 (2022) → v2 (2024) | Vendor-neutral instrumentation, easier to switch backends |
| CPU-based HPA | Event loop utilization HPA for Node.js | 2024-2025 research | More accurate autoscaling for event-driven runtimes |
| Helm 2 (Tiller) | Helm 3 (Tillerless) | 2019 | Removed security risk, simplified architecture |
| ELK stack (Elasticsearch) | Loki (Grafana Labs) | 2020-2023 | Cost-effective log aggregation, simpler ops |
| Manual kubectl | GitOps (ArgoCD/Flux) | 2020-2024 | Declarative deployments, audit trail, easier rollbacks |
| Vertical Pod Autoscaler (VPA) | HPA with custom metrics | 2023-2025 | Horizontal scaling more cloud-native than resizing pods |
| JMeter/Gatling | k6 | 2021-2024 | JavaScript DSL, cloud-native, better CI/CD integration |

**Deprecated/outdated:**

- **Helm 2 with Tiller:** Security vulnerability (Tiller had cluster-admin), removed in Helm 3 (2019)
- **Prometheus Operator (standalone):** Superseded by kube-prometheus-stack (comprehensive bundle)
- **Jaeger all-in-one with in-memory storage:** Not for production; use persistent storage (Cassandra/ClickHouse/Badger)
- **OWASP ZAP Jenkins plugin:** Deprecated; use Docker images in CI/CD instead
- **Custom OpenTracing instrumentation:** Deprecated in favor of OpenTelemetry (unified standard)

## Open Questions

1. **Kubernetes cluster hosting decision**
   - What we know: Documentation mentions EKS/GKE for production (line 7166), but no decision locked in CONTEXT.md
   - What's unclear: Budget constraints, team expertise with AWS vs GCP, Czech/EU data residency requirements
   - Recommendation:
     - **Option A (AWS EKS):** Better RDS managed PostgreSQL, EU (Frankfurt) region available, more mature ecosystem
     - **Option B (GCP GKE):** Simpler Kubernetes experience, better networking, Cloud SQL
     - **Option C (Hetzner Cloud + K3s):** Cost-effective for Czech market, EU data residency, requires more ops expertise
   - Decision needed before Terraform infrastructure code

2. **Managed vs self-hosted stateful services**
   - What we know: Current Docker Compose uses self-hosted PostgreSQL 16, Redis 7, RabbitMQ 3.13
   - What's unclear: Whether to continue self-hosting on Kubernetes (via Bitnami Helm charts) or use managed services (RDS, ElastiCache, Amazon MQ)
   - Recommendation:
     - **Production:** Managed services (less ops burden, automatic backups, easier scaling)
     - **Staging:** Self-hosted on K8s (cost savings, parity with local dev)
   - Tradeoff: Managed services cost 2-3x more but save significant ops time

3. **Beta testing recruitment strategy**
   - What we know: Need 3+ real businesses for beta testing (success criteria)
   - What's unclear: How to recruit, incentive structure, NDA requirements, support commitment
   - Recommendation:
     - Recruit via: LinkedIn outreach to Czech/Slovak SMB owners, local business Facebook groups, direct outreach to salon/fitness networks
     - Incentive: 6 months free Growth tier (worth 8,940 Kč), priority feature requests
     - Support: Dedicated Slack channel, weekly check-in calls, 4-hour SLA for bug fixes
     - Screening: Must have 5+ employees, currently using booking system (competitor or manual), willing to commit 4 weeks
   - Success metric: 2+ beta testers convert to paid tier after 6-month free period

4. **Observability data retention and costs**
   - What we know: Prometheus retention set to 15d in example config
   - What's unclear: Long-term metrics storage strategy, trace sampling rate, log retention policy, budget for observability storage
   - Recommendation:
     - **Metrics:** 15d in Prometheus, 13 months in Thanos/Cortex (long-term storage) or Grafana Cloud
     - **Traces:** 100% sampling in staging, 10% sampling in production (adjust based on traffic), 7d retention
     - **Logs:** 30d in Loki, 12 months in S3/R2 (compressed, for compliance)
   - Estimated cost: ~$200-500/month for 10 services at moderate traffic

5. **Load test success criteria specifics**
   - What we know: Target 1000 concurrent users without degradation (success criteria)
   - What's unclear: Define "degradation" thresholds, which endpoints to test, test data volume needed
   - Recommendation:
     - **Degradation thresholds:**
       - p95 latency < 2s (per documentation pattern)
       - p99 latency < 5s
       - Error rate < 1% (tighter than 5% for production)
       - No resource exhaustion (CPU < 80%, memory < 80%, DB connections < 80% pool)
     - **Test scenarios:**
       1. Booking flow (create booking): 60% of traffic
       2. Availability lookup: 30% of traffic
       3. Admin dashboard: 10% of traffic
     - **Test data:** Pre-seed 100 companies, 500 services, 50 employees, 1000 historical bookings
   - Run test 3 times, all passes required

## Sources

### Primary (HIGH confidence)

- [Kubernetes HPA Official Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) - HPA configuration, metrics types, scaling algorithm
- [k6 Running Large Tests Documentation](https://grafana.com/docs/k6/latest/testing-guides/running-large-tests/) - Resource requirements, optimization for 1000+ VUs
- [Jaeger Official Site](https://www.jaegertracing.io/) - v2.15 current version, OpenTelemetry relationship, ClickHouse storage backend
- [kube-prometheus GitHub](https://github.com/prometheus-operator/kube-prometheus) - v0.16.0, components included, production setup
- [OWASP ZAP Docker Documentation](https://www.zaproxy.org/docs/docker/about/) - Docker images, scan types, CI/CD integration
- [Helm Official Best Practices](https://helm.sh/docs/chart_best_practices/) - Chart structure, templating guidelines

### Secondary (MEDIUM confidence)

- [Running Microservices on Kubernetes: Best Practices (2026)](https://atmosly.com/blog/running-microservices-on-kubernetes-best-practices-2025) - Node.js DNS caching issue, event loop autoscaling
- [Deploying Prometheus and Grafana with Helm (2026)](https://oneuptime.com/blog/post/2026-01-17-helm-prometheus-grafana-deployment/view) - kube-prometheus-stack Helm deployment
- [OpenTelemetry and Jaeger 2026 Guide](https://signoz.io/blog/opentelemetry-vs-jaeger/) - Current state, OpenTelemetry as industry standard
- [Distributed Tracing in Node.js with Jaeger & OpenTelemetry](https://medium.com/@bhagyarana80/distributed-tracing-in-node-js-with-jaeger-opentelemetry-cd9db795b065) - Node.js instrumentation patterns
- [k6 Load Testing Best Practices](https://grafana.com/docs/k6/latest/testing-guides/calculate-concurrent-users/) - VU calculation, memory estimation
- [OWASP ZAP CI/CD Integration 2026](https://www.devopstraininginstitute.com/blog/how-can-you-integrate-owasp-zap-into-a-cicd-pipeline-for-automated-security) - GitHub Actions integration patterns
- [Event Loop Utilization with HPA (NearForm)](https://nearform.com/insights/event-loop-utilization-with-hpa/) - Node.js-specific HPA metrics
- [Terraform Kubernetes Best Practices 2026](https://www.tasrieit.com/guides/terraform-iac-guide) - IaC patterns, state management
- [Helm Charts Best Practices 2026](https://atmosly.com/knowledge/helm-chart-best-practices-what-every-devops-engineer-should-know) - Production-ready chart structure
- [Bitnami Production-Ready Helm Charts](https://techdocs.broadcom.com/us/en/vmware-tanzu/bitnami-secure-images/bitnami-secure-images/services/bsi-doc/apps-tutorials-production-ready-charts-index.html) - PostgreSQL, Redis, RabbitMQ deployment
- [SaaS Beta Testing Strategies 2026](https://www.zeepalm.com/blog/beta-testing-your-saas-strategies-for-success) - Recruitment, feedback collection
- [NPS Tools for SaaS 2026](https://www.zonkafeedback.com/blog/nps-tools-for-saas) - Zonka Feedback, Usersnap, Userpilot
- [Sentry for Microservices Monitoring 2026](https://blog.sentry.io/monitoring-microservices-distributed-systems-with-sentry/) - Error tracking, distributed systems

### Tertiary (LOW confidence - from project documentation)

- ScheduleBox Documentation (lines 7154-7683) - Deployment strategy, CI/CD pipeline, observability stack, metrics definitions
  - **Confidence note:** Project documentation is aspirational (implementation hasn't started), but provides clear requirements and architecture decisions

## Metadata

**Confidence breakdown:**

- **Standard stack: HIGH** - All tools verified from official documentation and 2026 sources. kube-prometheus-stack, OpenTelemetry, Jaeger v2, k6, OWASP ZAP, Helm are industry standards with strong documentation.
- **Architecture patterns: MEDIUM-HIGH** - Patterns verified from official docs (Kubernetes, Helm, k6, ZAP), but Node.js-specific patterns (DNS caching, event loop HPA) are from recent research papers and blog posts, not official Kubernetes docs.
- **Pitfalls: MEDIUM** - Common pitfalls documented across multiple 2026 sources, but some (DNS caching, beta tester bias) are based on community experience rather than official guidance.
- **Open questions: MEDIUM** - Questions are well-defined, but recommendations are based on industry norms, not project-specific validation.

**Research date:** 2026-02-12
**Valid until:** 2026-04-12 (60 days - DevOps ecosystem is relatively stable, but Kubernetes/Helm versions change quarterly)

**Research gaps:**
- No access to Context7 for library-specific API verification (would increase confidence to HIGH across all areas)
- Cloud provider pricing not verified (affects managed services recommendation)
- Czech/Slovak market beta recruitment channels not researched (would need local market knowledge)
- Long-term observability storage costs are estimates, not verified pricing

**Next steps for planner:**
1. Resolve Open Question #1 (Kubernetes hosting) - blocks Terraform infrastructure code
2. Resolve Open Question #2 (managed vs self-hosted) - affects deployment manifests
3. Resolve Open Question #4 (observability costs) - affects monitoring stack configuration
4. Resolve Open Question #5 (load test thresholds) - affects k6 test scripts and success validation
