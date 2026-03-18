/**
 * Industry AI Configuration Defaults
 *
 * Per-vertical AI feature defaults.
 * Medical verticals disable upselling (ethics/regulations).
 * Group-class verticals use group capacity mode.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface IndustryAiConfig {
  /** Whether AI upselling recommendations are enabled */
  upselling_enabled: boolean;
  /** Booking capacity model for AI scheduling */
  capacity_mode: 'individual' | 'group' | 'standard';
}

// ============================================================================
// DEFAULT CONFIG (generic business)
// ============================================================================

export const DEFAULT_AI_CONFIG: IndustryAiConfig = {
  upselling_enabled: true,
  capacity_mode: 'standard',
};

// ============================================================================
// PER-VERTICAL DEFAULTS
// ============================================================================

export const INDUSTRY_AI_DEFAULTS: Record<string, IndustryAiConfig> = {
  medical_clinic: {
    upselling_enabled: false,
    capacity_mode: 'individual',
  },
  fitness_gym: {
    upselling_enabled: true,
    capacity_mode: 'group',
  },
  yoga_pilates: {
    upselling_enabled: true,
    capacity_mode: 'group',
  },
};

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Returns AI configuration defaults for the given industry vertical.
 * Falls back to generic defaults for unknown or 'general' industry types.
 */
export function getIndustryAiDefaults(industryType: string): IndustryAiConfig {
  return INDUSTRY_AI_DEFAULTS[industryType] ?? DEFAULT_AI_CONFIG;
}
