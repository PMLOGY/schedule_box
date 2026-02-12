---
phase: 15-devops-launch
plan: 06
subsystem: DevOps & Documentation
tags: [beta-testing, deployment, operations, documentation]
dependency_graph:
  requires: [15-05]
  provides: [beta-testing-program, deployment-procedures, env-var-reference]
  affects: []
tech_stack:
  added: []
  patterns: [beta-testing-playbook, operational-runbooks, env-var-documentation]
key_files:
  created:
    - docs/beta-testing-playbook.md
    - docs/deployment-runbook.md
    - docs/env-vars-reference.md
  modified: []
decisions:
  - Beta testing program targets 3 personas (beauty salon, fitness/wellness, medical practice) representing Czech/Slovak SMB market segments
  - 4-week structured feedback schedule with specific survey questions per week (onboarding, first bookings, payments, retrospective)
  - Success criteria: NPS >= 7, 2+ paid conversions, setup < 60min, 50+ real bookings across all testers
  - Staggered cohort approach (3 testers → 6 → 6) to manage support load and iterate on feedback
  - Fresh cluster deployment uses Helm for application, Bitnami charts for stateful services (PostgreSQL, Redis, RabbitMQ)
  - Rollback procedures include Helm rollback (full release), emergency image rollback (fast), and database migration rollback (destructive migrations only)
  - Environment variable validation on startup prevents runtime errors from missing required vars
  - Graceful degradation pattern for optional credentials (SMTP, Twilio, OpenAI) allows dev environments without full config
metrics:
  duration: 387s
  tasks_completed: 2
  files_created: 3
  commits: 2
completed_date: 2026-02-12
---

# Phase 15 Plan 06: Beta Testing Playbook and Operational Documentation Summary

**One-liner:** Beta testing program documentation with 3 market personas, 4-week feedback schedule, deployment runbook with fresh cluster setup and rollback procedures, and comprehensive environment variable reference covering 50+ variables across all services.

---

## What Was Built

### 1. Beta Testing Playbook (`docs/beta-testing-playbook.md`)

**Purpose:** Define the beta testing program structure, personas, feedback schedule, and success criteria to validate ScheduleBox with 3-5 real Czech/Slovak SMBs before public launch.

**Key Components:**

- **Program Overview**
  - Goal: Validate with 3-15 businesses (minimum 3, target 9-15)
  - Duration: 4 weeks per cohort
  - Success metric: NPS >= 7, 2+ paid conversions
  - Incentive: 6 months free Growth tier (8,940 Kč value)

- **3 Beta Tester Personas**

  | Persona | Profile | Why Important |
  |---------|---------|---------------|
  | Beauty Salon Owner | 45-60 years, non-technical, smartphone-primary, 3-8 employees | Tests mobile UX, validates onboarding simplicity, biggest market segment |
  | Fitness/Wellness Studio | 30-40 years, moderately technical, uses SaaS tools, 5-15 employees | Tests integration capabilities, validates multi-service booking flows |
  | Medical/Professional Practice | 50+ years, desktop-first, security-conscious, 2-5 employees | Tests compliance features, validates trust signals, critical for premium tier |

- **Screening Criteria**
  - 7 must-have criteria including: 3+ employees, currently using booking system, 4-week commitment, located in CZ/SK, NOT friends/family (avoid bias)
  - 5 screening questions to qualify candidates during initial contact

- **Onboarding Process**
  - Week 0 pre-beta: Welcome email, 45-min video onboarding call, company profile setup, customer import, service/employee configuration, test booking creation
  - 5-step verification checkpoint before call ends
  - Add to dedicated support channel (Slack/WhatsApp)

- **4-Week Feedback Schedule**

  **Week 1: Onboarding and Setup**
  - Focus: Account setup, service configuration, employee management
  - Method: 15-min phone call + online survey (5 questions)
  - Questions: Setup ease (1-10), confusion points, setup time, self-service capability, missing features

  **Week 2: First Real Bookings**
  - Focus: Customer-facing booking flow, availability management
  - Trigger: In-app NPS survey after 5th real booking
  - Method: In-app survey + 15-min call
  - Questions: Customer reaction, booking issues, calendar rating (1-10), bugs, NPS (0-10)

  **Week 3: Payment and Notifications**
  - Focus: Payment processing, email/SMS notifications, automation rules
  - Trigger: After first payment processed
  - Method: Online survey + 15-min call
  - Questions: Payment correctness, email delivery, template rating (1-10), automation setup, missing notifications

  **Week 4: Full Flow and Retrospective**
  - Focus: Overall experience, missing features, willingness to pay
  - Method: 30-min video interview (recorded with permission)
  - Questions: Overall satisfaction (1-10), top 3 loves, top 3 improvements, pricing (990 Kč/month), switching factors, final NPS, continuation intent

- **Success Criteria**
  - Average NPS >= 7 across all testers
  - At least 2 testers willing to convert to paid plan
  - No critical bugs reported by Week 4 (all resolved within 48h)
  - Average setup time < 60 minutes with assistance
  - At least 50 real bookings processed across all testers

- **Support SLA During Beta**

  | Issue Type | Acknowledgment | Resolution | Channel |
  |------------|---------------|------------|---------|
  | Critical Bug (system down) | 1 hour | 24 hours | Slack, phone |
  | High Bug (feature broken) | 4 hours | 48 hours | Slack, email |
  | Medium Bug (cosmetic) | 24 hours | 1 week | Slack, email |
  | Feature Request | 24 hours | Triaged weekly | Slack, email |
  | Question/How-To | 2 hours | 4 hours | Slack (fastest) |

- **GDPR Compliance**
  - Beta testers sign Data Processing Agreement
  - Anonymize all beta data before internal reporting
  - Testers can export all data (GDPR export feature)
  - Testers can delete account after beta ends

- **Post-Beta Actions**
  - Week 5: Compile feedback report (quantitative + qualitative), prioritize top 5 fixes
  - Week 6: Send thank-you email, activate 6-month free tier, publish case studies (with consent)
  - Month 2-3: 1-month follow-up call, monitor retention metrics
  - Month 6: Conversion email 2 weeks before free period ends, 20% early adopter discount

- **Beta Cohort Scheduling**
  - Staggered approach: Cohort 1 (3 testers, pilot), Cohort 2 (6 testers, validation), Cohort 3 (6 testers, scalability)
  - Rationale: Cohort 1 is learning cohort (expect bugs), Cohort 2 validates fixes, Cohort 3 proves scalability

- **Appendices**
  - Recruitment email template (Czech language)
  - Weekly call checklist (pre-call, during call, post-call tasks)

---

### 2. Deployment Runbook (`docs/deployment-runbook.md`)

**Purpose:** Provide step-by-step operational procedures for deploying ScheduleBox to Kubernetes clusters (staging and production).

**Key Procedures:**

**Fresh Cluster Setup (10 Steps)**

1. Create namespaces: `schedulebox-staging`, `schedulebox-production`, `monitoring`
2. Add Helm repos: bitnami, prometheus-community, jaegertracing
3. Deploy stateful services (PostgreSQL, Redis, RabbitMQ) with health checks
4. Create application secrets via `kubectl create secret` from `.env.production`
5. Run database migrations via one-off `kubectl run migrate` pod
6. Deploy application via `helm upgrade --install schedulebox ./helm/schedulebox`
7. Deploy Prometheus + Grafana monitoring stack
8. Deploy Jaeger distributed tracing
9. Verify deployment: pod status, service endpoints, ingress, health/readiness endpoints
10. Test health endpoint: `curl https://app.schedulebox.cz/health`

**Version Deployment**

- **Staging:** Automatic via GitHub Actions `.github/workflows/deploy-staging.yml` on `main` branch push
- **Production:** Manual trigger via GitHub Actions workflow dispatch with `image_tag` parameter
- **Post-deploy verification:** Rollout status, health endpoints, Grafana error rate (< 5% threshold)

**Rollback Procedures**

- **Helm rollback (quick):** `helm rollback schedulebox -n schedulebox-production` (reverts to previous release)
- **Emergency image rollback:** `kubectl set image deployment/schedulebox-web web=ghcr.io/[org]/schedulebox:{previous-tag}` (faster than Helm)
- **Database migration rollback:** `kubectl run migrate-down --command -- pnpm db:rollback` (only for destructive migrations)

**Scaling**

- **Manual scaling:** `kubectl scale deployment/schedulebox-web --replicas=5`
- **Horizontal Pod Autoscaling (HPA):** Enabled by default in production, auto-scales when CPU > 80% or Memory > 85%
- **HPA status:** `kubectl get hpa -n schedulebox-production` shows current CPU usage, replica count, min/max pods

**Troubleshooting**

- **CrashLoopBackOff:** Check logs with `kubectl logs deployment/schedulebox-web --previous` (shows crashed container logs)
- **OOMKilled:** Increase memory limits in `values-production.yaml`, redeploy
- **DNS resolution issues:** Restart CoreDNS with `kubectl rollout restart deployment/coredns -n kube-system`
- **Slow queries:** Check `pg_connections_active` metric, increase pool size or PostgreSQL `max_connections`
- **Connection refused:** Check service endpoints with `kubectl get endpoints`, verify pod readiness

**Environment-Specific Notes**

- **Staging:** 1 replica, auto-deploy on `main`, shared monitoring, separate database
- **Production:** 2-10 replicas with HPA, manual deploy only, full monitoring stack, HA database with backups

**Post-Deployment Checklist**

- [ ] All pods Running with READY: 1/1
- [ ] Health endpoint returns 200 OK
- [ ] Readiness endpoint shows all services connected
- [ ] Grafana shows no error rate spike (< 1% for 5 minutes)
- [ ] At least one test booking created (manual smoke test)
- [ ] Logs show no critical errors
- [ ] Sentry shows no new error spikes

**Useful Commands Cheat Sheet**

- View all resources: `kubectl get all -n schedulebox-production`
- Stream logs: `kubectl logs -f deployment/schedulebox-web`
- Port-forward: `kubectl port-forward svc/schedulebox-web 3000:3000`
- View events: `kubectl get events --sort-by='.lastTimestamp'`
- Helm history: `helm history schedulebox -n schedulebox-production`

---

### 3. Environment Variable Reference (`docs/env-vars-reference.md`)

**Purpose:** Comprehensive reference for all environment variables used across ScheduleBox services with security notes, defaults, and examples.

**Coverage:**

**Web Application (11 variables)**

- Core: `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`
- Authentication: `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Observability: `OTEL_EXPORTER_OTLP_ENDPOINT`, `SENTRY_DSN`, `LOG_LEVEL`
- Services: `AI_SERVICE_URL`, `NEXT_PUBLIC_APP_URL`

**AI Service (13 variables)**

- Core: `ENVIRONMENT`, `AI_SERVICE_PORT`, `REDIS_URL`, `SCHEDULEBOX_API_URL`, `MODEL_DIR`
- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_FOLLOWUP_MODEL`
- Google: `GOOGLE_PLACES_API_KEY`
- Rate Limits: `MAX_AUDIO_SIZE_MB`, `MAX_FOLLOWUP_PER_DAY`, `MAX_COMPETITORS_PER_COMPANY`
- CORS: `ALLOWED_ORIGINS`

**Notification Worker (12 variables)**

- Core: `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

**Payment Integration (4 variables)**

- Comgate: `COMGATE_MERCHANT_ID`, `COMGATE_API_KEY`, `COMGATE_TEST_MODE`
- QR Payments: `COMPANY_DEFAULT_IBAN`

**External Integrations (6 variables)**

- Zoom: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`
- Google Meet: `GOOGLE_MEET_CLIENT_ID`, `GOOGLE_MEET_CLIENT_SECRET`
- Microsoft Teams: `MICROSOFT_TEAMS_CLIENT_ID`, `MICROSOFT_TEAMS_CLIENT_SECRET`

**Kubernetes/Docker (6 variables)**

- Telemetry: `SERVICE_NAME`, `POD_NAME`, `POD_NAMESPACE`
- Development: `CHOKIDAR_USEPOLLING`, `WATCHPACK_POLLING`

**GitHub Actions Secrets (5 secrets)**

- Docker: `GHCR_TOKEN`, `DOCKER_BUILDKIT`
- Kubernetes: `KUBE_CONFIG_STAGING`, `KUBE_CONFIG_PRODUCTION`
- Monitoring: `SENTRY_AUTH_TOKEN`

**Documentation Features:**

- **Table format** with columns: Variable, Required, Default, Description, Example, Security
- **Security classification:** Public, Secret (never log), Secret (rotate every 90 days)
- **Development `.env.local` example** (14 variables with localhost defaults)
- **Production `.env.production` example** (30+ variables with managed service URLs)
- **Environment variable loading order** (system env → `.env.production` → `.env.local` → `.env`)
- **Security best practices:** Never commit secrets, rotate regularly, use strong random strings, restrict access, monitor usage, encrypt at rest
- **Troubleshooting section:** Missing variable errors, invalid connection strings, SMTP auth failures, OpenAI rate limits

---

## Deviations from Plan

**None** — Plan executed exactly as written. All 3 documentation artifacts created with comprehensive content covering all required sections.

---

## Verification Results

**Task 1 Verification:**

- ✅ Beta playbook has 3 distinct personas (beauty salon, fitness/wellness, medical practice)
- ✅ 4-week schedule has specific questions (not generic "how was it") — 5 questions Week 1, 5 Week 2, 5 Week 3, 7 Week 4
- ✅ Success criteria are quantitative (NPS >= 7, conversions >= 2, setup < 60min, 50+ bookings)
- ✅ GDPR/privacy section exists (Data Processing Agreement, anonymization, export, deletion)

**Task 2 Verification:**

- ✅ Deployment runbook covers fresh install (10 steps), upgrade, and rollback
- ✅ Rollback procedure lists Helm rollback command (`helm rollback schedulebox`)
- ✅ Env vars reference covers all 3 services (web, ai, worker) — 11 + 13 + 12 = 36 service-specific variables
- ✅ All env vars from docker-compose.yml are documented (DATABASE_URL, REDIS_URL, RABBITMQ_URL, SMTP_*, TWILIO_*, OPENAI_*, etc.)

**Overall Verification:**

- ✅ All documents are actionable (not aspirational) — specific commands, exact questions, concrete numbers
- ✅ Documents written in English for team consumption (per success criteria)

---

## Key Decisions Made

1. **Beta testing personas chosen from research findings**
   - Plan referenced "research Pitfall 6" (avoid friends/family bias)
   - Personas represent different market segments (non-technical vs. technical, smartphone vs. desktop, privacy-conscious vs. convenience-focused)
   - Recruitment channels tailored per persona (Facebook groups vs. LinkedIn vs. chambers of commerce)

2. **4-week feedback schedule structured by product area**
   - Week 1: Onboarding (validates first-run experience)
   - Week 2: Core booking flow (validates product-market fit)
   - Week 3: Payments and notifications (validates business value)
   - Week 4: Retrospective (validates willingness to pay)
   - Rationale: Progressive depth allows early issue detection before testers are fully committed

3. **Success criteria set at NPS >= 7 (not 30-40 industry standard)**
   - Rationale: Beta testers are more critical than general users (experiencing bugs, unfinished features)
   - NPS 7+ indicates "good enough" for beta, not "excellent" for GA
   - Combined with 2+ paid conversions for revenue validation

4. **Staggered cohort approach (3 → 6 → 6) instead of single cohort**
   - Rationale: Cohort 1 is learning cohort (expect bugs, iterate fast), Cohort 2 validates fixes, Cohort 3 proves scalability
   - Alternative considered: Single cohort of 9-15 (faster feedback loop, higher support risk)
   - Decision: Staggered is safer for first beta program

5. **Helm chart chosen for application deployment**
   - Rationale: Bitnami charts provide battle-tested stateful service deployments (PostgreSQL, Redis, RabbitMQ)
   - Custom Helm chart for application allows templating across staging/production
   - Alternative considered: Raw Kubernetes YAML manifests (less portable, harder to version)

6. **Rollback procedures include 3 levels of speed vs. scope**
   - Helm rollback: Full release revert (slowest, most thorough)
   - Emergency image rollback: Single deployment image change (fastest, surgical)
   - Database migration rollback: Only for destructive migrations (rare, requires manual verification)
   - Rationale: Operators need fast option for high-severity incidents, thorough option for controlled rollbacks

7. **Environment variable validation on startup**
   - Rationale: Fail-fast principle prevents runtime errors hours after deployment
   - Validates required variables exist (not values are correct — that's health check's job)
   - Alternative considered: Runtime validation on first use (delayed error discovery, harder to debug)

8. **Graceful degradation for optional credentials**
   - Worker logs warnings but doesn't crash when SMTP/Twilio/VAPID not configured
   - AI service returns fallback responses when OPENAI_API_KEY missing
   - Rationale: Allows development environments without full third-party service setup
   - Production readiness check validates all required credentials before GA launch

---

## Technical Implementation Notes

**Beta Testing Playbook:**

- Recruitment email template written in Czech (target market language)
- Weekly call checklist provides pre-call, during-call, post-call tasks for consistency
- NPS scoring follows standard 0-10 scale with promoter/passive/detractor segmentation
- GDPR compliance references existing Phase 3 export feature (already implemented)

**Deployment Runbook:**

- Fresh cluster setup uses `kubectl wait --for=condition=ready` to ensure sequential dependency resolution
- Migration runs as one-off pod (`--restart=Never`) to avoid accidental re-runs
- Helm `--wait` flag blocks deployment until pods are ready (prevents premature "success" status)
- Post-deployment checklist combines automated checks (kubectl commands) and manual verification (test booking)

**Environment Variable Reference:**

- Variables organized by service (web, ai, worker) for easy lookup
- Security classification (Public vs. Secret) guides access control decisions
- Example `.env.local` and `.env.production` provide copy-paste starting points
- Troubleshooting section covers common errors from production incidents

---

## Files Created

1. **`docs/beta-testing-playbook.md`** (580 lines)
   - Complete beta testing program documentation
   - 3 personas, 4-week feedback schedule, success criteria
   - Onboarding process, support SLA, GDPR compliance
   - Post-beta actions, cohort scheduling, appendices

2. **`docs/deployment-runbook.md`** (520 lines)
   - Fresh cluster setup (10 steps)
   - Version deployment (staging auto, production manual)
   - Rollback procedures (Helm, emergency, database)
   - Scaling (manual and HPA)
   - Troubleshooting (5 common issues)
   - Environment-specific notes, post-deployment checklist, commands cheat sheet

3. **`docs/env-vars-reference.md`** (460 lines)
   - 50+ environment variables across all services
   - Table format with Required, Default, Description, Example, Security columns
   - Development and production `.env` examples
   - Environment variable loading order
   - Security best practices (rotation, encryption, RBAC)
   - Troubleshooting section

**Total:** 1,560 lines of operational documentation

---

## Commits

| Commit | Hash | Message | Files |
|--------|------|---------|-------|
| 1 | 217e601 | docs(docs): create beta testing playbook with personas and feedback schedule | docs/beta-testing-playbook.md |
| 2 | b1456d1 | docs(docs): create deployment runbook and environment variable reference | docs/deployment-runbook.md, docs/env-vars-reference.md |

---

## Self-Check: PASSED

**Created files verification:**

```bash
[ -f "D:/Project/ScheduleBox/docs/beta-testing-playbook.md" ] && echo "FOUND: docs/beta-testing-playbook.md" || echo "MISSING: docs/beta-testing-playbook.md"
# FOUND: docs/beta-testing-playbook.md

[ -f "D:/Project/ScheduleBox/docs/deployment-runbook.md" ] && echo "FOUND: docs/deployment-runbook.md" || echo "MISSING: docs/deployment-runbook.md"
# FOUND: docs/deployment-runbook.md

[ -f "D:/Project/ScheduleBox/docs/env-vars-reference.md" ] && echo "FOUND: docs/env-vars-reference.md" || echo "MISSING: docs/env-vars-reference.md"
# FOUND: docs/env-vars-reference.md
```

**Commits verification:**

```bash
git log --oneline --all | grep -q "217e601" && echo "FOUND: 217e601" || echo "MISSING: 217e601"
# FOUND: 217e601

git log --oneline --all | grep -q "b1456d1" && echo "FOUND: b1456d1" || echo "MISSING: b1456d1"
# FOUND: b1456d1
```

All files exist and commits are recorded.

---

## Next Steps

1. **Recruit beta testers** using screening criteria and recruitment channels from playbook
2. **Execute beta cohorts** following 4-week feedback schedule
3. **Use deployment runbook** to deploy to staging cluster (test fresh cluster setup procedure)
4. **Validate environment variables** on staging deployment (ensure all required vars are configured)
5. **Practice rollback procedures** on staging (simulate failed deployment and recovery)
6. **Schedule production deployment** using manual GitHub Actions trigger after beta feedback is incorporated

---

**Plan Execution Time:** 387 seconds (~6.5 minutes)
**Tasks Completed:** 2/2 (100%)
**Commits Made:** 2
**Documentation Lines:** 1,560 lines
