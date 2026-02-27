/**
 * GET /api/v1/billing/invoices/[id]/pdf
 *
 * Download subscription invoice as PDF.
 * Protected endpoint - requires owner role (SETTINGS_MANAGE permission).
 *
 * [id] is the invoice UUID (never SERIAL ID per project convention).
 * Returns PDF binary with Content-Type: application/pdf and
 * Content-Disposition: attachment for browser download.
 *
 * Verifies tenant isolation: invoice must belong to the authenticated company.
 */

import { eq } from 'drizzle-orm';
import { db, subscriptionInvoices } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { NotFoundError } from '@schedulebox/shared';
import { generateSubscriptionInvoicePDF } from '../../../invoice-service';

/**
 * GET /api/v1/billing/invoices/[id]/pdf
 * Generate and return subscription invoice PDF by UUID.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ req, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { companyId } = await findCompanyId(user.sub);

    // Extract invoice UUID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    // Pattern: /api/v1/billing/invoices/[uuid]/pdf
    // Find the segment before 'pdf'
    const pdfIndex = pathParts.lastIndexOf('pdf');
    const invoiceUuid = pdfIndex > 0 ? pathParts[pdfIndex - 1] : null;

    if (!invoiceUuid) {
      throw new NotFoundError('Invoice not found');
    }

    // Look up invoice by UUID and verify company ownership
    const [invoice] = await db
      .select({
        id: subscriptionInvoices.id,
        uuid: subscriptionInvoices.uuid,
        companyId: subscriptionInvoices.companyId,
        invoiceNumber: subscriptionInvoices.invoiceNumber,
      })
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.uuid, invoiceUuid))
      .limit(1);

    if (!invoice || invoice.companyId !== companyId) {
      throw new NotFoundError('Invoice not found');
    }

    // Generate PDF
    const pdfBuffer = await generateSubscriptionInvoicePDF(invoice.id, companyId);

    // Convert Buffer to Uint8Array for Response constructor compatibility
    const pdfBytes = new Uint8Array(pdfBuffer);

    // Return PDF as binary response with download headers
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  },
});
