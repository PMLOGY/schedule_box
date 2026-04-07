/**
 * Customer List and Create Endpoints
 * GET  /api/v1/customers - List customers with pagination, search, tag filter, and sorting
 * POST /api/v1/customers - Create new customer
 *
 * PII encryption (expand phase):
 * - Writes: dual-write to both plaintext columns and new ciphertext/HMAC columns
 * - Reads: email search uses HMAC index; response decrypts from ciphertext if available,
 *   falls back to plaintext for rows not yet back-filled
 */

import { eq, and, isNull, or, ilike, sql } from 'drizzle-orm';
import { db, customers, customerTags, tags } from '@schedulebox/database';
import { ConflictError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { createdResponse, paginatedResponse } from '@/lib/utils/response';
import {
  customerCreateSchema,
  customerQuerySchema,
  type CustomerQuery,
} from '@/validations/customer';
import { encrypt, decrypt, hmacIndex, getEncryptionKey } from '@/lib/security/encryption';

/** Safely convert a Date | null | undefined to ISO string or null */
function toISO(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  return d;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Decrypt a customer's email/phone from ciphertext if available.
 * Falls back to plaintext columns for rows not yet back-filled.
 */
function decryptCustomerContact(
  emailCiphertext: string | null | undefined,
  phoneCiphertext: string | null | undefined,
  emailPlaintext: string | null | undefined,
  phonePlaintext: string | null | undefined,
  key: string,
): { email: string | null; phone: string | null } {
  let email: string | null = null;
  let phone: string | null = null;

  if (emailCiphertext) {
    try {
      email = decrypt(emailCiphertext, key);
    } catch {
      // Decryption failure — fall back to plaintext (should not happen in production)
      email = emailPlaintext ?? null;
    }
  } else {
    email = emailPlaintext ?? null;
  }

  if (phoneCiphertext) {
    try {
      phone = decrypt(phoneCiphertext, key);
    } catch {
      phone = phonePlaintext ?? null;
    }
  } else {
    phone = phonePlaintext ?? null;
  }

  return { email, phone };
}

// ============================================================================
// GET /api/v1/customers
// ============================================================================

/**
 * GET /api/v1/customers
 * List customers with pagination, search, tag filter, and sorting
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(customerQuerySchema, req) as CustomerQuery;
    const { page, limit, search, tag_id, sort_by } = query;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build base WHERE conditions (company scoped + not deleted)
    const baseConditions = [eq(customers.companyId, companyId), isNull(customers.deletedAt)];

    // Add search condition
    // Email search: use HMAC index for exact match (encrypted); name/phone use ilike (plaintext)
    if (search) {
      const searchTerm = `%${search}%`;
      // Check if search looks like an email address — use HMAC exact match
      if (search.includes('@')) {
        const key = getEncryptionKey();
        const hmac = hmacIndex(search.trim().toLowerCase(), key);
        baseConditions.push(eq(customers.emailHmac, hmac));
      } else {
        // Name and phone search — plaintext ilike
        const searchCondition = or(
          ilike(customers.name, searchTerm),
          ilike(customers.phone, searchTerm),
        );
        if (searchCondition) {
          baseConditions.push(searchCondition);
        }
      }
    }

    // Build query based on tag filter
    let data;

    if (tag_id !== undefined) {
      // Query with tag filter (join with customer_tags)
      const queryWithTags = db
        .select({
          id: customers.id,
          uuid: customers.uuid,
          companyId: customers.companyId,
          userId: customers.userId,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          emailCiphertext: customers.emailCiphertext,
          phoneCiphertext: customers.phoneCiphertext,
          dateOfBirth: customers.dateOfBirth,
          gender: customers.gender,
          notes: customers.notes,
          source: customers.source,
          healthScore: customers.healthScore,
          clvPredicted: customers.clvPredicted,
          noShowCount: customers.noShowCount,
          totalBookings: customers.totalBookings,
          totalSpent: customers.totalSpent,
          lastVisitAt: customers.lastVisitAt,
          marketingConsent: customers.marketingConsent,
          preferredContact: customers.preferredContact,
          preferredReminderMinutes: customers.preferredReminderMinutes,
          isActive: customers.isActive,
          deletedAt: customers.deletedAt,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        })
        .from(customers)
        .innerJoin(customerTags, eq(customers.id, customerTags.customerId))
        .where(and(...baseConditions, eq(customerTags.tagId, tag_id)));

      // Add sorting based on sort_by parameter
      if (sort_by === 'name') {
        data = await queryWithTags.orderBy(customers.name).limit(limit).offset(offset);
      } else if (sort_by === 'total_bookings') {
        data = await queryWithTags.orderBy(customers.totalBookings).limit(limit).offset(offset);
      } else if (sort_by === 'total_spent') {
        data = await queryWithTags.orderBy(customers.totalSpent).limit(limit).offset(offset);
      } else if (sort_by === 'health_score') {
        data = await queryWithTags.orderBy(customers.healthScore).limit(limit).offset(offset);
      } else {
        data = await queryWithTags.orderBy(customers.lastVisitAt).limit(limit).offset(offset);
      }
    } else {
      // Query without tag filter
      const queryWithoutTags = db
        .select({
          id: customers.id,
          uuid: customers.uuid,
          companyId: customers.companyId,
          userId: customers.userId,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          emailCiphertext: customers.emailCiphertext,
          phoneCiphertext: customers.phoneCiphertext,
          dateOfBirth: customers.dateOfBirth,
          gender: customers.gender,
          notes: customers.notes,
          source: customers.source,
          healthScore: customers.healthScore,
          clvPredicted: customers.clvPredicted,
          noShowCount: customers.noShowCount,
          totalBookings: customers.totalBookings,
          totalSpent: customers.totalSpent,
          lastVisitAt: customers.lastVisitAt,
          marketingConsent: customers.marketingConsent,
          preferredContact: customers.preferredContact,
          preferredReminderMinutes: customers.preferredReminderMinutes,
          isActive: customers.isActive,
          deletedAt: customers.deletedAt,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        })
        .from(customers)
        .where(and(...baseConditions));

      // Add sorting based on sort_by parameter
      if (sort_by === 'name') {
        data = await queryWithoutTags.orderBy(customers.name).limit(limit).offset(offset);
      } else if (sort_by === 'total_bookings') {
        data = await queryWithoutTags.orderBy(customers.totalBookings).limit(limit).offset(offset);
      } else if (sort_by === 'total_spent') {
        data = await queryWithoutTags.orderBy(customers.totalSpent).limit(limit).offset(offset);
      } else if (sort_by === 'health_score') {
        data = await queryWithoutTags.orderBy(customers.healthScore).limit(limit).offset(offset);
      } else {
        data = await queryWithoutTags.orderBy(customers.lastVisitAt).limit(limit).offset(offset);
      }
    }

    // Get total count for pagination metadata
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(and(...baseConditions));

    // Add tag filter to count query if needed
    let totalCount: number;
    if (tag_id !== undefined) {
      const [countResult] = await db
        .select({ count: sql<number>`count(DISTINCT ${customers.id})::int` })
        .from(customers)
        .innerJoin(customerTags, eq(customers.id, customerTags.customerId))
        .where(and(...baseConditions, eq(customerTags.tagId, tag_id)));
      totalCount = countResult.count;
    } else {
      const [countResult] = await countQuery;
      totalCount = countResult.count;
    }

    // Resolve encryption key for decrypting PII in responses
    let encKey: string | null = null;
    try {
      encKey = getEncryptionKey();
    } catch {
      // ENCRYPTION_KEY not set — return plaintext values (pre-migration compatibility)
    }

    // Map to response format (decrypt PII if ciphertext available)
    const responseData = data.map((customer) => {
      const { email, phone } =
        encKey !== null
          ? decryptCustomerContact(
              customer.emailCiphertext,
              customer.phoneCiphertext,
              customer.email,
              customer.phone,
              encKey,
            )
          : { email: customer.email, phone: customer.phone };

      return {
        id: customer.id,
        uuid: customer.uuid,
        name: customer.name,
        email,
        phone,
        date_of_birth: customer.dateOfBirth,
        gender: customer.gender,
        notes: customer.notes,
        source: customer.source,
        health_score: customer.healthScore,
        clv_predicted: customer.clvPredicted,
        no_show_count: customer.noShowCount,
        total_bookings: customer.totalBookings,
        total_spent: customer.totalSpent,
        last_visit_at: toISO(customer.lastVisitAt),
        marketing_consent: customer.marketingConsent,
        preferred_contact: customer.preferredContact,
        preferred_reminder_minutes: customer.preferredReminderMinutes,
        is_active: customer.isActive,
        created_at: toISO(customer.createdAt),
        updated_at: toISO(customer.updatedAt),
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return paginatedResponse(responseData, {
      total: totalCount,
      page,
      limit,
      total_pages: totalPages,
    });
  },
});

// ============================================================================
// POST /api/v1/customers
// ============================================================================

/**
 * POST /api/v1/customers
 * Create new customer with optional tag assignment
 */
export const POST = createRouteHandler({
  bodySchema: customerCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_CREATE],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Resolve encryption key (used for both duplicate check and new record)
    let encKey: string | null = null;
    try {
      encKey = getEncryptionKey();
    } catch {
      // ENCRYPTION_KEY not set — proceed without encryption (pre-migration compatibility)
    }

    // Check for duplicate email within company (if email provided)
    // Prefer HMAC exact-match check when key is available (handles encrypted rows)
    if (body.email) {
      if (encKey) {
        const hmac = hmacIndex(body.email, encKey);
        const [existing] = await db
          .select({ id: customers.id })
          .from(customers)
          .where(
            and(
              eq(customers.companyId, companyId),
              eq(customers.emailHmac, hmac),
              isNull(customers.deletedAt),
            ),
          )
          .limit(1);

        if (!existing) {
          // Also check plaintext column for rows not yet back-filled
          const [existingPlaintext] = await db
            .select({ id: customers.id })
            .from(customers)
            .where(
              and(
                eq(customers.companyId, companyId),
                eq(customers.email, body.email),
                isNull(customers.emailHmac),
                isNull(customers.deletedAt),
              ),
            )
            .limit(1);

          if (existingPlaintext) {
            throw new ConflictError('Customer with this email already exists');
          }
        } else {
          throw new ConflictError('Customer with this email already exists');
        }
      } else {
        // No encryption key — fall back to plaintext check
        const [existing] = await db
          .select({ id: customers.id })
          .from(customers)
          .where(
            and(
              eq(customers.companyId, companyId),
              eq(customers.email, body.email),
              isNull(customers.deletedAt),
            ),
          )
          .limit(1);

        if (existing) {
          throw new ConflictError('Customer with this email already exists');
        }
      }
    }

    // Build ciphertext fields for new record (dual-write expand phase)
    const encryptedFields =
      encKey !== null
        ? {
            emailCiphertext: body.email ? encrypt(body.email, encKey) : null,
            phoneCiphertext: body.phone ? encrypt(body.phone, encKey) : null,
            emailHmac: body.email ? hmacIndex(body.email, encKey) : null,
          }
        : {};

    // Insert customer (dual-write: plaintext + ciphertext during expand phase)
    const [customer] = await db
      .insert(customers)
      .values({
        companyId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        dateOfBirth: body.date_of_birth,
        notes: body.notes,
        marketingConsent: body.marketing_consent ?? false,
        ...encryptedFields,
      })
      .returning();

    // If tag_ids provided, insert into customer_tags junction table
    if (body.tag_ids && body.tag_ids.length > 0) {
      // Verify all tags belong to the company
      const companyTags = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.companyId, companyId));

      const companyTagIds = new Set(companyTags.map((t) => t.id));
      const invalidTags = body.tag_ids.filter((tagId: number) => !companyTagIds.has(tagId));

      if (invalidTags.length > 0) {
        throw new ConflictError(`Invalid tag IDs: ${invalidTags.join(', ')}`);
      }

      // Insert customer-tag associations
      await db.insert(customerTags).values(
        body.tag_ids.map((tagId: number) => ({
          customerId: customer.id,
          tagId,
        })),
      );
    }

    // Decrypt for response (or use plaintext if encryption not yet active)
    const { email, phone } =
      encKey !== null
        ? decryptCustomerContact(
            customer.emailCiphertext,
            customer.phoneCiphertext,
            customer.email,
            customer.phone,
            encKey,
          )
        : { email: customer.email, phone: customer.phone };

    // Return created customer — convert Date objects to ISO strings
    return createdResponse({
      id: customer.id,
      uuid: customer.uuid,
      name: customer.name,
      email,
      phone,
      date_of_birth: customer.dateOfBirth,
      gender: customer.gender,
      notes: customer.notes,
      source: customer.source,
      health_score: customer.healthScore,
      clv_predicted: customer.clvPredicted,
      no_show_count: customer.noShowCount,
      total_bookings: customer.totalBookings,
      total_spent: customer.totalSpent,
      last_visit_at: toISO(customer.lastVisitAt),
      marketing_consent: customer.marketingConsent,
      preferred_contact: customer.preferredContact,
      preferred_reminder_minutes: customer.preferredReminderMinutes,
      is_active: customer.isActive,
      created_at: toISO(customer.createdAt),
      updated_at: toISO(customer.updatedAt),
    });
  },
});
