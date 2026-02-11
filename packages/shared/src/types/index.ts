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
