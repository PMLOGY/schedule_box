/**
 * Loyalty Domain Types
 *
 * TypeScript types for loyalty domain matching API response format.
 * Per API spec lines 3545-3658 and DB schema lines 1501-1579 in schedulebox_complete_documentation.md
 */

import type { z } from 'zod';
import type {
  loyaltyProgramCreateSchema,
  loyaltyProgramUpdateSchema,
  loyaltyCardCreateSchema,
  rewardCreateSchema,
  rewardUpdateSchema,
  addPointsSchema,
  redeemRewardSchema,
  loyaltyCardListQuerySchema,
  transactionListQuerySchema,
  tierCreateSchema,
  tierUpdateSchema,
} from '../schemas/loyalty';

// ============================================================================
// ENUMS
// ============================================================================

export type LoyaltyProgramType = 'points' | 'stamps' | 'tiers';

export type TransactionType = 'earn' | 'redeem' | 'expire' | 'adjust' | 'stamp';

export type RewardType = 'discount_percentage' | 'discount_fixed' | 'free_service' | 'gift';

// ============================================================================
// TIER TYPE
// ============================================================================

export type LoyaltyTier = {
  id: number;
  name: string;
  minPoints: number;
  benefits: Record<string, unknown>;
  color: string;
  sortOrder: number;
};

// ============================================================================
// LOYALTY PROGRAM TYPE
// ============================================================================

export type LoyaltyProgram = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  type: LoyaltyProgramType;
  pointsPerCurrency: number;
  isActive: boolean;
  tiers: LoyaltyTier[];
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// LOYALTY CARD TYPE
// ============================================================================

export type LoyaltyCard = {
  id: number;
  uuid: string;
  cardNumber: string;
  pointsBalance: number;
  stampsBalance: number;
  currentTier: LoyaltyTier | null;
  nextTier: {
    id: number;
    name: string;
    minPoints: number;
    pointsNeeded: number;
  } | null;
  customer: {
    id: number;
    uuid: string;
    name: string;
    email: string | null;
  };
  applePassUrl: string | null;
  googlePassUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// LOYALTY TRANSACTION TYPE
// ============================================================================

export type LoyaltyTransaction = {
  id: number;
  type: TransactionType;
  points: number;
  balanceAfter: number;
  description: string | null;
  bookingUuid: string | null;
  createdAt: string;
};

// ============================================================================
// REWARD TYPE
// ============================================================================

export type Reward = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  pointsCost: number;
  rewardType: RewardType;
  rewardValue: number | null;
  applicableServiceId: number | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// INFERRED INPUT TYPES
// ============================================================================

export type LoyaltyProgramCreate = z.infer<typeof loyaltyProgramCreateSchema>;
export type LoyaltyProgramUpdate = z.infer<typeof loyaltyProgramUpdateSchema>;
export type LoyaltyCardCreate = z.infer<typeof loyaltyCardCreateSchema>;
export type RewardCreate = z.infer<typeof rewardCreateSchema>;
export type RewardUpdate = z.infer<typeof rewardUpdateSchema>;
export type AddPoints = z.infer<typeof addPointsSchema>;
export type RedeemReward = z.infer<typeof redeemRewardSchema>;
export type LoyaltyCardListQuery = z.infer<typeof loyaltyCardListQuerySchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
export type TierCreate = z.infer<typeof tierCreateSchema>;
export type TierUpdate = z.infer<typeof tierUpdateSchema>;
