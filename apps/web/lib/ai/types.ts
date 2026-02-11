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
