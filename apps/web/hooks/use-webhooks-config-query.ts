import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookEndpoint {
  id: string; // UUID
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export interface WebhookEndpointCreated extends WebhookEndpoint {
  /** Plaintext HMAC secret — shown ONCE on creation */
  secret: string;
}

export interface CreateWebhookEndpointInput {
  url: string;
  events: string[];
}

export interface WebhookDelivery {
  id: string;
  endpointUrl: string;
  eventType: string;
  status: 'pending' | 'delivered' | 'failed';
  responseStatus: number | null;
  responseTimeMs: number | null;
  attempt: number;
  payload: string | null;
  responseBody: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

export interface WebhookDeliveriesResponse {
  data: WebhookDelivery[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface TestWebhookResult {
  status: string;
  response_status: number | null;
  response_time_ms: number | null;
  response_body: string | null;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * List webhook endpoints for the current company
 */
export function useWebhookEndpoints() {
  return useQuery({
    queryKey: ['webhook-endpoints'],
    queryFn: async () => {
      // apiClient auto-unwraps { data: T } envelopes
      return apiClient.get<WebhookEndpoint[]>('/webhook-endpoints');
    },
    staleTime: 30_000,
  });
}

/**
 * Create a new webhook endpoint.
 * On success, the response includes the plaintext secret (shown once).
 */
export function useCreateWebhookEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWebhookEndpointInput) => {
      // apiClient auto-unwraps { data: T } — returns the created endpoint + secret
      return apiClient.post<WebhookEndpointCreated>('/webhook-endpoints', input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] });
    },
  });
}

/**
 * Delete a webhook endpoint by UUID.
 */
export function useDeleteWebhookEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (endpointId: string) => {
      return apiClient.delete(`/webhook-endpoints/${endpointId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] });
    },
  });
}

/**
 * Send a test event to a webhook endpoint.
 */
export function useTestWebhookEndpoint() {
  return useMutation({
    mutationFn: async (endpointId: string) => {
      return apiClient.post<TestWebhookResult>(`/webhook-endpoints/${endpointId}/test`, {});
    },
  });
}

/**
 * Get paginated delivery log, optionally filtered by endpoint UUID.
 */
export function useWebhookDeliveries(page = 1, endpointId?: string) {
  return useQuery({
    queryKey: ['webhook-deliveries', page, endpointId],
    queryFn: async () => {
      // Paginated response — apiClient preserves { data, meta } object as-is
      return apiClient.get<WebhookDeliveriesResponse>('/webhook-endpoints/deliveries', {
        page,
        limit: 20,
        ...(endpointId ? { endpoint_id: endpointId } : {}),
      });
    },
    staleTime: 10_000,
  });
}
