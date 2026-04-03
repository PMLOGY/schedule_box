import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, 'playwright/.auth/user.json');

/**
 * Global auth setup: authenticate as test owner once, save storageState for reuse.
 *
 * Login rate limit is 10 req / 15 min, so we use API login + direct storageState
 * construction instead of repeated browser form submissions.
 *
 * @see https://playwright.dev/docs/auth
 */
setup('authenticate as test owner', async ({ request }) => {
  const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

  // Login via API to get tokens
  const apiResponse = await request.post(`${baseURL}/api/v1/auth/login`, {
    data: { email: 'test@example.com', password: 'password123' },
  });
  expect(apiResponse.ok(), `Login API failed: ${apiResponse.status()}`).toBeTruthy();

  const body = await apiResponse.json();
  const { access_token, user } = body.data;

  // Build Zustand auth store state
  const authStorage = JSON.stringify({
    state: {
      user: {
        id: user.uuid,
        email: user.email,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        role: user.role,
        companyId: user.company_id,
        companyName: '',
      },
      accessToken: access_token,
      isAuthenticated: true,
      _hasHydrated: true,
    },
    version: 0,
  });

  // Extract origin for storageState
  const origin = new URL(baseURL).origin;

  // Write storageState file directly — no browser navigation needed
  // This includes localStorage (for Zustand auth store) but no cookies
  // (the app uses JWT tokens from localStorage, not cookies)
  const storageState = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [{ name: 'auth-storage', value: authStorage }],
      },
    ],
  };

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));
});
