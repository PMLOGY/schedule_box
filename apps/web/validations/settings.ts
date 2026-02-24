/**
 * Settings validation schemas
 * Zod schemas for company settings and working hours endpoints
 */

import { z } from 'zod';

/**
 * Company update schema
 * Matches OpenAPI CompanyUpdate (lines 4494-4510)
 * All fields optional for partial updates
 */
export const companyUpdateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  logo_url: z.string().url().optional(),
  description: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_zip: z.string().optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
  busy_appearance_enabled: z.boolean().optional(),
  busy_appearance_percent: z.number().int().min(0).max(50).optional(),
  onboarding_completed: z.boolean().optional(),
  industry_type: z.string().optional(),
});

/**
 * Company working hours schema
 * Array of working hour entries for company-level defaults
 */
export const companyWorkingHoursSchema = z.array(
  z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    is_active: z.boolean().optional().default(true),
  }),
);

export type CompanyUpdate = z.infer<typeof companyUpdateSchema>;
export type CompanyWorkingHours = z.infer<typeof companyWorkingHoursSchema>;
