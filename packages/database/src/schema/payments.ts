/**
 * Payment Schema
 *
 * Payment processing and invoicing tables:
 * - payments: Payment transactions with gateway integration
 * - invoices: Invoice records with unique numbering per company
 */

import {
  pgTable,
  serial,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  date,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';
import { bookings } from './bookings';
import { customers } from './customers';

// ============================================================================
// PAYMENTS TABLE
// ============================================================================

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    bookingId: integer('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'restrict' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('CZK'),
    status: varchar('status', { length: 20 })
      .default('pending')
      .$type<'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'>(),
    gateway: varchar('gateway', { length: 20 })
      .notNull()
      .$type<'comgate' | 'qrcomat' | 'cash' | 'bank_transfer' | 'gift_card'>(),
    gatewayTransactionId: varchar('gateway_transaction_id', { length: 255 }),
    gatewayResponse: jsonb('gateway_response'),
    refundAmount: numeric('refund_amount', { precision: 10, scale: 2 }).default('0'),
    refundReason: text('refund_reason'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // CHECK constraints
    amountCheck: check('payments_amount_check', sql`${table.amount} > 0`),
    statusCheck: check(
      'payments_status_check',
      sql`${table.status} IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')`,
    ),
    gatewayCheck: check(
      'payments_gateway_check',
      sql`${table.gateway} IN ('comgate', 'qrcomat', 'cash', 'bank_transfer', 'gift_card')`,
    ),
    // Indexes
    companyIdx: index('idx_payments_company').on(table.companyId),
    bookingIdx: index('idx_payments_booking').on(table.bookingId),
    customerIdx: index('idx_payments_customer').on(table.customerId),
    statusIdx: index('idx_payments_status').on(table.companyId, table.status),
    gatewayTxIdx: index('idx_payments_gateway_tx').on(table.gateway, table.gatewayTransactionId),
  }),
);

// ============================================================================
// INVOICES TABLE
// ============================================================================

export const invoices = pgTable(
  'invoices',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    paymentId: integer('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).default('0'),
    currency: varchar('currency', { length: 3 }).default('CZK'),
    status: varchar('status', { length: 20 })
      .default('issued')
      .$type<'draft' | 'issued' | 'paid' | 'cancelled'>(),
    issuedAt: date('issued_at')
      .notNull()
      .default(sql`CURRENT_DATE`),
    dueAt: date('due_at'),
    pdfUrl: varchar('pdf_url', { length: 500 }),
    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // CHECK constraints
    statusCheck: check(
      'invoices_status_check',
      sql`${table.status} IN ('draft', 'issued', 'paid', 'cancelled')`,
    ),
    // UNIQUE constraint
    companyInvoiceNumberUnique: unique('invoices_company_invoice_number_unique').on(
      table.companyId,
      table.invoiceNumber,
    ),
    // Indexes
    companyIdx: index('idx_invoices_company').on(table.companyId),
    customerIdx: index('idx_invoices_customer').on(table.customerId),
  }),
);
