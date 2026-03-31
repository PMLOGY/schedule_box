/**
 * Industry Vertical Field Configurations
 *
 * Per-vertical booking form field definitions and Zod validation schemas
 * for booking_metadata JSONB column.
 *
 * Field validation happens at the Zod API layer — no DB CHECK constraints.
 */

import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export interface VerticalField {
  /** Field key — matches booking_metadata JSON property */
  key: string;
  /** Czech display label */
  label: string;
  /** Czech placeholder text */
  placeholder: string;
  /** Whether the field is required for booking */
  required: boolean;
  /** Maximum character length */
  maxLength: number;
}

// ============================================================================
// VERTICAL FIELD DEFINITIONS
// ============================================================================

export const VERTICAL_FIELDS: Record<string, VerticalField[]> = {
  medical_clinic: [
    {
      key: 'birth_number',
      label: 'Rodné číslo',
      placeholder: 'NNNNNN/NNNN',
      required: false,
      maxLength: 20,
    },
    {
      key: 'insurance_provider',
      label: 'Pojišťovna',
      placeholder: 'VZP / ČPZP / OZP...',
      required: false,
      maxLength: 100,
    },
    {
      key: 'health_records',
      label: 'Zdravotní záznamy',
      placeholder: 'Alergie, chronická onemocnění...',
      required: false,
      maxLength: 5000,
    },
    {
      key: 'medical_notes',
      label: 'Lékařské poznámky',
      placeholder: 'Poznámky k pacientovi...',
      required: false,
      maxLength: 5000,
    },
  ],
  auto_service: [
    {
      key: 'license_plate',
      label: 'SPZ',
      placeholder: '1A2 3456',
      required: false,
      maxLength: 20,
    },
    {
      key: 'vin',
      label: 'VIN',
      placeholder: '17 znaků',
      required: false,
      maxLength: 17,
    },
    {
      key: 'vehicle_make',
      label: 'Značka',
      placeholder: 'Škoda, VW...',
      required: false,
      maxLength: 100,
    },
    {
      key: 'vehicle_model',
      label: 'Model',
      placeholder: 'Octavia, Golf...',
      required: false,
      maxLength: 100,
    },
  ],
  cleaning_service: [
    {
      key: 'address',
      label: 'Adresa úklidu',
      placeholder: 'Ulice, město, PSČ',
      required: false,
      maxLength: 300,
    },
  ],
  tutoring: [
    {
      key: 'lesson_notes',
      label: 'Poznámky z lekce',
      placeholder: 'Co se probíralo, postřehy...',
      required: false,
      maxLength: 2000,
    },
    {
      key: 'homework',
      label: 'Domácí úkol',
      placeholder: 'Zadání pro studenta...',
      required: false,
      maxLength: 1000,
    },
  ],
};

// ============================================================================
// ZOD SCHEMAS FOR BOOKING METADATA VALIDATION
// ============================================================================

export const medicalMetadataSchema = z.object({
  industry_type: z.literal('medical_clinic'),
  birth_number: z.string().max(20).optional(),
  insurance_provider: z.string().max(100).optional(),
  health_records: z.string().max(5000).optional(),
  medical_notes: z.string().max(5000).optional(),
});

export const autoMetadataSchema = z.object({
  industry_type: z.literal('auto_service'),
  license_plate: z.string().max(20).optional(),
  vin: z.string().max(17).optional(),
  vehicle_make: z.string().max(100).optional(),
  vehicle_model: z.string().max(100).optional(),
});

export const cleaningMetadataSchema = z.object({
  industry_type: z.literal('cleaning_service'),
  address: z.string().max(300).optional(),
});

export const tutoringMetadataSchema = z.object({
  industry_type: z.literal('tutoring'),
  lesson_notes: z.string().max(2000).optional(),
  homework: z.string().max(1000).optional(),
});

/**
 * Discriminated union schema for booking_metadata JSONB column.
 * Nullable and optional — most bookings have no vertical-specific metadata.
 */
export const bookingMetadataSchema = z
  .discriminatedUnion('industry_type', [
    medicalMetadataSchema,
    autoMetadataSchema,
    cleaningMetadataSchema,
    tutoringMetadataSchema,
  ])
  .nullable()
  .optional();

export type MedicalMetadata = z.infer<typeof medicalMetadataSchema>;
export type AutoMetadata = z.infer<typeof autoMetadataSchema>;
export type CleaningMetadata = z.infer<typeof cleaningMetadataSchema>;
export type TutoringMetadata = z.infer<typeof tutoringMetadataSchema>;
export type BookingMetadata = z.infer<typeof bookingMetadataSchema>;
