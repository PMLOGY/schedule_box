/**
 * Payment Domain Types
 *
 * TypeScript types for payment domain matching API response format.
 * Per API spec lines 3015-3155 in schedulebox_complete_documentation.md
 */

import type { z } from 'zod';
import type {
  paymentCreateSchema,
  paymentRefundSchema,
  paymentListQuerySchema,
  paymentStatusEnum,
  paymentGatewayEnum,
  invoiceStatusEnum,
} from '../schemas/payment';

// ============================================================================
// ENUMS
// ============================================================================

export type PaymentStatus = z.infer<typeof paymentStatusEnum>;
export type PaymentGateway = z.infer<typeof paymentGatewayEnum>;
export type InvoiceStatus = z.infer<typeof invoiceStatusEnum>;

// ============================================================================
// MAIN PAYMENT TYPE
// ============================================================================

/**
 * Full payment object matching API response format
 * API spec: lines 3015-3025
 */
export type Payment = {
  id: number;
  uuid: string;
  companyId: number;
  bookingId: number;
  customerId: number;
  amount: string; // Decimal as string
  currency: string;
  status: PaymentStatus;
  gateway: PaymentGateway;
  gatewayTransactionId: string | null;
  refundAmount: string; // Decimal as string
  refundReason: string | null;
  paidAt: string | null; // ISO 8601
  refundedAt: string | null; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

// ============================================================================
// INVOICE TYPE
// ============================================================================

/**
 * Full invoice object matching API response format
 * API spec: lines 3135-3155
 */
export type Invoice = {
  id: number;
  uuid: string;
  companyId: number;
  paymentId: number;
  customerId: number;
  invoiceNumber: string;
  amount: string; // Decimal as string
  taxAmount: string; // Decimal as string
  currency: string;
  status: InvoiceStatus;
  issuedAt: string; // ISO 8601 date
  dueAt: string | null; // ISO 8601 date
  pdfUrl: string | null;
  createdAt: string; // ISO 8601
};

// ============================================================================
// GATEWAY RESPONSE TYPES
// ============================================================================

/**
 * Comgate payment creation response
 * API spec: lines 3027-3036
 */
export type ComgateCreateResponse = {
  transactionId: string;
  redirectUrl: string;
};

/**
 * QR payment generation response
 * API spec: lines 3057-3066
 */
export type QrPaymentResponse = {
  qrCodeBase64: string;
  spdString: string;
};

// ============================================================================
// INFERRED TYPES FROM SCHEMAS
// ============================================================================

/**
 * Type inferred from paymentCreateSchema
 */
export type PaymentCreate = z.infer<typeof paymentCreateSchema>;

/**
 * Type inferred from paymentRefundSchema
 */
export type PaymentRefund = z.infer<typeof paymentRefundSchema>;

/**
 * Type inferred from paymentListQuerySchema
 */
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
