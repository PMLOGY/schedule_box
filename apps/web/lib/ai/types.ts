// AI Service TypeScript Types
// Request and response types for all AI prediction endpoints

// ============================================================================
// Request Types
// ============================================================================

export interface NoShowPredictionRequest {
  booking_id: number;
  features?: {
    booking_lead_time_hours?: number;
    customer_no_show_rate?: number;
    customer_total_bookings?: number;
    day_of_week?: number;
    hour_of_day?: number;
    is_weekend?: number;
    service_duration_minutes?: number;
    service_price?: number;
    is_first_visit?: number;
    has_payment?: number;
    days_since_last_visit?: number;
  };
}

export interface CLVPredictionRequest {
  customer_id: number;
  features?: {
    total_bookings?: number;
    total_spent?: number;
    avg_booking_value?: number;
    days_since_first_visit?: number;
    days_since_last_visit?: number;
    booking_frequency?: number;
    no_show_rate?: number;
    service_diversity?: number;
  };
}

export interface HealthScorePredictionRequest {
  customer_id: number;
  recency_days: number;
  frequency: number;
  monetary: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface NoShowPredictionResponse {
  booking_id: number;
  no_show_probability: number;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high';
  model_version: string;
  fallback: boolean;
}

export interface CLVPredictionResponse {
  customer_id: number;
  clv_predicted: number;
  confidence: number;
  segment: 'low' | 'medium' | 'high' | 'premium';
  model_version: string;
  fallback: boolean;
}

export interface HealthScoreResponse {
  customer_id: number;
  health_score: number;
  category: 'excellent' | 'good' | 'at_risk' | 'churning';
  rfm_details?: {
    r_score: number;
    f_score: number;
    m_score: number;
  };
  model_version: string;
  fallback: boolean;
}

// ============================================================================
// Circuit Breaker Health
// ============================================================================

export interface AIServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  stats: {
    successes: number;
    failures: number;
    fallbacks: number;
    timeouts: number;
  };
}

// ============================================================================
// Optimization Request Types (Phase 11)
// ============================================================================

export interface UpsellRequest {
  customer_id: number;
  current_service_id: number;
  customer_history?: number[];
}

export interface DynamicPricingRequest {
  service_id: number;
  price_min: number;
  price_max: number;
  base_price?: number;
  hour_of_day: number;
  day_of_week: number;
  utilization: number;
}

export interface CapacityForecastRequest {
  company_id: number;
  days_ahead?: number;
  current_capacity?: number;
}

export interface ReminderTimingRequest {
  customer_id: number;
  notification_channel: 'email' | 'sms' | 'push';
}

// ============================================================================
// Optimization Response Types (Phase 11)
// ============================================================================

export interface UpsellRecommendation {
  service_id: number;
  confidence: number;
  reason: string;
}

export interface UpsellResponse {
  recommendations: UpsellRecommendation[];
  model_version: string;
  fallback: boolean;
}

export interface DynamicPricingResponse {
  service_id: number;
  optimal_price: number;
  confidence: number;
  constrained: boolean;
  model_version: string;
  fallback: boolean;
}

export interface CapacityForecastEntry {
  datetime: string;
  predicted_bookings: number;
  lower_bound: number;
  upper_bound: number;
  utilization_level: 'low' | 'medium' | 'high';
}

export interface CapacityScheduleSuggestion {
  datetime: string;
  type: 'extend_hours' | 'reduce_hours' | 'add_employee';
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CapacityForecastResponse {
  forecast: CapacityForecastEntry[];
  suggestions: CapacityScheduleSuggestion[];
  model_version: string;
  fallback: boolean;
}

export interface ReminderTimingResponse {
  customer_id: number;
  minutes_before: number;
  expected_open_rate: number;
  confidence: number;
  model_version: string;
  fallback: boolean;
}

// ============================================================================
// Voice Booking Types (Phase 14)
// ============================================================================

export interface VoiceEntities {
  service_name: string | null;
  date: string | null;
  time: string | null;
  employee_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
}

export interface VoiceProcessResponse {
  transcript: string | null;
  intent: 'create_booking' | 'cancel_booking' | 'check_availability' | 'unknown';
  entities: VoiceEntities | null;
  confidence: number;
  confirmation_needed: boolean;
  error: string | null;
  fallback: boolean;
}

// ============================================================================
// Follow-Up Generator Types (Phase 14)
// ============================================================================

export interface FollowUpCustomerContext {
  customer_name: string;
  business_name: string;
  last_visit_date?: string;
  last_service?: string;
  total_visits?: number;
  total_spent?: number;
  health_score?: number;
  health_category?: string;
  preferred_services?: string;
  days_inactive?: number;
  recommended_service?: string;
  recommendation_reason?: string;
  loyalty_tier?: string;
}

export interface FollowUpRequest {
  customer_id: number;
  company_id: number;
  type: 'post_visit' | 're_engagement' | 'upsell' | 'birthday';
  customer_context: FollowUpCustomerContext;
}

export interface FollowUpResponse {
  subject: string;
  body: string;
  model: string;
  tokens_used: number;
  error: string | null;
  fallback: boolean;
}

// ============================================================================
// Competitor Intelligence Types (Phase 14)
// ============================================================================

export interface CompetitorScrapeRequest {
  company_id: number;
  competitor_name: string;
  competitor_url: string;
  data_types?: ('pricing' | 'services' | 'reviews')[];
}

export interface CompetitorScrapeResult {
  competitor_name: string;
  data_type: string;
  data: Record<string, unknown>;
  scraped_at: string;
}

export interface CompetitorScrapeResponse {
  results: CompetitorScrapeResult[];
  errors: string[];
  fallback: boolean;
}

export interface CompetitorDataRequest {
  company_id: number;
  competitor_name?: string;
  data_type?: 'pricing' | 'services' | 'reviews' | 'availability';
}

export interface CompetitorDataResponse {
  data: CompetitorScrapeResult[];
  total: number;
  fallback: boolean;
}
