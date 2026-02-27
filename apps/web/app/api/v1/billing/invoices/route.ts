/**
 * GET /api/v1/billing/invoices
 *
 * List subscription invoices for the authenticated company.
 * Protected endpoint - requires owner role (SETTINGS_MANAGE permission).
 *
 * Returns invoice records with UUIDs (never exposes SERIAL IDs).
 * Ordered by creation date descending (newest first).
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { getSubscriptionInvoicesForCompany } from '../invoice-service';

/**
 * GET /api/v1/billing/invoices
 * Returns list of subscription invoices for the authenticated company.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { companyId } = await findCompanyId(user.sub);

    const invoices = await getSubscriptionInvoicesForCompany(companyId);

    // Map to public response format (UUIDs only, no SERIAL IDs)
    const publicInvoices = invoices.map((inv) => ({
      uuid: inv.uuid,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      taxAmount: inv.taxAmount,
      vatRate: inv.vatRate,
      currency: inv.currency,
      status: inv.status,
      period: inv.period,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
    }));

    return successResponse({ invoices: publicInvoices });
  },
});
