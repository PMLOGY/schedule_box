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
  retries: process.env.CI ? 2 : 1,
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
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project: authenticate once and save storageState (regular user)
    {
      name: 'setup',
      testDir: '.', // auth.setup.ts is in e2e/ root, not e2e/tests/
      testMatch: /auth\.setup\.ts/,
    },

    // Admin setup project: authenticate as platform admin
    // Depends on 'setup' to run sequentially (avoids login rate limiting)
    {
      name: 'admin-setup',
      testDir: '.', // admin.setup.ts is in e2e/ root, not e2e/tests/
      testMatch: /admin\.setup\.ts/,
      dependencies: ['setup'],
    },

    // Browser projects: all depend on setup for authenticated state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      testIgnore: [/.*visual.*\.spec\.ts/, /admin-.*\.spec\.ts/],
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      testIgnore: [/.*visual.*\.spec\.ts/, /admin-.*\.spec\.ts/],
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      testIgnore: [/.*visual.*\.spec\.ts/, /admin-.*\.spec\.ts/],
      dependencies: ['setup'],
    },

    // Admin project: platform admin flows (impersonation, super-admin panel)
    {
      name: 'admin-chromium',
      testMatch: /admin-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'playwright/.auth/admin.json'),
      },
      dependencies: ['admin-setup'],
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

  /* When BASE_URL is set (e.g. Coolify), skip launching a local server */
  ...(!process.env.BASE_URL && {
    webServer: {
      command: process.env.CI ? 'pnpm start' : 'pnpm dev',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  }),
});
