/**
 * Customer Tags Assignment Endpoint
 * PUT /api/v1/customers/[id]/tags - Replace all customer tags atomically
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, customers, customerTags, tags } from '@schedulebox/database';
import { NotFoundError, ConflictError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import {
  customerTagsSchema,
  customerIdParamSchema,
  type CustomerTags,
  type CustomerIdParam,
} from '@/validations/customer';

/**
 * PUT /api/v1/customers/[id]/tags
 * Replace all customer tags atomically (delete existing + insert new)
 */
export const PUT = createRouteHandler<CustomerTags, CustomerIdParam>({
  bodySchema: customerTagsSchema,
  paramsSchema: customerIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_UPDATE],
  handler: async ({ body, params, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Find customer by UUID with tenant isolation
    const [customer] = await db
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

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Verify all tag IDs belong to the company
    if (body.tag_ids.length > 0) {
      const companyTags = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.companyId, companyId));

      const companyTagIds = new Set(companyTags.map((t) => t.id));
      const invalidTags = body.tag_ids.filter((tagId: number) => !companyTagIds.has(tagId));

      if (invalidTags.length > 0) {
        throw new ConflictError(`Invalid tag IDs: ${invalidTags.join(', ')}`);
      }
    }

    // Delete all existing customer tags
    await db.delete(customerTags).where(eq(customerTags.customerId, customer.id));

    // Insert new tags (if any provided)
    if (body.tag_ids.length > 0) {
      await db.insert(customerTags).values(
        body.tag_ids.map((tagId: number) => ({
          customerId: customer.id,
          tagId,
        })),
      );
    }

    return successResponse({
      message: 'Customer tags updated successfully',
      tag_ids: body.tag_ids,
    });
  },
});
