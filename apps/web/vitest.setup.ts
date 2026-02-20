import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Start MSW server before all tests
// onUnhandledRequest: 'warn' is used instead of 'error' to avoid
// failing tests for unexpected requests during initial setup phase.
// Switch to 'error' once all external API calls are fully mocked.
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset any request handlers added during individual tests
// CRITICAL: prevents test pollution between test runs
afterEach(() => server.resetHandlers());

// Clean up the MSW server after all tests complete
afterAll(() => server.close());
