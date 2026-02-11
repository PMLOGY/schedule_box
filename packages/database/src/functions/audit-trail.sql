-- Audit trail trigger for critical business tables
-- Captures INSERT, UPDATE, DELETE operations with old/new values as JSONB

CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id INTEGER;
    v_user_id INTEGER;
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    -- Read session variables (set by application layer)
    v_company_id := current_setting('app.company_id', TRUE)::INTEGER;
    v_user_id := current_setting('app.user_id', TRUE)::INTEGER;

    -- Prepare old/new values based on operation
    IF (TG_OP = 'DELETE') THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
        v_company_id := COALESCE(v_company_id, OLD.company_id);
    ELSIF (TG_OP = 'INSERT') THEN
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
        v_company_id := COALESCE(v_company_id, NEW.company_id);
    ELSE -- UPDATE
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        v_company_id := COALESCE(v_company_id, NEW.company_id);
    END IF;

    -- Insert audit log entry
    INSERT INTO audit_logs (
        company_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent
    ) VALUES (
        v_company_id,
        v_user_id,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_old_values,
        v_new_values,
        current_setting('app.ip_address', TRUE),
        current_setting('app.user_agent', TRUE)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trail trigger to critical tables
CREATE TRIGGER trg_bookings_audit
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER trg_customers_audit
AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER trg_services_audit
AFTER INSERT OR UPDATE OR DELETE ON services
FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER trg_employees_audit
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER trg_payments_audit
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
