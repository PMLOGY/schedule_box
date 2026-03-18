/**
 * Unit tests for route-logger.ts (OBS-02 coverage)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logRouteComplete, getRequestId } from '../route-logger';

// Mock @schedulebox/shared/logger functions
vi.mock('@schedulebox/shared/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

import { logInfo, logError } from '@schedulebox/shared/logger';

describe('logRouteComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls logInfo with route, method, status, duration_ms, request_id when no error', () => {
    logRouteComplete({
      route: '/api/v1/bookings',
      method: 'GET',
      status: 200,
      duration_ms: 42,
      request_id: 'req-123',
    });

    expect(logInfo).toHaveBeenCalledOnce();
    expect(logInfo).toHaveBeenCalledWith('route_complete', {
      route: '/api/v1/bookings',
      method: 'GET',
      status: 200,
      duration_ms: 42,
      request_id: 'req-123',
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('calls logError with error_message field when error is provided', () => {
    const err = new Error('Database timeout');

    logRouteComplete({
      route: '/api/v1/auth/login',
      method: 'POST',
      status: 500,
      duration_ms: 300,
      request_id: 'req-456',
      error: err,
    });

    expect(logError).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledWith('route_error', {
      route: '/api/v1/auth/login',
      method: 'POST',
      status: 500,
      duration_ms: 300,
      request_id: 'req-456',
      error_message: 'Database timeout',
    });
    expect(logInfo).not.toHaveBeenCalled();
  });
});

describe('getRequestId', () => {
  it('returns the x-request-id header value when present', () => {
    const req = new Request('http://localhost/api/v1/test', {
      headers: { 'x-request-id': 'abc-def-123' },
    });

    expect(getRequestId(req)).toBe('abc-def-123');
  });

  it("returns 'unknown' when x-request-id header is missing", () => {
    const req = new Request('http://localhost/api/v1/test');

    expect(getRequestId(req)).toBe('unknown');
  });
});
