/**
 * White-label App Validation Schemas
 *
 * Zod schemas for white-label app domain validation across API routes and frontend forms.
 * Per DB schema in packages/database/src/schema/apps.ts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const whitelabelBuildStatusEnum = z.enum([
  'draft',
  'building',
  'submitted',
  'published',
  'rejected',
]);

// ============================================================================
// WHITELABEL APP SCHEMAS
// ============================================================================

/**
 * Schema for creating a new white-label app
 */
export const whitelabelAppCreateSchema = z.object({
  appName: z.string().min(2).max(100),
  bundleId: z.string().max(255).optional(),
  logoUrl: z.string().url().max(500).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#3B82F6'),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#1E40AF'),
  features: z
    .object({
      booking: z.boolean(),
      loyalty: z.boolean(),
      push: z.boolean(),
    })
    .optional(),
});

/**
 * Schema for updating a white-label app
 */
export const whitelabelAppUpdateSchema = whitelabelAppCreateSchema.partial();
