# Deployment Runbook — ScheduleBox

This document provides step-by-step operational procedures for deploying ScheduleBox to Kubernetes clusters (staging and production).

## Prerequisites

Before deploying ScheduleBox, ensure you have:

- ✅ **kubectl** configured with cluster access (verify: `kubectl cluster-info`)
- ✅ **Helm 3.x** installed (verify: `helm version`)
- ✅ **Docker images** pushed to GitHub Container Registry (`ghcr.io/[org]/schedulebox`)
- ✅ **DNS records** configured for target domain (e.g., `app.schedulebox.cz`, `api.schedulebox.cz`)
- ✅ **TLS certificate** ready (via cert-manager or manual upload as Kubernetes secret)
- ✅ **GitHub Personal Access Token** (for pulling images from ghcr.io if repository is private)
- ✅ **Database credentials** (PostgreSQL connection string)
- ✅ **External service credentials** (Comgate, Twilio, SMTP, OpenAI API keys)

---

## Fresh Cluster Setup

Use this procedure when deploying to a brand new Kubernetes cluster (first-time setup).

### Step 1: Create Namespaces

```bash
kubectl create namespace schedulebox-staging
kubectl create namespace schedulebox-production
kubectl create namespace monitoring
```

Verify namespaces exist:
```bash
kubectl get namespaces | grep -E 'schedulebox|monitoring'
```

---

### Step 2: Add Helm Chart Repositories

Add Bitnami, Prometheus, and Jaeger repositories:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update
```

Verify repositories:
```bash
helm repo list
```

---

### Step 3: Deploy Stateful Services (Database Layer)

Deploy PostgreSQL, Redis, and RabbitMQ **in order** (each service must be healthy before proceeding).

#### 3a. Deploy PostgreSQL

```bash
helm install postgres bitnami/postgresql \
  --namespace schedulebox-production \
  --values k8s/stateful/postgres-values.yaml \
  --wait
```

**Wait for PostgreSQL to be ready:**
```bash
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql \
  --namespace schedulebox-production \
  --timeout=120s
```

Expected output: `pod/postgres-postgresql-0 condition met`

#### 3b. Deploy Redis

```bash
helm install redis bitnami/redis \
  --namespace schedulebox-production \
  --values k8s/stateful/redis-values.yaml \
  --wait
```

**Wait for Redis to be ready:**
```bash
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis \
  --namespace schedulebox-production \
  --timeout=120s
```

#### 3c. Deploy RabbitMQ

```bash
helm install rabbitmq bitnami/rabbitmq \
  --namespace schedulebox-production \
  --values k8s/stateful/rabbitmq-values.yaml \
  --wait
```

**Wait for RabbitMQ to be ready:**
```bash
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=rabbitmq \
  --namespace schedulebox-production \
  --timeout=120s
```

**Verify all stateful services are running:**
```bash
kubectl get pods -n schedulebox-production | grep -E 'postgres|redis|rabbitmq'
```

All pods should show `STATUS: Running` and `READY: 1/1`.

---

### Step 4: Create Application Secrets

Create Kubernetes secret with environment variables (see `env-vars-reference.md` for complete list).

**Option A: From `.env.production` file**

```bash
kubectl create secret generic schedulebox-secrets \
  --from-env-file=.env.production \
  --namespace schedulebox-production
```

**Option B: From individual values**

```bash
kubectl create secret generic schedulebox-secrets \
  --namespace schedulebox-production \
  --from-literal=DATABASE_URL='postgresql://user:pass@postgres-postgresql:5432/schedulebox' \
  --from-literal=REDIS_URL='redis://:password@redis-master:6379' \
  --from-literal=RABBITMQ_URL='amqp://user:pass@rabbitmq:5672' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  --from-literal=JWT_REFRESH_SECRET='your-refresh-secret' \
  --from-literal=COMGATE_API_KEY='your-comgate-key' \
  --from-literal=OPENAI_API_KEY='your-openai-key' \
  --from-literal=SMTP_USER='your-smtp-user' \
  --from-literal=SMTP_PASS='your-smtp-password' \
  --from-literal=TWILIO_AUTH_TOKEN='your-twilio-token'
```

**Verify secret created:**
```bash
kubectl get secret schedulebox-secrets -n schedulebox-production
```

---

### Step 5: Run Database Migrations

Run Drizzle migrations before deploying the application (ensures database schema is up-to-date).

```bash
kubectl run migrate \
  --image=ghcr.io/[org]/schedulebox:latest \
  --namespace schedulebox-production \
  --restart=Never \
  --env-from=secret/schedulebox-secrets \
  --command -- pnpm db:migrate
```

**Monitor migration progress:**
```bash
kubectl logs -f migrate -n schedulebox-production
```

Expected output: `Migrations applied successfully` (or similar success message).

**Clean up migration pod:**
```bash
kubectl delete pod migrate -n schedulebox-production
```

---

### Step 6: Deploy ScheduleBox Application

Deploy the main application using the Helm chart:

```bash
helm upgrade --install schedulebox ./helm/schedulebox \
  --namespace schedulebox-production \
  --values helm/schedulebox/values-production.yaml \
  --set web.image.tag=latest \
  --set ai.image.tag=latest \
  --set worker.image.tag=latest \
  --wait \
  --timeout 10m
```

**Monitor rollout:**
```bash
kubectl rollout status deployment/schedulebox-web -n schedulebox-production
kubectl rollout status deployment/schedulebox-ai -n schedulebox-production
kubectl rollout status deployment/schedulebox-worker -n schedulebox-production
```

Expected output: `deployment "schedulebox-web" successfully rolled out`

---

### Step 7: Deploy Monitoring Stack (Prometheus + Grafana)

Deploy Prometheus and Grafana for observability:

```bash
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values k8s/monitoring/prometheus-values.yaml \
  --wait
```

**Access Grafana:**
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

Then open `http://localhost:3000` (default credentials: `admin` / `prom-operator`).

---

### Step 8: Deploy Jaeger (Distributed Tracing)

Deploy Jaeger for OpenTelemetry trace collection:

```bash
helm install jaeger jaegertracing/jaeger \
  --namespace monitoring \
  --values k8s/monitoring/jaeger-values.yaml \
  --wait
```

**Access Jaeger UI:**
```bash
kubectl port-forward -n monitoring svc/jaeger-query 16686:16686
```

Then open `http://localhost:16686`.

---

### Step 9: Verify Deployment

Run these verification checks to ensure the system is healthy:

#### 9a. Check Pod Status
```bash
kubectl get pods -n schedulebox-production
```

All pods should be `Running` with `READY: 1/1` (or higher for replicas).

#### 9b. Check Service Endpoints
```bash
kubectl get svc -n schedulebox-production
```

Verify services have `CLUSTER-IP` and `PORT(S)` assigned.

#### 9c. Check Ingress (if using Ingress Controller)
```bash
kubectl get ingress -n schedulebox-production
```

Verify `HOSTS` column matches your domain (e.g., `app.schedulebox.cz`).

#### 9d. Test Health Endpoint
```bash
curl https://app.schedulebox.cz/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-12T16:30:00Z",
  "version": "1.0.0"
}
```

#### 9e. Test Readiness Endpoint
```bash
curl https://app.schedulebox.cz/readiness
```

Expected response:
```json
{
  "status": "ready",
  "checks": {
    "database": "connected",
    "redis": "connected",
    "rabbitmq": "connected"
  }
}
```

---

## Deploying a New Version

Use this procedure to deploy updated code to an existing cluster.

### For Staging (Automatic via CI/CD)

Staging deployments are **automatic** on every push to `main` branch via GitHub Actions workflow `.github/workflows/deploy-staging.yml`.

**Monitor deployment:**
```bash
kubectl rollout status deployment/schedulebox-web -n schedulebox-staging
```

---

### For Production (Manual Trigger)

Production deployments are **manual** and triggered via GitHub Actions workflow dispatch.

#### Step 1: Trigger Deployment Workflow

Go to GitHub Actions → `.github/workflows/deploy-production.yml` → **Run workflow**

**Required inputs:**
- `image_tag`: Docker image tag to deploy (e.g., `v1.2.3`, `sha-abc1234`, `latest`)

#### Step 2: Monitor Rollout

```bash
kubectl rollout status deployment/schedulebox-web -n schedulebox-production
```

Expected output: `deployment "schedulebox-web" successfully rolled out`

#### Step 3: Verify Health Endpoints

```bash
curl https://app.schedulebox.cz/health
curl https://app.schedulebox.cz/readiness
```

Both should return `200 OK` with healthy status.

#### Step 4: Check Grafana for Error Rate

Open Grafana dashboard → **ScheduleBox Overview** → Check **Error Rate** panel.

**Red flag:** Error rate spike > 5% in first 5 minutes after deployment → consider rollback.

---

## Rollback Procedures

Use these procedures if a deployment causes issues (high error rate, crashes, data corruption).

### Quick Rollback (Helm)

Rollback to the previous Helm release (reverts all resources):

```bash
helm rollback schedulebox -n schedulebox-production
```

This reverts to the **previous release** (release number N-1).

**Rollback to specific release:**
```bash
helm history schedulebox -n schedulebox-production
helm rollback schedulebox 5 -n schedulebox-production  # Rollback to release #5
```

**Verify rollback:**
```bash
kubectl rollout status deployment/schedulebox-web -n schedulebox-production
curl https://app.schedulebox.cz/health
```

---

### Emergency Rollback (Image Tag)

If Helm rollback is too slow, directly revert the Docker image tag:

```bash
kubectl set image deployment/schedulebox-web \
  web=ghcr.io/[org]/schedulebox:v1.2.2 \
  -n schedulebox-production
```

Replace `v1.2.2` with the **previous known-good image tag**.

**Monitor:**
```bash
kubectl rollout status deployment/schedulebox-web -n schedulebox-production
```

---

### Database Migration Rollback

**IMPORTANT:** Only rollback migrations if the migration was **destructive** (dropped columns, tables, or corrupted data).

**Non-destructive migrations** (added columns, indexes) can stay in place even if application code is rolled back.

#### Step 1: Identify Migration to Rollback

```bash
pnpm db:migrate:list  # Lists applied migrations
```

#### Step 2: Run Rollback Command

```bash
kubectl run migrate-down \
  --image=ghcr.io/[org]/schedulebox:{previous-tag} \
  --namespace schedulebox-production \
  --restart=Never \
  --env-from=secret/schedulebox-secrets \
  --command -- pnpm db:rollback
```

**Monitor:**
```bash
kubectl logs -f migrate-down -n schedulebox-production
```

#### Step 3: Verify Database State

Connect to PostgreSQL and verify schema:
```bash
kubectl exec -it postgres-postgresql-0 -n schedulebox-production -- psql -U schedulebox -d schedulebox
```

Run:
```sql
\dt  -- List tables
\d bookings  -- Describe bookings table schema
```

---

## Scaling

### Manual Scaling

Scale deployments to handle increased load:

**Web application (API + frontend):**
```bash
kubectl scale deployment/schedulebox-web --replicas=5 -n schedulebox-production
```

**AI service:**
```bash
kubectl scale deployment/schedulebox-ai --replicas=3 -n schedulebox-production
```

**Notification worker:**
```bash
kubectl scale deployment/schedulebox-worker --replicas=2 -n schedulebox-production
```

**Verify:**
```bash
kubectl get pods -n schedulebox-production
```

---

### Horizontal Pod Autoscaling (HPA)

HPA is **enabled by default** in production (see `helm/schedulebox/values-production.yaml`).

**Check HPA status:**
```bash
kubectl get hpa -n schedulebox-production
```

Expected output:
```
NAME               REFERENCE                   TARGETS         MINPODS   MAXPODS   REPLICAS
schedulebox-web    Deployment/schedulebox-web  45%/80%         2         10        3
```

**Explanation:**
- `TARGETS`: Current CPU usage / Target threshold
- `MINPODS`: Minimum replicas (always running)
- `MAXPODS`: Maximum replicas (scale limit)
- `REPLICAS`: Current number of running pods

**HPA will automatically scale** when CPU > 80% or Memory > 85%.

---

## Troubleshooting

### Pod in CrashLoopBackOff

**Symptom:** Pod restarts repeatedly, status shows `CrashLoopBackOff`.

**Diagnosis:**
```bash
kubectl logs deployment/schedulebox-web -n schedulebox-production --previous
```

The `--previous` flag shows logs from the crashed container (before restart).

**Common causes:**
- Database connection refused → Check `DATABASE_URL` in secret
- Missing environment variable → Check `kubectl describe secret schedulebox-secrets`
- Application crash on startup → Check logs for stack trace

---

### Pod Killed with OOMKilled

**Symptom:** Pod status shows `OOMKilled` (Out Of Memory).

**Diagnosis:**
```bash
kubectl describe pod schedulebox-web-{pod-id} -n schedulebox-production
```

Look for: `Last State: Terminated, Reason: OOMKilled`

**Fix:** Increase memory limits in `values-production.yaml`:

```yaml
web:
  resources:
    limits:
      memory: 1Gi  # Increase from 512Mi to 1Gi
```

Then redeploy:
```bash
helm upgrade schedulebox ./helm/schedulebox \
  --namespace schedulebox-production \
  --values helm/schedulebox/values-production.yaml
```

---

### DNS Resolution Issues

**Symptom:** Services cannot resolve each other (e.g., `app` cannot reach `postgres-postgresql`).

**Diagnosis:**
```bash
kubectl get pods -n kube-system | grep coredns
```

Verify CoreDNS pods are running.

**Fix:** Restart CoreDNS:
```bash
kubectl rollout restart deployment/coredns -n kube-system
```

**Alternative:** Enable NodeLocal DNSCache for faster DNS resolution (advanced, see Kubernetes docs).

---

### Slow Database Queries

**Symptom:** API response times > 2 seconds, Grafana shows high `pg_query_duration`.

**Diagnosis:** Check active connections in Grafana:
```
pg_connections_active{namespace="schedulebox-production"}
```

If connections are maxed out (e.g., 100/100), increase pool size.

**Fix:** Update `DATABASE_URL` connection string:
```
postgresql://user:pass@postgres:5432/schedulebox?pool_size=20&max_overflow=10
```

Or increase PostgreSQL `max_connections` in `k8s/stateful/postgres-values.yaml`:
```yaml
primary:
  configuration: |
    max_connections = 200
```

---

### Connection Refused to Stateful Services

**Symptom:** Application logs show `ECONNREFUSED` or `Connection refused` to PostgreSQL/Redis/RabbitMQ.

**Diagnosis:** Check service endpoints:
```bash
kubectl get endpoints -n schedulebox-production
```

Verify each service has `ENDPOINTS` IP addresses listed (not empty).

**Common causes:**
- Pods not ready → Check `kubectl get pods`
- Service selector mismatch → Check `kubectl describe svc postgres-postgresql`
- Network policy blocking traffic → Check `kubectl get networkpolicies`

---

## Environment-Specific Notes

### Staging Environment

- **Namespace:** `schedulebox-staging`
- **Domain:** `staging.schedulebox.cz`
- **Auto-deploy:** Enabled on `main` branch push
- **Replicas:** 1 web, 1 ai, 1 worker (no HPA)
- **Monitoring:** Enabled (shared monitoring namespace)
- **Database:** Separate PostgreSQL instance (not production data)

### Production Environment

- **Namespace:** `schedulebox-production`
- **Domain:** `app.schedulebox.cz`
- **Auto-deploy:** Disabled (manual trigger only)
- **Replicas:** 2-10 web (HPA), 2-5 ai (HPA), 2 worker
- **Monitoring:** Full Prometheus + Grafana + Jaeger stack
- **Database:** High-availability PostgreSQL with backups enabled

---

## Post-Deployment Checklist

After every deployment (staging or production), verify:

- [ ] All pods are `Running` with `READY: 1/1`
- [ ] Health endpoint returns `200 OK`
- [ ] Readiness endpoint shows all services `connected`
- [ ] Grafana shows no error rate spike (< 1% for 5 minutes)
- [ ] At least one test booking created successfully (manual smoke test)
- [ ] Logs show no critical errors (`kubectl logs deployment/schedulebox-web | grep ERROR`)
- [ ] Sentry shows no new error spikes (if Sentry is configured)

---

## Useful Commands Cheat Sheet

```bash
# View all resources in namespace
kubectl get all -n schedulebox-production

# Get detailed pod information
kubectl describe pod schedulebox-web-{id} -n schedulebox-production

# Stream logs from deployment
kubectl logs -f deployment/schedulebox-web -n schedulebox-production

# Execute command inside pod (e.g., database migration)
kubectl exec -it schedulebox-web-{id} -n schedulebox-production -- pnpm db:migrate

# Port-forward to access service locally
kubectl port-forward svc/schedulebox-web 3000:3000 -n schedulebox-production

# Get events (useful for debugging)
kubectl get events -n schedulebox-production --sort-by='.lastTimestamp'

# Delete and recreate pod (force restart)
kubectl delete pod schedulebox-web-{id} -n schedulebox-production

# View Helm release history
helm history schedulebox -n schedulebox-production

# Diff between current state and new values
helm diff upgrade schedulebox ./helm/schedulebox -n schedulebox-production
```

---

**Document Version:** 1.0
**Last Updated:** 2026-02-12
**Owner:** DevOps Team
