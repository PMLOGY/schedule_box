-- =============================================================================
-- Row Level Security Policies
-- =============================================================================
-- Multi-tenant isolation policies for ScheduleBox.
--
-- SECURITY MODEL:
-- - Every table with company_id gets RLS enabled
-- - Tenant isolation: WHERE company_id = current_company_id()
-- - Admin bypass: WHERE current_user_role() = 'admin'
-- - Customer self-access: Special policy for customers viewing own bookings
--
-- TABLES WITH RLS (29 tables with company_id):
-- Auth: users, api_keys
-- Entities: customers, tags, service_categories, services, employees,
--           working_hours, working_hours_overrides, resource_types, resources
-- Bookings: bookings, availability_slots
-- Payments: payments, invoices
-- Business: coupons, gift_cards, loyalty_programs, notification_templates,
--           notifications, reviews
-- Platform: ai_predictions, marketplace_listings, video_meetings,
--           whitelabel_apps, automation_rules, analytics_events,
--           competitor_data, audit_logs
--
-- TABLES WITHOUT RLS (skipped with reasoning):
-- - companies: Root tenant table, no company_id
-- - roles, permissions, role_permissions: Global system tables
-- - password_history, refresh_tokens: User-scoped, not tenant-scoped
-- - Junction tables (no company_id): customer_tags, employee_services,
--   service_resources, booking_resources
-- - Loyalty sub-tables (accessed via program FK): loyalty_tiers, loyalty_cards,
--   loyalty_transactions, rewards
-- - Transaction logs (accessed via parent FK): coupon_usage,
--   gift_card_transactions, automation_logs
-- - ai_model_metrics: Global ML metrics table
-- =============================================================================

-- =============================================================================
-- AUTH & TENANCY
-- =============================================================================

-- users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_users ON users
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_users ON users
  USING (current_user_role() = 'admin');

-- api_keys table
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_api_keys ON api_keys
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_api_keys ON api_keys
  USING (current_user_role() = 'admin');

-- =============================================================================
-- CUSTOMERS
-- =============================================================================

-- customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_customers ON customers
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_customers ON customers
  USING (current_user_role() = 'admin');

-- tags table
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tags ON tags
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_tags ON tags
  USING (current_user_role() = 'admin');

-- =============================================================================
-- SERVICES
-- =============================================================================

-- service_categories table
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_service_categories ON service_categories
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_service_categories ON service_categories
  USING (current_user_role() = 'admin');

-- services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_services ON services
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_services ON services
  USING (current_user_role() = 'admin');

-- =============================================================================
-- EMPLOYEES
-- =============================================================================

-- employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_employees ON employees
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_employees ON employees
  USING (current_user_role() = 'admin');

-- working_hours table
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_working_hours ON working_hours
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_working_hours ON working_hours
  USING (current_user_role() = 'admin');

-- working_hours_overrides table
ALTER TABLE working_hours_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_working_hours_overrides ON working_hours_overrides
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_working_hours_overrides ON working_hours_overrides
  USING (current_user_role() = 'admin');

-- =============================================================================
-- RESOURCES
-- =============================================================================

-- resource_types table
ALTER TABLE resource_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_resource_types ON resource_types
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_resource_types ON resource_types
  USING (current_user_role() = 'admin');

-- resources table
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_resources ON resources
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_resources ON resources
  USING (current_user_role() = 'admin');

-- =============================================================================
-- BOOKINGS
-- =============================================================================

-- bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_bookings ON bookings
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_bookings ON bookings
  USING (current_user_role() = 'admin');

-- Customer self-access: customers can view their own bookings
CREATE POLICY customer_own_bookings ON bookings
  FOR SELECT
  USING (
    current_user_role() = 'customer'
    AND customer_id IN (
      SELECT id FROM customers WHERE user_id = current_user_id()
    )
  );

-- availability_slots table
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_availability_slots ON availability_slots
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_availability_slots ON availability_slots
  USING (current_user_role() = 'admin');

-- =============================================================================
-- PAYMENTS
-- =============================================================================

-- payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_payments ON payments
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_payments ON payments
  USING (current_user_role() = 'admin');

-- invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_invoices ON invoices
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_invoices ON invoices
  USING (current_user_role() = 'admin');

-- =============================================================================
-- COUPONS & GIFT CARDS
-- =============================================================================

-- coupons table
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_coupons ON coupons
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_coupons ON coupons
  USING (current_user_role() = 'admin');

-- gift_cards table
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_gift_cards ON gift_cards
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_gift_cards ON gift_cards
  USING (current_user_role() = 'admin');

-- =============================================================================
-- LOYALTY
-- =============================================================================

-- loyalty_programs table
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_loyalty_programs ON loyalty_programs
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_loyalty_programs ON loyalty_programs
  USING (current_user_role() = 'admin');

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

-- notification_templates table
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_notification_templates ON notification_templates
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_notification_templates ON notification_templates
  USING (current_user_role() = 'admin');

-- notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_notifications ON notifications
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_notifications ON notifications
  USING (current_user_role() = 'admin');

-- =============================================================================
-- REVIEWS
-- =============================================================================

-- reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_reviews ON reviews
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_reviews ON reviews
  USING (current_user_role() = 'admin');

-- =============================================================================
-- AI
-- =============================================================================

-- ai_predictions table
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_ai_predictions ON ai_predictions
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_ai_predictions ON ai_predictions
  USING (current_user_role() = 'admin');

-- =============================================================================
-- MARKETPLACE
-- =============================================================================

-- marketplace_listings table
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_marketplace_listings ON marketplace_listings
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_marketplace_listings ON marketplace_listings
  USING (current_user_role() = 'admin');

-- =============================================================================
-- VIDEO
-- =============================================================================

-- video_meetings table
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_video_meetings ON video_meetings
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_video_meetings ON video_meetings
  USING (current_user_role() = 'admin');

-- =============================================================================
-- WHITELABEL APPS
-- =============================================================================

-- whitelabel_apps table
ALTER TABLE whitelabel_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_whitelabel_apps ON whitelabel_apps
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_whitelabel_apps ON whitelabel_apps
  USING (current_user_role() = 'admin');

-- =============================================================================
-- AUTOMATION
-- =============================================================================

-- automation_rules table
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_automation_rules ON automation_rules
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_automation_rules ON automation_rules
  USING (current_user_role() = 'admin');

-- =============================================================================
-- ANALYTICS
-- =============================================================================

-- analytics_events table
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_analytics_events ON analytics_events
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_analytics_events ON analytics_events
  USING (current_user_role() = 'admin');

-- audit_logs table (company_id is nullable - survives company deletion)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (company_id = current_company_id() OR company_id IS NULL);

CREATE POLICY admin_bypass_audit_logs ON audit_logs
  USING (current_user_role() = 'admin');

-- competitor_data table
ALTER TABLE competitor_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_competitor_data ON competitor_data
  USING (company_id = current_company_id());

CREATE POLICY admin_bypass_competitor_data ON competitor_data
  USING (current_user_role() = 'admin');

-- =============================================================================
-- END OF RLS POLICIES
-- =============================================================================
