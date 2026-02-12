---
status: complete
phase: 08-crm-marketing
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md
started: 2026-02-12T12:00:00Z
updated: 2026-02-12T12:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Coupon CRUD Endpoints

expected: API routes exist for list (GET with pagination, search, is_active filter), create (POST with duplicate code check), detail (GET by UUID), update (PUT with duplicate code check on code change), and delete (DELETE with CASCADE). All use createRouteHandler with PERMISSIONS.COUPONS_MANAGE and findCompanyId().
result: pass

### 2. Coupon Code Normalization

expected: Coupon codes are automatically transformed to uppercase via Zod .transform() in both create and validate schemas. Creating a coupon with code "summer10" stores it as "SUMMER10".
result: pass

### 3. Coupon Validation for Booking

expected: POST /api/v1/coupons/validate checks 5 conditions in order: active status, validFrom date, validUntil date, global usage limit (maxUses), per-customer usage limit (maxUsesPerCustomer), and service applicability (applicableServiceIds). Returns {valid: true, discount_type, discount_value} on success or {valid: false, message} on failure. Customer UUID resolved to SERIAL ID for usage tracking.
result: pass

### 4. Gift Card CRUD with Auto-Generated Code

expected: POST /api/v1/gift-cards creates a gift card with auto-generated code in XXXX-XXXX-XXXX-XXXX format using crypto.randomBytes(8). Code returned on creation. GET lists with pagination/search/is_active filter. GET [id] returns card details plus last 20 transactions. PUT updates metadata only (balance and code are immutable).
result: pass

### 5. Gift Card Balance Check

expected: GET /api/v1/gift-cards/[id]/balance returns current balance info including initial balance, current balance, currency, is_active status, and valid_until date. Numeric balance fields returned as numbers (not strings).
result: pass

### 6. Gift Card Atomic Redemption

expected: POST /api/v1/gift-cards/redeem uses SELECT FOR UPDATE within db.transaction() to lock the gift card row, validates expiration and sufficient balance, deducts amount, and inserts a redemption transaction record. Returns error for expired cards or insufficient balance. Race conditions prevented by row-level locking.
result: pass

### 7. CSV Customer Import

expected: POST /api/v1/customers/import accepts CSV file, parses with PapaParse (header detection, skipEmptyLines), validates each row with Zod (name required, email/phone/date_of_birth/notes optional), batch inserts in groups of 1000 with onConflictDoNothing for duplicates. Returns {imported, skipped, errors[], total_rows}. File size capped at 10MB, row count at 500k, errors capped at 100.
result: pass

### 8. GDPR Anonymization

expected: DELETE /api/v1/customers/[id]/anonymize nullifies all PII fields (email, phone, dateOfBirth, notes), replaces name with "Deleted User {uuid}", sets marketingConsent=false, sets deletedAt timestamp, and removes all customer_tags. Preserves business analytics (totalBookings, totalSpent, healthScore, clvPredicted, noShowCount). Requires PERMISSIONS.CUSTOMERS_DELETE. Returns 204 No Content.
result: pass

### 9. Transaction Logging for Gift Cards

expected: All balance changes are recorded in gift_card_transactions: 'purchase' transaction on creation (amount=initialBalance), 'redemption' transaction on redeem (amount deducted, balanceAfter calculated). Transaction history visible in GET /api/v1/gift-cards/[id] response.
result: pass

### 10. Zod Validation Schemas

expected: Dedicated validation schemas exist in apps/web/validations/coupon.ts (couponCreateSchema, couponUpdateSchema, couponQuerySchema, couponValidateSchema) and apps/web/validations/gift-card.ts (giftCardCreateSchema, giftCardUpdateSchema, giftCardQuerySchema, giftCardBalanceSchema, giftCardRedeemSchema). Customer import row schema added to apps/web/validations/customer.ts.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
