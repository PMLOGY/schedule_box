// Re-export all API types
export * from './api';

// Booking types
export type {
  BookingStatus,
  BookingSource,
  CancelledBy,
  BookingCustomer,
  BookingService,
  BookingEmployee,
  Booking,
  BookingCreate,
  BookingUpdate,
  BookingListQuery,
} from './booking';

// Availability types
export type { AvailabilitySlot, AvailabilityRequest, AvailabilityResponse } from './availability';

// Payment types
export type {
  PaymentStatus,
  PaymentGateway,
  InvoiceStatus,
  Payment,
  Invoice,
  ComgateCreateResponse,
  QrPaymentResponse,
  PaymentCreate,
  PaymentRefund,
  PaymentListQuery,
} from './payment';

// Notification types
export type {
  NotificationTemplateType,
  NotificationChannel,
  NotificationStatus,
  NotificationTemplateCreate,
  NotificationTemplateUpdate,
  NotificationListQuery,
  NotificationTemplatePreview,
} from './notification';

// Automation types
export type {
  AutomationTriggerType,
  AutomationActionType,
  AutomationLogStatus,
  AutomationRuleCreate,
  AutomationRuleUpdate,
  AutomationRuleListQuery,
} from './automation';

// Loyalty types
export type {
  LoyaltyProgramType,
  TransactionType,
  RewardType,
  LoyaltyTier,
  LoyaltyProgram,
  LoyaltyCard,
  LoyaltyTransaction,
  Reward,
  LoyaltyProgramCreate,
  LoyaltyProgramUpdate,
  LoyaltyCardCreate,
  RewardCreate,
  RewardUpdate,
  AddPoints,
  RedeemReward,
  LoyaltyCardListQuery,
  TransactionListQuery,
  TierCreate,
  TierUpdate,
} from './loyalty';

// Marketplace types
export type {
  MarketplaceListingCreate,
  MarketplaceListingUpdate,
  MarketplaceSearchQuery,
  MarketplaceListing,
  PriceRange,
  SortBy,
} from './marketplace';

// Review types
export type { ReviewCreate, ReviewReply, ReviewListQuery, Review, ReviewStatus } from './review';

// Video meeting types
export type {
  VideoMeetingCreate,
  VideoMeetingListQuery,
  VideoMeeting,
  VideoProvider,
  VideoMeetingStatus,
} from './video';

// White-label app types
export type {
  WhitelabelAppCreate,
  WhitelabelAppUpdate,
  WhitelabelApp,
  WhitelabelBuildStatus,
} from './whitelabel';
