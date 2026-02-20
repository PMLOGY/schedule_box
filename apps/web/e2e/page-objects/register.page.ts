import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Registration page.
 *
 * The register form has 5 fields: name, email, companyName, password, confirmPassword.
 * Uses `useTranslations('auth.register')` for i18n labels.
 * Password requirements: min 12 chars, uppercase + lowercase + number + special char.
 *
 * @see apps/web/components/auth/register-form.tsx
 */
export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly companyNameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Name is the first text input in the form
    this.nameInput = page.locator('input[type="text"]').first();
    this.emailInput = page.locator('input[type="email"]');
    // Company name is the second text input
    this.companyNameInput = page.locator('input[type="text"]').nth(1);
    // Password is the first password input
    this.passwordInput = page.locator('input[type="password"]').first();
    // Confirm password is the second password input
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);

    this.submitButton = page.getByRole('button', {
      name: /registrovat|register|sign up|submit/i,
    });
    this.errorMessage = page.locator('.text-destructive, [class*="text-destructive"]');
    this.successMessage = page.locator('.text-green-700, [class*="text-green"]');
    this.loginLink = page.getByRole('link', {
      name: /prihlasit|login|sign in/i,
    });
  }

  /** Navigate to the registration page */
  async goto() {
    await this.page.goto('/register');
  }

  /**
   * Fill all registration fields and submit the form.
   * Password is automatically used for both password and confirmPassword.
   */
  async register(data: { name: string; email: string; companyName: string; password: string }) {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    await this.companyNameInput.fill(data.companyName);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.password);
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

  /** Get the displayed success message text, or null if not visible */
  async getSuccessMessage(): Promise<string | null> {
    try {
      await this.successMessage.waitFor({ state: 'visible', timeout: 5000 });
      return await this.successMessage.textContent();
    } catch {
      return null;
    }
  }

  /** Verify that the registration page is displayed */
  async isVisible(): Promise<boolean> {
    try {
      await expect(this.emailInput).toBeVisible({ timeout: 5000 });
      await expect(this.nameInput).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
