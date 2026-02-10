/**
 * Zod validation schemas for authentication endpoints
 * Matches OpenAPI spec (lines 4422-4468)
 */

import { z } from 'zod';

/**
 * Password complexity schema per documentation section 24.1:
 * - Minimum 12 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Password must contain uppercase, lowercase, number, and special character',
  );

/**
 * User registration schema
 * POST /api/v1/auth/register
 */
export const registerSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: passwordSchema,
  phone: z.string().optional(),
  company_name: z.string().min(2),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * User login schema
 * POST /api/v1/auth/login
 */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfa_code: z.string().length(6).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Refresh token schema
 * POST /api/v1/auth/refresh
 */
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Forgot password schema
 * POST /api/v1/auth/forgot-password
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password schema
 * POST /api/v1/auth/reset-password
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Verify email schema
 * POST /api/v1/auth/verify-email
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/**
 * Change password schema
 * POST /api/v1/auth/change-password
 */
export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * MFA setup verification schema
 * POST /api/v1/auth/mfa/setup/verify
 */
export const mfaSetupVerifySchema = z.object({
  code: z.string().length(6),
});

export type MfaSetupVerifyInput = z.infer<typeof mfaSetupVerifySchema>;

/**
 * MFA login verification schema
 * POST /api/v1/auth/mfa/verify
 */
export const mfaLoginVerifySchema = z.object({
  mfa_token: z.string().min(1),
  code: z.string().length(6),
});

export type MfaLoginVerifyInput = z.infer<typeof mfaLoginVerifySchema>;

/**
 * User profile update schema
 * PATCH /api/v1/auth/me
 */
export const userUpdateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
