// Fallback Functions for AI Predictions
// Return sensible default values when the AI service is unavailable

import type {
  CapacityForecastRequest,
  CapacityForecastResponse,
  CLVPredictionRequest,
  CLVPredictionResponse,
  CompetitorDataRequest,
  CompetitorDataResponse,
  CompetitorScrapeRequest,
  CompetitorScrapeResponse,
  DynamicPricingRequest,
  DynamicPricingResponse,
  FollowUpRequest,
  FollowUpResponse,
  HealthScorePredictionRequest,
  HealthScoreResponse,
  NoShowPredictionRequest,
  NoShowPredictionResponse,
  ReminderTimingRequest,
  ReminderTimingResponse,
  UpsellRequest,
  UpsellResponse,
  VoiceProcessResponse,
} from './types';

/**
 * Fallback for no-show prediction.
 * Returns a conservative low-risk estimate (15% probability).
 * This avoids false-positive alerts when AI service is down.
 */
export function getNoShowFallback(request: NoShowPredictionRequest): NoShowPredictionResponse {
  return {
    booking_id: request.booking_id,
    no_show_probability: 0.15,
    confidence: 0.0,
    risk_level: 'low',
    model_version: 'fallback',
    fallback: true,
  };
}

/**
 * Fallback for CLV (Customer Lifetime Value) prediction.
 * Returns zero CLV with low segment - caller should compute from
 * customer.total_spent * 2.5 if historical data is available.
 */
export function getCLVFallback(request: CLVPredictionRequest): CLVPredictionResponse {
  return {
    customer_id: request.customer_id,
    clv_predicted: 0,
    confidence: 0.0,
    segment: 'low',
    model_version: 'fallback',
    fallback: true,
  };
}

/**
 * Fallback for customer health score prediction.
 * Returns a neutral score of 50 with "good" category.
 * This prevents incorrect churn alerts when AI service is unavailable.
 */
export function getHealthScoreFallback(request: HealthScorePredictionRequest): HealthScoreResponse {
  return {
    customer_id: request.customer_id,
    health_score: 50,
    category: 'good',
    model_version: 'fallback',
    fallback: true,
  };
}

// ============================================================================
// Optimization Fallback Functions (Phase 11)
// ============================================================================

/**
 * Fallback for upselling recommendations.
 * Returns empty recommendations - no misleading suggestions when AI unavailable.
 */
export function getUpsellFallback(_request: UpsellRequest): UpsellResponse {
  return {
    recommendations: [],
    model_version: 'fallback',
    fallback: true,
  };
}

/**
 * Fallback for dynamic pricing.
 * Simulates rule-based dynamic pricing when the AI service is unavailable:
 * - High utilization → higher price (supply/demand)
 * - Peak hours (10-12, 15-17) → higher price
 * - Weekend (Sat) → higher price, off-peak (Mon-Wed) → lower price
 * - Clamped to the [price_min, price_max] range
 */
export function getDynamicPricingFallback(request: DynamicPricingRequest): DynamicPricingResponse {
  const basePrice = request.base_price ?? (request.price_min + request.price_max) / 2;
  const utilization = request.utilization ?? 0.5;
  const hour = request.hour_of_day ?? 12;
  const day = request.day_of_week ?? 3;

  // Utilization factor: low utilization → discount, high → premium
  // 0% utilization → -12%, 50% → 0%, 100% → +15%
  const utilizationFactor = (utilization - 0.5) * 0.3;

  // Hour-of-day factor: peak hours get a premium
  let hourFactor = 0;
  if (hour >= 10 && hour <= 12)
    hourFactor = 0.06; // Late morning peak
  else if (hour >= 15 && hour <= 17)
    hourFactor = 0.08; // Afternoon peak
  else if (hour >= 9 && hour <= 9)
    hourFactor = 0.02; // Opening — slight premium
  else if (hour < 9 || hour >= 18) hourFactor = -0.08; // Off-hours — discount

  // Day-of-week factor
  let dayFactor = 0;
  if (day === 6)
    dayFactor = 0.1; // Saturday premium
  else if (day === 5)
    dayFactor = 0.05; // Friday premium
  else if (day === 0)
    dayFactor = -0.05; // Sunday discount
  else if (day <= 2) dayFactor = -0.04; // Mon-Tue discount

  // Combine factors
  const totalAdjustment = 1 + utilizationFactor + hourFactor + dayFactor;
  let optimalPrice = basePrice * totalAdjustment;

  // Clamp to allowed range
  let constrained = false;
  if (optimalPrice < request.price_min) {
    optimalPrice = request.price_min;
    constrained = true;
  } else if (optimalPrice > request.price_max) {
    optimalPrice = request.price_max;
    constrained = true;
  }

  // Round to whole number (Czech pricing convention)
  optimalPrice = Math.round(optimalPrice);

  // Confidence: higher when inputs are in well-understood ranges
  const confidence =
    0.62 + Math.abs(utilizationFactor) * 0.3 + (hour >= 9 && hour <= 17 ? 0.08 : 0);

  return {
    service_id: request.service_id,
    optimal_price: optimalPrice,
    confidence: Math.min(confidence, 0.95),
    constrained,
    model_version: 'rule-based-v1',
    fallback: true,
  };
}

/**
 * Fallback for capacity forecasting.
 * Generates a rule-based 7-day forecast when the AI service is unavailable:
 * - Weekday patterns: Mon/Tue quieter, Wed-Fri busier, Sat half-day
 * - Adds variance for realism
 * - Generates schedule suggestions for high/low utilization days
 */
export function getCapacityForecastFallback(
  request: CapacityForecastRequest,
): CapacityForecastResponse {
  const daysAhead = request.days_ahead ?? 7;
  const capacity = request.current_capacity ?? 8;

  // Base booking patterns by day of week (0=Sun..6=Sat)
  // Expressed as fraction of capacity
  const dayPatterns = [0.15, 0.45, 0.5, 0.7, 0.75, 0.85, 0.6];

  const forecast: CapacityForecastEntry[] = [];
  const suggestions: CapacityScheduleSuggestion[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dow = date.getDay();

    // Skip Sundays (salon closed)
    if (dow === 0) {
      forecast.push({
        datetime: date.toISOString(),
        predicted_bookings: 0,
        lower_bound: 0,
        upper_bound: 1,
        utilization_level: 'low',
      });
      continue;
    }

    const baseFraction = dayPatterns[dow];
    // Add some pseudo-random variance using day-of-month as seed
    const dayOfMonth = date.getDate();
    const variance = (((dayOfMonth * 7 + i * 13) % 20) - 10) / 100; // -10% to +10%
    const adjustedFraction = Math.max(0.1, Math.min(1.0, baseFraction + variance));

    const predicted = Math.round(adjustedFraction * capacity);
    const lowerBound = Math.max(0, predicted - Math.ceil(capacity * 0.15));
    const upperBound = Math.min(capacity + 2, predicted + Math.ceil(capacity * 0.2));

    const utilizationLevel: 'low' | 'medium' | 'high' =
      adjustedFraction < 0.4 ? 'low' : adjustedFraction < 0.7 ? 'medium' : 'high';

    forecast.push({
      datetime: date.toISOString(),
      predicted_bookings: predicted,
      lower_bound: lowerBound,
      upper_bound: upperBound,
      utilization_level: utilizationLevel,
    });

    // Generate suggestions for notable days
    if (utilizationLevel === 'high' && dow !== 6) {
      suggestions.push({
        datetime: date.toISOString(),
        type: 'add_employee',
        reason:
          dow === 5
            ? 'Pátek bývá vytížený — zvažte přidání dalšího zaměstnance.'
            : 'Vysoká předpokládaná poptávka — zajistěte dostatek personálu.',
        priority: adjustedFraction > 0.85 ? 'high' : 'medium',
      });
    }

    if (utilizationLevel === 'low' && dow >= 1 && dow <= 3) {
      suggestions.push({
        datetime: date.toISOString(),
        type: 'reduce_hours',
        reason: 'Nízká poptávka — zvažte zkrácení otevírací doby nebo nabídněte slevu.',
        priority: 'low',
      });
    }

    if (dow === 6 && adjustedFraction > 0.55) {
      suggestions.push({
        datetime: date.toISOString(),
        type: 'extend_hours',
        reason: 'Sobota s vyšší poptávkou — zvažte prodloužení otevírací doby.',
        priority: 'medium',
      });
    }
  }

  return {
    forecast,
    suggestions,
    model_version: 'rule-based-v1',
    fallback: true,
  };
}

/**
 * Fallback for reminder timing.
 * Returns default 24h (1440 minutes) which is the standard reminder window.
 */
export function getReminderTimingFallback(request: ReminderTimingRequest): ReminderTimingResponse {
  return {
    customer_id: request.customer_id,
    minutes_before: 1440,
    expected_open_rate: 0.0,
    confidence: 0.0,
    model_version: 'fallback',
    fallback: true,
  };
}

// ============================================================================
// Phase 14 Fallback Functions
// ============================================================================

/** Fallback for voice processing. Returns unknown intent with no transcript. */
export function getVoiceProcessFallback(): VoiceProcessResponse {
  return {
    transcript: null,
    intent: 'unknown',
    entities: null,
    confidence: 0.0,
    confirmation_needed: false,
    error: 'ai_service_unavailable',
    fallback: true,
  };
}

/** Fallback for follow-up generation. Returns empty subject/body. */
export function getFollowUpFallback(_request: FollowUpRequest): FollowUpResponse {
  return {
    subject: '',
    body: '',
    model: 'fallback',
    tokens_used: 0,
    error: 'ai_service_unavailable',
    fallback: true,
  };
}

/** Fallback for competitor scrape trigger. Returns empty results. */
export function getCompetitorScrapeFallback(
  _request: CompetitorScrapeRequest,
): CompetitorScrapeResponse {
  return {
    results: [],
    errors: ['ai_service_unavailable'],
    fallback: true,
  };
}

/** Fallback for competitor data retrieval. Returns empty data. */
export function getCompetitorDataFallback(_request: CompetitorDataRequest): CompetitorDataResponse {
  return {
    data: [],
    total: 0,
    fallback: true,
  };
}
