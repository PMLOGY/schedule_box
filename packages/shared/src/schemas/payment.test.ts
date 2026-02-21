import { describe, it, expect } from 'vitest';
import {
  paymentStatusEnum,
  paymentGatewayEnum,
  invoiceStatusEnum,
  paymentCreateSchema,
  comgateCreateSchema,
  qrPaymentGenerateSchema,
  paymentRefundSchema,
  paymentListQuerySchema,
} from './payment';

// ============================================================================
// paymentStatusEnum
// ============================================================================

describe('paymentStatusEnum', () => {
  it('accepts all valid payment status values', () => {
    const validStatuses = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'];
    for (const status of validStatuses) {
      expect(paymentStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it('rejects invalid status value', () => {
    expect(paymentStatusEnum.safeParse('cancelled').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(paymentStatusEnum.safeParse('').success).toBe(false);
  });
});

// ============================================================================
// paymentGatewayEnum
// ============================================================================

describe('paymentGatewayEnum', () => {
  it('accepts all valid gateway values', () => {
    const validGateways = ['comgate', 'qrcomat', 'cash', 'bank_transfer', 'gift_card'];
    for (const gateway of validGateways) {
      expect(paymentGatewayEnum.safeParse(gateway).success).toBe(true);
    }
  });

  it('rejects invalid gateway value', () => {
    expect(paymentGatewayEnum.safeParse('stripe').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(paymentGatewayEnum.safeParse('').success).toBe(false);
  });
});

// ============================================================================
// invoiceStatusEnum
// ============================================================================

describe('invoiceStatusEnum', () => {
  it('accepts all valid invoice status values', () => {
    const validStatuses = ['draft', 'issued', 'paid', 'cancelled'];
    for (const status of validStatuses) {
      expect(invoiceStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it('rejects invalid invoice status', () => {
    expect(invoiceStatusEnum.safeParse('pending').success).toBe(false);
  });
});

// ============================================================================
// paymentCreateSchema
// ============================================================================

describe('paymentCreateSchema', () => {
  const validCreate = {
    booking_id: '123e4567-e89b-12d3-a456-426614174000',
    gateway: 'comgate',
    amount: 500,
  };

  it('validates correct payment data', () => {
    const result = paymentCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('applies default currency of CZK', () => {
    const result = paymentCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('CZK');
    }
  });

  it('accepts explicit currency value', () => {
    const result = paymentCreateSchema.safeParse({ ...validCreate, currency: 'EUR' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('EUR');
    }
  });

  it('rejects missing booking_id', () => {
    const { booking_id: _, ...without } = validCreate;
    expect(paymentCreateSchema.safeParse(without).success).toBe(false);
  });

  it('rejects non-UUID booking_id', () => {
    expect(
      paymentCreateSchema.safeParse({ ...validCreate, booking_id: 'not-a-uuid' }).success,
    ).toBe(false);
  });

  it('rejects missing gateway', () => {
    const { gateway: _, ...without } = validCreate;
    expect(paymentCreateSchema.safeParse(without).success).toBe(false);
  });

  it('rejects invalid gateway enum value', () => {
    expect(paymentCreateSchema.safeParse({ ...validCreate, gateway: 'paypal' }).success).toBe(
      false,
    );
  });

  it('rejects missing amount', () => {
    const { amount: _, ...without } = validCreate;
    expect(paymentCreateSchema.safeParse(without).success).toBe(false);
  });

  it('rejects zero amount (not positive)', () => {
    expect(paymentCreateSchema.safeParse({ ...validCreate, amount: 0 }).success).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(paymentCreateSchema.safeParse({ ...validCreate, amount: -100 }).success).toBe(false);
  });

  it('rejects currency not exactly 3 characters', () => {
    expect(paymentCreateSchema.safeParse({ ...validCreate, currency: 'CZ' }).success).toBe(false);
    expect(paymentCreateSchema.safeParse({ ...validCreate, currency: 'EURO' }).success).toBe(false);
  });

  it('rejects empty object', () => {
    expect(paymentCreateSchema.safeParse({}).success).toBe(false);
  });
});

// ============================================================================
// comgateCreateSchema
// ============================================================================

describe('comgateCreateSchema', () => {
  it('validates correct Comgate data', () => {
    expect(
      comgateCreateSchema.safeParse({
        booking_id: '123e4567-e89b-12d3-a456-426614174000',
      }).success,
    ).toBe(true);
  });

  it('rejects missing booking_id', () => {
    expect(comgateCreateSchema.safeParse({}).success).toBe(false);
  });

  it('rejects non-UUID booking_id', () => {
    expect(comgateCreateSchema.safeParse({ booking_id: '12345' }).success).toBe(false);
  });
});

// ============================================================================
// qrPaymentGenerateSchema
// ============================================================================

describe('qrPaymentGenerateSchema', () => {
  it('validates correct QR payment data', () => {
    expect(
      qrPaymentGenerateSchema.safeParse({
        booking_id: '123e4567-e89b-12d3-a456-426614174000',
      }).success,
    ).toBe(true);
  });

  it('rejects missing booking_id', () => {
    expect(qrPaymentGenerateSchema.safeParse({}).success).toBe(false);
  });

  it('rejects invalid UUID format', () => {
    expect(qrPaymentGenerateSchema.safeParse({ booking_id: 'abc' }).success).toBe(false);
  });
});

// ============================================================================
// paymentRefundSchema
// ============================================================================

describe('paymentRefundSchema', () => {
  it('validates full refund (no amount, only reason)', () => {
    const result = paymentRefundSchema.safeParse({ reason: 'Customer changed mind' });
    expect(result.success).toBe(true);
  });

  it('validates partial refund with amount', () => {
    const result = paymentRefundSchema.safeParse({
      amount: 150,
      reason: 'Partial service not delivered',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing reason', () => {
    expect(paymentRefundSchema.safeParse({ amount: 100 }).success).toBe(false);
  });

  it('rejects empty object', () => {
    expect(paymentRefundSchema.safeParse({}).success).toBe(false);
  });

  it('rejects zero amount (must be positive)', () => {
    expect(paymentRefundSchema.safeParse({ amount: 0, reason: 'Test' }).success).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(paymentRefundSchema.safeParse({ amount: -50, reason: 'Test' }).success).toBe(false);
  });

  it('rejects reason exceeding 500 characters', () => {
    expect(paymentRefundSchema.safeParse({ reason: 'r'.repeat(501) }).success).toBe(false);
  });

  it('accepts reason at maximum length (500 chars)', () => {
    expect(paymentRefundSchema.safeParse({ reason: 'r'.repeat(500) }).success).toBe(true);
  });
});

// ============================================================================
// paymentListQuerySchema
// ============================================================================

describe('paymentListQuerySchema', () => {
  it('validates empty query with defaults', () => {
    const result = paymentListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string page and limit to numbers', () => {
    const result = paymentListQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('validates all optional filters', () => {
    const result = paymentListQuerySchema.safeParse({
      page: '1',
      limit: '20',
      status: 'paid',
      gateway: 'comgate',
      date_from: '2026-01-01',
      date_to: '2026-12-31',
      booking_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status enum in filter', () => {
    expect(paymentListQuerySchema.safeParse({ status: 'expired' }).success).toBe(false);
  });

  it('rejects invalid gateway enum in filter', () => {
    expect(paymentListQuerySchema.safeParse({ gateway: 'bitcoin' }).success).toBe(false);
  });

  it('rejects page below 1', () => {
    expect(paymentListQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('rejects limit above 100', () => {
    expect(paymentListQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('rejects non-UUID booking_id in filter', () => {
    expect(paymentListQuerySchema.safeParse({ booking_id: 'not-uuid' }).success).toBe(false);
  });
});
