-- =============================================================================
-- Rollback Script: rollback_partitions.sql
-- Purpose: Reverse the RENAME swap performed by partition-migrate.ts
--
-- WARNING: Run this ONLY if the original _old tables still exist.
--   After the verification period (recommended: 7 days), drop the _old tables
--   once you are confident the partitioned tables are stable.
--
-- Prerequisites:
--   - bookings_old, notifications_old, audit_logs_old tables must exist
--   - The application should be put in maintenance mode / scaled to zero before
--     running this script to avoid writes landing in the wrong table during swap
--
-- After rollback:
--   - bookings, notifications, audit_logs are the original unpartitioned tables
--   - bookings_partitioned, notifications_partitioned, audit_logs_partitioned
--     hold the data that was written after the swap — review and merge if needed
--
-- Cleanup (after verification period, NOT during rollback):
--   DROP TABLE bookings_partitioned CASCADE;
--   DROP TABLE notifications_partitioned CASCADE;
--   DROP TABLE audit_logs_partitioned CASCADE;
-- =============================================================================

-- =============================================================================
-- Rollback bookings
-- =============================================================================
BEGIN;
ALTER TABLE bookings RENAME TO bookings_partitioned;
ALTER TABLE bookings_old RENAME TO bookings;
COMMIT;

-- =============================================================================
-- Rollback notifications
-- =============================================================================
BEGIN;
ALTER TABLE notifications RENAME TO notifications_partitioned;
ALTER TABLE notifications_old RENAME TO notifications;
COMMIT;

-- =============================================================================
-- Rollback audit_logs
-- =============================================================================
BEGIN;
ALTER TABLE audit_logs RENAME TO audit_logs_partitioned;
ALTER TABLE audit_logs_old RENAME TO audit_logs;
COMMIT;
