---
phase: 09-loyalty-program
plan: 06
subsystem: backend
status: complete
completed_date: 2026-02-11
tags:
  - wallet
  - apple-wallet
  - google-wallet
  - passkit-generator
  - loyalty
  - pkpass
  - jwt
dependency_graph:
  requires:
    - loyalty-service-layer
    - loyalty-crud-api
    - loyalty-schemas
  provides:
    - apple-wallet-pass-generation
    - google-wallet-pass-generation
    - wallet-api-endpoints
  affects:
    - frontend-loyalty-card-detail
    - customer-portal
tech_stack:
  added:
    - passkit-generator: Apple Wallet .pkpass file generation (v3)
    - google-auth-library: Google Cloud service account authentication
  patterns:
    - wallet-config-error: ConfigurationError class for graceful 503 on missing credentials
    - skinny-jwt: Google Wallet JWT approach embedding class+object in claims
    - dynamic-import: ESM dynamic import for passkit-generator in CJS context
    - hex-to-rgb: Color conversion for Apple Wallet pass backgrounds
key_files:
  created:
    - apps/web/lib/loyalty/wallet/apple-wallet.ts
    - apps/web/lib/loyalty/wallet/google-wallet.ts
    - apps/web/app/api/v1/loyalty/cards/[id]/apple-pass/route.ts
    - apps/web/app/api/v1/loyalty/cards/[id]/google-pass/route.ts
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - title: passkit-generator v3 constructor props API
    rationale: PKPass v3 sets serialNumber, description, colors via constructor 3rd argument, not instance properties
    outcome: Properties passed in OverridablePassProps parameter to constructor
  - title: Skinny JWT for Google Wallet instead of REST API
    rationale: Avoids REST API calls to create class/object; embeds definitions in JWT claims for on-the-fly creation
    outcome: generateGooglePassUrl uses jsonwebtoken sign() with RS256 to create save URL
  - title: ConfigurationError class shared between both wallet services
    rationale: Consistent 503 error handling for missing credentials in both Apple and Google wallet routes
    outcome: Exported from apple-wallet.ts, imported by google-wallet.ts and both API routes
  - title: NextResponse for binary file download
    rationale: createRouteHandler expects NextResponse return type; Uint8Array conversion from Buffer for body compatibility
    outcome: new NextResponse(new Uint8Array(buffer)) with proper Content-Type and Content-Disposition headers
  - title: Google pass URL stored in loyaltyCards.googlePassUrl
    rationale: Plan specifies storing URL for future updates; truncated to 500 chars (field limit)
    outcome: URL saved on each generation for reference
patterns_established:
  - 'Wallet service pattern: separate service file in lib/loyalty/wallet/ with dedicated API route'
  - 'ConfigurationError pattern: custom error with statusCode 503 for graceful handling of missing external credentials'
  - 'Binary file response: NextResponse with Uint8Array body for non-JSON responses from createRouteHandler'
metrics:
  duration_seconds: 300
  tasks_completed: 2
  files_created: 4
  files_modified: 2
  commits: 2
  lines_added: 581
---

# Phase 09 Plan 06: Digital Wallet Pass Generation Summary

**Apple Wallet .pkpass generation with passkit-generator v3 and Google Wallet save URL via skinny JWT, both with graceful credential fallback**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-11
- **Completed:** 2026-02-11
- **Tasks:** 2
- **Files created:** 4
- **Files modified:** 2

## Accomplishments

- Apple Wallet .pkpass generation service using passkit-generator v3 with certificate-based signing
- Google Wallet save URL generation using skinny JWT approach with service account RS256 signing
- Both services gracefully handle missing credentials with descriptive ConfigurationError (503)
- API endpoints validate card ownership via company scope before generating passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Apple Wallet Pass Generation** - `f7b4540` (feat)
2. **Task 2: Google Wallet Pass Generation** - `03a9322` (feat)

## Files Created/Modified

- `apps/web/lib/loyalty/wallet/apple-wallet.ts` - Apple Wallet .pkpass generation using passkit-generator, ConfigurationError class, hex-to-rgb color conversion
- `apps/web/lib/loyalty/wallet/google-wallet.ts` - Google Wallet save URL generation using skinny JWT with jsonwebtoken RS256
- `apps/web/app/api/v1/loyalty/cards/[id]/apple-pass/route.ts` - GET endpoint returning binary .pkpass file download
- `apps/web/app/api/v1/loyalty/cards/[id]/google-pass/route.ts` - GET endpoint returning JSON with saveUrl, stores URL in DB
- `apps/web/package.json` - Added passkit-generator and google-auth-library dependencies
- `pnpm-lock.yaml` - Lock file updated with 37 new packages

## Decisions Made

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| passkit-generator v3 constructor API | PKPass v3 uses 3rd constructor arg for props (serialNumber, colors) | Properties in OverridablePassProps, type set after construction |
| Skinny JWT for Google Wallet | Avoids REST API round-trips; class+object embedded in JWT claims | Single sign() call produces save URL with all card data |
| Shared ConfigurationError | Both wallets need same graceful missing-credential behavior | Exported from apple-wallet.ts, reused in google-wallet.ts |
| NextResponse for binary download | createRouteHandler expects NextResponse, Buffer incompatible with Response body | new NextResponse(new Uint8Array(buffer)) with pkpass headers |
| Google pass URL persistence | Store URL for future pass update workflows | googlePassUrl column updated on each URL generation |
| Dynamic import for passkit-generator | ESM module needs dynamic import in potential CJS context | await import('passkit-generator') at runtime |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] passkit-generator API mismatch**

- **Found during:** Task 1 (Apple Wallet service)
- **Issue:** Plan specified setting pass.serialNumber, pass.description, pass.foregroundColor as direct instance properties, but PKPass v3 requires these via constructor props argument
- **Fix:** Moved serialNumber, description, foregroundColor, backgroundColor, logoText to 3rd argument of PKPass constructor
- **Files modified:** apps/web/lib/loyalty/wallet/apple-wallet.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** f7b4540

**2. [Rule 3 - Blocking] Buffer incompatible with Response body**

- **Found during:** Task 1 (Apple pass API route)
- **Issue:** Node.js Buffer type not assignable to BodyInit for Response constructor; also createRouteHandler expects NextResponse, not Response
- **Fix:** Used new NextResponse(new Uint8Array(passBuffer)) for type compatibility
- **Files modified:** apps/web/app/api/v1/loyalty/cards/[id]/apple-pass/route.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** f7b4540

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both fixes necessary for TypeScript compilation. API behavior matches plan specification exactly.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

**External services require manual configuration.**

### Apple Wallet Setup

Environment variables needed:
- `APPLE_WWDR_CERT_PATH` - Path to Apple WWDR (G4) certificate (download from Apple Developer portal)
- `APPLE_PASS_CERT_PATH` - Path to Pass Type ID certificate (create via Apple Developer portal -> Identifiers -> Pass Type IDs)
- `APPLE_PASS_KEY_PATH` - Path to private key .pem file (export from Keychain Access)
- `APPLE_PASS_KEY_PASSPHRASE` - Passphrase set during key export (optional)
- `APPLE_TEAM_ID` - Apple Developer Team Identifier

### Google Wallet Setup

Environment variables needed:
- `GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH` - Path to service account JSON key file (Google Cloud Console -> IAM -> Service Accounts)
- `GOOGLE_WALLET_ISSUER_ID` - Issuer ID from Google Wallet API Merchant Center

Both services return descriptive 503 errors when credentials are missing, allowing safe development without certificates.

## Verification Results

**TypeScript Compilation:** PASSED
- Only pre-existing button.tsx error remains (unrelated)
- All 4 new files compile cleanly

**Route Coverage:**

| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| /api/v1/loyalty/cards/:id/apple-pass | GET | Created | application/vnd.apple.pkpass binary |
| /api/v1/loyalty/cards/:id/google-pass | GET | Created | JSON { saveUrl: string } |

**Tenant Isolation:** VERIFIED
- Both routes validate card ownership via loyaltyPrograms.companyId JOIN
- Uses createRouteHandler with PERMISSIONS.LOYALTY_MANAGE

**Credential Handling:** VERIFIED
- Missing Apple certs: ConfigurationError with descriptive message -> 503
- Missing Google creds: ConfigurationError with descriptive message -> 503
- Invalid cert paths: ConfigurationError with file error details -> 503

## Next Steps

**Phase 09 remaining plans:** Check plan 07+ for loyalty event consumers, frontend integration

**Dependencies satisfied:**
- [x] Apple Wallet .pkpass generation ready for customer-facing download
- [x] Google Wallet save URL ready for "Add to Google Wallet" button
- [x] Both services handle missing credentials gracefully for development
- [x] Card ownership validation prevents cross-tenant pass generation

**Pending integrations:**
- [ ] Frontend "Add to Wallet" buttons on customer loyalty card detail page
- [ ] Pass update webhooks when points balance changes (APNs for Apple, REST for Google)
- [ ] Actual Apple Developer certificates and Google Cloud service account provisioning

**Blockers:** None

## Self-Check: PASSED

**Created files exist:**
- FOUND: apps/web/lib/loyalty/wallet/apple-wallet.ts
- FOUND: apps/web/lib/loyalty/wallet/google-wallet.ts
- FOUND: apps/web/app/api/v1/loyalty/cards/[id]/apple-pass/route.ts
- FOUND: apps/web/app/api/v1/loyalty/cards/[id]/google-pass/route.ts

**Commits exist:**
- FOUND: f7b4540
- FOUND: 03a9322

All claims verified.
