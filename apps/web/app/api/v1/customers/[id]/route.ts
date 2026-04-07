/**
 * Customer Detail, Update, and Delete Endpoints
 * GET    /api/v1/customers/[id] - Get customer details
 * PUT    /api/v1/customers/[id] - Update customer
 * DELETE /api/v1/customers/[id] - Soft delete customer (GDPR compliance)
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, customers, customerTags, tags } from '@schedulebox/database';
import { NotFoundError, ConflictError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, noContentResponse } from '@/lib/utils/response';
import {
  customerUpdateSchema,
  customerIdParamSchema,
  type CustomerUpdate,
  type CustomerIdParam,
} from '@/validations/customer';

/** Safely convert a Date | null | undefined to ISO string or null */
function toISO(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  return d;
}

/**
 * GET /api/v1/customers/[id]
 * Get customer details with tags (tenant isolated, UUID lookup)
 */
export const GET = createRouteHandler<undefined, CustomerIdParam>({
  paramsSchema: customerIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Query customer by UUID with tenant isolation — explicit column selection
    // to avoid referencing columns that may not exist in the DB yet
    const [customer] = await db
      .select({
        id: customers.id,
        uuid: customers.uuid,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        dateOfBirth: customers.dateOfBirth,
        gender: customers.gender,
        notes: customers.notes,
        customerMetadata: customers.customerMetadata,
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
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(
        and(
          eq(customers.uuid, params!.id),
          eq(customers.companyId, companyId),
          isNull(customers.deletedAt),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Get customer tags via junction table
    const customerTagsList = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(customerTags)
      .innerJoin(tags, eq(customerTags.tagId, tags.id))
      .where(eq(customerTags.customerId, customer.id));

    // Return customer with tags — convert Date objects to ISO strings
    return successResponse({
      id: customer.uuid,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      date_of_birth: customer.dateOfBirth,
      gender: customer.gender,
      notes: customer.notes,
      customer_metadata: customer.customerMetadata,
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
      tags: customerTagsList,
    });
  },
});

/**
 * PUT /api/v1/customers/[id]
 * Update customer (tenant isolated, with duplicate email check)
 */
export const PUT = createRouteHandler<CustomerUpdate, CustomerIdParam>({
  bodySchema: customerUpdateSchema,
  paramsSchema: customerIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_UPDATE],
  handler: async ({ body, params, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Find existing customer to get internal ID
    const [existingCustomer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.uuid, params!.id),
          eq(customers.companyId, companyId),
          isNull(customers.deletedAt),
        ),
      )
      .limit(1);

    if (!existingCustomer) {
      throw new NotFoundError('Customer not found');
    }

    // If email is being changed, check for duplicates within company
    if (body.email) {
      const [duplicate] = await db
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

      // If duplicate exists and it's not the same customer, throw error
      if (duplicate && duplicate.id !== existingCustomer.id) {
        throw new ConflictError('Customer with this email already exists');
      }
    }

    // Update customer
    const [updated] = await db
      .update(customers)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.date_of_birth !== undefined && { dateOfBirth: body.date_of_birth }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.customer_metadata !== undefined && { customerMetadata: body.customer_metadata }),
        ...(body.marketing_consent !== undefined && { marketingConsent: body.marketing_consent }),
      })
      .where(
        and(
          eq(customers.uuid, params!.id),
          eq(customers.companyId, companyId),
          isNull(customers.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundError('Customer not found');
    }

    // Return updated customer — convert Date objects to ISO strings
    return successResponse({
      id: updated.uuid,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      date_of_birth: updated.dateOfBirth,
      gender: updated.gender,
      notes: updated.notes,
      customer_metadata: updated.customerMetadata,
      source: updated.source,
      health_score: updated.healthScore,
      clv_predicted: updated.clvPredicted,
      no_show_count: updated.noShowCount,
      total_bookings: updated.totalBookings,
      total_spent: updated.totalSpent,
      last_visit_at: toISO(updated.lastVisitAt),
      marketing_consent: updated.marketingConsent,
      preferred_contact: updated.preferredContact,
      preferred_reminder_minutes: updated.preferredReminderMinutes,
      is_active: updated.isActive,
      created_at: toISO(updated.createdAt),
      updated_at: toISO(updated.updatedAt),
    });
  },
});

/**
 * DELETE /api/v1/customers/[id]
 * SOFT DELETE - sets deletedAt timestamp (GDPR compliance)
 * Does NOT actually delete the record from the database
 */
export const DELETE = createRouteHandler<undefined, CustomerIdParam>({
  paramsSchema: customerIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_DELETE],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Soft delete: set deletedAt timestamp
    const result = await db
      .update(customers)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(customers.uuid, params!.id),
          eq(customers.companyId, companyId),
          isNull(customers.deletedAt), // Only delete if not already deleted
        ),
      )
      .returning({ id: customers.id });

    if (result.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    return noContentResponse();
  },
});
