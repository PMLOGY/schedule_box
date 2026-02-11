/**
 * Loyalty domain event definitions
 * CloudEvents for loyalty program lifecycle events
 */

import { createCloudEvent } from '../publisher';
import type { CloudEvent } from '../types';

// Event type constants
const EVENT_SOURCE = 'loyalty-service';
const EVENT_TYPE_PREFIX = 'com.schedulebox.loyalty';

/**
 * Loyalty card created event payload
 * Emitted when a new loyalty card is issued to a customer
 */
export interface LoyaltyCardCreatedPayload {
  /** Loyalty card UUID (public identifier) */
  cardUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Customer UUID */
  customerUuid: string;

  /** Loyalty program UUID */
  programUuid: string;

  /** Card number */
  cardNumber: string;
}

/**
 * Points earned event payload
 * Emitted when customer earns loyalty points
 */
export interface PointsEarnedPayload {
  /** Loyalty card UUID */
  cardUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Customer UUID */
  customerUuid: string;

  /** Points earned (positive) */
  points: number;

  /** New balance after earning */
  balanceAfter: number;

  /** Booking that triggered earning (null for manual) */
  bookingUuid: string | null;

  /** Reason for points */
  description: string;
}

/**
 * Tier upgraded event payload
 * Emitted when customer's loyalty tier is upgraded
 */
export interface TierUpgradedPayload {
  /** Loyalty card UUID */
  cardUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Customer UUID */
  customerUuid: string;

  /** Previous tier name (null if no tier) */
  previousTierName: string | null;

  /** New tier name */
  newTierName: string;

  /** Minimum points required for new tier */
  newTierMinPoints: number;
}

/**
 * Reward redeemed event payload
 * Emitted when customer redeems a loyalty reward
 */
export interface RewardRedeemedPayload {
  /** Loyalty card UUID */
  cardUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Customer UUID */
  customerUuid: string;

  /** Reward ID (SERIAL) */
  rewardId: number;

  /** Reward name */
  rewardName: string;

  /** Points deducted for redemption */
  pointsSpent: number;

  /** New balance after redemption */
  balanceAfter: number;
}

// Type aliases for CloudEvents
export type LoyaltyCardCreatedEvent = CloudEvent<LoyaltyCardCreatedPayload>;
export type PointsEarnedEvent = CloudEvent<PointsEarnedPayload>;
export type TierUpgradedEvent = CloudEvent<TierUpgradedPayload>;
export type RewardRedeemedEvent = CloudEvent<RewardRedeemedPayload>;

/**
 * Create a loyalty card created event
 */
export function createLoyaltyCardCreatedEvent(
  data: LoyaltyCardCreatedPayload,
): LoyaltyCardCreatedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.card_created`, EVENT_SOURCE, data, data.cardUuid);
}

/**
 * Create a points earned event
 */
export function createPointsEarnedEvent(data: PointsEarnedPayload): PointsEarnedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.points_earned`, EVENT_SOURCE, data, data.cardUuid);
}

/**
 * Create a tier upgraded event
 */
export function createTierUpgradedEvent(data: TierUpgradedPayload): TierUpgradedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.tier_upgraded`, EVENT_SOURCE, data, data.cardUuid);
}

/**
 * Create a reward redeemed event
 */
export function createRewardRedeemedEvent(data: RewardRedeemedPayload): RewardRedeemedEvent {
  return createCloudEvent(
    `${EVENT_TYPE_PREFIX}.reward_redeemed`,
    EVENT_SOURCE,
    data,
    data.cardUuid,
  );
}
