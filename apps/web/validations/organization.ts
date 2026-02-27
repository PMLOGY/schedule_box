/**
 * Zod validation schemas for organization endpoints
 * Used by multi-location organization CRUD operations
 */

import { z } from 'zod';

/**
 * Switch location schema
 * POST /api/v1/auth/switch-location
 */
export const switchLocationSchema = z.object({
  company_uuid: z.string().uuid('Invalid company UUID'),
});
export type SwitchLocationInput = z.infer<typeof switchLocationSchema>;

/**
 * Create organization schema
 * POST /api/v1/organizations
 */
export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(255),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/**
 * Add location schema
 * POST /api/v1/organizations/:uuid/locations
 */
export const addLocationSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  email: z.string().email(),
  phone: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_zip: z.string().optional(),
});
export type AddLocationInput = z.infer<typeof addLocationSchema>;

/**
 * Update location schema
 * PATCH /api/v1/organizations/:uuid/locations/:locationUuid
 */
export const updateLocationSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_zip: z.string().optional(),
  is_active: z.boolean().optional(),
});
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

/**
 * Add member schema
 * POST /api/v1/organizations/:uuid/members
 */
export const addMemberSchema = z.object({
  user_email: z.string().email(),
  role: z.enum(['franchise_owner', 'location_manager']),
  company_uuid: z.string().uuid().optional(), // required for location_manager
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

/**
 * Remove member schema
 * DELETE /api/v1/organizations/:uuid/members (body)
 */
export const removeMemberSchema = z.object({
  user_uuid: z.string().uuid('Invalid user UUID'),
});
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

/**
 * Update organization schema
 * PUT /api/v1/organizations/:uuid
 */
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(255),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/**
 * Organization UUID params schema
 * Validates [id] route param as UUID
 */
export const orgParamsSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
});
export type OrgParams = z.infer<typeof orgParamsSchema>;

/**
 * Organization + Location UUID params schema
 * Validates [id] and [locationId] route params
 */
export const orgLocationParamsSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
  locationId: z.string().uuid('Invalid location ID'),
});
export type OrgLocationParams = z.infer<typeof orgLocationParamsSchema>;
