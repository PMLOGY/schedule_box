-- Soft delete partial indexes for active records
-- NOTE: deleted_at columns are already defined in Drizzle schema files
-- These partial indexes optimize queries on active (non-deleted) records

-- Bookings: optimize queries by company and start_time for active bookings
CREATE INDEX idx_bookings_active ON bookings(company_id, start_time)
    WHERE deleted_at IS NULL;

-- Customers: optimize company-scoped customer queries
CREATE INDEX idx_customers_active ON customers(company_id)
    WHERE deleted_at IS NULL;

-- Services: optimize queries by company and active status
CREATE INDEX idx_services_active ON services(company_id, is_active)
    WHERE deleted_at IS NULL;

-- Employees: optimize company-scoped employee queries
CREATE INDEX idx_employees_active ON employees(company_id)
    WHERE deleted_at IS NULL;

-- Payments: optimize company-scoped payment queries
CREATE INDEX idx_payments_active ON payments(company_id)
    WHERE deleted_at IS NULL;

-- Reviews: optimize company-scoped review queries
CREATE INDEX idx_reviews_active ON reviews(company_id)
    WHERE deleted_at IS NULL;
