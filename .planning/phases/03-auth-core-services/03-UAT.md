---
status: complete
phase: 03-auth-core-services
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md, 03-08-SUMMARY.md
started: 2026-02-10T22:00:00Z
updated: 2026-02-10T22:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. User Registration

expected: POST /api/v1/auth/register with { name, email, password, company_name } creates a new company and user. Returns 201 with user object (uuid, email, name, role) and JWT tokens (access_token, refresh_token, expires_in).
result: skipped
reason: Backend server not available for testing

### 2. User Login

expected: POST /api/v1/auth/login with { email, password } returns 200 with user object and JWT tokens. Using wrong credentials returns 401 with INVALID_CREDENTIALS error code.
result: skipped
reason: Backend server not available for testing

### 3. Token Refresh

expected: POST /api/v1/auth/refresh with { refresh_token } returns new access_token and refresh_token. Old refresh token becomes invalid (one-time use via rotation).
result: skipped
reason: Backend server not available for testing

### 4. User Profile

expected: GET /api/v1/auth/me with valid Bearer token returns 200 with user profile including company UUID (never internal SERIAL ID). PUT /api/v1/auth/me updates user name/phone.
result: skipped
reason: Backend server not available for testing

### 5. Logout

expected: POST /api/v1/auth/logout with valid Bearer token returns 204. The access token is blacklisted and subsequent requests with the same token return 401.
result: skipped
reason: Backend server not available for testing

### 6. Forgot Password (Security)

expected: POST /api/v1/auth/forgot-password always returns 200 with success message regardless of whether the email exists. Never reveals email existence.
result: skipped
reason: Backend server not available for testing

### 7. MFA Setup

expected: POST /api/v1/auth/mfa/setup (authenticated) returns TOTP secret, QR code data URL, and 10 backup codes. POST /api/v1/auth/mfa/verify with valid 6-digit code enables MFA on the account.
result: skipped
reason: Backend server not available for testing

### 8. API Key Management

expected: POST /api/v1/settings/api-keys creates a key with sb_live_ prefix and returns full key ONLY ONCE. GET /api/v1/settings/api-keys lists keys WITHOUT exposing the key hash. DELETE /api/v1/settings/api-keys/{id} soft-revokes the key.
result: skipped
reason: Backend server not available for testing

### 9. Customer CRUD

expected: POST /api/v1/customers creates a customer. GET /api/v1/customers/{uuid} returns customer detail with tags. PUT updates customer. DELETE soft-deletes (sets deletedAt, not actual deletion).
result: skipped
reason: Backend server not available for testing

### 10. Customer Search & Pagination

expected: GET /api/v1/customers?search=term searches across name, email, phone. Supports page/limit params and returns pagination meta (total, page, limit, total_pages). Supports sort_by and tag_id filter.
result: skipped
reason: Backend server not available for testing

### 11. Tag Management & Assignment

expected: POST /api/v1/tags creates a tag with name and hex color. PUT /api/v1/customers/{id}/tags with { tag_ids: [...] } atomically replaces all customer tags. GET /api/v1/tags lists all company tags.
result: skipped
reason: Backend server not available for testing

### 12. GDPR Customer Export

expected: GET /api/v1/customers/{id}/export returns complete customer data (profile + tags + bookings + payments) for GDPR data portability compliance.
result: skipped
reason: Backend server not available for testing

### 13. Service CRUD with Categories

expected: POST /api/v1/service-categories creates a category. POST /api/v1/services creates a service with duration, price, category. GET /api/v1/services supports category_id and is_active filters. DELETE soft-deletes.
result: skipped
reason: Backend server not available for testing

### 14. Employee CRUD with Service Assignment

expected: POST /api/v1/employees creates an employee. PUT /api/v1/employees/{id}/services atomically replaces service assignments. GET /api/v1/employees lists employees with their assigned services.
result: skipped
reason: Backend server not available for testing

### 15. Employee Working Hours & Overrides

expected: PUT /api/v1/employees/{id}/working-hours bulk-replaces working hours for employee. POST /api/v1/employees/{id}/schedule-overrides creates a date-specific exception (day off or modified hours).
result: skipped
reason: Backend server not available for testing

### 16. Resource CRUD with Types

expected: POST /api/v1/resource-types creates a type. POST /api/v1/resources creates a resource with optional type. GET returns resource with type via left join. DELETE is hard delete (FK constraint prevents deletion if in use).
result: skipped
reason: Backend server not available for testing

### 17. Company Settings

expected: GET /api/v1/settings/company returns full company profile. PUT /api/v1/settings/company accepts partial update (only specified fields change). PUT /api/v1/settings/working-hours bulk-replaces company-level default working hours.
result: skipped
reason: Backend server not available for testing

### 18. RBAC Enforcement

expected: Accessing any protected endpoint without a valid Bearer token returns 401. Accessing an endpoint without required permissions returns 403. Error responses follow format { error: { code, message, details } }.
result: skipped
reason: Backend server not available for testing

### 19. Validation Error Format

expected: Sending invalid data (e.g., missing required fields, invalid email format) returns 400 with VALIDATION_ERROR code and details array listing field paths and messages. Error details NEVER include raw input values (security).
result: skipped
reason: Backend server not available for testing

## Summary

total: 19
passed: 0
issues: 0
pending: 0
skipped: 19

## Gaps

[none yet]
