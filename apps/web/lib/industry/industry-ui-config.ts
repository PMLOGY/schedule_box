/**
 * Industry UI Configuration
 *
 * Per-vertical UI defaults for calendar slot sizing, capacity display mode,
 * and default service duration. Used by calendar views, booking forms, and
 * scheduling components to adapt to the company's industry vertical.
 *
 * Used by: useIndustryConfig hook, calendar components, booking UI
 */

// ============================================================================
// TYPES
// ============================================================================

export interface IndustryUiConfig {
  /** Calendar time-slot granularity in minutes */
  calendarSlotMinutes: number;
  /** How capacity is displayed on calendar: individual slots, group count, or hidden */
  capacityDisplay: 'individual' | 'group' | 'hidden';
  /** Default service duration in minutes when creating new services */
  defaultServiceDuration: number;
}

// ============================================================================
// DEFAULT CONFIG (generic business)
// ============================================================================

export const DEFAULT_UI_CONFIG: IndustryUiConfig = {
  calendarSlotMinutes: 30,
  capacityDisplay: 'individual',
  defaultServiceDuration: 60,
};

// ============================================================================
// PER-VERTICAL CONFIGS
// ============================================================================

export const INDUSTRY_UI_CONFIGS: Record<string, IndustryUiConfig> = {
  medical_clinic: {
    calendarSlotMinutes: 15,
    capacityDisplay: 'individual',
    defaultServiceDuration: 30,
  },
  auto_service: {
    calendarSlotMinutes: 60,
    capacityDisplay: 'individual',
    defaultServiceDuration: 120,
  },
  beauty_salon: {
    calendarSlotMinutes: 30,
    capacityDisplay: 'individual',
    defaultServiceDuration: 60,
  },
  fitness_gym: {
    calendarSlotMinutes: 60,
    capacityDisplay: 'group',
    defaultServiceDuration: 60,
  },
  yoga_pilates: {
    calendarSlotMinutes: 60,
    capacityDisplay: 'group',
    defaultServiceDuration: 60,
  },
  cleaning_service: {
    calendarSlotMinutes: 60,
    capacityDisplay: 'hidden',
    defaultServiceDuration: 120,
  },
  tutoring: {
    calendarSlotMinutes: 30,
    capacityDisplay: 'individual',
    defaultServiceDuration: 60,
  },
  general: {
    calendarSlotMinutes: 30,
    capacityDisplay: 'individual',
    defaultServiceDuration: 60,
  },
};

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Returns UI configuration for the given industry vertical.
 * Falls back to generic defaults for unknown or 'general' industry types.
 */
export function getIndustryUiConfig(industryType: string): IndustryUiConfig {
  return INDUSTRY_UI_CONFIGS[industryType] ?? DEFAULT_UI_CONFIG;
}
