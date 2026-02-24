/**
 * Onboarding wizard validation schemas
 * Zod schemas for the 4-step business setup wizard
 */

import { z } from 'zod';

// Industry types matching the DB CHECK constraint
export const INDUSTRY_TYPES = [
  'beauty_salon',
  'barbershop',
  'spa_wellness',
  'fitness_gym',
  'yoga_pilates',
  'dance_studio',
  'medical_clinic',
  'veterinary',
  'physiotherapy',
  'psychology',
  'auto_service',
  'cleaning_service',
  'tutoring',
  'photography',
  'consulting',
  'coworking',
  'pet_grooming',
  'tattoo_piercing',
  'escape_room',
  'general',
] as const;

export type IndustryType = (typeof INDUSTRY_TYPES)[number];

/**
 * Step 1 — Company details
 */
export const companyDetailsSchema = z.object({
  name: z.string().min(2).max(255),
  phone: z.string().optional(),
  description: z.string().max(500).optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_zip: z
    .string()
    .regex(/^\d{3}\s?\d{2}$/, 'Neplatné PSČ (formát: 123 45)')
    .optional()
    .or(z.literal('')),
  industry_type: z.enum(INDUSTRY_TYPES),
});

export type CompanyDetailsInput = z.infer<typeof companyDetailsSchema>;

/**
 * Step 2 — First service
 */
export const firstServiceSchema = z.object({
  name: z.string().min(1).max(255),
  duration_minutes: z.number().int().min(5).max(480),
  price: z.number().min(0),
  description: z.string().max(500).optional(),
});

export type FirstServiceInput = z.infer<typeof firstServiceSchema>;

/**
 * Step 3 — Working hours
 */
export const workingHoursSchema = z.array(
  z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Neplatný formát času (HH:mm)'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Neplatný formát času (HH:mm)'),
    is_active: z.boolean(),
  }),
);

export type WorkingHoursInput = z.infer<typeof workingHoursSchema>;
