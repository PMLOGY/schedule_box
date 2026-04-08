/**
 * Customer Export Endpoint
 * GET /api/v1/customers/[id]/export - Export customer data for GDPR compliance
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, customers, customerTags, tags, bookings, payments } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { customerIdParamSchema, type CustomerIdParam } from '@/validations/customer';

/**
 * GET /api/v1/customers/[id]/export
 * Export all customer data for GDPR data portability
 * Includes customer details, bookings, payments, and tags
 */
export const GET = createRouteHandler<undefined, CustomerIdParam>({
  paramsSchema: customerIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Find customer by UUID with tenant isolation — explicit columns to avoid missing DB columns
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

    // Get customer tags
    const customerTagsList = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        created_at: tags.createdAt,
      })
      .from(customerTags)
      .innerJoin(tags, eq(customerTags.tagId, tags.id))
      .where(eq(customerTags.customerId, customer.id));

    // Get customer bookings (all, including deleted)
    const customerBookings = await db
      .select({
        id: bookings.uuid,
        service_id: bookings.serviceId,
        employee_id: bookings.employeeId,
        start_time: bookings.startTime,
        end_time: bookings.endTime,
        status: bookings.status,
        source: bookings.source,
        notes: bookings.notes,
        internal_notes: bookings.internalNotes,
        price: bookings.price,
        currency: bookings.currency,
        discount_amount: bookings.discountAmount,
        coupon_id: bookings.couponId,
        gift_card_id: bookings.giftCardId,
        no_show_probability: bookings.noShowProbability,
        cancelled_at: bookings.cancelledAt,
        cancellation_reason: bookings.cancellationReason,
        cancelled_by: bookings.cancelledBy,
        created_at: bookings.createdAt,
        updated_at: bookings.updatedAt,
        deleted_at: bookings.deletedAt,
      })
      .from(bookings)
      .where(and(eq(bookings.customerId, customer.id), eq(bookings.companyId, companyId)))
      .orderBy(bookings.startTime);

    // Get customer payments
    const customerPayments = await db
      .select({
        id: payments.uuid,
        booking_id: bookings.uuid,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        gateway: payments.gateway,
        gateway_transaction_id: payments.gatewayTransactionId,
        refund_amount: payments.refundAmount,
        refunded_at: payments.refundedAt,
        created_at: payments.createdAt,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(and(eq(bookings.customerId, customer.id), eq(payments.companyId, companyId)))
      .orderBy(payments.createdAt);

    // Return comprehensive customer data export for GDPR
    return successResponse({
      data: {
        customer: {
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
          deleted_at: customer.deletedAt,
        },
        tags: customerTagsList,
        bookings: customerBookings,
        payments: customerPayments,
      },
    });
  },
});
