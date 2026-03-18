-- =============================================================================
-- Migration: 0005_partition_notifications.sql
-- Purpose: Range-partition notifications by created_at (monthly partitions)
-- Strategy: Conservative create-migrate-swap (see partition-migrate.ts)
--
-- IMPORTANT: This DDL creates the shadow table only.
--   Data migration and RENAME swap are handled by partition-migrate.ts.
--   Do NOT run this file directly — use partition-migrate.ts instead.
--
-- Partition key choice:
--   scheduled_at is NULLABLE on the notifications table — a NULL partition key
--   would require all NULL rows to go into the DEFAULT partition and makes
--   range pruning unreliable. created_at is NOT NULL and represents when the
--   notification record was created, which aligns with time-scoped queries
--   (e.g., "all notifications sent this month"). Using created_at.
-- =============================================================================

-- Create the partitioned shadow table
CREATE TABLE notifications_partitioned (
  id           SERIAL,
  company_id   INTEGER       NOT NULL,
  customer_id  INTEGER,
  booking_id   INTEGER,
  template_id  INTEGER,
  channel      VARCHAR(20)   NOT NULL,
  recipient    VARCHAR(255)  NOT NULL,
  subject      VARCHAR(255),
  body         TEXT          NOT NULL,
  status       VARCHAR(20)   DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  clicked_at   TIMESTAMPTZ,
  error_message TEXT,
  metadata     JSONB         DEFAULT '{}',
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- CHECK constraints (mirrored from original table)
  CONSTRAINT notifications_partitioned_channel_check
    CHECK (channel IN ('email', 'sms', 'push')),
  CONSTRAINT notifications_partitioned_status_check
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked'))
) PARTITION BY RANGE (created_at);

-- Indexes (propagate to all partitions)
CREATE INDEX idx_notifications_partitioned_company ON notifications_partitioned (company_id);
CREATE INDEX idx_notifications_partitioned_customer ON notifications_partitioned (customer_id);
CREATE INDEX idx_notifications_partitioned_booking ON notifications_partitioned (booking_id);
CREATE INDEX idx_notifications_partitioned_status ON notifications_partitioned (status);

-- Partial index for pending scheduled notifications (cron delivery query)
-- NOTE: Partial indexes on the partitioned parent are supported in PG 11+
CREATE INDEX idx_notifications_partitioned_scheduled
  ON notifications_partitioned (scheduled_at)
  WHERE status = 'pending';

-- Primary time-scoped access pattern
CREATE INDEX idx_notifications_partitioned_company_created
  ON notifications_partitioned (company_id, created_at);

-- =============================================================================
-- Monthly partitions: 2025-01-01 through 2027-06-01
-- Naming convention: notifications_YYYY_MM
-- =============================================================================

-- 2025
CREATE TABLE notifications_2025_01 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
CREATE TABLE notifications_2025_02 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');
CREATE TABLE notifications_2025_03 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');
CREATE TABLE notifications_2025_04 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');
CREATE TABLE notifications_2025_05 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');
CREATE TABLE notifications_2025_06 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');
CREATE TABLE notifications_2025_07 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');
CREATE TABLE notifications_2025_08 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');
CREATE TABLE notifications_2025_09 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-09-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');
CREATE TABLE notifications_2025_10 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');
CREATE TABLE notifications_2025_11 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');
CREATE TABLE notifications_2025_12 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');

-- 2026
CREATE TABLE notifications_2026_01 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
CREATE TABLE notifications_2026_02 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
CREATE TABLE notifications_2026_03 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE notifications_2026_04 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
CREATE TABLE notifications_2026_05 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
CREATE TABLE notifications_2026_06 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE notifications_2026_07 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE notifications_2026_08 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE notifications_2026_09 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE notifications_2026_10 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE notifications_2026_11 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE notifications_2026_12 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- 2027 (forward buffer: 6 months)
CREATE TABLE notifications_2027_01 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
CREATE TABLE notifications_2027_02 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');
CREATE TABLE notifications_2027_03 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');
CREATE TABLE notifications_2027_04 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2027-04-01 00:00:00+00') TO ('2027-05-01 00:00:00+00');
CREATE TABLE notifications_2027_05 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2027-05-01 00:00:00+00') TO ('2027-06-01 00:00:00+00');
CREATE TABLE notifications_2027_06 PARTITION OF notifications_partitioned
  FOR VALUES FROM ('2027-06-01 00:00:00+00') TO ('2027-07-01 00:00:00+00');

-- Default partition catches out-of-range rows
CREATE TABLE notifications_default PARTITION OF notifications_partitioned DEFAULT;
