/**
 * Invoice PDF Download Endpoint
 *
 * GET /api/v1/invoices/{id}/pdf
 * Returns downloadable PDF invoice for authenticated user
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { db, invoices } from '@schedulebox/database';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@schedulebox/shared';
import { generateInvoicePDF } from '../../generate';
import { findCompanyId } from '@/lib/db/tenant-scope';

// Params schema for invoice ID
const invoiceIdParamSchema = z.object({
  id: z.string().uuid(),
});

type InvoiceIdParam = z.infer<typeof invoiceIdParamSchema>;

/**
 * GET /api/v1/invoices/{id}/pdf
 * Download invoice PDF
 *
 * Path params: id (invoice UUID)
 *
 * Returns: PDF binary with Content-Type: application/pdf
 */
export const GET = createRouteHandler<undefined, InvoiceIdParam>({
  requiresAuth: true,
  paramsSchema: invoiceIdParamSchema,
  handler: async ({ params, user }) => {
    // Get company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Extract invoice UUID from path params
    const invoiceUuid = params.id;

    // Find invoice by UUID and verify tenant isolation
    const [invoice] = await db
      .select({
        id: invoices.id,
        uuid: invoices.uuid,
        companyId: invoices.companyId,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(invoices)
      .where(eq(invoices.uuid, invoiceUuid))
      .limit(1);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Verify invoice belongs to user's company (tenant isolation)
    if (invoice.companyId !== companyId) {
      throw new NotFoundError('Invoice not found');
    }

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoice.id, companyId);

    // Return PDF as binary response with Czech filename
    // Convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="faktura-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  },
});
