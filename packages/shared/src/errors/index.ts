/**
 * Error handling exports for ScheduleBox
 */

// Re-export all error classes
export * from './app-error.js';

/**
 * Standard error codes used throughout the ScheduleBox API
 * These match the documented error response format
 */
export const ERROR_CODES = {
  // Generic HTTP errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',

  // Authentication specific
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_MFA_CODE: 'INVALID_MFA_CODE',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  MFA_REQUIRED: 'MFA_REQUIRED',

  // Account specific
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  // Resource conflicts
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
