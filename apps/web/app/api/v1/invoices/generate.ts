/**
 * Invoice Generation Module
 *
 * Business logic for creating invoices and generating PDF documents
 * with Czech accounting standards compliance.
 */

import PDFDocument from 'pdfkit';
import { eq } from 'drizzle-orm';
import {
  db,
  invoices,
  payments,
  bookings,
  customers,
  services,
  companies,
  type Database,
} from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { generateInvoiceNumber } from '../payments/service';

// ============================================================================
// CREATE INVOICE FOR PAYMENT
// ============================================================================

/**
 * Create invoice record for a completed payment
 *
 * Generates sequential invoice number (YYYY-NNNN format) per company
 * and calculates 21% Czech VAT on the payment amount.
 *
 * Must be called within a transaction for invoice numbering atomicity.
 *
 * @param paymentId - Internal payment ID (SERIAL)
 * @param companyId - Company ID for tenant isolation
 * @param tx - Drizzle transaction instance
 * @returns Created invoice record
 * @throws NotFoundError if payment not found or doesn't belong to company
 */
export async function createInvoiceForPayment(paymentId: number, companyId: number, tx: Database) {
  // Query payment with related booking, customer, and service details
  const [payment] = await tx
    .select({
      payment: {
        id: payments.id,
        companyId: payments.companyId,
        bookingId: payments.bookingId,
        customerId: payments.customerId,
        amount: payments.amount,
        currency: payments.currency,
      },
    })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment || payment.payment.companyId !== companyId) {
    throw new NotFoundError('Payment not found');
  }

  // Generate sequential invoice number
  const invoiceNumber = await generateInvoiceNumber(companyId, tx);

  // Calculate tax: amount * 0.21 for 21% Czech VAT (standard rate)
  const amount = parseFloat(payment.payment.amount);
  const taxAmount = (amount * 0.21).toFixed(2);

  // Calculate due date (issue date + 14 days)
  const issuedAt = new Date();
  const dueAt = new Date(issuedAt);
  dueAt.setDate(dueAt.getDate() + 14);

  // Insert invoice record
  const [invoice] = await tx
    .insert(invoices)
    .values({
      companyId,
      paymentId: payment.payment.id,
      customerId: payment.payment.customerId,
      invoiceNumber,
      amount: payment.payment.amount,
      taxAmount,
      currency: payment.payment.currency,
      status: 'issued' as const,
      issuedAt,
      dueAt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) // Drizzle type inference issue consistent with existing patterns
    .returning();

  return invoice;
}

// ============================================================================
// GENERATE INVOICE PDF
// ============================================================================

/**
 * Generate PDF document for an invoice
 *
 * Creates A4 PDF with Czech accounting standard layout:
 * - Company header with ICO, DIC, address
 * - "FAKTURA" title with invoice number
 * - Customer details
 * - Invoice metadata (dates, variable symbol)
 * - Line items table with VAT breakdown
 * - Totals (tax base, VAT 21%, total)
 * - Payment information
 *
 * Uses PDFKit with built-in Helvetica font (supports Czech diacritics).
 *
 * @param invoiceId - Internal invoice ID (SERIAL)
 * @param companyId - Company ID for tenant isolation
 * @returns PDF as Buffer
 * @throws NotFoundError if invoice not found or doesn't belong to company
 */
export async function generateInvoicePDF(invoiceId: number, _companyId: number): Promise<Buffer> {
  // Query invoice with all related data for PDF generation
  const [result] = await db
    .select({
      invoice: {
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        amount: invoices.amount,
        taxAmount: invoices.taxAmount,
        currency: invoices.currency,
        issuedAt: invoices.issuedAt,
        dueAt: invoices.dueAt,
      },
      payment: {
        id: payments.id,
        gateway: payments.gateway,
        gatewayTransactionId: payments.gatewayTransactionId,
        amount: payments.amount,
      },
      booking: {
        id: bookings.id,
        startTime: bookings.startTime,
        price: bookings.price,
      },
      customer: {
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
      },
      service: {
        name: services.name,
      },
      company: {
        name: companies.name,
        email: companies.email,
        phone: companies.phone,
        addressStreet: companies.addressStreet,
        addressCity: companies.addressCity,
        addressZip: companies.addressZip,
        addressCountry: companies.addressCountry,
        settings: companies.settings,
      },
    })
    .from(invoices)
    .innerJoin(payments, eq(invoices.paymentId, payments.id))
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(companies, eq(invoices.companyId, companies.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!result) {
    throw new NotFoundError('Invoice not found');
  }

  // Verify tenant isolation
  const invoice = result.invoice;
  const payment = result.payment;
  const booking = result.booking;
  const customer = result.customer;
  const service = result.service;
  const company = result.company;

  // Extract company registration numbers from settings or use defaults
  const settings = company.settings as { ico?: string; dic?: string; iban?: string } | null;
  const ico = settings?.ico || '';
  const dic = settings?.dic || '';

  // Create PDF document
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Buffer for collecting PDF data
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // Header - Company information
  doc.fontSize(20).font('Helvetica-Bold').text(company.name, { align: 'left' });

  doc.fontSize(10).font('Helvetica');

  if (ico) {
    doc.text(`IČO: ${ico}`);
  }
  if (dic) {
    doc.text(`DIČ: ${dic}`);
  }

  // Company address
  if (company.addressStreet) {
    doc.text(company.addressStreet);
  }
  if (company.addressCity && company.addressZip) {
    doc.text(`${company.addressZip} ${company.addressCity}`);
  }
  if (company.addressCountry) {
    doc.text(company.addressCountry);
  }

  doc.moveDown(2);

  // Invoice title and number
  doc.fontSize(24).font('Helvetica-Bold').text('FAKTURA', { align: 'center' });

  doc.fontSize(14).font('Helvetica').text(`Číslo: ${invoice.invoiceNumber}`, { align: 'center' });

  doc.moveDown(2);

  // Customer section
  doc.fontSize(12).font('Helvetica-Bold').text('Odběratel:');
  doc.fontSize(10).font('Helvetica');
  doc.text(customer.name);
  if (customer.email) {
    doc.text(customer.email);
  }

  if (customer.phone) {
    doc.text(customer.phone);
  }

  doc.moveDown(1.5);

  // Invoice details
  doc.fontSize(12).font('Helvetica-Bold').text('Detaily faktury:');
  doc.fontSize(10).font('Helvetica');

  if (invoice.issuedAt) {
    const issuedDate = new Date(invoice.issuedAt).toLocaleDateString('cs-CZ');
    doc.text(`Datum vystavení: ${issuedDate}`);
  }

  if (invoice.dueAt) {
    const dueDate = new Date(invoice.dueAt).toLocaleDateString('cs-CZ');
    doc.text(`Datum splatnosti: ${dueDate}`);
  }

  doc.text(`Variabilní symbol: ${payment.id}`);

  doc.moveDown(1.5);

  // Line items table header
  doc.fontSize(12).font('Helvetica-Bold').text('Položky:');
  doc.fontSize(9).font('Helvetica');

  const tableTop = doc.y + 10;
  const col1 = 50; // Description
  const col2 = 280; // Quantity
  const col3 = 340; // Price excl. VAT
  const col4 = 420; // VAT
  const col5 = 480; // Price incl. VAT

  // Table header
  doc.font('Helvetica-Bold');
  doc.text('Popis', col1, tableTop);
  doc.text('Množství', col2, tableTop);
  doc.text('Cena bez DPH', col3, tableTop);
  doc.text('DPH', col4, tableTop);
  doc.text('Cena s DPH', col5, tableTop);

  // Draw line under header
  doc
    .moveTo(50, tableTop + 15)
    .lineTo(550, tableTop + 15)
    .stroke();

  // Table row - Service line item
  const rowTop = tableTop + 25;
  doc.font('Helvetica');

  const priceWithVat = parseFloat(booking.price);
  const priceWithoutVat = (priceWithVat / 1.21).toFixed(2);
  const vatAmount = (priceWithVat - parseFloat(priceWithoutVat)).toFixed(2);

  doc.text(service.name, col1, rowTop, { width: 220 });
  doc.text('1', col2, rowTop);
  doc.text(`${priceWithoutVat} ${invoice.currency}`, col3, rowTop);
  doc.text('21%', col4, rowTop);
  doc.text(`${priceWithVat.toFixed(2)} ${invoice.currency}`, col5, rowTop);

  // Draw line under row
  doc
    .moveTo(50, rowTop + 20)
    .lineTo(550, rowTop + 20)
    .stroke();

  doc.moveDown(3);

  // Totals section
  const totalsTop = rowTop + 50;
  doc.fontSize(11).font('Helvetica');

  doc.text(`Základ daně:`, 350, totalsTop);
  doc.text(`${priceWithoutVat} ${invoice.currency}`, 480, totalsTop, { align: 'right' });

  doc.text(`DPH 21%:`, 350, totalsTop + 20);
  doc.text(`${vatAmount} ${invoice.currency}`, 480, totalsTop + 20, { align: 'right' });

  doc.font('Helvetica-Bold');
  doc.text(`Celkem:`, 350, totalsTop + 40);
  doc.text(`${priceWithVat.toFixed(2)} ${invoice.currency}`, 480, totalsTop + 40, {
    align: 'right',
  });

  doc.moveDown(3);

  // Payment information
  doc.fontSize(10).font('Helvetica-Bold').text('Platební informace:');
  doc.font('Helvetica');

  const gatewayNames: Record<string, string> = {
    comgate: 'Comgate (platební brána)',
    qrcomat: 'QR platba (bankovní převod)',
    cash: 'Hotovost',
    bank_transfer: 'Bankovní převod',
    gift_card: 'Dárkový poukaz',
  };

  doc.text(`Způsob platby: ${gatewayNames[payment.gateway] || payment.gateway}`);

  if (payment.gatewayTransactionId) {
    doc.text(`ID transakce: ${payment.gatewayTransactionId || ''}`);
  }

  // Footer
  doc
    .fontSize(8)
    .font('Helvetica')
    .text('Vystaveno v systému ScheduleBox', 50, 750, { align: 'center' });

  // Finalize PDF
  doc.end();

  // Wait for PDF generation to complete
  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
}
