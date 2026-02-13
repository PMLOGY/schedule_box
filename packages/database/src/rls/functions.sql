-- =============================================================================
-- RLS Helper Functions
-- =============================================================================
-- Helper functions for Row Level Security policies.
-- These functions read from session variables set by the application layer.
--
-- Usage:
--   SET app.company_id = 123;
--   SET app.user_role = 'owner';
--   SET app.user_id = 456;
--
-- These functions are SECURITY DEFINER to ensure they always execute with
-- the permissions of the function owner (typically the database owner).
-- They are STABLE because they read session variables that don't change
-- within a transaction.
-- =============================================================================

-- Get company_id from session variable
CREATE OR REPLACE FUNCTION current_company_id() RETURNS INTEGER AS $$
BEGIN
  RETURN NULLIF(current_setting('app.company_id', true), '')::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get user role from session variable
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.user_role', true), '');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get user_id from session variable
CREATE OR REPLACE FUNCTION current_user_id() RETURNS INTEGER AS $$
BEGIN
  RETURN NULLIF(current_setting('app.user_id', true), '')::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
