---
phase: 28-subscription-billing
verified: 2026-02-24T19:37:54Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: Navigate to /cs/settings/billing as test owner. Verify page renders with Free plan, 4-plan grid, empty invoices.
    expected: Page loads, shows Free plan, 4 plan columns (0/490/1490/2990 CZK), empty invoice section.
    why_human: Visual UI rendering and Czech translations need human eyes.
  - test: Click Upgradovat on a paid plan. Verify Comgate redirect.
    expected: Browser redirects to Comgate payment page.
    why_human: Requires live Comgate merchant 498621 with recurring activated.
  - test: After payment, verify payment=pending polling overlay and activation.
    expected: Polling overlay polls every 2s, shows activation after webhook.
    why_human: Requires real-time payment flow with live Comgate gateway.
  - test: Trigger renewal and verify invoice PDF is generated and emailed.
    expected: Invoice PDF has FAKTURA, ICO/DIC, VAT breakdown, SB-YYYY-NNNNNN number.
    why_human: PDF visual layout compliance with Czech VAT needs human review.
---

# Phase 28: Subscription and Billing Verification Report

**Phase Goal:** Companies can subscribe to a paid plan, pay via Comgate recurring, auto-renew monthly, and receive compliant invoice PDFs.
**Verified:** 2026-02-24T19:37:54Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Owner can select a paid plan, complete Comgate payment with initRecurring=true, and see account reflect new plan | VERIFIED | subscribe/route.ts calls initComgatePayment with initRecurring: true; service.ts activateSubscription updates both subscriptions and companies tables. Billing page shows plan comparison grid. |
| 2 | BullMQ renewal job auto-charges via Comgate recurring; subscription transitions active->active with updated period | VERIFIED | billing-scheduler.ts processRenewals queries due subscriptions, calls chargeRecurringPayment, extends period. Uses upsertJobScheduler cron 0 6 * * *. |
| 3 | Failed payment transitions to past_due; dunning email sent; 14-day auto-expire to Free | VERIFIED | billing-scheduler.ts sets past_due+dunningStartedAt on failure, enqueues dunning email. processDunning expires after 14 days, sets company plan=free. |
| 4 | Owner can upgrade (immediate with proration) or downgrade (end of period) | VERIFIED | service.ts upgradeSubscription uses chargeRecurringPayment for server-side charge, initComgatePayment for no-token case. downgradeSubscription sets cancelAtPeriodEnd=true. |
| 5 | Owner receives PDF invoice by email; can download past invoices; Czech VAT compliant | VERIFIED | invoice-service.ts uses SEQUENCE (nextval), getVatRate, sellerSnapshot. PDF has FAKTURA, ICO/DIC, VAT breakdown, SB-YYYY-NNNNNN. Scheduler creates invoice+email after renewal. |

**Score:** 5/5 truths verified

### Required Artifacts (25 total, all VERIFIED)

All 25 artifacts verified at 3 levels (exists, substantive, wired). Key highlights:

- **subscriptions.ts** (158 lines): 3 tables with CHECK constraints, indexes, FKs
- **billing.ts** (201 lines): PLAN_CONFIG, state machine, types, helpers
- **comgate/client.ts** (334 lines): initRecurring + chargeRecurringPayment
- **billing/service.ts** (762 lines): 8 exported functions for full lifecycle
- **invoice-service.ts** (481 lines): SEQUENCE numbering, sellerSnapshot, PDFKit PDF
- **billing-scheduler.ts** (695 lines): processRenewals, processDunning, invoice creation
- **billing/page.tsx** (708 lines): 3 sections, payment polling, upgrade/downgrade flows
- **use-billing-query.ts** (221 lines): 4 query + 3 mutation hooks
- **7 API routes**: plans, subscribe, subscription, upgrade, downgrade, status, webhook
- **4 email templates**: dunning-payment-failed, dunning-final-warning, subscription-activated, subscription-invoice
- **Supporting files**: schema/index.ts barrel, relations.ts, SQL migration, cs.json, en.json

### Key Link Verification (14 total, all WIRED)

- subscribe/route.ts -> comgate/client.ts (initRecurring=true): WIRED
- webhook/route.ts -> subscriptionEvents (idempotency): WIRED
- service.ts -> billing.ts (VALID_SUBSCRIPTION_TRANSITIONS): WIRED
- service.ts -> comgate/client.ts (chargeRecurringPayment): WIRED
- billing-scheduler.ts -> Comgate (inlined chargeRecurringPayment): WIRED
- billing-scheduler.ts -> subscriptions (query due renewals): WIRED
- billing-scheduler.ts -> invoice creation (SEQUENCE+VAT+snapshot): WIRED
- schedulers/index.ts -> billing-scheduler.ts (startBillingScheduler): WIRED
- billing/page.tsx -> use-billing-query.ts (all 7 hooks): WIRED
- use-billing-query.ts -> billing API routes (fetch calls): WIRED
- subscriptions.ts -> auth.ts (companies FK): WIRED
- schema/index.ts -> subscriptions.ts (barrel export): WIRED
- types/index.ts -> billing.ts (barrel export): WIRED
- invoices/[id]/pdf/route.ts -> invoice-service.ts (generateSubscriptionInvoicePDF): WIRED

### Requirements Coverage

| Requirement | Status |
|-------------|--------|
| BILL-01: Subscribe to paid plan via Comgate recurring | SATISFIED |
| BILL-02: Auto-renew monthly via BullMQ scheduler | SATISFIED |
| BILL-03: Upgrade/downgrade from billing portal | SATISFIED |
| BILL-04: Czech VAT-compliant invoice PDFs | SATISFIED |
| BILL-05: Dunning workflow (past_due + 14d auto-expire) | SATISFIED |
| BILL-06: Billing portal with plan comparison + invoice history | SATISFIED |
| BILL-07: Invoice email with PDF download after each billing cycle | SATISFIED |

### Anti-Patterns Found

No blockers or warnings. Two Info-level eslint-disable comments for known Drizzle ORM type limitations, consistent with existing codebase patterns. No TODO/FIXME/PLACEHOLDER in any billing file.

### Human Verification Required

1. **Billing Portal Visual Rendering** - Navigate to /cs/settings/billing, verify Free plan, 4-plan grid, Czech text, responsive layout
2. **Comgate Payment Flow** - Test actual payment redirect and activation (requires live merchant)
3. **Invoice PDF Czech VAT Compliance** - Review PDF layout for FAKTURA, ICO/DIC, VAT breakdown
4. **Dunning Email Flow** - Verify Czech dunning emails with correct dates and links

### Gaps Summary

No gaps found. All 5 truths verified. All 25 artifacts substantive and wired. All 14 key links connected. All 7 requirements satisfied at code level. Only standard human verification items remain (visual UI, external service integration, PDF layout, email content).

---

_Verified: 2026-02-24T19:37:54Z_
_Verifier: Claude (gsd-verifier)_
