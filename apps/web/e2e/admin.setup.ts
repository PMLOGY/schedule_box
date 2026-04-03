import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, 'playwright/.auth/admin.json');

/**
 * Admin auth setup: authenticate as platform admin once, save storageState for reuse.
 *
 * @see https://playwright.dev/docs/auth
 */
setup('authenticate as admin', async ({ request }) => {
  const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

  const apiResponse = await request.post(`${baseURL}/api/v1/auth/login`, {
    data: { email: 'admin@schedulebox.cz', password: 'password123' },
  });
  expect(apiResponse.ok(), `Admin login API failed: ${apiResponse.status()}`).toBeTruthy();

  const body = await apiResponse.json();
  const { access_token, user } = body.data;

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

  const origin = new URL(baseURL).origin;
  const storageState = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [{ name: 'schedulebox-auth', value: authStorage }],
      },
    ],
  };

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));
});
