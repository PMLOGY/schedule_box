# ScheduleBox Load Testing with k6

This directory contains comprehensive k6 load test scenarios for validating ScheduleBox performance under realistic production conditions.

## Prerequisites

1. **k6 installed**: Download from [k6.io](https://k6.io/docs/get-started/installation/)
2. **Test database seeded**: Load test users must be created in the database
3. **Staging/test environment accessible**: Target URL must be reachable
4. **Hardware requirements**: For 1000+ VU tests, recommended 4+ CPU cores and 8GB RAM

## Test Scenarios

### 1. Booking Flow (`booking-flow.js`)

Full booking lifecycle test covering 60% of expected production traffic.

**Flow:**

1. User login
2. List available services
3. Check availability for tomorrow
4. Create booking
5. Verify booking created

**Load profile:**

- Ramp to 100 VUs (2 minutes)
- Ramp to 600 VUs (5 minutes)
- Sustain 600 VUs (10 minutes)
- Ramp down (2 minutes)

**Thresholds:**

- p95 latency < 2 seconds
- p99 latency < 5 seconds
- Error rate < 1%

**Run:**

```bash
k6 run --env BASE_URL=https://staging.schedulebox.cz scenarios/booking-flow.js
```

### 2. Availability Lookup (`availability-lookup.js`)

Read-heavy availability checking representing 30% of expected traffic.

**Flow:**

1. User login
2. List services
3. Check availability for random date (0-6 days ahead)
4. Get service detail

**Load profile:**

- Ramp to 100 VUs (1 minute)
- Ramp to 300 VUs (3 minutes)
- Sustain 300 VUs (10 minutes)
- Ramp down (1 minute)

**Thresholds:**

- p95 latency < 1 second (tighter for read-only)
- p99 latency < 3 seconds
- Error rate < 1%

**Run:**

```bash
k6 run --env BASE_URL=https://staging.schedulebox.cz scenarios/availability-lookup.js
```

### 3. Mixed Traffic (`api-mixed.js`)

Combined traffic pattern matching real-world distribution across three user types.

**Scenarios:**

- **Booking users (60%)**: Full booking flow with 360 VUs
- **Browsing users (30%)**: Availability checking with 180 VUs
- **Admin users (10%)**: Management operations (bookings/customers/analytics) with 60 VUs

**Total target:** 600 VUs sustained for 10 minutes (simulates 1000 concurrent users with realistic think time)

**Thresholds:**

- Overall p95 < 2s, p99 < 5s
- Booking users p95 < 2s
- Browsing users p95 < 1s (read-heavy)
- Admin users p95 < 2s
- Error rate < 1%

**Run:**

```bash
k6 run --env BASE_URL=https://staging.schedulebox.cz scenarios/api-mixed.js
```

### 4. Spike Test (`spike-test.js`)

Sudden traffic surge test validating system recovery behavior.

**Flow:**

- Baseline: 100 VUs for 3 minutes
- Spike: Surge to 2000 VUs in 30 seconds
- Sustain: 2000 VUs for 1 minute
- Drop: Back to 100 VUs in 30 seconds
- Recovery: 100 VUs for 3 minutes

**Thresholds:**

- p95 latency < 5 seconds (looser during burst)
- Error rate < 5% (acceptable during spike)
- Check success > 90%

**Custom metrics:**

- `spike_requests`: Requests during surge period
- `baseline_requests`: Requests during normal operation

**Run:**

```bash
k6 run --env BASE_URL=https://staging.schedulebox.cz scenarios/spike-test.js
```

## Test Data Seeding

Load test users are defined in `fixtures/users.json` (50 users).

These users must be seeded into the test database before running load tests:

```sql
-- Example seed script (adjust for your schema)
INSERT INTO companies (name, slug, timezone)
VALUES ('Load Test Company', 'loadtest', 'Europe/Prague');

INSERT INTO users (email, password_hash, name, role, company_id)
SELECT
  'loadtest-' || generate_series(1,50) || '@schedulebox.cz',
  '$argon2id$v=19$m=65536,t=3,p=4$...',  -- Hash for 'LoadTest123!@#'
  'Load Test User ' || generate_series(1,50),
  'customer',
  (SELECT id FROM companies WHERE slug = 'loadtest');
```

Alternatively, use the seed script at `packages/database/seed/load-test-users.ts` (if available).

## Interpreting Results

### Key Metrics

**Virtual Users (VUs):** Simulated concurrent users. Each VU runs the test flow in a loop with realistic think time (sleep).

**p50 (median):** 50% of requests completed in this time or less.

**p95:** 95% of requests completed in this time or less. Industry standard for "good user experience".

**p99:** 99% of requests completed in this time or less. Catches outlier slowness.

**http_req_duration:** Time from sending request to receiving full response.

**http_req_failed:** Percentage of requests that failed (non-2xx/3xx status).

**checks:** Percentage of assertions that passed (status codes, response body validation).

### Success Criteria

**Good UX:** p95 < 2 seconds

**No outlier horror:** p99 < 5 seconds

**Reliable:** Error rate < 1%

### Example Output

```
✓ http_req_duration..............: avg=1.2s  min=200ms med=1.0s max=4.8s p(95)=1.8s p(99)=3.2s
✓ http_req_failed................: 0.12%   ✓ 23      ✗ 19234
✓ checks.........................: 98.76%  ✓ 94832   ✗ 1189
```

This shows:

- p95 = 1.8s (under 2s threshold - PASS)
- p99 = 3.2s (under 5s threshold - PASS)
- Error rate = 0.12% (under 1% threshold - PASS)
- Check success = 98.76% (over 95% threshold - PASS)

## Resource Requirements

**1000 VUs:** Requires 4+ CPU cores and 8GB RAM on test machine.

**Distributed testing:** For >1000 VU tests from CI, consider:

- k6 Cloud (SaaS offering)
- k6 Operator (Kubernetes-based distributed execution)
- Multiple test machines with load balancing

## Environment Variables

**BASE_URL:** Target API URL (default: `https://staging.schedulebox.cz`)

Example:

```bash
k6 run --env BASE_URL=https://production.schedulebox.cz scenarios/api-mixed.js
```

## Continuous Integration

Load tests can be run automatically via GitHub Actions. See `.github/workflows/load-test.yml` for CI configuration.

Manual trigger:

```bash
gh workflow run load-test.yml -f scenario=api-mixed -f base_url=https://staging.schedulebox.cz
```

Scheduled runs: Weekly on Sunday at 3am UTC for regression testing.

## Troubleshooting

**High error rate:** Check database connection pool size, RabbitMQ queue limits, API rate limiting.

**Slow p95/p99:** Profile slow queries with database EXPLAIN ANALYZE, check Redis cache hit rate.

**Memory issues on test machine:** Reduce VU count or use distributed k6 execution.

**Auth failures:** Verify test users exist in database with correct passwords.

## Notes

- All scenarios use realistic think time (sleep) to simulate real user behavior
- 50 test users are rotated round-robin across VUs
- Each scenario validates response status codes and body structure
- Thresholds cause test to fail if performance degrades below acceptable levels
