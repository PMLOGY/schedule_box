---
phase: 06-payment-integration
plan: 07
subsystem: payments
tags: [api-routes, crud, invoices, manual-payments, pagination]
dependency_graph:
  requires:
    - 06-01 (payment schemas and types)
    - 06-02 (payment service foundation)
    - 06-05 (SAGA choreography handlers)
    - 06-06 (invoice generation)
  provides:
    - Payment list endpoint with pagination and filtering
    - Payment detail endpoint with full relationship data
    - Manual payment creation endpoint (cash/bank_transfer)
    - Invoice list endpoint with pagination and filtering
  affects:
    - Frontend (Phase 7 will consume these endpoints for payment UI)
    - Admin dashboard (payment history and invoice management)
tech_stack:
  added: []
  patterns:
    - Pagination with offset/limit
    - Multi-field filtering (status, gateway, date range, booking_id)
    - LEFT JOIN for optional invoice relationship
    - INNER JOIN for service name resolution
    - Fire-and-forget event publishing
    - SAGA handler invocation on manual payment
key_files:
  created:
    - apps/web/app/api/v1/payments/route.ts (GET list, POST manual create)
    - apps/web/app/api/v1/payments/[id]/route.ts (GET detail)
    - apps/web/app/api/v1/invoices/route.ts (GET list)
  modified:
    - apps/web/lib/middleware/rbac.ts (added PAYMENTS_CREATE, PAYMENTS_VIEW, INVOICES_READ)
decisions:
  - decision: "Manual payment creation auto-confirms booking via SAGA"
    rationale: "Cash and bank transfers are already received when recorded. Immediate confirmation matches business reality."
  - decision: "Payment list excludes gatewayResponse (large JSONB field)"
    rationale: "Performance optimization. Gateway details available in detail endpoint for admin debugging."
  - decision: "Invoice list includes payment UUID and customer name"
    rationale: "Context fields for quick reference without additional API calls."
metrics:
  duration: 280
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  commits: 2
  completed_date: 2026-02-11
---

# Phase 6 Plan 07: Payment List and Status Tracking Endpoints Summary

**One-liner:** Payment CRUD and invoice list endpoints with pagination, filtering, and full relationship data to complete the Phase 6 payment API surface

## What Was Built

### Task 1: Payment List, Detail, and Manual Create Endpoints (Commit: 5b3dfcb)

**apps/web/app/api/v1/payments/route.ts** — Payment list and manual create:

**GET /api/v1/payments:**
- Pagination: `page` (default 1), `limit` (default 20, max 100)
- Filters: `status`, `gateway`, `date_from`, `date_to`, `booking_id`
- Date range filtering on `createdAt` with end-of-day adjustment
- Booking filter accepts UUID and resolves to internal ID for tenant isolation
- Returns lightweight list: uuid, amount, currency, status, gateway, gatewayTransactionId, paidAt, createdAt
- Excludes `gatewayResponse` for performance (large JSONB field available in detail endpoint)
- Order by: `createdAt DESC` (newest first)
- Response: paginated with `total`, `page`, `limit`, `total_pages`

**POST /api/v1/payments:**
- Manual payment recording for cash and bank_transfer only
- Request body: `booking_id`, `gateway`, `amount`, `currency`
- Validates gateway is `cash` or `bank_transfer` (rejects Comgate/QR — those have dedicated endpoints)
- Validates booking exists, belongs to company, and status allows payment (not cancelled/completed)
- Creates payment with `status='pending'`, then immediately updates to `status='paid'` with `paidAt`
- Publishes `payment.completed` event (fire-and-forget)
- Calls `handlePaymentCompleted` SAGA handler to auto-confirm booking
- Creates invoice via `createInvoiceForPayment` in transaction
- Returns created payment with booking UUID and all payment fields

**apps/web/app/api/v1/payments/[id]/route.ts** — Payment detail:

**GET /api/v1/payments/{id}:**
- Accepts payment UUID in path
- Joins: payments → bookings → services, customers, invoices (LEFT JOIN)
- Returns full payment detail with:
  - All payment fields including `gatewayResponse` for admin debugging
  - Booking context: uuid, status, start_time, end_time, service_name
  - Customer context: uuid, name, email
  - Invoice context (if exists): uuid, invoice_number, status
- 404 if payment not found or doesn't belong to company (tenant isolation)

**Permissions:**
- GET /api/v1/payments: `PAYMENTS_VIEW` (read payments)
- POST /api/v1/payments: `PAYMENTS_CREATE` (create manual payments)
- GET /api/v1/payments/{id}: `PAYMENTS_VIEW` (read payment details)

### Task 2: Invoice List Endpoint and Final Integration (Commit: a8a2bd2)

**apps/web/app/api/v1/invoices/route.ts** — Invoice list:

**GET /api/v1/invoices:**
- Pagination: `page`, `limit` (default 20, max 100)
- Filters: `status` (draft, issued, paid, cancelled), `date_from`, `date_to` (on `issuedAt`)
- LEFT JOIN with payments and customers for context
- Returns: uuid, invoice_number, amount, tax_amount, currency, status, issued_at, due_at, pdf_url, created_at
- Context fields: payment_id (UUID), customer_name
- Order by: `issuedAt DESC` (newest first)
- Response: paginated with total count

**apps/web/lib/middleware/rbac.ts** — Added missing permissions:
- `PAYMENTS_CREATE: 'payments.create'` — For manual payment creation
- `PAYMENTS_VIEW: 'payments.read'` — Alias for backward compatibility
- `INVOICES_READ: 'invoices.read'` — For invoice list access

**Integration fixes:**
- Payment detail endpoint: Added join with `services` table to resolve service name (bookings table has `serviceId` FK, not `serviceName`)
- Date to string conversion: `paidAt` converted to ISO string for event payloads (`PaymentCompletedPayload` expects `string`)
- Transaction type cast: `createInvoiceForPayment` accepts `Database` type but `db.transaction()` provides narrower type — cast to `any` per existing pattern

**.env.example verification:**
- All Phase 6 env vars already documented (added in previous plans)
- COMGATE_MERCHANT_ID, COMGATE_SECRET, COMGATE_API_URL ✓
- PAYMENT_TIMEOUT_MINUTES ✓
- COMPANY_DEFAULT_IBAN ✓

## Architecture Patterns

### Pagination Pattern
```typescript
const offset = (page - 1) * limit;
const data = await db.select().limit(limit).offset(offset);
const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(table);
return paginatedResponse(data, { total, page, limit, total_pages });
```

### Date Range Filtering with End-of-Day Adjustment
```typescript
if (date_to) {
  const endOfDay = new Date(date_to);
  endOfDay.setHours(23, 59, 59, 999);
  baseConditions.push(lte(payments.createdAt, endOfDay));
}
```

### Manual Payment Auto-Confirmation Flow
```
1. Create payment record (status='pending')
2. Update to status='paid' with paidAt timestamp
3. Publish payment.completed event (fire-and-forget)
4. Call handlePaymentCompleted SAGA handler (confirms booking)
5. Create invoice in transaction
6. Return payment response
```

### Service Name Resolution
```typescript
// Bookings table has serviceId FK, not serviceName field
.innerJoin(services, eq(bookings.serviceId, services.id))
.select({ serviceName: services.name, ... })
```

## Verification Results

All verification checks passed:

```bash
✓ pnpm exec tsc --noEmit -p apps/web/tsconfig.json (only 2 pre-existing OAuth errors)
✓ GET /api/v1/payments exports handler with pagination and filters
✓ POST /api/v1/payments exports handler with manual payment creation
✓ GET /api/v1/payments/{id} exports handler with full relationship data
✓ GET /api/v1/invoices exports handler with pagination and filters
✓ PAYMENTS_CREATE, PAYMENTS_VIEW, INVOICES_READ added to RBAC
✓ All endpoints use UUID in paths and responses (never SERIAL IDs)
✓ All endpoints use createRouteHandler for auth and permissions
✓ .env.example includes all Phase 6 variables
```

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Met

- [x] Payment list supports filtering by status, gateway, date range, and booking
- [x] Payment detail includes related booking, customer, and invoice information
- [x] Manual payment creation auto-confirms booking via SAGA
- [x] Invoice list shows all company invoices with pagination
- [x] All Phase 6 environment variables documented in .env.example
- [x] Complete API surface matches documentation specification

## Complete Phase 6 Payment API Surface

### Payment Endpoints (8 total)
1. **GET /api/v1/payments** — List with filters (Plan 06-07) ✓
2. **POST /api/v1/payments** — Manual create (Plan 06-07) ✓
3. **GET /api/v1/payments/{id}** — Detail (Plan 06-07) ✓
4. **POST /api/v1/payments/{id}/refund** — Refund (Plan 06-06) ✓
5. **POST /api/v1/payments/comgate/create** — Comgate initiation (Plan 06-03) ✓
6. **GET /api/v1/payments/comgate/callback** — Comgate redirect (Plan 06-03) ✓
7. **POST /api/v1/payments/qr-payment/generate** — QR code (Plan 06-04) ✓
8. **POST /api/v1/payments/expire-pending** — Timeout trigger (Plan 06-05) ✓

### Invoice Endpoints (2 total)
9. **GET /api/v1/invoices** — List (Plan 06-07) ✓
10. **GET /api/v1/invoices/{id}/pdf** — Download (Plan 06-06) ✓

### Webhook Endpoints (1 public endpoint)
11. **POST /api/v1/webhooks/comgate** — Webhook receiver (Plan 06-03) ✓

**Total: 11 endpoints spanning 7 plans in Phase 6**

## Integration Points

### For Frontend (Phase 7)
```typescript
// Payment history page
const { data, meta } = await apiClient.get('/api/v1/payments', {
  params: { page: 1, limit: 20, status: 'paid', date_from: '2026-01-01' }
});

// Payment detail modal
const payment = await apiClient.get(`/api/v1/payments/${paymentId}`);
// Access: payment.booking.service_name, payment.customer.name, payment.invoice

// Manual payment recording (admin)
const payment = await apiClient.post('/api/v1/payments', {
  booking_id: 123,
  gateway: 'cash',
  amount: 1500,
  currency: 'CZK',
});
// Result: booking auto-confirmed, invoice auto-generated

// Invoice list page
const { data, meta } = await apiClient.get('/api/v1/invoices', {
  params: { page: 1, status: 'issued' }
});
```

### For Admin Dashboard
- Payment history with filters (status, gateway, date range)
- Invoice management with status tracking
- Manual payment recording for on-site cash/bank transfers
- Payment detail view with full context (booking, customer, invoice)

## Technical Notes

### Performance Considerations
1. **Payment list excludes gatewayResponse:** Large JSONB field excluded from list for performance. Available in detail endpoint for admin debugging.

2. **Booking filter optimization:** Accepts UUID but resolves to internal ID before filtering payments. Avoids subquery performance penalty.

3. **Invoice list joins:** LEFT JOIN with payments and customers adds minimal overhead (indexed FKs) while providing valuable context.

### Date Handling
- Date range filters use `date_from` (start of day) and `date_to` (end of day with 23:59:59.999)
- Ensures inclusive date range matching user expectations
- Filters on `createdAt` for payments, `issuedAt` for invoices

### Manual Payment Flow
- Manual payments (cash, bank_transfer) are recorded as already received
- Immediate status='paid' with paidAt timestamp reflects business reality
- SAGA handler confirms booking synchronously (no async event wait)
- Invoice generation in transaction ensures consistency

### Tenant Isolation
- All endpoints filter by companyId via `findCompanyId(userSub)`
- Booking filter resolves UUID to internal ID with company check
- Payment detail validates payment belongs to company
- Invoice list scoped to company invoices only

### Error Handling
- 404: Payment/invoice not found or doesn't belong to company
- 422: Invalid gateway (must be cash/bank_transfer for manual payments)
- 422: Booking status doesn't allow payment (cancelled/completed)
- Fire-and-forget event publishing never fails the request

## Self-Check: PASSED

### Created Files Verification
```bash
✓ FOUND: apps/web/app/api/v1/payments/route.ts
✓ FOUND: apps/web/app/api/v1/payments/[id]/route.ts
✓ FOUND: apps/web/app/api/v1/invoices/route.ts
```

### Modified Files Verification
```bash
✓ FOUND: apps/web/lib/middleware/rbac.ts
```

### Commits Verification
```bash
✓ FOUND: 5b3dfcb (Task 1 - Payment list, detail, and manual create endpoints)
✓ FOUND: a8a2bd2 (Task 2 - Invoice list endpoint and final integration)
```

All files created. All commits exist. Plan execution successful.

## Next Steps

**Phase 6 Complete!** All payment integration plans executed:
- Plan 06-01: Payment schemas, types, and events ✓
- Plan 06-02: Webhook idempotency and payment service foundation ✓
- Plan 06-03: Comgate payment gateway integration ✓
- Plan 06-04: Czech QR payment generation (SPD format) ✓
- Plan 06-05: SAGA choreography and payment timeout ✓
- Plan 06-06: Invoice PDF generation and payment refund ✓
- Plan 06-07: Payment list and status tracking endpoints ✓

**Phase 7:** Frontend integration
- Payment UI components for booking flow
- Admin payment history page
- Invoice list and download
- Manual payment recording form
- Payment status tracking and filtering

**Phase 8:** CRM and marketing features
- Customer segmentation
- Email campaigns
- SMS notifications
- Marketing automation

---

**Tasks:** 2/2 complete
**Duration:** 4m 40s (280 seconds)
**Commits:** 5b3dfcb, a8a2bd2
