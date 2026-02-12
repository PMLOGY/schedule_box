/**
 * White-label App Domain Types
 *
 * TypeScript types for white-label app domain matching API response format.
 * Per DB schema in packages/database/src/schema/apps.ts
 */

import type { z } from 'zod';
import type { whitelabelAppCreateSchema, whitelabelAppUpdateSchema } from '../schemas/whitelabel';

// ============================================================================
// INFERRED INPUT TYPES
// ============================================================================

export type WhitelabelAppCreate = z.infer<typeof whitelabelAppCreateSchema>;
export type WhitelabelAppUpdate = z.infer<typeof whitelabelAppUpdateSchema>;

// ============================================================================
// ENUMS
// ============================================================================

export type WhitelabelBuildStatus = 'draft' | 'building' | 'submitted' | 'published' | 'rejected';

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * White-label app response type with all fields from database
 * Note: Never expose internal SERIAL ID - use UUID for public-facing API
 */
export type WhitelabelApp = {
  uuid: string;
  appName: string;
  bundleId: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  features: {
    booking: boolean;
    loyalty: boolean;
    push: boolean;
  };
  iosStatus: WhitelabelBuildStatus;
  androidStatus: WhitelabelBuildStatus;
  iosAppStoreUrl: string | null;
  androidPlayStoreUrl: string | null;
  lastBuildAt: string | null;
  createdAt: string;
  updatedAt: string;
};
