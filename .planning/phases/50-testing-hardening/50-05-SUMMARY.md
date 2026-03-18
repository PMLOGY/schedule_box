---
phase: 50-testing-hardening
plan: "05"
subsystem: database
tags: [partitioning, postgresql, migrations, performance, hardening]
dependency_graph:
  requires: [50-01, 50-02, 50-04]
  provides: [partition-ddl, partition-migrate-script]
  affects: [bookings, notifications, audit_logs]
tech_stack:
  added: []
  patterns:
    - Range partitioning by month (PostgreSQL 16 declarative)
    - Create-migrate-swap (shadow table strategy)
    - 500-row batch INSERT ... SELECT with OFFSET resume
    - RENAME swap in single transaction (catalog-only, fast)
    - Default partition for out-of-range safety
key_files:
  created:
    - packages/database/src/migrations/0004_partition_bookings.sql
    - packages/database/src/migrations/0005_partition_notifications.sql
    - packages/database/src/migrations/0006_partition_audit_logs.sql
    - packages/database/src/migrations/rollback_partitions.sql
    - packages/database/scripts/partition-migrate.ts
  modified: []
decisions:
  - "Partition notifications by created_at (not scheduled_at): scheduled_at is NULLABLE; NULL partition keys are unreliable in range partitioning — all NULLs would fall to DEFAULT partition defeating pruning"
  - "audit_logs is in public schema (analytics.ts), not platform_audit_logs (platform.ts) — migration targets public.audit_logs"
  - "btree_gist exclusion constraint not added to partitioned parent: PG 16 prohibits EXCLUDE USING gist on partitioned table parents; application SELECT FOR UPDATE is the authoritative double-booking guard"
  - "postgres.js kept in devDependencies (Phase 45 decision) specifically for local/manual scripts like this one"
  - "Partition range 2025-01 through 2027-06 (30 months back + 15 forward buffer): covers all historical data since product launch, provides 15-month runway before new partitions are needed"
  - "BATCH_SIZE=500: matches PII backfill convention established in Phase 46; balances transaction size vs memory"
metrics:
  duration: "7min"
  completed: "2026-03-18"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
---

# Phase 50 Plan 05: DB Partitioning (bookings, notifications, audit_logs) Summary

Range-partitioned bookings (by start_time), notifications (by created_at), and audit_logs (by created_at) with monthly partitions 2025-01 through 2027-06, using a conservative create-shadow-table → batch-migrate-500-rows → RENAME-swap strategy with a complete rollback script.

## What Was Built

### Task 1: Partition DDL Scripts + Rollback

**0004_partition_bookings.sql** — Creates `bookings_partitioned` with `PARTITION BY RANGE (start_time)`. 30 monthly partitions (2025-01 through 2027-06) + `bookings_default` catch-all. 7 indexes including the primary access pattern `(company_id, start_time)`, UUID uniqueness, employee+time for schedule views, and date range for calendar views. Documents the btree_gist exclusion constraint PG 16 limitation.

**0005_partition_notifications.sql** — Creates `notifications_partitioned` with `PARTITION BY RANGE (created_at)`. Same 30+1 partition structure. Partition key chosen as `created_at` (NOT NULL) instead of `scheduled_at` (NULLABLE) because NULL range keys make pruning unreliable. Preserves the partial index for pending scheduled notifications (cron delivery query).

**0006_partition_audit_logs.sql** — Creates `audit_logs_partitioned` with `PARTITION BY RANGE (created_at)`. Targets `public.audit_logs` (analytics.ts), not `platform_audit_logs` (platform.ts). Composite index on `(company_id, created_at)` for compliance reporting pattern.

**rollback_partitions.sql** — Reversal script: renames `{table}` back to `{table}_partitioned` and `{table}_old` back to `{table}` for all 3 tables. Includes prominent maintenance-window warning and post-rollback cleanup notes.

### Task 2: Batch Migration Script

**partition-migrate.ts** — TypeScript script runnable via `npx tsx`. Features:
- Connects via `postgres.js` (already in devDependencies per Phase 45 decision)
- Per-table: applies DDL → 500-row batch INSERT ... SELECT → RENAME swap
- Idempotent: detects if shadow table already exists (skips DDL re-run); detects already-migrated rows (resumes from count)
- `--dry-run`: runs DDL + batch migration, skips RENAME swap (safe for staging validation)
- `--table bookings|notifications|audit_logs`: incremental single-table migration
- `--rollback`: executes rollback_partitions.sql
- Progress logging: `[bookings] Migrated 500/12500 rows`
- Post-swap EXPLAIN verification: checks query plan for partition name pattern to confirm pruning is active
- Prominent maintenance window warning at file top

## Deviations from Plan

None — plan executed exactly as written.

Notable implementation choices within plan boundaries:

1. **notifications partition key** — Plan said "check if scheduled_at is nullable". Checked: nullable. Chose created_at as instructed.
2. **Batch resume via COUNT** — Plan described "interrupted and resumed". Implemented by counting rows already in the shadow table and computing OFFSET, then resuming from there.
3. **EXPLAIN pattern detection** — Used regex `{table}_\d{4}_\d{2}` to detect partition-specific scan nodes in plan output; logs WARNING if not detected (may be normal for empty DB).

## Self-Check

### Files created

- `packages/database/src/migrations/0004_partition_bookings.sql` — FOUND (8,724 bytes)
- `packages/database/src/migrations/0005_partition_notifications.sql` — FOUND (7,732 bytes)
- `packages/database/src/migrations/0006_partition_audit_logs.sql` — FOUND (6,891 bytes)
- `packages/database/src/migrations/rollback_partitions.sql` — FOUND (2,146 bytes)
- `packages/database/scripts/partition-migrate.ts` — FOUND (12,013 bytes)

### Commits

- `86addc8` — feat(database): add partition DDL for bookings, notifications, audit_logs
- `8edf776` — feat(database): add partition-migrate.ts batch migration script

### Schema files unchanged

`git diff --name-only packages/database/src/schema/` — empty (no modifications)

### PARTITION BY RANGE count

All 3 DDL files: 1 occurrence each — confirmed.

## Self-Check: PASSED
