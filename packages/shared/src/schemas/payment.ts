/**
 * Payment Validation Schemas
 *
 * Zod schemas for payment domain validation across API routes and frontend forms.
 * Per API spec lines 3015-3155 in schedulebox_complete_documentation.md
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const paymentStatusEnum = z.enum([
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
]);

export const paymentGatewayEnum = z.enum([
  'comgate',
  'qrcomat',
  'cash',
  'bank_transfer',
  'gift_card',
]);

export const invoiceStatusEnum = z.enum(['draft', 'issued', 'paid', 'cancelled']);

// ============================================================================
// PAYMENT CREATE SCHEMA
// ============================================================================

/**
 * Schema for creating a payment manually (admin/internal use)
 * API spec: lines 3015-3025
 */
export const paymentCreateSchema = z.object({
  booking_id: z.string().uuid(),
  gateway: paymentGatewayEnum,
  amount: z.number().positive(),
  currency: z.string().length(3).default('CZK'),
});

// ============================================================================
// COMGATE PAYMENT CREATION SCHEMA
// ============================================================================

/**
 * Schema for initiating Comgate payment
 * Amount is derived from booking, not passed in request
 * API spec: lines 3027-3036
 */
export const comgateCreateSchema = z.object({
  booking_id: z.string().uuid(),
});

// ============================================================================
// QR PAYMENT GENERATION SCHEMA
// ============================================================================

/**
 * Schema for generating QR payment code
 * Amount is derived from booking, not passed in request
 * API spec: lines 3057-3066
 */
export const qrPaymentGenerateSchema = z.object({
  booking_id: z.string().uuid(),
});

// ============================================================================
// PAYMENT REFUND SCHEMA
// ============================================================================

/**
 * Schema for refunding a payment
 * API spec: lines 3087-3096
 */
export const paymentRefundSchema = z.object({
  amount: z.number().positive().optional(), // Optional for full refund
  reason: z.string().max(500),
});

// ============================================================================
// PAYMENT LIST QUERY SCHEMA
// ============================================================================

/**
 * Schema for payment list query parameters
 * API spec: lines 3115-3133
 */
export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: paymentStatusEnum.optional(),
  gateway: paymentGatewayEnum.optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  booking_id: z.string().uuid().optional(),
});
