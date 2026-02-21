---
plan: 21-03
phase: 21-payment-processing
status: deferred
started: 2026-02-20
completed: null
duration: n/a
---

## Summary

**Status:** DEFERRED — user chose to skip production credential setup and E2E payment verification for now.

**What was skipped:**
- Comgate KYC + production credential configuration
- Railway environment variable setup (COMGATE_MERCHANT_ID, COMGATE_SECRET, CRON_SECRET)
- Railway cron job setup for payment expiration
- Real card payment E2E testing (create → webhook → confirm → refund)

**Prerequisites complete (from Plans 01-02):**
- Webhook POST body secret verification implemented and tested
- Defense-in-depth API status check added
- Cron payment expiration endpoint created
- Environment variable documentation corrected

**To resume later:**
1. Complete Comgate KYC at portal.comgate.cz
2. Add COMGATE_MERCHANT_ID, COMGATE_SECRET, CRON_SECRET to Railway
3. Set webhook URL in Comgate portal
4. Test real card payment flow

## Self-Check: DEFERRED

Deferred by user — no automated verification possible without production credentials.
