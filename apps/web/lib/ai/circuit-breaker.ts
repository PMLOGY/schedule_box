// Circuit Breaker Factory for AI Service Calls
// Uses Opossum to prevent cascading failures when AI service is unavailable

import CircuitBreaker from 'opossum';

import type { AIServiceHealth } from './types';

// Default circuit breaker options tuned for AI service calls
export const AI_CIRCUIT_BREAKER_OPTIONS: CircuitBreaker.Options = {
  timeout: 5000, // 5 seconds - AI predictions should respond quickly
  errorThresholdPercentage: 50, // Open circuit after 50% failure rate
  resetTimeout: 30000, // Try again after 30 seconds
  rollingCountTimeout: 10000, // 10 second rolling window
  rollingCountBuckets: 10, // 10 buckets of 1 second each
  volumeThreshold: 5, // Minimum 5 requests before circuit can trip
};

/**
 * Creates a circuit breaker instance wrapping an async function.
 *
 * @param fn - The async function to wrap (e.g., HTTP call to AI service)
 * @param fallbackFn - Function returning sensible defaults when circuit is open
 * @param customOptions - Optional overrides for circuit breaker configuration
 * @returns Configured CircuitBreaker instance
 */
export function createAICircuitBreaker<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  fallbackFn: (...args: TArgs) => TResult,
  customOptions?: Partial<CircuitBreaker.Options>,
): CircuitBreaker<TArgs, TResult> {
  const options = {
    ...AI_CIRCUIT_BREAKER_OPTIONS,
    ...customOptions,
  };

  const breaker = new CircuitBreaker<TArgs, TResult>(fn, options);

  // Register fallback function for when circuit is open or call fails
  breaker.fallback(fallbackFn);

  // Log circuit breaker state transitions for monitoring
  breaker.on('open', () => {
    console.warn('[AI Circuit Breaker] Circuit OPENED - AI service calls will use fallback values');
  });

  breaker.on('halfOpen', (_resetTimeout: number) => {
    console.info('[AI Circuit Breaker] Circuit HALF-OPEN - testing if AI service has recovered');
  });

  breaker.on('close', () => {
    console.info(
      '[AI Circuit Breaker] Circuit CLOSED - AI service is healthy, resuming normal calls',
    );
  });

  breaker.on('fallback', (result: unknown, _err: Error) => {
    console.warn('[AI Circuit Breaker] Fallback used, returned:', result);
  });

  return breaker;
}

/**
 * Get health status from a circuit breaker instance.
 *
 * @param breaker - CircuitBreaker instance to inspect
 * @returns AIServiceHealth object with status, state, and stats
 */
export function getCircuitBreakerHealth(breaker: CircuitBreaker): AIServiceHealth {
  // Determine circuit state
  let state: AIServiceHealth['state'];
  if (breaker.opened) {
    state = 'OPEN';
  } else if (breaker.halfOpen) {
    state = 'HALF_OPEN';
  } else {
    state = 'CLOSED';
  }

  // Map circuit state to health status
  let status: AIServiceHealth['status'];
  switch (state) {
    case 'CLOSED':
      status = 'healthy';
      break;
    case 'HALF_OPEN':
      status = 'degraded';
      break;
    case 'OPEN':
      status = 'unhealthy';
      break;
  }

  // Extract stats from the circuit breaker
  const stats = breaker.stats;

  return {
    status,
    state,
    stats: {
      successes: stats.successes ?? 0,
      failures: stats.failures ?? 0,
      fallbacks: stats.fallbacks ?? 0,
      timeouts: stats.timeouts ?? 0,
    },
  };
}
