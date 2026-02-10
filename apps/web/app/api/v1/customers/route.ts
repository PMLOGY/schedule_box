/**
 * Customer List and Create Endpoints
 * GET  /api/v1/customers - List customers with pagination, search, tag filter, and sorting
 * POST /api/v1/customers - Create new customer
 */

import { eq, and, isNull, or, ilike, sql } from 'drizzle-orm';
import { db, customers, customerTags, tags } from '@schedulebox/database';
import { ConflictError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { validateQuery } from '@/lib/middleware/validate.js';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { successResponse, createdResponse, paginatedResponse } from '@/lib/utils/response.js';
import {
  customerCreateSchema,
  customerQuerySchema,
  type CustomerCreate,
  type CustomerQuery,
} from '@/validations/customer.js';

/**
 * GET /api/v1/customers
 * List customers with pagination, search, tag filter, and sorting
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Parse and validate query parameters
    const query = validateQuery(customerQuerySchema, req) as CustomerQuery;
    const { page, limit, search, tag_id, sort_by } = query;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build base WHERE conditions (company scoped + not deleted)
    const baseConditions = [eq(customers.companyId, companyId), isNull(customers.deletedAt)];

    // Add search condition (search in name, email, or phone)
    if (search) {
      const searchTerm = `%${search}%`;
      baseConditions.push(
        or(
          ilike(customers.name, searchTerm),
          ilike(customers.email, searchTerm),
          ilike(customers.phone, searchTerm),
        )!,
      );
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
      const queryWithoutTags = db.select().from(customers).where(and(...baseConditions));

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

    // Map to response format (use UUID, not SERIAL id)
    const responseData = data.map((customer) => ({
      id: customer.uuid,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      date_of_birth: customer.dateOfBirth,
      gender: customer.gender,
      notes: customer.notes,
      source: customer.source,
      health_score: customer.healthScore,
      clv_predicted: customer.clvPredicted,
      no_show_count: customer.noShowCount,
      total_bookings: customer.totalBookings,
      total_spent: customer.totalSpent,
      last_visit_at: customer.lastVisitAt,
      marketing_consent: customer.marketingConsent,
      preferred_contact: customer.preferredContact,
      preferred_reminder_minutes: customer.preferredReminderMinutes,
      is_active: customer.isActive,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    }));

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
    const { companyId } = await findCompanyId(user!.sub);

    // Check for duplicate email within company (if email provided)
    if (body.email) {
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

    // Insert customer
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

    // Return created customer (use UUID, not SERIAL id)
    return createdResponse({
      id: customer.uuid,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      date_of_birth: customer.dateOfBirth,
      gender: customer.gender,
      notes: customer.notes,
      source: customer.source,
      health_score: customer.healthScore,
      clv_predicted: customer.clvPredicted,
      no_show_count: customer.noShowCount,
      total_bookings: customer.totalBookings,
      total_spent: customer.totalSpent,
      last_visit_at: customer.lastVisitAt,
      marketing_consent: customer.marketingConsent,
      preferred_contact: customer.preferredContact,
      preferred_reminder_minutes: customer.preferredReminderMinutes,
      is_active: customer.isActive,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    });
  },
});
