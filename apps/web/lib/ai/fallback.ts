// Fallback Functions for AI Predictions
// Return sensible default values when the AI service is unavailable

import type {
  CapacityForecastRequest,
  CapacityForecastResponse,
  CLVPredictionRequest,
  CLVPredictionResponse,
  DynamicPricingRequest,
  DynamicPricingResponse,
  HealthScorePredictionRequest,
  HealthScoreResponse,
  NoShowPredictionRequest,
  NoShowPredictionResponse,
  ReminderTimingRequest,
  ReminderTimingResponse,
  UpsellRequest,
  UpsellResponse,
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
 * Returns midpoint of min/max range (static pricing behavior).
 */
export function getDynamicPricingFallback(request: DynamicPricingRequest): DynamicPricingResponse {
  return {
    service_id: request.service_id,
    optimal_price: (request.price_min + request.price_max) / 2,
    confidence: 0.0,
    constrained: false,
    model_version: 'fallback',
    fallback: true,
  };
}

/**
 * Fallback for capacity forecasting.
 * Returns empty forecast - no misleading predictions when AI unavailable.
 */
export function getCapacityForecastFallback(
  _request: CapacityForecastRequest,
): CapacityForecastResponse {
  return {
    forecast: [],
    suggestions: [],
    model_version: 'fallback',
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
