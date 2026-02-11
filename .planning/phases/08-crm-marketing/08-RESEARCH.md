# Phase 8: CRM & Marketing - Research

**Researched:** 2026-02-11
**Domain:** CRM & Marketing features (customer segmentation, coupons, gift cards, import/export, GDPR)
**Confidence:** HIGH

## Summary

Phase 8 implements customer relationship management features including tagging for segmentation, promotional coupons, gift card systems, bulk customer import/export, and GDPR compliance tools. The database schema is already in place (Phase 2), and customer CRUD with export is implemented (Phase 3). This phase completes the CRM functionality by adding coupon/gift card APIs, CSV import, and GDPR anonymization.

The technical domain is well-understood with established patterns for CSV parsing (PapaParse/csv-parse), bulk database operations (Drizzle ORM batch API), coupon validation (validation at checkout with usage tracking), gift card balance management (transaction log pattern), and GDPR compliance (soft delete + anonymization).

**Primary recommendation:** Use PapaParse for CSV import (browser and Node.js compatible, auto-delimiter detection), Drizzle batch API for bulk inserts with 1000-row chunks, implement coupon validation with real-time checks at booking time, track gift card transactions in append-only log, and use soft delete + field anonymization for GDPR compliance.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PapaParse | ^5.4.1 | CSV parsing | Industry standard for CSV parsing - works in browser and Node.js, auto-detects delimiters, handles quotes/malformed input, 700k+ weekly downloads |
| Drizzle ORM | ^0.38.0 | Batch operations | Already in use - native batch API for PostgreSQL bulk inserts with transaction support |
| Zod | ^3.24.1 | Validation | Already in use - schema validation for coupon codes, gift card redemption, CSV row validation |
| PostgreSQL | 16 | Database | Already in use - native support for RLS, arrays (applicable_service_ids), transactional integrity |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto | Node.js built-in | Gift card code generation | Use `randomBytes` for secure unique codes |
| csv-parse | ^5.6.0 | Alternative CSV parser | If streaming large files (>100MB) where memory is critical |
| fast-csv | ^5.0.1 | CSV formatting | If need to export customers to CSV (Phase 8 only needs JSON export per docs) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PapaParse | csv-parser | csv-parser is faster for streaming but lacks browser support and auto-detection |
| PapaParse | csv-parse | csv-parse has 2x downloads but PapaParse handles malformed CSVs better |
| Transaction log | Balance field only | Direct balance updates risk race conditions and lack audit trail |

**Installation:**
```bash
pnpm add papaparse
pnpm add -D @types/papaparse
```

## Architecture Patterns

### Recommended Project Structure

```
apps/web/app/api/v1/
├── coupons/
│   ├── route.ts              # GET (list), POST (create)
│   ├── [id]/route.ts         # PUT (update), DELETE (delete)
│   └── validate/route.ts     # POST (validate code before booking)
├── gift-cards/
│   ├── route.ts              # GET (list), POST (create)
│   ├── [id]/balance/route.ts # GET (check balance)
│   └── redeem/route.ts       # POST (redeem at booking)
└── customers/
    ├── import/route.ts       # POST (CSV upload) - currently scaffold
    └── [id]/
        ├── export/route.ts   # GET (GDPR export) - already implemented
        └── anonymize/route.ts # DELETE (GDPR anonymization) - new
```

### Pattern 1: CSV Import with Streaming and Validation

**What:** Parse CSV files in streaming mode, validate each row with Zod, batch insert valid rows while collecting errors
**When to use:** Importing customer lists from external systems (Excel exports, old CRM data)
**Example:**
```typescript
// Source: PapaParse docs + Drizzle batch pattern
import Papa from 'papaparse';
import { db, customers } from '@schedulebox/database';
import { customerImportSchema } from '@/validations/customer';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  const results = { imported: 0, skipped: 0, errors: [] };
  const batch = [];
  const BATCH_SIZE = 1000;

  return new Promise((resolve) => {
    Papa.parse(file.stream(), {
      header: true,
      skipEmptyLines: true,
      step: (row, parser) => {
        // Validate row
        const parsed = customerImportSchema.safeParse(row.data);
        if (!parsed.success) {
          results.errors.push({ row: row.meta.cursor, error: parsed.error });
          results.skipped++;
          return;
        }

        // Add to batch
        batch.push({ ...parsed.data, companyId, source: 'import' });

        // Flush batch when full
        if (batch.length >= BATCH_SIZE) {
          await db.insert(customers).values(batch).onConflictDoNothing();
          results.imported += batch.length;
          batch.length = 0;
        }
      },
      complete: async () => {
        // Flush remaining
        if (batch.length > 0) {
          await db.insert(customers).values(batch).onConflictDoNothing();
          results.imported += batch.length;
        }
        resolve(successResponse({ data: results }));
      },
    });
  });
}
```

### Pattern 2: Coupon Validation with Multi-Condition Checks

**What:** Validate coupon code against expiration, usage limits, service applicability, customer history
**When to use:** During booking creation when customer applies a coupon code
**Example:**
```typescript
// Source: ScheduleBox docs lines 3453-3478 + e-commerce best practices
export const POST = createRouteHandler({
  bodySchema: z.object({
    code: z.string(),
    service_id: z.number().int(),
    customer_id: z.number().int(),
  }),
  handler: async ({ body, user }) => {
    const { companyId } = await findCompanyId(user!.sub);

    // Find coupon with company scope
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(and(
        eq(coupons.companyId, companyId),
        eq(coupons.code, body.code),
        eq(coupons.isActive, true)
      ))
      .limit(1);

    if (!coupon) {
      return successResponse({
        data: { valid: false, message: 'Invalid coupon code' }
      });
    }

    // Check expiration
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      return successResponse({
        data: { valid: false, message: 'Coupon not yet valid' }
      });
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      return successResponse({
        data: { valid: false, message: 'Coupon has expired' }
      });
    }

    // Check global usage limit
    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
      return successResponse({
        data: { valid: false, message: 'Coupon usage limit reached' }
      });
    }

    // Check per-customer usage limit
    const customerUsage = await db
      .select({ count: sql<number>`count(*)` })
      .from(couponUsage)
      .where(and(
        eq(couponUsage.couponId, coupon.id),
        eq(couponUsage.customerId, body.customer_id)
      ));

    if (customerUsage[0].count >= coupon.maxUsesPerCustomer) {
      return successResponse({
        data: { valid: false, message: 'You have already used this coupon' }
      });
    }

    // Check service applicability
    if (coupon.applicableServiceIds !== null &&
        !coupon.applicableServiceIds.includes(body.service_id)) {
      return successResponse({
        data: { valid: false, message: 'Coupon not valid for this service' }
      });
    }

    // Valid coupon - return discount info
    return successResponse({
      data: {
        valid: true,
        discount_type: coupon.discountType,
        discount_value: coupon.discountValue,
        message: 'Coupon applied successfully'
      }
    });
  }
});
```

### Pattern 3: Gift Card Transaction Log

**What:** Append-only transaction log pattern for gift card balance tracking
**When to use:** Gift card purchase, redemption, refund operations
**Example:**
```typescript
// Source: ScheduleBox docs lines 3523-3543 + gift card management patterns
export const POST = createRouteHandler({
  bodySchema: z.object({
    code: z.string(),
    booking_id: z.number().int(),
    amount: z.number().positive(),
  }),
  handler: async ({ body, user }) => {
    const { companyId } = await findCompanyId(user!.sub);

    // Atomic redemption with transaction
    return await db.transaction(async (tx) => {
      // Lock gift card row
      const [giftCard] = await tx
        .select()
        .from(giftCards)
        .where(and(
          eq(giftCards.code, body.code),
          eq(giftCards.companyId, companyId),
          eq(giftCards.isActive, true)
        ))
        .for('update'); // SELECT FOR UPDATE prevents race conditions

      if (!giftCard) {
        throw new NotFoundError('Gift card not found');
      }

      // Check expiration
      if (giftCard.validUntil && new Date() > giftCard.validUntil) {
        throw new ValidationError('Gift card has expired');
      }

      // Check balance
      if (giftCard.currentBalance < body.amount) {
        throw new ValidationError('Insufficient gift card balance');
      }

      // Deduct balance
      const newBalance = Number(giftCard.currentBalance) - body.amount;
      await tx
        .update(giftCards)
        .set({ currentBalance: String(newBalance), updatedAt: new Date() })
        .where(eq(giftCards.id, giftCard.id));

      // Log transaction
      await tx.insert(giftCardTransactions).values({
        giftCardId: giftCard.id,
        bookingId: body.booking_id,
        type: 'redemption',
        amount: String(body.amount),
        balanceAfter: String(newBalance),
      });

      return successResponse({ data: { current_balance: newBalance } });
    });
  }
});
```

### Pattern 4: GDPR Anonymization (Soft Delete + PII Removal)

**What:** Soft delete customer record, anonymize PII fields, preserve booking statistics
**When to use:** Customer requests right to be forgotten (GDPR Article 17)
**Example:**
```typescript
// Source: GDPR compliance patterns + ScheduleBox docs lines 2749-2754
export const DELETE = createRouteHandler({
  paramsSchema: customerIdParamSchema,
  handler: async ({ params, user }) => {
    const { companyId } = await findCompanyId(user!.sub);

    // Find customer
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(
        eq(customers.uuid, params!.id),
        eq(customers.companyId, companyId),
        isNull(customers.deletedAt)
      ));

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Anonymize customer data (GDPR right to erasure)
    await db
      .update(customers)
      .set({
        name: `Deleted User ${customer.id}`,
        email: null,
        phone: null,
        dateOfBirth: null,
        notes: null,
        marketingConsent: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.id));

    // Note: Booking statistics (totalBookings, totalSpent) are preserved
    // for business analytics - these are aggregates, not PII

    return new NextResponse(null, { status: 204 });
  }
});
```

### Pattern 5: Atomic Tag Replacement (DELETE + INSERT)

**What:** Replace customer tags atomically within transaction
**When to use:** Updating customer tag assignments
**Example:**
```typescript
// Source: ScheduleBox docs Phase 03-06 decision
export const PUT = createRouteHandler({
  bodySchema: z.object({ tag_ids: z.array(z.number().int()) }),
  handler: async ({ params, body, user }) => {
    const { companyId } = await findCompanyId(user!.sub);

    // Verify customer exists
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(
        eq(customers.uuid, params!.id),
        eq(customers.companyId, companyId),
        isNull(customers.deletedAt)
      ));

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Atomic tag replacement
    await db.transaction(async (tx) => {
      // Delete existing tags
      await tx
        .delete(customerTags)
        .where(eq(customerTags.customerId, customer.id));

      // Insert new tags
      if (body.tag_ids.length > 0) {
        await tx.insert(customerTags).values(
          body.tag_ids.map(tagId => ({
            customerId: customer.id,
            tagId,
          }))
        );
      }
    });

    return successResponse({ data: { success: true } });
  }
});
```

### Anti-Patterns to Avoid

- **Direct balance updates without transaction log:** Always log gift card transactions for audit trail and dispute resolution
- **Race conditions in coupon/gift card redemption:** Use `SELECT FOR UPDATE` or increment operators to prevent double-spending
- **Hard delete for GDPR:** Soft delete + anonymization preserves referential integrity and business analytics
- **Loading entire CSV into memory:** Stream parse large files to prevent memory exhaustion
- **Per-row database inserts:** Batch inserts (1000 rows) are 10-50x faster than individual inserts
- **Exposing SERIAL IDs in coupon/gift card codes:** Use UUIDs or cryptographically random codes (crypto.randomBytes)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Manual string.split(',') | PapaParse | Handles quotes, escaped delimiters, malformed rows, encoding issues |
| Unique code generation | Math.random() | crypto.randomBytes() | Math.random() is not cryptographically secure, predictable codes = fraud risk |
| Date validation | Regex patterns | Zod date schema | Zod handles timezone, leap years, format validation |
| Bulk insert optimization | For loop + await | Drizzle batch API | Batch API uses single round trip, transaction wrapped, 10-50x faster |
| Discount calculation | Manual price * discount | Dedicated discount function | Edge cases: rounding, negative discounts, min order amount, stacking rules |
| GDPR compliance checker | Manual field list | GDPR data map + validation | Easy to miss PII fields when schema changes |

**Key insight:** CSV parsing and bulk operations have countless edge cases (character encoding, partial failures, memory limits, transaction rollback). Battle-tested libraries prevent production incidents that custom code misses.

## Common Pitfalls

### Pitfall 1: CSV Encoding Issues

**What goes wrong:** CSV files exported from Excel/Google Sheets use different encodings (UTF-8, UTF-16, Windows-1252), causing garbled characters
**Why it happens:** File upload doesn't specify encoding, parser uses default ASCII
**How to avoid:** PapaParse auto-detects encoding, but explicitly set `encoding: 'utf-8'` and validate characters in Zod schema
**Warning signs:** Customer names display as `\ufffd` or `Ã©` instead of accented characters

### Pitfall 2: Coupon Double-Redemption Race Condition

**What goes wrong:** Two simultaneous booking requests with same coupon code both pass validation and exceed max_uses
**Why it happens:** Check-then-increment pattern has race window between SELECT and UPDATE
**How to avoid:** Use database trigger (implemented in Phase 2) or atomic increment: `UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ? AND current_uses < max_uses`
**Warning signs:** `coupon.current_uses > coupon.max_uses` in production data

### Pitfall 3: Gift Card Balance Drift

**What goes wrong:** Gift card balance doesn't match sum of transactions
**Why it happens:** Direct balance updates without transaction log, or updates outside transaction
**How to avoid:** Always update balance and insert transaction within same database transaction, never update balance directly
**Warning signs:** Customer disputes balance, audit shows missing transaction records

### Pitfall 4: GDPR Export Misses Related Data

**What goes wrong:** Customer export doesn't include all PII (bookings, payments, tags), violating GDPR Article 20 (data portability)
**Why it happens:** Forgot to query related tables or added new PII fields without updating export
**How to avoid:** Maintain data map of all customer-linked tables, write integration test that verifies export completeness
**Warning signs:** Customer complaint that export is incomplete, GDPR audit flags missing data

### Pitfall 5: Import Duplicate Detection Logic

**What goes wrong:** CSV import creates duplicate customers instead of updating existing ones
**Why it happens:** Matching logic uses only email, but customer has multiple emails or phone number changed
**How to avoid:** Use `onConflictDoNothing()` or `onConflictDoUpdate()` with UNIQUE constraint on (company_id, email), document matching strategy clearly
**Warning signs:** Customer shows up twice in list, bookings split across duplicate records

### Pitfall 6: Coupon Code Case Sensitivity

**What goes wrong:** Customer enters "SAVE10" but code in database is "save10", validation fails
**Why it happens:** Database comparison is case-sensitive by default in PostgreSQL
**How to avoid:** Normalize codes to uppercase in validation schema before comparison: `code: z.string().toUpperCase()`, or use `ILIKE` in query
**Warning signs:** Support tickets "coupon code doesn't work" when code is correct but wrong case

## Code Examples

Verified patterns from official sources:

### Drizzle Batch Insert with Chunking

```typescript
// Source: Drizzle ORM docs - https://orm.drizzle.team/docs/batch-api
import { db, customers } from '@schedulebox/database';

async function bulkImport(rows: CustomerImport[], companyId: number) {
  const BATCH_SIZE = 1000;
  let imported = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);

    // Batch insert with conflict handling
    await db
      .insert(customers)
      .values(chunk.map(row => ({ ...row, companyId, source: 'import' })))
      .onConflictDoNothing({ target: [customers.email, customers.companyId] });

    imported += chunk.length;
  }

  return imported;
}
```

### PapaParse Streaming with Validation

```typescript
// Source: PapaParse docs - https://www.papaparse.com/docs#streaming
import Papa from 'papaparse';

function parseCSVStream(file: File, onRow: (data: any) => void) {
  return new Promise((resolve, reject) => {
    Papa.parse(file.stream(), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // Auto-convert numbers
      step: (results) => {
        if (results.errors.length > 0) {
          console.warn('Row errors:', results.errors);
        }
        onRow(results.data);
      },
      complete: resolve,
      error: reject,
    });
  });
}
```

### PostgreSQL RLS Policy for Multi-Tenant Coupons

```sql
-- Source: ScheduleBox docs Phase 02-07 + PostgreSQL RLS patterns
-- Already implemented in Phase 2, documented here for reference

CREATE POLICY coupons_tenant_isolation ON coupons
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::integer);

-- Application sets company_id in session:
-- SET LOCAL app.current_company_id = 123;
```

### Unique Gift Card Code Generation

```typescript
// Source: Node.js crypto docs
import crypto from 'crypto';

function generateGiftCardCode(): string {
  // Generate 16 random bytes, encode as hex
  const buffer = crypto.randomBytes(16);
  const code = buffer.toString('hex').toUpperCase();

  // Format as XXXX-XXXX-XXXX-XXXX for readability
  return code.match(/.{1,4}/g)?.join('-') || code;
}

// Example output: "A3F9-2D8E-7C1B-4E56"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|---------|
| Manual CSV parsing | PapaParse/csv-parse streaming | 2020-2021 | Handles 10GB+ files without memory issues |
| Check-then-increment | Database triggers/atomic ops | PostgreSQL 9.5+ (2016) | Eliminates race conditions in coupon redemption |
| Hard delete for GDPR | Soft delete + anonymization | GDPR effective 2018 | Preserves referential integrity and analytics |
| Per-row inserts | Batch API (Drizzle 0.28+) | 2023 | 10-50x faster imports, single transaction |
| Math.random() codes | crypto.randomBytes() | Always recommended | Cryptographically secure, prevents fraud |

**Deprecated/outdated:**

- **mysql/csv npm package:** Deprecated in favor of csv-parse (part of CSV suite)
- **Exposing discount logic to frontend:** Modern approach validates coupons server-side only to prevent manipulation
- **Synchronous CSV parsing:** Blocks event loop, replaced by streaming parsers
- **Foreign key ON DELETE CASCADE for customers:** GDPR requires soft delete, changed to ON DELETE RESTRICT with deletedAt pattern (implemented Phase 2)

## Open Questions

1. **CSV file size limits**
   - What we know: PapaParse handles streaming, Drizzle batches 1000 rows
   - What's unclear: Should we reject files >100MB or >1M rows?
   - Recommendation: Set limit at 500k rows (typical SMB size), document in API error message

2. **Coupon stacking rules**
   - What we know: Schema allows one coupon_id per booking (lines 1331)
   - What's unclear: Can gift card + coupon be combined?
   - Recommendation: Allow gift card + coupon (stored in separate fields), apply coupon first then gift card to remaining balance

3. **Gift card refund policy**
   - What we know: gift_card_transactions supports 'refund' type (line 1493)
   - What's unclear: Full refund only, or partial refunds?
   - Recommendation: Support partial refunds, validate refund_amount <= original_transaction_amount

4. **Customer merge functionality**
   - What we know: Import may create duplicates if email changed
   - What's unclear: Do we need customer merge API in Phase 8?
   - Recommendation: Defer to future phase - handle duplicates manually via support for now, add merge API if high demand

## Sources

### Primary (HIGH confidence)

- [Drizzle ORM - Insert operations](https://orm.drizzle.team/docs/insert)
- [Drizzle ORM - Batch API](https://orm.drizzle.team/docs/batch-api)
- [PapaParse - Official Documentation](https://www.papaparse.com/)
- [PostgreSQL Row Level Security - AWS Guide](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- ScheduleBox documentation (schedulebox_complete_documentation.md) - lines 1435-1498 (coupon/gift card schema), 2690-2863 (customer endpoints), 3404-3543 (coupon/gift card endpoints)
- ScheduleBox Phase 02 database schemas - packages/database/src/schema/customers.ts, coupons.ts, gift-cards.ts
- ScheduleBox Phase 03-06 implementation - apps/web/app/api/v1/customers/[id]/export/route.ts

### Secondary (MEDIUM confidence)

- [JavaScript CSV Parsers Comparison - LeanLabs](https://leanylabs.com/blog/js-csv-parsers-benchmarks/) - Performance benchmarks (2024)
- [npm-compare: papaparse vs csv-parser vs fast-csv](https://npm-compare.com/csv-parse,csv-parser,fast-csv,papaparse) - Download statistics and feature comparison
- [GDPR Compliance Guide 2026](https://secureprivacy.ai/blog/gdpr-compliance-2026) - Data anonymization requirements
- [Anonymization and GDPR - GDPR Summary](https://www.gdprsummary.com/anonymization-and-gdpr/) - Distinction between anonymization and deletion
- [Coupon Code Best Practices - Talon.One](https://www.talon.one/blog/coupon-code-best-practices-and-how-to-use-them-with-real-examples) - Validation and UX patterns
- [Gift Card Management Features - Opia](https://www.opia.com/insights/gift-card-management-features-and-best-software/) - Balance tracking and transaction log patterns
- [PostgreSQL RLS Multi-Tenant - Crunchy Data](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres) - RLS implementation guide

### Tertiary (LOW confidence)

- None - all findings verified with official docs or ScheduleBox implementation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - PapaParse and Drizzle ORM are officially documented and already in use
- Architecture: HIGH - Patterns verified in ScheduleBox codebase (Phase 3 export, Phase 2 schemas) and official library docs
- Pitfalls: MEDIUM-HIGH - Based on documented best practices and common production issues in e-commerce/CRM systems

**Research date:** 2026-02-11
**Valid until:** 2026-04-11 (60 days - stable domain with established libraries and patterns)
