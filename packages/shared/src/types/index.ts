/** Standard API error response format */
export interface ApiError {
  error: string;
  code: string;
  message: string;
  details?: unknown;
}

/** Standard health check response */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
}
