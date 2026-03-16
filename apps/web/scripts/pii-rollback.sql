-- Rollback: Remove PII encryption columns
-- Run this ONLY if back-fill verification failed and you need to revert
-- WARNING: This permanently drops encrypted data — ensure no data loss before running
ALTER TABLE customers
  DROP COLUMN IF EXISTS email_ciphertext,
  DROP COLUMN IF EXISTS phone_ciphertext,
  DROP COLUMN IF EXISTS email_hmac;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_email_hmac;
