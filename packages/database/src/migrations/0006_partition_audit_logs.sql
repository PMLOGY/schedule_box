-- =============================================================================
-- Migration: 0006_partition_audit_logs.sql
-- Purpose: Range-partition audit_logs by created_at (monthly partitions)
-- Strategy: Conservative create-migrate-swap (see partition-migrate.ts)
--
-- IMPORTANT: This DDL creates the shadow table only.
--   Data migration and RENAME swap are handled by partition-migrate.ts.
--   Do NOT run this file directly — use partition-migrate.ts instead.
--
-- Schema note:
--   audit_logs lives in the PUBLIC schema (defined in analytics.ts via pgTable).
--   It is distinct from platform_audit_logs (platform.ts) which is the
--   super-admin action audit trail. This migration targets audit_logs only.
--
-- Partition key:
--   created_at is the natural time dimension for audit log queries.
--   Compliance queries ("show all actions in March 2026") align with monthly
--   partition pruning on created_at.
-- =============================================================================

-- Create the partitioned shadow table
CREATE TABLE audit_logs_partitioned (
  id           SERIAL,
  company_id   INTEGER,
  user_id      INTEGER,
  action       VARCHAR(100)  NOT NULL,
  entity_type  VARCHAR(50)   NOT NULL,
  entity_id    INTEGER,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Indexes (propagate to all partitions)
CREATE INDEX idx_audit_logs_partitioned_company  ON audit_logs_partitioned (company_id);
CREATE INDEX idx_audit_logs_partitioned_user     ON audit_logs_partitioned (user_id);
CREATE INDEX idx_audit_logs_partitioned_action   ON audit_logs_partitioned (action);
CREATE INDEX idx_audit_logs_partitioned_entity   ON audit_logs_partitioned (entity_type, entity_id);
CREATE INDEX idx_audit_logs_partitioned_created  ON audit_logs_partitioned (created_at);

-- Composite index: company + time-range (primary access pattern for compliance reports)
CREATE INDEX idx_audit_logs_partitioned_company_created
  ON audit_logs_partitioned (company_id, created_at);

-- =============================================================================
-- Monthly partitions: 2025-01-01 through 2027-06-01
-- Naming convention: audit_logs_YYYY_MM
-- =============================================================================

-- 2025
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');
CREATE TABLE audit_logs_2025_03 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');
CREATE TABLE audit_logs_2025_04 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');
CREATE TABLE audit_logs_2025_05 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');
CREATE TABLE audit_logs_2025_06 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');
CREATE TABLE audit_logs_2025_07 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');
CREATE TABLE audit_logs_2025_08 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');
CREATE TABLE audit_logs_2025_09 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-09-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');
CREATE TABLE audit_logs_2025_10 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');
CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');
CREATE TABLE audit_logs_2025_12 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');

-- 2026
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE audit_logs_2026_04 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE audit_logs_2026_08 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE audit_logs_2026_09 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE audit_logs_2026_10 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE audit_logs_2026_11 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE audit_logs_2026_12 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- 2027 (forward buffer: 6 months)
CREATE TABLE audit_logs_2027_01 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
CREATE TABLE audit_logs_2027_02 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');
CREATE TABLE audit_logs_2027_03 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');
CREATE TABLE audit_logs_2027_04 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2027-04-01 00:00:00+00') TO ('2027-05-01 00:00:00+00');
CREATE TABLE audit_logs_2027_05 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2027-05-01 00:00:00+00') TO ('2027-06-01 00:00:00+00');
CREATE TABLE audit_logs_2027_06 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2027-06-01 00:00:00+00') TO ('2027-07-01 00:00:00+00');

-- Default partition catches out-of-range rows
CREATE TABLE audit_logs_default PARTITION OF audit_logs_partitioned DEFAULT;
