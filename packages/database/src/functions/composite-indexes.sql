-- Composite indexes for common query patterns
-- These cover the most frequent API queries identified during code review
-- All use IF NOT EXISTS to be safely re-runnable

-- ============================================================================
-- BOOKINGS — most queried table
-- ============================================================================

-- Employee schedule: upcoming bookings per employee (used by availability checks)
CREATE INDEX IF NOT EXISTS idx_bookings_employee_time
    ON bookings(employee_id, start_time)
    WHERE deleted_at IS NULL AND status NOT IN ('cancelled');

-- Customer booking history
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status
    ON bookings(company_id, customer_id, status)
    WHERE deleted_at IS NULL;

-- Dashboard: recent bookings sorted by time
CREATE INDEX IF NOT EXISTS idx_bookings_company_created
    ON bookings(company_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Availability lookup: active bookings in a time range for an employee
CREATE INDEX IF NOT EXISTS idx_bookings_overlap_check
    ON bookings(employee_id, start_time, end_time)
    WHERE deleted_at IS NULL AND status IN ('pending', 'confirmed');

-- ============================================================================
-- PAYMENTS
-- ============================================================================

-- Recent payments by company (list endpoint)
CREATE INDEX IF NOT EXISTS idx_payments_company_created
    ON payments(company_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Filter by status (common in dashboard)
CREATE INDEX IF NOT EXISTS idx_payments_company_status
    ON payments(company_id, status)
    WHERE deleted_at IS NULL;

-- Gateway transaction lookup (webhook processing)
CREATE INDEX IF NOT EXISTS idx_payments_gateway_tx
    ON payments(gateway, gateway_transaction_id)
    WHERE gateway_transaction_id IS NOT NULL;

-- ============================================================================
-- CUSTOMERS
-- ============================================================================

-- Search by name/email within a company (customers list with search)
CREATE INDEX IF NOT EXISTS idx_customers_company_name
    ON customers(company_id, name)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_company_email
    ON customers(company_id, email)
    WHERE deleted_at IS NULL;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Pending notifications for scheduler
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled
    ON notifications(scheduled_at)
    WHERE status = 'pending' AND scheduled_at IS NOT NULL;

-- Company notification history
CREATE INDEX IF NOT EXISTS idx_notifications_company_created
    ON notifications(company_id, created_at DESC);

-- ============================================================================
-- ANALYTICS EVENTS
-- ============================================================================

-- Time-series queries by company
CREATE INDEX IF NOT EXISTS idx_analytics_company_time
    ON analytics_events(company_id, created_at DESC);

-- Event type filtering
CREATE INDEX IF NOT EXISTS idx_analytics_company_type
    ON analytics_events(company_id, event_type);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

-- Audit trail by company and time
CREATE INDEX IF NOT EXISTS idx_audit_company_created
    ON audit_logs(company_id, created_at DESC)
    WHERE company_id IS NOT NULL;

-- ============================================================================
-- AVAILABILITY SLOTS
-- ============================================================================

-- Availability lookup (public widget)
CREATE INDEX IF NOT EXISTS idx_availability_employee_date
    ON availability_slots(employee_id, date, start_time);

CREATE INDEX IF NOT EXISTS idx_availability_company_date
    ON availability_slots(company_id, date);
