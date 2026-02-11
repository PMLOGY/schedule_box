// AI Service HTTP Client
// Wraps all AI prediction calls with circuit breaker pattern for resilience

import { createAICircuitBreaker, getCircuitBreakerHealth } from './circuit-breaker';
import {
  getCapacityForecastFallback,
  getCLVFallback,
  getDynamicPricingFallback,
  getHealthScoreFallback,
  getNoShowFallback,
  getReminderTimingFallback,
  getUpsellFallback,
} from './fallback';
import type {
  AIServiceHealth,
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

// AI service base URL - defaults to localhost for development
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ============================================================================
// Private HTTP call functions (wrapped by circuit breaker)
// ============================================================================

async function callNoShowAPI(request: NoShowPredictionRequest): Promise<NoShowPredictionResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/predictions/no-show`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<NoShowPredictionResponse>;
}

async function callCLVAPI(request: CLVPredictionRequest): Promise<CLVPredictionResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/predictions/clv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<CLVPredictionResponse>;
}

async function callHealthScoreAPI(
  request: HealthScorePredictionRequest,
): Promise<HealthScoreResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/predictions/health-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<HealthScoreResponse>;
}

// ============================================================================
// Circuit breaker-wrapped prediction methods (module-level singletons)
// ============================================================================

/**
 * Predict no-show probability for a booking.
 * Uses circuit breaker: returns fallback (15% probability, low risk) when AI service is unavailable.
 */
export const predictNoShow = createAICircuitBreaker<
  [NoShowPredictionRequest],
  NoShowPredictionResponse
>(callNoShowAPI, getNoShowFallback);

/**
 * Predict customer lifetime value.
 * Uses circuit breaker: returns fallback (0 CLV, low segment) when AI service is unavailable.
 */
export const predictCLV = createAICircuitBreaker<[CLVPredictionRequest], CLVPredictionResponse>(
  callCLVAPI,
  getCLVFallback,
);

/**
 * Predict customer health score (churn risk).
 * Uses circuit breaker: returns fallback (score 50, good category) when AI service is unavailable.
 */
export const predictHealthScore = createAICircuitBreaker<
  [HealthScorePredictionRequest],
  HealthScoreResponse
>(callHealthScoreAPI, getHealthScoreFallback);

/**
 * Get the current health status of the AI service.
 * Uses the no-show circuit breaker as a representative indicator.
 */
export function getAIServiceStatus(): AIServiceHealth {
  return getCircuitBreakerHealth(predictNoShow);
}

// ============================================================================
// Private HTTP call functions for optimization endpoints
// ============================================================================

async function callUpsellAPI(request: UpsellRequest): Promise<UpsellResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/optimization/upselling`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<UpsellResponse>;
}

async function callDynamicPricingAPI(
  request: DynamicPricingRequest,
): Promise<DynamicPricingResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/optimization/pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<DynamicPricingResponse>;
}

async function callCapacityForecastAPI(
  request: CapacityForecastRequest,
): Promise<CapacityForecastResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/optimization/capacity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<CapacityForecastResponse>;
}

async function callReminderTimingAPI(
  request: ReminderTimingRequest,
): Promise<ReminderTimingResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/optimization/reminder-timing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ReminderTimingResponse>;
}

// ============================================================================
// Circuit breaker-wrapped optimization methods (Phase 11)
// ============================================================================

/**
 * Get smart upselling recommendations for a service selection.
 * Uses SHORTER 2s timeout to avoid blocking the booking wizard flow.
 * Returns empty recommendations when AI service is unavailable.
 */
export const predictUpselling = createAICircuitBreaker<[UpsellRequest], UpsellResponse>(
  callUpsellAPI,
  getUpsellFallback,
  { timeout: 2000 },
);

/**
 * Get optimal dynamic price for a service in a given context.
 * Returns midpoint price when AI service is unavailable.
 */
export const predictDynamicPricing = createAICircuitBreaker<
  [DynamicPricingRequest],
  DynamicPricingResponse
>(callDynamicPricingAPI, getDynamicPricingFallback);

/**
 * Get capacity forecast for the next N days.
 * Returns empty forecast when AI service is unavailable.
 */
export const predictCapacityForecast = createAICircuitBreaker<
  [CapacityForecastRequest],
  CapacityForecastResponse
>(callCapacityForecastAPI, getCapacityForecastFallback);

/**
 * Get optimal reminder timing for a customer.
 * Returns 24h default when AI service is unavailable.
 */
export const predictReminderTiming = createAICircuitBreaker<
  [ReminderTimingRequest],
  ReminderTimingResponse
>(callReminderTimingAPI, getReminderTimingFallback);
