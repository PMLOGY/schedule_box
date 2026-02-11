---
status: complete
phase: 06-payment-integration
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md
started: 2026-02-11T23:00:00Z
updated: 2026-02-12T00:15:00Z
---

## Current Test

Complete - all 12 tests executed.

## Tests

### 1. Payment List API

expected: Run: curl "http://localhost:3000/api/v1/payments?page=1&limit=5" with Bearer token. Returns 200 with paginated list { data: [...], meta: { total, page, limit, total_pages } }. Each payment has uuid, amount, currency, status, gateway fields. No SERIAL IDs exposed.
result: pass
reported: "Returns 200 with 5 payments on page 1, meta { total:22, page:1, limit:5, total_pages:5 }. Each payment has UUID id, amount (string for decimal precision), currency, status, gateway, gateway_transaction_id, paid_at, created_at. No SERIAL IDs exposed. Initial 400 was expired token, not endpoint issue."

### 2. Manual Cash Payment Creation

expected: POST /api/v1/payments with Bearer token, body { "booking_id": (UUID of a pending booking), "gateway": "cash", "amount": 500, "currency": "CZK" }. Returns 201 with payment object (status "paid", gateway "cash"). The associated booking should be auto-confirmed via SAGA handler.
result: pass
reported: "Returns 201 with payment UUID f91b6000-1e79-4423-bf0d-06f0498c9e7d, status 'paid', gateway 'cash', amount 500. Booking was auto-confirmed via SAGA handler (status changed from 'pending' to 'confirmed'). Required fixes: (1) booking_id schema changed from z.number() to z.string().uuid(), (2) route handler changed from eq(bookings.id) to eq(bookings.uuid), (3) invoice date fields changed from Date objects to ISO date strings for Drizzle date() column type."

### 3. Payment Detail with Relationships

expected: GET /api/v1/payments/{uuid} with Bearer token (using payment UUID from test 2). Returns 200 with full payment detail including nested booking (uuid, status, service_name), customer (uuid, name, email), and invoice (uuid, invoice_number, status) if auto-generated.
result: pass
reported: "Returns 200 with full payment detail including nested booking (uuid, status='confirmed', service_name='Strih a foukanA'), customer (uuid, name='Petra NovAkovA', email), and invoice (uuid, invoice_number='2026-0001', status='issued'). All relationships correctly resolved."

### 4. Invoice Auto-Generation after Payment

expected: GET /api/v1/invoices?page=1&limit=5 with Bearer token. Returns 200 with paginated invoice list. An invoice should exist for the payment created in test 2, with invoice_number in YYYY-NNNN format, status "issued", and amount matching the payment.
result: pass
reported: "Returns 200 with paginated invoice list. Invoice 2026-0001 exists with status 'issued', amount 500.00 CZK, tax_amount 105.00 (21% VAT). Invoice auto-generated during cash payment creation."

### 5. Invoice PDF Download

expected: GET /api/v1/invoices/{uuid}/pdf with Bearer token (using invoice UUID from test 4). Returns 200 with Content-Type "application/pdf" and Content-Disposition header containing "faktura-YYYY-NNNN.pdf". The response body is a valid PDF binary.
result: pass
reported: "Returns 200 with Content-Type 'application/pdf', Content-Disposition 'attachment; filename=\"faktura-2026-0001.pdf\"', Content-Length 2129 bytes. Valid PDF binary. Required fix: PDFKit font data files (Helvetica.afm etc.) copied to .next/server/vendor-chunks/data/ directory. serverExternalPackages config also added for production builds."

### 6. QR Payment Generation (SPD Format)

expected: POST /api/v1/payments/qr-payment/generate with Bearer token, body { "booking_id": (UUID of another pending booking) }. Returns 200 with { qr_code_base64, spd_string, variable_symbol, payment_id }. The spd_string starts with "SPD*1.0*ACC:" and contains a valid IBAN. The qr_code_base64 starts with "data:image/png;base64,".
result: pass
reported: "Returns 200 with qr_code_base64 starting with 'data:image/png;base64,...', spd_string='SPD*1.0*ACC:CZ6508000000192000145399*AM:500.00*CC:CZK*X-VS:0000000222*MSG:ScheduleBox #f4403e41', variable_symbol='0000000222', payment_id UUID. Required fix: IBAN set in company settings (DB) since env var needed server restart. Booking_id schema also changed to UUID."

### 7. Payment Refund (Full)

expected: POST /api/v1/payments/{uuid}/refund with Bearer token (using payment UUID from test 2), body { "reason": "Customer request" }. Returns 200 with updated payment showing status "refunded" and refund_amount matching original amount.
result: pass
reported: "Returns 200 with payment status 'refunded', refund_amount '500.00', refund_reason 'Customer request', refundedAt timestamp set. Required fixes: (1) Comgate client changed from module-level env var validation (crashed all imports) to lazy getComgateCredentials() function, (2) AppError constructor args fixed (code, message order), (3) refund response changed to select UUID-safe fields only (was exposing SERIAL IDs)."

### 8. Payment Refund Validation (Already Refunded)

expected: POST /api/v1/payments/{uuid}/refund again with Bearer token (same payment from test 7), body { "reason": "Duplicate" }. Returns 422 or 400 error because payment is already fully refunded. No double-refund allowed.
result: pass
reported: "Returns VALIDATION_ERROR 'Payment must be paid or partially refunded to process refund'. Correctly prevents double-refund - payment was already in 'refunded' status from Test 7."

### 9. Payment Expiration Endpoint

expected: POST /api/v1/payments/expire-pending with Bearer token, body { "timeout_minutes": 999999 }. Returns 200 with { expired_count: 0 } (since timeout is very large, no payments should expire). Validates endpoint is accessible and functional.
result: pass
reported: "Returns 200 with { expired_count: 0 }. Endpoint functional. Required fix: cutoffTime changed from Date object to .toISOString() with ::timestamptz cast in SQL template literal."

### 10. Comgate Payment Create (Validation)

expected: POST /api/v1/payments/comgate/create with Bearer token, body { "booking_id": (UUID of a pending booking) }. Since no real Comgate credentials are configured, should return 500 or error related to Comgate API. But it should NOT return 404 (endpoint must exist) and should validate the booking exists first.
result: pass
reported: "Endpoint exists (not 404). First run returned PAYMENT_GATEWAY_ERROR about credentials not configured (expected without real Comgate sandbox). Second run (after QR payment created payment for same booking) returned VALIDATION_ERROR 'Payment already exists for this booking' - proving the endpoint validates booking state before calling Comgate. Both behaviors are correct."

### 11. Payment List Filtering

expected: GET /api/v1/payments?status=paid&gateway=cash with Bearer token. Returns 200 with only cash payments that have status "paid". Verifies filtering works correctly.
result: pass
reported: "Returns 200 with 8 cash/paid payments. All results have gateway='cash' and status='paid'. Meta shows total:8, page:1, limit:20, total_pages:1. Filtering by both status and gateway works correctly."

### 12. Webhook Idempotency Table

expected: Query the processed_webhooks table via a database check. The table should exist with columns: event_id (primary key), gateway_name, status, payload, processed_at. This validates the webhook infrastructure foundation.
result: pass
reported: "Table exists with columns: event_id (text, NOT NULL), gateway_name (varchar, NOT NULL), payment_id (integer, nullable), status (varchar, NOT NULL), payload (jsonb, nullable), processed_at (timestamptz, NOT NULL), completed_at (timestamptz, nullable). All expected columns present plus additional payment_id and completed_at columns."

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Gaps

### G1: AppError Constructor Argument Order (Non-blocking)

Several payment routes use `new AppError('human message', 'ERROR_CODE', status)` instead of correct `new AppError('ERROR_CODE', 'human message', status)`. This causes the API error response to show the human-readable message in the `code` field and the machine code in the `message` field. Affects: comgate/create/route.ts (5 instances), and was fixed in comgate/client.ts and [id]/refund/route.ts during this UAT session. Not blocking but should be standardized across all payment routes.

### G2: PDFKit Font Files Fragile in Dev (Non-blocking)

PDFKit's built-in Helvetica.afm font files are not included when Next.js bundles server code. Fix applied: (1) `serverExternalPackages: ['pdfkit']` in next.config.mjs for production, (2) font files manually copied to `.next/server/vendor-chunks/data/` for dev. The dev workaround is fragile - files need re-copying after `.next` is cleared. Consider a post-build script or explicit font registration.

## Fixes Applied During UAT

1. **booking_id UUID schema** - Changed all payment schemas from `z.number().int().positive()` to `z.string().uuid()` and route handlers from `eq(bookings.id, ...)` to `eq(bookings.uuid, ...)` in `packages/shared/src/schemas/payment.ts`, `payments/route.ts`, `comgate/create/route.ts`, `qr-payment/generate/route.ts`
2. **Invoice date serialization** - Changed `issuedAt`/`dueAt` from `new Date()` to ISO string format `'YYYY-MM-DD'` in `invoices/generate.ts` (Drizzle `date()` columns expect strings)
3. **Payment timeout date serialization** - Changed `cutoffTime` from Date to `.toISOString()` with `::timestamptz` cast in `payments/saga/payment-timeout.ts`
4. **Comgate client lazy init** - Changed module-level env var validation (crashed all imports) to lazy `getComgateCredentials()` function in `comgate/client.ts`
5. **AppError arg order** - Fixed swapped `(message, code)` to `(code, message)` in `comgate/client.ts`
6. **Refund SERIAL ID exposure** - Changed refund response from `select()` (all columns) to explicit UUID-safe field selection in `[id]/refund/route.ts`
7. **PDFKit font files** - Added `serverExternalPackages: ['pdfkit']` to `next.config.mjs` and copied .afm files to vendor-chunks
8. **Company IBAN** - Set IBAN in company settings DB for QR payment functionality
