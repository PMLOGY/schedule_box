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

/** Pagination metadata for paginated responses */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Standard paginated API response */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Standard single-resource API response */
export interface ApiResponse<T> {
  data: T;
}

/** JWT payload structure for ScheduleBox tokens */
export interface JWTPayload {
  sub: string;
  iss: 'schedulebox';
  aud: 'schedulebox-api';
  exp: number;
  iat: number;
  company_id: number;
  role: string;
  permissions: string[];
  mfa_verified: boolean;
}
