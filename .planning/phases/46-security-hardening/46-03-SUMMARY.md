---
phase: 46-security-hardening
plan: 03
subsystem: database
tags: [encryption, aes-256-gcm, hmac-sha256, pii, gdpr, crypto]

# Dependency graph
requires:
  - phase: 45-infrastructure-migration
    provides: Neon PostgreSQL + Drizzle ORM baseline with customers table

provides:
  - AES-256-GCM encrypt/decrypt with random IV and auth tag verification
  - HMAC-SHA256 deterministic search index (case-normalized)
  - customers schema: emailCiphertext, phoneCiphertext, emailHmac columns
  - Drizzle migration 0003 for new PII columns and HMAC index
  - Back-fill script: 500-row batches, idempotent, verification step
  - Rollback SQL: drops all new columns safely
  - Customer routes: dual-write plaintext + ciphertext (expand phase)
  - Public booking route: HMAC-first customer lookup, dual-write on create/update

affects:
  - 46-04 (rate limiting — no interaction with PII encryption)
  - future contract phase (dropping plaintext email/phone columns)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AES-256-GCM with prepended IV + auth tag stored as base64
    - Key derivation via SHA-256 of (masterKey + ':enc') and (masterKey + ':hmac')
    - Expand-contract migration pattern — dual-write before dropping old columns
    - HMAC search index for encrypted fields — exact match without plaintext exposure

key-files:
  created:
    - apps/web/lib/security/encryption.ts
    - apps/web/lib/security/encryption.test.ts
    - apps/web/scripts/pii-backfill.ts
    - apps/web/scripts/pii-rollback.sql
    - packages/database/src/migrations/0003_glossy_vermin.sql
  modified:
    - packages/database/src/schema/customers.ts
    - apps/web/app/api/v1/customers/route.ts
    - apps/web/app/api/v1/public/company/[slug]/bookings/route.ts

key-decisions:
  - 'Expand-contract migration pattern — plaintext email/phone columns retained until back-fill verified; contract phase drops them later'
  - 'Key derivation: SHA-256 of masterKey+suffix produces separate enc/hmac keys from single ENCRYPTION_KEY env var'
  - 'Email search uses HMAC exact match (not ilike) to avoid exposing plaintext; non-email search (name/phone) remains ilike'
  - 'Graceful degradation: ENCRYPTION_KEY absence falls back to plaintext for pre-migration compatibility'
  - 'Buffer: IV (12 bytes) + auth tag (16 bytes) prepended to ciphertext, all base64-encoded in single column'

patterns-established:
  - 'PII Encryption: encrypt() on write, hmacIndex() for searchable index, decrypt() on read with plaintext fallback'
  - 'Dual-write pattern: new encrypted columns set alongside old plaintext columns during expand phase'
  - 'HMAC lookup first, then plaintext fallback for find-or-create customer logic'

requirements-completed:
  - SEC-03

# Metrics
duration: 25min
completed: 2026-03-16
---

# Phase 46 Plan 03: PII Encryption Summary

**AES-256-GCM at-rest encryption for customer email/phone with HMAC-SHA256 searchable index, schema migration, 500-row back-fill script, and dual-write route integration**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-16T19:37:00Z
- **Completed:** 2026-03-16T20:02:00Z
- **Tasks:** 2 of 3 (Task 3 is checkpoint:human-verify — stopped for review)
- **Files modified:** 8

## Accomplishments

- Encryption module with full TDD (11 tests, all pass): round-trip, random IV, tamper detection, unicode, HMAC determinism
- Drizzle migration 0003 adds emailCiphertext, phoneCiphertext, emailHmac columns to customers table
- Back-fill script processes rows in 500-row batches, idempotent, with verification step
- Customer routes dual-write plaintext + ciphertext (expand phase), HMAC-based email search
- Public booking route: HMAC-first lookup + dual-write on customer create/update
- Rollback SQL prepared before any data migration

## Task Commits

1. **TDD RED: failing encryption tests** - `d6a88ae` (test)
2. **Task 1: Encryption module + schema + migration + rollback SQL** - `c8b81ee` (feat)
3. **Task 2: Back-fill script + customer route integration** - `210dd80` (feat)

## Files Created/Modified

- `apps/web/lib/security/encryption.ts` - AES-256-GCM encrypt/decrypt + HMAC-SHA256 index + getEncryptionKey helper
- `apps/web/lib/security/encryption.test.ts` - 11 unit tests covering all behaviors
- `apps/web/scripts/pii-backfill.ts` - Batch back-fill script with verification step
- `apps/web/scripts/pii-rollback.sql` - DDL rollback: DROP COLUMN IF EXISTS for all 3 new columns
- `packages/database/src/schema/customers.ts` - Added emailCiphertext, phoneCiphertext, emailHmac columns + emailHmacIdx
- `packages/database/src/migrations/0003_glossy_vermin.sql` - ALTER TABLE + CREATE INDEX migration
- `apps/web/app/api/v1/customers/route.ts` - HMAC email search, decrypt on read, dual-write on create
- `apps/web/app/api/v1/public/company/[slug]/bookings/route.ts` - HMAC lookup + dual-write customer create/update

## Decisions Made

- Expand-contract migration: plaintext columns retained; contract phase will drop them after back-fill verified
- Key derivation from single `ENCRYPTION_KEY` using SHA-256 with `:enc`/`:hmac` suffixes to produce independent sub-keys
- Email search: `@` in search term triggers HMAC exact-match; name/phone continue using `ilike`
- Graceful degradation: if `ENCRYPTION_KEY` not set, falls back to plaintext for both reads and writes

## Deviations from Plan

**1. [Rule 3 - Blocking] Pre-existing merge conflicts in message JSON files blocked commit**

- **Found during:** Task 2 commit
- **Issue:** Working tree had unresolved merge conflict markers in cs.json, en.json, sk.json staged from a previous session
- **Fix:** Staged only task-specific files, avoided staging the conflicted JSON files
- **Files modified:** None (worked around pre-existing state)
- **Verification:** Commit succeeded with only Task 2 files staged

---

**Total deviations:** 1 blocking (pre-existing conflict resolution)
**Impact on plan:** No scope creep. All task work completed as specified.

## Issues Encountered

- Pre-commit hook (lint-staged) stash/restore mechanism conflicted with pre-existing unresolved merge markers in working tree — resolved by selective staging

## User Setup Required

Before running the back-fill, add `ENCRYPTION_KEY` to your environment:

```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env.local (dev) or Vercel environment variables (prod)
ENCRYPTION_KEY=<generated-hex-string>
```

Run back-fill during maintenance window:
```bash
ENCRYPTION_KEY=<your-key> pnpm tsx apps/web/scripts/pii-backfill.ts
```

Verify with SQL: `SELECT count(*) FROM customers WHERE email IS NOT NULL AND email_ciphertext IS NULL;` (should be 0)

## Next Phase Readiness

- PII encryption infrastructure complete and passing 46 tests
- Awaiting human review at checkpoint (Task 3) before proceeding
- Back-fill script ready to run after ENCRYPTION_KEY is provisioned
- Rollback SQL available if back-fill fails

---

_Phase: 46-security-hardening_
_Completed: 2026-03-16_
