/**
 * Subscription Invoice Service
 *
 * Business logic for subscription invoice lifecycle:
 * - SEQUENCE-based invoice numbering (SB-YYYY-NNNNNN) for concurrency safety
 * - Invoice creation with company detail snapshot (Czech law compliance)
 * - Czech VAT-compliant PDF generation via PDFKit
 * - Invoice listing for company billing portal
 *
 * Important: For subscription invoices, the roles are:
 * - Seller (Dodavatel): ScheduleBox s.r.o. (platform)
 * - Buyer (Odberatel): The subscribing company (frozen via sellerSnapshot at invoice time)
 */

import PDFDocument from 'pdfkit';
import { eq, desc, sql } from 'drizzle-orm';
import {
  db,
  subscriptionInvoices,
  subscriptions,
  companies,
  type Database,
} from '@schedulebox/database';
import { NotFoundError, getVatRate, type SubscriptionPlan, PLAN_CONFIG } from '@schedulebox/shared';

// ============================================================================
// PLATFORM SELLER DETAILS
// ============================================================================

/**
 * ScheduleBox platform billing entity details.
 * For subscription invoices, ScheduleBox is the SELLER (Dodavatel),
 * and the subscribing company is the BUYER (Odberatel).
 */
const PLATFORM_SELLER = {
  name: process.env.PLATFORM_COMPANY_NAME || 'ScheduleBox s.r.o.',
  ico: process.env.PLATFORM_ICO || '',
  dic: process.env.PLATFORM_DIC || '',
  address: process.env.PLATFORM_ADDRESS || '',
};

// ============================================================================
// TYPES
// ============================================================================

export interface CreateSubInvoiceParams {
  subscriptionId: number;
  companyId: number;
  amount: number;
  currency: string;
  comgateTransactionId?: string;
  period: string; // e.g., '2026-03'
}

export interface SellerSnapshot {
  companyName: string;
  ico: string;
  dic: string;
  addressStreet: string;
  addressCity: string;
  addressZip: string;
  addressCountry: string;
}

export interface InvoiceRecord {
  id: number;
  uuid: string;
  invoiceNumber: string;
  amount: string;
  taxAmount: string | null;
  vatRate: string;
  currency: string | null;
  status: string | null;
  period: string;
  paidAt: Date | null;
  pdfUrl: string | null;
  createdAt: Date;
}

// ============================================================================
// GENERATE INVOICE NUMBER (SEQUENCE-BASED)
// ============================================================================

/**
 * Generate a globally unique subscription invoice number using PostgreSQL SEQUENCE.
 *
 * Uses `subscription_invoice_seq` SEQUENCE (created in migration) to guarantee
 * uniqueness under concurrent renewals. No MAX+1 race condition.
 *
 * Format: SB-YYYY-NNNNNN (e.g., SB-2026-000001)
 *
 * @param tx Drizzle transaction instance
 * @returns Formatted invoice number string
 */
export async function generateSubscriptionInvoiceNumber(tx: Database): Promise<string> {
  const [result] = await tx.execute(sql`SELECT nextval('subscription_invoice_seq') as num`);
  const seqNum = String(result.num).padStart(6, '0');
  const year = new Date().getFullYear();
  return `SB-${year}-${seqNum}`;
}

// ============================================================================
// CREATE SUBSCRIPTION INVOICE
// ============================================================================

/**
 * Create a subscription invoice record with frozen company details.
 *
 * Per Czech accounting law (Zakon o DPH), invoices must reflect the
 * buyer's details at the time of issue, not current details. This is
 * achieved by storing a `sellerSnapshot` JSONB column.
 *
 * VAT rate is determined by company country (CZ: 21%, SK: 20%).
 *
 * @param params Invoice creation parameters
 * @param txOuter Optional existing transaction
 * @returns Created invoice record
 */
export async function createSubscriptionInvoice(
  params: CreateSubInvoiceParams,
  txOuter?: Database,
): Promise<InvoiceRecord> {
  const doCreate = async (tx: Database) => {
    // Get company data for buyer snapshot
    const [company] = await tx
      .select({
        name: companies.name,
        addressStreet: companies.addressStreet,
        addressCity: companies.addressCity,
        addressZip: companies.addressZip,
        addressCountry: companies.addressCountry,
        settings: companies.settings,
      })
      .from(companies)
      .where(eq(companies.id, params.companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Extract registration numbers from company settings
    const settings = company.settings as { ico?: string; dic?: string } | null;

    // Determine VAT rate from company country
    const vatRate = getVatRate(company.addressCountry || 'CZ');
    const taxAmount = ((params.amount * vatRate) / 100).toFixed(2);

    // Generate SEQUENCE-based invoice number
    const invoiceNumber = await generateSubscriptionInvoiceNumber(tx);

    // Freeze company details at invoice time (Czech law compliance)
    const sellerSnapshot: SellerSnapshot = {
      companyName: company.name,
      ico: settings?.ico || '',
      dic: settings?.dic || '',
      addressStreet: company.addressStreet || '',
      addressCity: company.addressCity || '',
      addressZip: company.addressZip || '',
      addressCountry: company.addressCountry || 'CZ',
    };

    // Insert invoice record
    const [invoice] = await tx
      .insert(subscriptionInvoices)
      .values({
        companyId: params.companyId,
        subscriptionId: params.subscriptionId,
        invoiceNumber,
        amount: params.amount.toFixed(2),
        taxAmount,
        vatRate: vatRate.toFixed(2),
        currency: params.currency,
        status: 'paid',
        period: params.period,
        comgateTransactionId: params.comgateTransactionId || null,
        paidAt: new Date(),
        sellerSnapshot,
      })
      .returning();

    return invoice as unknown as InvoiceRecord;
  };

  if (txOuter) {
    return doCreate(txOuter);
  }

  return db.transaction(async (tx) => doCreate(tx as unknown as Database));
}

// ============================================================================
// GENERATE SUBSCRIPTION INVOICE PDF
// ============================================================================

/**
 * Generate a Czech VAT-compliant PDF for a subscription invoice.
 *
 * Layout follows Czech accounting standards (A4):
 * - Seller (Dodavatel): ScheduleBox platform entity
 * - Buyer (Odberatel): Subscribing company (from sellerSnapshot)
 * - FAKTURA title with sequential invoice number
 * - Line item: subscription plan name, price excl. VAT, VAT rate, price incl. VAT
 * - Totals: tax base (Zaklad dane), VAT amount, total (Celkem)
 * - Payment info: Comgate transaction reference
 *
 * Uses PDFKit (already in serverExternalPackages) with built-in Helvetica.
 *
 * @param invoiceId Internal invoice ID (SERIAL)
 * @param companyId Company ID for tenant isolation
 * @returns PDF as Buffer
 * @throws NotFoundError if invoice not found or doesn't belong to company
 */
export async function generateSubscriptionInvoicePDF(
  invoiceId: number,
  companyId: number,
): Promise<Buffer> {
  // Query invoice with subscription and company data
  const [result] = await db
    .select({
      invoice: {
        id: subscriptionInvoices.id,
        invoiceNumber: subscriptionInvoices.invoiceNumber,
        amount: subscriptionInvoices.amount,
        taxAmount: subscriptionInvoices.taxAmount,
        vatRate: subscriptionInvoices.vatRate,
        currency: subscriptionInvoices.currency,
        status: subscriptionInvoices.status,
        period: subscriptionInvoices.period,
        comgateTransactionId: subscriptionInvoices.comgateTransactionId,
        paidAt: subscriptionInvoices.paidAt,
        sellerSnapshot: subscriptionInvoices.sellerSnapshot,
        createdAt: subscriptionInvoices.createdAt,
      },
      subscription: {
        plan: subscriptions.plan,
        billingCycle: subscriptions.billingCycle,
      },
    })
    .from(subscriptionInvoices)
    .innerJoin(subscriptions, eq(subscriptionInvoices.subscriptionId, subscriptions.id))
    .where(eq(subscriptionInvoices.id, invoiceId))
    .limit(1);

  if (!result) {
    throw new NotFoundError('Invoice not found');
  }

  // Verify tenant isolation
  const [companyCheck] = await db
    .select({ companyId: subscriptionInvoices.companyId })
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.id, invoiceId))
    .limit(1);

  if (!companyCheck || companyCheck.companyId !== companyId) {
    throw new NotFoundError('Invoice not found');
  }

  const invoice = result.invoice;
  const subscription = result.subscription;

  // Use sellerSnapshot for buyer details (frozen at invoice time, per Czech law)
  const buyerSnapshot = invoice.sellerSnapshot as SellerSnapshot | null;

  // Get plan display name
  const planKey = subscription.plan as SubscriptionPlan;
  const planConfig = PLAN_CONFIG[planKey];
  const planName = planConfig?.name || subscription.plan;
  const cycleLabel = subscription.billingCycle === 'annual' ? 'rocni' : 'mesicni';

  // Parse amounts
  const amountInclVat = parseFloat(invoice.amount);
  const vatRate = parseFloat(invoice.vatRate);
  const amountExclVat = (amountInclVat / (1 + vatRate / 100)).toFixed(2);
  const vatAmount = (amountInclVat - parseFloat(amountExclVat)).toFixed(2);

  // Create PDF document (A4)
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // ---- SELLER SECTION (Dodavatel = ScheduleBox) ----
  doc.fontSize(20).font('Helvetica-Bold').text(PLATFORM_SELLER.name, { align: 'left' });
  doc.fontSize(10).font('Helvetica');
  if (PLATFORM_SELLER.ico) {
    doc.text(`ICO: ${PLATFORM_SELLER.ico}`);
  }
  if (PLATFORM_SELLER.dic) {
    doc.text(`DIC: ${PLATFORM_SELLER.dic}`);
  }
  if (PLATFORM_SELLER.address) {
    doc.text(PLATFORM_SELLER.address);
  }
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica-Bold').text('Dodavatel');
  doc.moveDown(1.5);

  // ---- INVOICE TITLE ----
  doc.fontSize(24).font('Helvetica-Bold').text('FAKTURA', { align: 'center' });
  doc.fontSize(14).font('Helvetica').text(`Cislo: ${invoice.invoiceNumber}`, { align: 'center' });
  doc.moveDown(2);

  // ---- BUYER SECTION (Odberatel = subscribing company) ----
  doc.fontSize(12).font('Helvetica-Bold').text('Odberatel:');
  doc.fontSize(10).font('Helvetica');

  if (buyerSnapshot) {
    doc.text(buyerSnapshot.companyName);
    if (buyerSnapshot.ico) {
      doc.text(`ICO: ${buyerSnapshot.ico}`);
    }
    if (buyerSnapshot.dic) {
      doc.text(`DIC: ${buyerSnapshot.dic}`);
    }
    if (buyerSnapshot.addressStreet) {
      doc.text(buyerSnapshot.addressStreet);
    }
    if (buyerSnapshot.addressCity && buyerSnapshot.addressZip) {
      doc.text(`${buyerSnapshot.addressZip} ${buyerSnapshot.addressCity}`);
    }
    if (buyerSnapshot.addressCountry) {
      doc.text(buyerSnapshot.addressCountry);
    }
  }

  doc.moveDown(1.5);

  // ---- INVOICE DETAILS ----
  doc.fontSize(12).font('Helvetica-Bold').text('Detaily faktury:');
  doc.fontSize(10).font('Helvetica');

  if (invoice.createdAt) {
    const issuedDate = new Date(invoice.createdAt).toLocaleDateString('cs-CZ');
    doc.text(`Datum vystaveni: ${issuedDate}`);
  }

  // Due date = issue date + 14 days
  if (invoice.createdAt) {
    const dueDate = new Date(invoice.createdAt);
    dueDate.setDate(dueDate.getDate() + 14);
    doc.text(`Datum splatnosti: ${dueDate.toLocaleDateString('cs-CZ')}`);
  }

  doc.text(`Variabilni symbol: ${invoice.invoiceNumber}`);
  doc.text(`Obdobi: ${invoice.period}`);

  doc.moveDown(1.5);

  // ---- LINE ITEMS TABLE ----
  doc.fontSize(12).font('Helvetica-Bold').text('Polozky:');
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
  doc.text('Mnozstvi', col2, tableTop);
  doc.text('Cena bez DPH', col3, tableTop);
  doc.text('DPH', col4, tableTop);
  doc.text('Cena s DPH', col5, tableTop);

  // Draw line under header
  doc
    .moveTo(50, tableTop + 15)
    .lineTo(550, tableTop + 15)
    .stroke();

  // Table row - Subscription plan line item
  const rowTop = tableTop + 25;
  doc.font('Helvetica');

  const lineDescription = `${planName} plan (${cycleLabel})`;
  doc.text(lineDescription, col1, rowTop, { width: 220 });
  doc.text('1', col2, rowTop);
  doc.text(`${amountExclVat} ${invoice.currency || 'CZK'}`, col3, rowTop);
  doc.text(`${vatRate}%`, col4, rowTop);
  doc.text(`${amountInclVat.toFixed(2)} ${invoice.currency || 'CZK'}`, col5, rowTop);

  // Draw line under row
  doc
    .moveTo(50, rowTop + 20)
    .lineTo(550, rowTop + 20)
    .stroke();

  doc.moveDown(3);

  // ---- TOTALS SECTION ----
  const totalsTop = rowTop + 50;
  doc.fontSize(11).font('Helvetica');

  doc.text('Zaklad dane:', 350, totalsTop);
  doc.text(`${amountExclVat} ${invoice.currency || 'CZK'}`, 480, totalsTop, { align: 'right' });

  doc.text(`DPH ${vatRate}%:`, 350, totalsTop + 20);
  doc.text(`${vatAmount} ${invoice.currency || 'CZK'}`, 480, totalsTop + 20, { align: 'right' });

  doc.font('Helvetica-Bold');
  doc.text('Celkem:', 350, totalsTop + 40);
  doc.text(`${amountInclVat.toFixed(2)} ${invoice.currency || 'CZK'}`, 480, totalsTop + 40, {
    align: 'right',
  });

  doc.moveDown(3);

  // ---- PAYMENT INFORMATION ----
  const paymentTop = totalsTop + 80;
  doc.fontSize(10).font('Helvetica-Bold').text('Platebni informace:', 50, paymentTop);
  doc.font('Helvetica');
  doc.text('Zpusob platby: Comgate (platebni brana)');

  if (invoice.comgateTransactionId) {
    doc.text(`ID transakce: ${invoice.comgateTransactionId}`);
  }

  if (invoice.paidAt) {
    const paidDate = new Date(invoice.paidAt).toLocaleDateString('cs-CZ');
    doc.text(`Datum uhrazeni: ${paidDate}`);
  }

  // ---- FOOTER ----
  doc
    .fontSize(8)
    .font('Helvetica')
    .text('Vystaveno v systemu ScheduleBox', 50, 750, { align: 'center' });

  // Finalize PDF
  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
}

// ============================================================================
// LIST SUBSCRIPTION INVOICES FOR COMPANY
// ============================================================================

/**
 * Get all subscription invoices for a company, ordered by creation date descending.
 *
 * Returns invoice records with all fields needed for the billing portal UI.
 *
 * @param companyId Internal company ID (SERIAL)
 * @returns Array of invoice records
 */
export async function getSubscriptionInvoicesForCompany(
  companyId: number,
): Promise<InvoiceRecord[]> {
  const results = await db
    .select({
      id: subscriptionInvoices.id,
      uuid: subscriptionInvoices.uuid,
      invoiceNumber: subscriptionInvoices.invoiceNumber,
      amount: subscriptionInvoices.amount,
      taxAmount: subscriptionInvoices.taxAmount,
      vatRate: subscriptionInvoices.vatRate,
      currency: subscriptionInvoices.currency,
      status: subscriptionInvoices.status,
      period: subscriptionInvoices.period,
      paidAt: subscriptionInvoices.paidAt,
      pdfUrl: subscriptionInvoices.pdfUrl,
      createdAt: subscriptionInvoices.createdAt,
    })
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.companyId, companyId))
    .orderBy(desc(subscriptionInvoices.createdAt));

  return results as unknown as InvoiceRecord[];
}
