---
phase: 06-payment-integration
plan: 04
subsystem: payments
tags: [qr-payment, spd-format, czech-banking, on-site-payment, backend]
dependency_graph:
  requires:
    - 06-01 (payment schemas and events)
    - 06-02 (payment service foundation)
  provides:
    - SPD format QR payment generation client
    - QR payment generate API endpoint
    - Czech Banking Association standard QR codes
  affects:
    - Future Phase 7 (payment confirmation via bank statement import)
    - Future Phase 9 (employee mobile app for on-site QR generation)
tech_stack:
  added:
    - qrcode library for QR code generation (already installed)
    - SPD (Short Payment Descriptor) format implementation
  patterns:
    - Manual SPD format string generation (no external dependency)
    - Idempotent QR generation (returns existing for pending payments)
    - Company IBAN from settings or environment variable
    - Variable symbol as payment reference (no gateway transaction ID upfront)
key_files:
  created:
    - apps/web/app/api/v1/payments/qr-payment/client.ts (SPD client)
    - apps/web/app/api/v1/payments/qr-payment/generate/route.ts (API endpoint)
  modified: []
decisions:
  - decision: "Implement SPD format manually instead of using @spayd/core"
    rationale: "SPD format is simple string concatenation. Avoid potentially unmaintained dependency for what is essentially a template string with validation."
  - decision: "Variable symbol as payment reference"
    rationale: "QR payments don't have gateway transaction IDs upfront. Variable symbol (booking ID) serves as the tracking reference for bank transfers."
  - decision: "Manual payment confirmation required"
    rationale: "QR payments don't have webhooks. Admin must manually mark as paid when bank transfer arrives. Future: FIO Bank API integration for automatic confirmation."
  - decision: "Company IBAN from company settings or env var"
    rationale: "MVP: Allow env var fallback for development. Production: IBAN stored in company.settings JSONB field."
metrics:
  duration: 235
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  commits: 2
  completed_at: 2026-02-11T15:32:56Z
---

# Phase 6 Plan 04: Czech QR Payment Generation (SPD Format) Summary

**One-liner:** SPD format QR payment generation for on-site customer payments using Czech Banking Association standard, compatible with all Czech and Slovak banking apps

## What Was Built

### Task 1: SPD Format QR Payment Client (Commit: 7d1ed9a)

Created `apps/web/app/api/v1/payments/qr-payment/client.ts` with SPD format implementation:

**Functions:**
1. **generateSPDString** — Manual SPD string generation
   - Format: `SPD*1.0*ACC:{iban}*AM:{amount}*CC:{currency}*X-VS:{variableSymbol}*MSG:{message}`
   - IBAN validation (CZ/SK, 24 characters)
   - Variable symbol validation (1-10 digits)
   - Amount formatted to 2 decimal places
   - Message truncated to 60 chars (SPD spec limit)

2. **generateCzechQRPayment** — QR code generation as base64 PNG
   - Calls generateSPDString to build SPD string
   - Uses qrcode.toDataURL with error correction level 'M' (15% recovery)
   - 300px width for optimal mobile scanning
   - Returns both spdString (for debugging) and qrCodeBase64 (data URL)

**Validation implemented:**
- IBAN must start with CZ or SK
- IBAN must be exactly 24 characters
- Variable symbol must be 1-10 digits only
- Message truncated to SPD limit (60 chars)

**Why manual SPD implementation:**
Research recommended @spayd/core, but for a simple format that's essentially string concatenation, implementing manually avoids dependency on potentially unmaintained package. SPD spec is stable and well-documented at https://qr-platba.cz/pro-vyvojare/specifikace-formatu/.

### Task 2: QR Payment Generate Endpoint (Commit: acf1464)

Created `POST /api/v1/payments/qr-payment/generate` endpoint:

**Flow:**
1. Validate booking exists and belongs to company
2. Verify booking status is 'pending' or 'confirmed' (can't pay cancelled/completed)
3. Check for existing pending payment (idempotent — returns existing QR if found)
4. Fetch company IBAN from company.settings.iban or COMPANY_DEFAULT_IBAN env var
5. Error if no IBAN configured: "Company bank account (IBAN) not configured"
6. Generate variable symbol = booking ID zero-padded to 10 digits (e.g., "0000001234")
7. Call generateCzechQRPayment with IBAN, amount, currency, variable symbol, message
8. Create payment record with gateway='qrcomat', status='pending'
9. Publish payment.initiated event (fire-and-forget)
10. Return QR code base64, SPD string, variable symbol, payment UUID

**Request:**
```json
{
  "booking_id": 123
}
```

**Response:**
```json
{
  "qr_code_base64": "data:image/png;base64,iVBORw0KG...",
  "spd_string": "SPD*1.0*ACC:CZ6508000000192000145399*AM:1500.00*CC:CZK*X-VS:0000000123*MSG:ScheduleBox #a1b2c3d4",
  "variable_symbol": "0000000123",
  "payment_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Security & Permissions:**
- Requires authentication (requiresAuth: true)
- Requires BOOKINGS_UPDATE permission (since payment is tied to booking workflow)
- Company-scoped via tenant isolation (findCompanyId)

**Error handling:**
- 404 if booking not found or doesn't belong to company
- 422 if booking status doesn't allow payment
- 422 if no IBAN configured

## Architecture Patterns

### SPD Format String Generation
```typescript
const spdString = [
  'SPD*1.0',
  `ACC:${cleanIban}`,
  `AM:${formattedAmount}`,
  `CC:${currency}`,
  `X-VS:${variableSymbol}`,
  `MSG:${truncatedMessage}`,
].join('*');
```

### Idempotent QR Generation
If pending payment already exists for booking, endpoint regenerates QR code (since it's deterministic based on booking ID) and returns same payment UUID. This prevents duplicate payment records.

### Payment Reference via Variable Symbol
Unlike Comgate which provides a gateway transaction ID, QR payments use the variable symbol (booking ID) as the tracking reference. When the bank transfer arrives, admin matches variable symbol to payment record.

### Company IBAN Resolution
```typescript
const companySettings = (company?.settings as Record<string, unknown> | null) || {};
const iban = (companySettings.iban as string | undefined) || process.env.COMPANY_DEFAULT_IBAN || '';
```

## Payment Confirmation Flow

**Important:** QR payments don't have automatic webhook confirmation like Comgate.

**MVP flow:**
1. Employee generates QR code via this endpoint
2. Customer scans QR with their bank app and pays
3. Bank transfer arrives (minutes to days later)
4. Admin sees payment in bank statement with variable symbol
5. Admin manually marks payment as paid via `PUT /api/v1/payments/{id}` (Plan 06-07)

**Future Phase 7 enhancement:**
- FIO Bank API integration for automatic payment confirmation
- Poll FIO Bank transactions, match variable symbol to payment record
- Auto-update payment status when transfer arrives

## Verification Results

- [x] TypeScript compilation passes (no errors in QR payment files)
- [x] qrcode package already installed in apps/web/package.json
- [x] POST endpoint exports handler
- [x] Payment record created with gateway='qrcomat'
- [x] SPD string follows Czech Banking Association spec
- [x] QR code generated as base64 data URL
- [x] Idempotency check prevents duplicate payments

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Met

- [x] QR payment generates valid SPD format string
- [x] QR code image returned as base64 PNG
- [x] Payment record created for tracking
- [x] Endpoint protected with authentication
- [x] Company IBAN validation prevents QR generation without configured bank account

## Integration Points

### For Frontend (Phase 9)
```typescript
// Employee mobile app - generate QR for on-site payment
const response = await apiClient.post('/api/v1/payments/qr-payment/generate', {
  booking_id: bookingId
});

// Display QR code to customer
<img src={response.data.qr_code_base64} alt="Payment QR Code" />
```

### For Payment Confirmation (Phase 7)
```typescript
// Admin manually marks payment as paid
await apiClient.put(`/api/v1/payments/${paymentId}`, {
  status: 'paid',
  paid_at: new Date().toISOString()
});

// Or: Automated FIO Bank integration
const fioTransactions = await fetchFIOBankTransactions();
for (const tx of fioTransactions) {
  const payment = await findPaymentByVariableSymbol(tx.vs);
  if (payment && payment.status === 'pending') {
    await updatePaymentStatus(payment.id, 'paid', { paidAt: tx.date });
  }
}
```

## Technical Notes

### SPD Format Compatibility
The SPD (Short Payment Descriptor) format is the Czech Banking Association standard for QR payments. All major Czech and Slovak banks support this format:
- Česká spořitelna
- Komerční banka
- ČSOB
- Raiffeisenbank
- mBank
- Air Bank
- Fio banka
- etc.

### QR Code Parameters
- **Error correction level M:** 15% recovery (sufficient for payment data, not excessive)
- **Width 300px:** Optimal size for mobile scanning without excessive data size
- **Margin 2:** Standard quiet zone around QR code

### Variable Symbol as Reference
Variable symbol is zero-padded to 10 digits (Czech banking standard) and serves as the unique payment reference. Since booking IDs are sequential integers, this provides a clean mapping between QR payments and booking records.

### Environment Variable Fallback
For development/testing, `COMPANY_DEFAULT_IBAN` env var can be set. Production: Each company configures their IBAN in company settings (future Phase 9 company settings UI).

## Next Steps

**Phase 6 Plan 05:** Comgate webhook handler
- Consume Comgate payment status notifications
- Use checkWebhookIdempotency from Plan 06-02
- Update payment status and trigger booking confirmation

**Phase 6 Plan 06:** Payment refund implementation
- Comgate refund API integration
- Refund validation and status transitions
- Refund event publishing

**Phase 7:** Payment confirmation automation
- Manual payment confirmation endpoint (for QR payments)
- Bank statement import/parsing
- FIO Bank API integration for automatic QR payment confirmation

## Self-Check: PASSED

### Files Created
```bash
✓ FOUND: apps/web/app/api/v1/payments/qr-payment/client.ts
✓ FOUND: apps/web/app/api/v1/payments/qr-payment/generate/route.ts
```

### Commits
```bash
✓ FOUND: 7d1ed9a (Task 1 - SPD format QR payment client)
✓ FOUND: acf1464 (Task 2 - QR payment generate endpoint)
```

All files created. All commits exist. Plan execution successful.

---

**Tasks:** 2/2 complete
**Duration:** 3m 55s
**Commits:** 7d1ed9a, acf1464
