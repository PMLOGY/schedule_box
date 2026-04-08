/**
 * Customer GDPR Anonymization Endpoint
 * DELETE /api/v1/customers/[id]/anonymize - Anonymize customer data for GDPR right-to-erasure
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, customers, customerTags } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { noContentResponse } from '@/lib/utils/response';
import { customerIdParamSchema, type CustomerIdParam } from '@/validations/customer';

/**
 * DELETE /api/v1/customers/[id]/anonymize
 * GDPR right-to-erasure: Anonymize all customer PII while preserving business statistics
 *
 * Anonymization process:
 * - Nullify PII fields: email, phone, dateOfBirth, notes
 * - Replace name with "Deleted User {uuid}"
 * - Disable marketing consent
 * - Set deletedAt timestamp (soft delete)
 * - Remove all customer tag associations
 *
 * Preserved fields:
 * - totalBookings, totalSpent (aggregate analytics, not PII)
 * - healthScore, clvPredicted, noShowCount (AI metrics, not PII)
 * - Customer record itself (for referential integrity with bookings)
 *
 * Difference from DELETE /customers/[id]:
 * - Soft delete: sets deletedAt, preserves data, can be restored
 * - Anonymize: irreversible PII removal, GDPR compliance
 */
export const DELETE = createRouteHandler<undefined, CustomerIdParam>({
  paramsSchema: customerIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_DELETE],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Find customer by UUID with tenant isolation — explicit columns
    const [customer] = await db
      .select({
        id: customers.id,
        uuid: customers.uuid,
        companyId: customers.companyId,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        isActive: customers.isActive,
        deletedAt: customers.deletedAt,
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

    // Anonymize customer data (GDPR right-to-erasure)
    await db
      .update(customers)
      .set({
        name: `Deleted User ${customer.uuid}`,
        email: null,
        phone: null,
        dateOfBirth: null,
        notes: null,
        marketingConsent: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.id));

    // Remove all tag associations for this customer
    await db.delete(customerTags).where(eq(customerTags.customerId, customer.id));

    // Return 204 No Content (successful anonymization)
    return noContentResponse();
  },
});
