// AI Service HTTP Client
// Wraps all AI prediction calls with circuit breaker pattern for resilience

import { createAICircuitBreaker, getCircuitBreakerHealth } from './circuit-breaker';
import {
  getCapacityForecastFallback,
  getCLVFallback,
  getCompetitorDataFallback,
  getCompetitorScrapeFallback,
  getDynamicPricingFallback,
  getFollowUpFallback,
  getHealthScoreFallback,
  getNoShowFallback,
  getReminderTimingFallback,
  getUpsellFallback,
  getVoiceProcessFallback,
} from './fallback';
import type {
  AIServiceHealth,
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

// ============================================================================
// Phase 14: Voice Booking, Follow-Up, Competitor Intelligence
// ============================================================================

// Voice booking -- multipart proxy, 15s timeout for Whisper + GPT-4 pipeline
async function callVoiceProcessAPI(formData: FormData): Promise<VoiceProcessResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/voice/process`, {
    method: 'POST',
    body: formData, // multipart/form-data -- browser/node sets boundary automatically
  });
  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<VoiceProcessResponse>;
}

/**
 * Process voice audio for booking intent extraction.
 * Uses 15s timeout for Whisper transcription + GPT-4 NLU pipeline.
 * Returns unknown intent fallback when AI service is unavailable.
 */
export const processVoice = createAICircuitBreaker<[FormData], VoiceProcessResponse>(
  callVoiceProcessAPI,
  getVoiceProcessFallback,
  { timeout: 15000 },
);

// Follow-up generation -- JSON, 10s timeout for GPT-4 text generation
async function callFollowUpAPI(request: FollowUpRequest): Promise<FollowUpResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/followup/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<FollowUpResponse>;
}

/**
 * Generate AI-powered follow-up email/SMS text for a customer.
 * Uses 10s timeout for GPT-4 text generation.
 * Returns empty subject/body fallback when AI service is unavailable.
 */
export const generateFollowUp = createAICircuitBreaker<[FollowUpRequest], FollowUpResponse>(
  callFollowUpAPI,
  getFollowUpFallback,
  { timeout: 10000 },
);

// Competitor scraping trigger -- JSON, 30s timeout for web scraping
async function callCompetitorScrapeAPI(
  request: CompetitorScrapeRequest,
): Promise<CompetitorScrapeResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/competitor/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<CompetitorScrapeResponse>;
}

/**
 * Trigger competitor data scraping.
 * Uses 30s timeout for web scraping operations.
 * Returns empty results fallback when AI service is unavailable.
 */
export const triggerCompetitorScrape = createAICircuitBreaker<
  [CompetitorScrapeRequest],
  CompetitorScrapeResponse
>(callCompetitorScrapeAPI, getCompetitorScrapeFallback, { timeout: 30000 });

// Competitor data retrieval -- GET with query params, 5s default timeout
async function callCompetitorDataAPI(
  request: CompetitorDataRequest,
): Promise<CompetitorDataResponse> {
  const params = new URLSearchParams();
  params.set('company_id', String(request.company_id));
  if (request.competitor_name) params.set('competitor_name', request.competitor_name);
  if (request.data_type) params.set('data_type', request.data_type);
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/competitor/data?${params}`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<CompetitorDataResponse>;
}

/**
 * Retrieve stored competitor intelligence data.
 * Uses default 5s timeout (database query, not scraping).
 * Returns empty data fallback when AI service is unavailable.
 */
export const getCompetitorData = createAICircuitBreaker<
  [CompetitorDataRequest],
  CompetitorDataResponse
>(callCompetitorDataAPI, getCompetitorDataFallback);
