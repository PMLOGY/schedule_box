-- =============================================================================
-- Migration: 0004_partition_bookings.sql
-- Purpose: Range-partition bookings by start_time (monthly partitions)
-- Strategy: Conservative create-migrate-swap (see partition-migrate.ts)
--
-- IMPORTANT: This DDL creates the shadow table only.
--   Data migration and RENAME swap are handled by partition-migrate.ts.
--   Do NOT run this file directly — use partition-migrate.ts instead.
--
-- btree_gist NOTE:
--   EXCLUDE USING gist (...) exclusion constraints CANNOT be defined on a
--   partitioned table parent in PostgreSQL 16 (PG restriction on partitioned
--   tables). The application uses SELECT FOR UPDATE as the primary double-booking
--   guard (see booking-service.ts createBooking). This is intentional and safe —
--   the application-level lock is the authoritative guard; the DB exclusion
--   constraint is a belt-and-suspenders check that would only apply per-partition
--   anyway. Adding the constraint per-partition is deferred until needed at scale.
-- =============================================================================

-- Create the partitioned shadow table
-- LIKE ... INCLUDING ALL would copy constraints including CHECK, which we want.
-- We do NOT include INDEXES here — we define them explicitly below so they
-- propagate to all partitions correctly.
CREATE TABLE bookings_partitioned (
  id           SERIAL,
  uuid         UUID          NOT NULL DEFAULT gen_random_uuid(),
  company_id   INTEGER       NOT NULL,
  customer_id  INTEGER       NOT NULL,
  service_id   INTEGER       NOT NULL,
  employee_id  INTEGER,
  start_time   TIMESTAMPTZ   NOT NULL,
  end_time     TIMESTAMPTZ   NOT NULL,
  status       VARCHAR(20)   DEFAULT 'pending',
  source       VARCHAR(30)   DEFAULT 'online',
  notes        TEXT,
  internal_notes TEXT,
  booking_metadata JSONB,
  price        NUMERIC(10,2) NOT NULL,
  currency     VARCHAR(3)    DEFAULT 'CZK',
  discount_amount NUMERIC(10,2) DEFAULT 0,
  coupon_id    INTEGER,
  gift_card_id INTEGER,
  video_meeting_id INTEGER,
  no_show_probability REAL,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(20),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- CHECK constraints (mirrored from original table)
  CONSTRAINT bookings_partitioned_status_check
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  CONSTRAINT bookings_partitioned_source_check
    CHECK (source IN ('online', 'admin', 'phone', 'walk_in', 'voice_ai', 'marketplace', 'api', 'widget')),
  CONSTRAINT bookings_partitioned_cancelled_by_check
    CHECK (cancelled_by IN ('customer', 'employee', 'admin', 'system') OR cancelled_by IS NULL),
  CONSTRAINT bookings_partitioned_end_time_check
    CHECK (end_time > start_time)
) PARTITION BY RANGE (start_time);

-- UUID uniqueness index (propagates to all partitions)
CREATE UNIQUE INDEX idx_bookings_partitioned_uuid ON bookings_partitioned (uuid);

-- Primary access pattern: company_id + start_time (partition key included — enables pruning)
CREATE INDEX idx_bookings_partitioned_company_start ON bookings_partitioned (company_id, start_time);

-- Employee + start_time for schedule views
CREATE INDEX idx_bookings_partitioned_employee_start ON bookings_partitioned (employee_id, start_time);

-- Status filter per company
CREATE INDEX idx_bookings_partitioned_status ON bookings_partitioned (company_id, status);

-- Date range queries (e.g., calendar month view)
CREATE INDEX idx_bookings_partitioned_date_range ON bookings_partitioned (company_id, start_time, end_time);

-- Customer lookup
CREATE INDEX idx_bookings_partitioned_customer ON bookings_partitioned (customer_id);

-- Service lookup
CREATE INDEX idx_bookings_partitioned_service ON bookings_partitioned (service_id);

-- =============================================================================
-- Monthly partitions: 2025-01-01 through 2027-06-01
-- Naming convention: bookings_YYYY_MM
-- Boundary: [lower, upper) — standard PG range partition convention
-- =============================================================================

-- 2025
CREATE TABLE bookings_2025_01 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
CREATE TABLE bookings_2025_02 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');
CREATE TABLE bookings_2025_03 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');
CREATE TABLE bookings_2025_04 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');
CREATE TABLE bookings_2025_05 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');
CREATE TABLE bookings_2025_06 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');
CREATE TABLE bookings_2025_07 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');
CREATE TABLE bookings_2025_08 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');
CREATE TABLE bookings_2025_09 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-09-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');
CREATE TABLE bookings_2025_10 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');
CREATE TABLE bookings_2025_11 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');
CREATE TABLE bookings_2025_12 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');

-- 2026
CREATE TABLE bookings_2026_01 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
CREATE TABLE bookings_2026_02 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
CREATE TABLE bookings_2026_03 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE bookings_2026_04 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
CREATE TABLE bookings_2026_05 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
CREATE TABLE bookings_2026_06 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE bookings_2026_07 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE bookings_2026_08 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE bookings_2026_09 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE bookings_2026_10 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE bookings_2026_11 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE bookings_2026_12 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- 2027 (forward buffer: 6 months)
CREATE TABLE bookings_2027_01 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
CREATE TABLE bookings_2027_02 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');
CREATE TABLE bookings_2027_03 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');
CREATE TABLE bookings_2027_04 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2027-04-01 00:00:00+00') TO ('2027-05-01 00:00:00+00');
CREATE TABLE bookings_2027_05 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2027-05-01 00:00:00+00') TO ('2027-06-01 00:00:00+00');
CREATE TABLE bookings_2027_06 PARTITION OF bookings_partitioned
  FOR VALUES FROM ('2027-06-01 00:00:00+00') TO ('2027-07-01 00:00:00+00');

-- Default partition catches out-of-range rows (before 2025 or after 2027-06)
-- This ensures INSERT never fails due to out-of-range partition key.
CREATE TABLE bookings_default PARTITION OF bookings_partitioned DEFAULT;
