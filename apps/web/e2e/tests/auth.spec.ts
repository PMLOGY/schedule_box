import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login.page';
import { RegisterPage } from '../page-objects/register.page';
import { DashboardPage } from '../page-objects/dashboard.page';
import { TEST_OWNER, createNewUser } from '../helpers/test-data';

/**
 * Authentication E2E Tests
 *
 * Tests the two primary authentication flows:
 * 1. New user registration (POST /api/v1/auth/register)
 * 2. Existing user login (auth store login)
 *
 * All tests use unauthenticated browser context (no storageState)
 * since they test the pre-auth user journey.
 *
 * The app uses next-intl with defaultLocale 'cs' and localePrefix 'as-needed',
 * so URLs may or may not include /cs/ prefix. All waitForURL calls use
 * glob patterns (e.g., '**\/login') to handle both cases.
 */
test.describe('Authentication', () => {
  // Override default storageState: all auth tests start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe('Registration', () => {
    test('new user can register successfully', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      const newUser = createNewUser();

      // Navigate to registration page
      await registerPage.goto();

      // Verify registration page loaded
      const isVisible = await registerPage.isVisible();
      expect(isVisible).toBe(true);

      // Fill all 5 registration fields and submit
      await registerPage.register({
        name: newUser.name,
        email: newUser.email,
        companyName: newUser.companyName,
        password: newUser.password,
      });

      // Wait for success message to appear
      // The register form shows a green success div: "Registration successful! Redirecting to login..."
      const successMessage = await registerPage.getSuccessMessage();
      expect(successMessage).toBeTruthy();
      // Czech: "Registrace proběhla úspěšně!", English: "Registration successful"
      expect(successMessage).toMatch(/Registration successful|Registrace proběhla úspěšně/i);

      // After 2 seconds the form redirects to login
      await page.waitForURL('**/login', { timeout: 10000 });
    });
  });

  test.describe('Login', () => {
    test('user can login with valid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      // Navigate to login page
      await loginPage.goto();

      // Verify login page loaded
      const isVisible = await loginPage.isVisible();
      expect(isVisible).toBe(true);

      // Fill credentials for seeded test owner and submit
      await loginPage.login(TEST_OWNER.email, TEST_OWNER.password);

      // Wait for redirect away from login page to dashboard
      // The login form calls router.push('/') on success
      await page.waitForURL(/.*(?<!login)$/, { timeout: 15000 });

      // Verify dashboard content is visible (user is authenticated)
      const isDashboardVisible = await dashboardPage.isVisible();
      expect(isDashboardVisible).toBe(true);
    });

    test('login shows error with invalid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);

      // Navigate to login page
      await loginPage.goto();

      // Fill invalid credentials and submit
      await loginPage.login('wrong@example.com', 'wrongpassword');

      // Verify error message appears
      // The login form sets errorMessage which renders in .text-destructive div
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();

      // Verify we remain on the login page
      expect(page.url()).toMatch(/login/);
    });

    test('login form validates email format', async ({ page }) => {
      const loginPage = new LoginPage(page);

      // Navigate to login page
      await loginPage.goto();

      // Fill an email that passes HTML5 type="email" validation but fails Zod
      // (empty string triggers Zod validation since HTML5 doesn't require non-empty for type=email)
      await loginPage.emailInput.fill('');
      await loginPage.passwordInput.fill('');

      // Click submit to trigger form validation
      await loginPage.submitButton.click();

      // Zod/react-hook-form validation should show error via <FormMessage> component
      // Czech: "Neplatná e-mailová adresa" / English: "Invalid email address"
      const validationMessage = page
        .locator('[id*="message"], p.text-destructive, p[class*="destructive"]')
        .first();
      await expect(validationMessage).toBeVisible({ timeout: 5000 });

      // Verify we remain on the login page (form was not submitted)
      expect(page.url()).toMatch(/login/);
    });
  });
});
