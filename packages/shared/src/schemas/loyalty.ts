/**
 * Loyalty Validation Schemas
 *
 * Zod schemas for loyalty program domain validation across API routes and frontend forms.
 * Per API spec lines 3545-3658 and DB schema lines 1501-1579 in schedulebox_complete_documentation.md
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const loyaltyProgramTypeEnum = z.enum(['points', 'stamps', 'tiers']);

export const transactionTypeEnum = z.enum(['earn', 'redeem', 'expire', 'adjust', 'stamp']);

export const rewardTypeEnum = z.enum([
  'discount_percentage',
  'discount_fixed',
  'free_service',
  'gift',
]);

// ============================================================================
// LOYALTY PROGRAM SCHEMAS
// ============================================================================

/**
 * Schema for creating a new loyalty program
 * API spec: lines 3556-3570
 */
export const loyaltyProgramCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  type: loyaltyProgramTypeEnum,
  points_per_currency: z.number().positive().max(99999).default(1),
});

/**
 * Schema for updating a loyalty program
 */
export const loyaltyProgramUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  type: loyaltyProgramTypeEnum.optional(),
  points_per_currency: z.number().positive().max(99999).optional(),
  is_active: z.boolean().optional(),
});

// ============================================================================
// LOYALTY CARD SCHEMAS
// ============================================================================

/**
 * Schema for creating a new loyalty card
 * API spec: lines 3596-3610
 */
export const loyaltyCardCreateSchema = z.object({
  customer_id: z.string().uuid(),
});

/**
 * Schema for adding points to a card
 * API spec: lines 3637-3658
 */
export const addPointsSchema = z.object({
  points: z.number().int().positive(),
  description: z.string().max(255).optional(),
});

/**
 * Schema for redeeming a reward
 */
export const redeemRewardSchema = z.object({
  card_id: z.string().uuid(),
});

/**
 * Schema for querying loyalty cards
 */
export const loyaltyCardListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  customer_id: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

// ============================================================================
// REWARD SCHEMAS
// ============================================================================

/**
 * Schema for creating a new reward
 */
export const rewardCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  points_cost: z.number().int().positive(),
  reward_type: rewardTypeEnum,
  reward_value: z.number().positive().optional(),
  applicable_service_id: z.string().uuid().optional(),
  max_redemptions: z.number().int().positive().optional(),
});

/**
 * Schema for updating a reward
 */
export const rewardUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  points_cost: z.number().int().positive().optional(),
  reward_type: rewardTypeEnum.optional(),
  reward_value: z.number().positive().optional(),
  applicable_service_id: z.string().uuid().optional(),
  max_redemptions: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

// ============================================================================
// TRANSACTION SCHEMAS
// ============================================================================

/**
 * Schema for querying loyalty transactions
 */
export const transactionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: transactionTypeEnum.optional(),
});

// ============================================================================
// TIER SCHEMAS
// ============================================================================

/**
 * Schema for creating a new loyalty tier
 */
export const tierCreateSchema = z.object({
  name: z.string().min(1).max(100),
  min_points: z.number().int().min(0),
  benefits: z.record(z.unknown()).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#3B82F6'),
  sort_order: z.number().int().min(0).default(0),
});

/**
 * Schema for updating a loyalty tier
 */
export const tierUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  min_points: z.number().int().min(0).optional(),
  benefits: z.record(z.unknown()).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  sort_order: z.number().int().min(0).optional(),
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type LoyaltyProgramCreate = z.infer<typeof loyaltyProgramCreateSchema>;
export type LoyaltyProgramUpdate = z.infer<typeof loyaltyProgramUpdateSchema>;
export type LoyaltyCardCreate = z.infer<typeof loyaltyCardCreateSchema>;
export type AddPoints = z.infer<typeof addPointsSchema>;
export type RedeemReward = z.infer<typeof redeemRewardSchema>;
export type RewardCreate = z.infer<typeof rewardCreateSchema>;
export type RewardUpdate = z.infer<typeof rewardUpdateSchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
export type TierCreate = z.infer<typeof tierCreateSchema>;
export type TierUpdate = z.infer<typeof tierUpdateSchema>;
export type LoyaltyCardListQuery = z.infer<typeof loyaltyCardListQuerySchema>;
