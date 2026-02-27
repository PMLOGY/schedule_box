---
phase: 28-subscription-billing
plan: 05
subsystem: billing
tags: [invoice, pdf, pdfkit, czech-vat, sequence, subscription]

# Dependency graph
requires:
  - phase: 28-subscription-billing/02
    provides: subscription schema (subscription_invoices table, subscription_invoice_seq SEQUENCE), billing types (getVatRate, PLAN_CONFIG)
provides:
  - Subscription invoice creation with SEQUENCE-based numbering (SB-YYYY-NNNNNN)
  - Czech VAT-compliant PDF generation via PDFKit
  - Invoice list API endpoint (GET /api/v1/billing/invoices)
  - Invoice PDF download API endpoint (GET /api/v1/billing/invoices/[uuid]/pdf)
affects: [28-subscription-billing/03, 28-subscription-billing/04, billing-portal-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [subscription-invoice-sequence, seller-snapshot-czech-law, platform-as-seller-pattern]

key-files:
  created:
    - apps/web/app/api/v1/billing/invoice-service.ts
    - apps/web/app/api/v1/billing/invoices/route.ts
    - apps/web/app/api/v1/billing/invoices/[id]/pdf/route.ts
  modified: []

key-decisions:
  - 'Platform entity (ScheduleBox s.r.o.) is seller (Dodavatel), subscribing company is buyer (Odberatel) on subscription invoices'
  - 'sellerSnapshot freezes buyer company details at invoice creation time per Czech accounting law'
  - 'Invoice number uses PostgreSQL SEQUENCE via nextval for concurrency-safe globally unique numbering'
  - 'VAT rate stored on invoice record from company country at creation time, not hardcoded'

patterns-established:
  - 'Subscription invoice numbering: SB-YYYY-NNNNNN via PostgreSQL SEQUENCE (not MAX+1)'
  - 'Company detail snapshot (sellerSnapshot JSONB) for Czech law compliance on invoices'
  - 'Platform-as-seller pattern with env var overrides for billing entity details'

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 28 Plan 05: Subscription Invoice Service Summary

**Subscription invoice service with SEQUENCE-based SB-YYYY-NNNNNN numbering, Czech VAT-compliant PDF generation via PDFKit, and invoice list/download API endpoints**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T19:19:43Z
- **Completed:** 2026-02-24T19:23:44Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Invoice creation service with PostgreSQL SEQUENCE-based numbering (SB-YYYY-NNNNNN) preventing race conditions under concurrent renewals
- Czech VAT-compliant PDF generation with PDFKit: FAKTURA title, ICO/DIC, seller/buyer sections, VAT breakdown, payment info
- GET /api/v1/billing/invoices endpoint lists subscription invoices with UUID-only responses
- GET /api/v1/billing/invoices/[uuid]/pdf endpoint generates and downloads invoice PDF with proper Content-Disposition headers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create subscription invoice service with SEQUENCE-based numbering and PDF generation** - `d0221f7` (feat)
2. **Task 2: Create invoice API routes (list and PDF download)** - `cfa154f` (feat)

## Files Created/Modified

- `apps/web/app/api/v1/billing/invoice-service.ts` - Invoice service: createSubscriptionInvoice, generateSubscriptionInvoicePDF, getSubscriptionInvoicesForCompany, generateSubscriptionInvoiceNumber
- `apps/web/app/api/v1/billing/invoices/route.ts` - GET /api/v1/billing/invoices endpoint (invoice list for company)
- `apps/web/app/api/v1/billing/invoices/[id]/pdf/route.ts` - GET /api/v1/billing/invoices/[uuid]/pdf endpoint (PDF download)

## Decisions Made

- **Platform is seller on subscription invoices:** ScheduleBox s.r.o. (Dodavatel) issues invoices to subscribing companies (Odberatel). This is the reverse of booking invoices where the company is the seller.
- **sellerSnapshot for Czech law:** Company details frozen in JSONB at invoice creation time. Czech accounting law requires invoices to reflect buyer details at issuance, not current details.
- **PLATFORM_SELLER via env vars:** Platform billing entity details configurable via PLATFORM_COMPANY_NAME, PLATFORM_ICO, PLATFORM_DIC, PLATFORM_ADDRESS environment variables with sensible defaults.
- **Buffer to Uint8Array for Response:** Converted PDFKit Buffer output to Uint8Array for compatibility with the Web API Response constructor in Next.js.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Response constructor type incompatibility with Buffer**

- **Found during:** Task 2 (PDF download route)
- **Issue:** TypeScript error: `Buffer` is not assignable to `BodyInit | null | undefined` in the Web Response constructor
- **Fix:** Converted Buffer to Uint8Array via `new Uint8Array(pdfBuffer)` before passing to Response
- **Files modified:** apps/web/app/api/v1/billing/invoices/[id]/pdf/route.ts
- **Verification:** Type-check passes
- **Committed in:** cfa154f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix for TypeScript type compatibility. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

Optional: Set environment variables for platform billing entity details in production:
- `PLATFORM_COMPANY_NAME` - Platform company name (default: "ScheduleBox s.r.o.")
- `PLATFORM_ICO` - Platform registration number
- `PLATFORM_DIC` - Platform VAT ID
- `PLATFORM_ADDRESS` - Platform address

## Next Phase Readiness

- Invoice service ready for use by Plan 03 (renewal scheduler) to create invoices after successful billing cycles
- Invoice endpoints ready for Plan 04 (billing portal UI) to display invoice list and PDF downloads
- All exports available: createSubscriptionInvoice, generateSubscriptionInvoicePDF, getSubscriptionInvoicesForCompany

---

## Self-Check: PASSED

All 4 files verified present. All 2 commit hashes verified in git log.

---

_Phase: 28-subscription-billing_
_Completed: 2026-02-24_
