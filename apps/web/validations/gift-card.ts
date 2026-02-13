/**
 * Gift card validation schemas
 * Zod schemas for gift card CRUD, balance check, and redemption endpoints
 */

import { z } from 'zod';

/**
 * Gift card creation schema
 * POST /api/v1/gift-cards
 */
/**
 * Preprocess helper: convert empty/whitespace-only strings to undefined
 * so that optional Zod validators don't reject them.
 */
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const giftCardCreateSchema = z.object({
  initial_balance: z.preprocess(
    (v) => (v === null ? undefined : v),
    z
      .number()
      .positive('Initial balance must be positive')
      .max(100000, 'Initial balance cannot exceed 100,000'),
  ),
  currency: z.string().length(3, 'Currency must be 3 characters').default('CZK'),
  purchased_by_customer_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid('Invalid customer UUID').optional(),
  ),
  recipient_email: z.preprocess(
    emptyToUndefined,
    z.string().email('Invalid email format').optional(),
  ),
  recipient_name: z.preprocess(
    emptyToUndefined,
    z.string().max(255, 'Recipient name too long').optional(),
  ),
  message: z.preprocess(emptyToUndefined, z.string().max(500, 'Message too long').optional()),
  valid_until: z.preprocess(
    emptyToUndefined,
    z.string().datetime('Invalid datetime format').optional(),
  ),
});

export type GiftCardCreate = z.infer<typeof giftCardCreateSchema>;

/**
 * Gift card update schema
 * PUT /api/v1/gift-cards/[id]
 * NOTE: balance and code are NOT updateable for security
 */
export const giftCardUpdateSchema = z.object({
  is_active: z.boolean().optional(),
  recipient_email: z.string().email('Invalid email format').optional(),
  recipient_name: z.string().max(255, 'Recipient name too long').optional(),
  message: z.string().max(500, 'Message too long').optional(),
  valid_until: z.string().datetime('Invalid datetime format').optional(),
});

export type GiftCardUpdate = z.infer<typeof giftCardUpdateSchema>;

/**
 * Gift card query parameters schema
 * GET /api/v1/gift-cards - List with pagination, search, and filtering
 */
export const giftCardQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  is_active: z.coerce.boolean().optional(),
  search: z.string().optional(), // Searches code and recipient_name
});

export type GiftCardQuery = z.infer<typeof giftCardQuerySchema>;

/**
 * Gift card UUID parameter schema
 * For route parameters like /api/v1/gift-cards/[id]
 */
export const giftCardIdParamSchema = z.object({
  id: z.string().uuid('Invalid gift card ID format'),
});

export type GiftCardIdParam = z.infer<typeof giftCardIdParamSchema>;

/**
 * Gift card balance check schema
 * GET /api/v1/gift-cards/[id]/balance
 */
export const giftCardBalanceSchema = z.object({
  code: z.string().transform((val) => val.toUpperCase()),
});

export type GiftCardBalance = z.infer<typeof giftCardBalanceSchema>;

/**
 * Gift card redemption schema
 * POST /api/v1/gift-cards/redeem
 */
export const giftCardRedeemSchema = z.object({
  code: z.string().transform((val) => val.toUpperCase()),
  amount: z.number().positive('Amount must be positive'),
  booking_id: z.number().int().positive('Invalid booking ID').optional(),
});

export type GiftCardRedeem = z.infer<typeof giftCardRedeemSchema>;
