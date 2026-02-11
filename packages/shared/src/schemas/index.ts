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
