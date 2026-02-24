import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for ScheduleBox E2E tests.
 *
 * Projects:
 * - setup: Authenticates once, saves storageState for reuse
 * - chromium: Desktop Chrome
 * - firefox: Desktop Firefox
 * - webkit: Desktop Safari (critical for 40% CZ iOS users)
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
  outputDir: './test-results',

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // 1% tolerance for anti-aliasing
    },
  },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project: authenticate once and save storageState
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Browser projects: all depend on setup for authenticated state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      dependencies: ['setup'],
    },

    // Visual regression projects: public embed widget, no auth needed
    {
      name: 'visual-regression-desktop',
      testMatch: /.*visual.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      // No dependencies — embed widget is public, no auth needed
    },
    {
      name: 'visual-regression-mobile',
      testMatch: /.*visual.*\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
      // No dependencies — embed widget is public, no auth needed
    },
  ],

  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
    },
  },
});
