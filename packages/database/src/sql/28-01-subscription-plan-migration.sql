-- Phase 28-01: Subscription Plan Name Migration
-- Run AFTER drizzle-kit migration that creates the new tables and updates CHECK constraint
-- This script updates existing rows to use new plan names and creates the invoice sequence

-- Update existing plan names (old -> new)
UPDATE companies SET subscription_plan = 'essential' WHERE subscription_plan = 'starter';
UPDATE companies SET subscription_plan = 'growth' WHERE subscription_plan = 'professional';
UPDATE companies SET subscription_plan = 'ai_powered' WHERE subscription_plan = 'enterprise';

-- Create subscription invoice sequence for globally unique invoice numbering
-- Format: SB-YYYY-NNNNNN (e.g., SB-2026-000001)
CREATE SEQUENCE IF NOT EXISTS subscription_invoice_seq START 1;
