/**
 * Invoice List Endpoint
 * GET /api/v1/invoices - List invoices with pagination and filtering
 */

import { eq, and, isNull, gte, lte, desc, sql } from 'drizzle-orm';
import { db, invoices, payments, customers } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { paginatedResponse } from '@/lib/utils/response';
import { z } from 'zod';

/**
 * Validation schema for invoice list query parameters
 */
const invoiceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'issued', 'paid', 'cancelled']).optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
});

type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

/**
 * GET /api/v1/invoices
 * List invoices with pagination and filtering
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.INVOICES_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(invoiceListQuerySchema, req) as InvoiceListQuery;
    const { page, limit, status, date_from, date_to } = query;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build base WHERE conditions (company scoped + not deleted)
    const baseConditions = [eq(invoices.companyId, companyId), isNull(invoices.deletedAt)];

    // Add optional filters
    if (status) {
      baseConditions.push(eq(invoices.status, status));
    }
    if (date_from) {
      baseConditions.push(gte(invoices.issuedAt, date_from));
    }
    if (date_to) {
      baseConditions.push(lte(invoices.issuedAt, date_to));
    }

    // Query invoices with related payment and customer info (LEFT JOIN)
    const data = await db
      .select({
        // Invoice fields
        id: invoices.id,
        uuid: invoices.uuid,
        invoiceNumber: invoices.invoiceNumber,
        amount: invoices.amount,
        taxAmount: invoices.taxAmount,
        currency: invoices.currency,
        status: invoices.status,
        issuedAt: invoices.issuedAt,
        dueAt: invoices.dueAt,
        pdfUrl: invoices.pdfUrl,
        createdAt: invoices.createdAt,
        // Related payment UUID for context
        paymentUuid: payments.uuid,
        // Related customer name for context
        customerName: customers.name,
      })
      .from(invoices)
      .leftJoin(payments, eq(invoices.paymentId, payments.id))
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(...baseConditions))
      .orderBy(desc(invoices.issuedAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination metadata
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(...baseConditions));
    const totalCount = countResult.count;

    // Map to response format (use UUID, not SERIAL id, and snake_case)
    const responseData = data.map((invoice) => ({
      id: invoice.uuid,
      invoice_number: invoice.invoiceNumber,
      amount: invoice.amount,
      tax_amount: invoice.taxAmount,
      currency: invoice.currency,
      status: invoice.status,
      issued_at: invoice.issuedAt,
      due_at: invoice.dueAt,
      pdf_url: invoice.pdfUrl,
      created_at: invoice.createdAt,
      // Context: related payment and customer
      payment_id: invoice.paymentUuid,
      customer_name: invoice.customerName,
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
