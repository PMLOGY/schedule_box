/**
 * Zod Validation Schemas
 *
 * Re-exports all validation schemas for API input validation
 */

// Booking schemas
export {
  bookingCreateSchema,
  bookingUpdateSchema,
  bookingCancelSchema,
  bookingRescheduleSchema,
  bookingListQuerySchema,
  bookingStatusEnum,
  bookingSourceEnum,
} from './booking';

// Availability schemas
export { availabilityRequestSchema } from './availability';

// Payment schemas
export {
  paymentCreateSchema,
  comgateCreateSchema,
  qrPaymentGenerateSchema,
  paymentRefundSchema,
  paymentListQuerySchema,
  paymentStatusEnum,
  paymentGatewayEnum,
  invoiceStatusEnum,
} from './payment';

// Notification schemas
export {
  notificationTemplateCreateSchema,
  notificationTemplateUpdateSchema,
  notificationListQuerySchema,
  notificationTemplatePreviewSchema,
  notificationTemplateTypeEnum,
  notificationChannelEnum,
  notificationStatusEnum,
} from './notification';

// Automation schemas
export {
  automationRuleCreateSchema,
  automationRuleUpdateSchema,
  automationRuleListQuerySchema,
  automationTriggerTypeEnum,
  automationActionTypeEnum,
} from './automation';

// Loyalty schemas
export {
  loyaltyProgramCreateSchema,
  loyaltyProgramUpdateSchema,
  loyaltyCardCreateSchema,
  addPointsSchema,
  redeemRewardSchema,
  rewardCreateSchema,
  rewardUpdateSchema,
  loyaltyCardListQuerySchema,
  transactionListQuerySchema,
  tierCreateSchema,
  tierUpdateSchema,
  loyaltyProgramTypeEnum,
  transactionTypeEnum,
  rewardTypeEnum,
} from './loyalty';

// AI Optimization schemas
export {
  upsellRequestSchema,
  dynamicPricingRequestSchema,
  capacityForecastRequestSchema,
  reminderTimingRequestSchema,
} from './ai-optimization';

// Marketplace schemas
export {
  marketplaceListingCreateSchema,
  marketplaceListingUpdateSchema,
  marketplaceSearchQuerySchema,
  priceRangeEnum,
  sortByEnum,
} from './marketplace';

// Review schemas
export {
  reviewCreateSchema,
  reviewReplySchema,
  reviewListQuerySchema,
  reviewStatusEnum,
} from './review';

// Video meeting schemas
export { videoMeetingCreateSchema, videoMeetingListQuerySchema, videoProviderEnum } from './video';

// White-label app schemas
export {
  whitelabelAppCreateSchema,
  whitelabelAppUpdateSchema,
  whitelabelBuildStatusEnum,
} from './whitelabel';

// AI Voice Intelligence schemas (Phase 14)
export {
  voiceBookingSchema,
  followUpRequestSchema,
  competitorScrapeRequestSchema,
  competitorQuerySchema,
} from './ai-voice-intelligence';
