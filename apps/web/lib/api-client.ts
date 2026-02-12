import { useAuthStore } from '@/stores/auth.store';

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Get access token from auth store
    const accessToken = useAuthStore.getState().accessToken;

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add Authorization header if token exists
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - attempt token refresh
      if (response.status === 401) {
        // Try to refresh token
        try {
          await useAuthStore.getState().refreshToken();

          // Retry the request with new token
          const newToken = useAuthStore.getState().accessToken;
          if (newToken) {
            const retryHeaders: Record<string, string> = {
              ...headers,
              Authorization: `Bearer ${newToken}`,
            };
            const retryResponse = await fetch(url, {
              ...options,
              headers: retryHeaders,
            });

            // If still 401 after refresh, logout
            if (retryResponse.status === 401) {
              useAuthStore.getState().logout();
              throw this.buildError(retryResponse, await retryResponse.json());
            }

            return this.handleResponse<T>(retryResponse);
          }
        } catch {
          // Refresh failed - logout
          useAuthStore.getState().logout();
          throw this.buildError(response, await response.json());
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      // Network error or other fetch error
      if (error instanceof Error && !('statusCode' in error)) {
        throw {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error.message,
          statusCode: 0,
        } as ApiError;
      }
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle 204 No Content (e.g., DELETE responses)
    if (response.status === 204) {
      return undefined as T;
    }

    const json = await response.json();

    if (!response.ok) {
      throw this.buildError(response, json);
    }

    // Unwrap standard API envelope { data: ... }
    // But preserve paginated responses { data: [...], meta: {...} } as-is
    if (json && typeof json === 'object' && 'data' in json && !('meta' in json)) {
      return json.data as T;
    }

    return json as T;
  }

  private buildError(response: Response, data: unknown): ApiError {
    const raw = data as Record<string, unknown>;

    // API error responses are nested: { error: { code, message, details } }
    const errorData =
      raw?.error && typeof raw.error === 'object'
        ? (raw.error as { code?: string; message?: string; details?: unknown })
        : (raw as { code?: string; message?: string; details?: unknown });

    return {
      code: errorData.code || 'UNKNOWN_ERROR',
      message: errorData.message || 'An error occurred',
      details: errorData.details,
      statusCode: response.status,
    };
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    let url = endpoint;

    // Build query string from params
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url = `${endpoint}?${searchParams.toString()}`;
    }

    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
