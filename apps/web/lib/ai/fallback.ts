// Fallback Functions for AI Predictions
// Return sensible default values when the AI service is unavailable

import type {
  CLVPredictionRequest,
  CLVPredictionResponse,
  HealthScorePredictionRequest,
  HealthScoreResponse,
  NoShowPredictionRequest,
  NoShowPredictionResponse,
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
