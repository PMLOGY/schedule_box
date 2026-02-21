import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Login page.
 *
 * The login form uses `useTranslations('auth.login')` so button/label text
 * depends on the active locale (cs, sk, en). All locators use i18n-safe
 * regex patterns that match across locales.
 *
 * @see apps/web/components/auth/login-form.tsx
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.getByRole('button', {
      name: /prihlasit|sign in|submit/i,
    });
    this.errorMessage = page.locator('.text-destructive, [class*="text-destructive"]');
    this.registerLink = page.getByRole('link', { name: /registr/i });
  }

  /** Navigate to the login page */
  async goto() {
    await this.page.goto('/login');
  }

  /** Fill email and password, then submit the form */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** Get the displayed error message text, or null if not visible */
  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }

  /** Verify that the login page is displayed */
  async isVisible(): Promise<boolean> {
    try {
      await expect(this.emailInput).toBeVisible({ timeout: 5000 });
      await expect(this.passwordInput).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
