import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the 4-step Booking Wizard.
 *
 * Steps:
 * 1. Service Select — choose a service from cards
 * 2. DateTime Select — pick a date and time slot
 * 3. Customer Info — fill name, email, phone, notes
 * 4. Confirmation — review and confirm booking
 *
 * The wizard uses Zustand store for step state management.
 *
 * @see apps/web/components/booking/BookingWizard.tsx
 * @see apps/web/stores/booking-wizard.store.ts
 */
export class BookingWizardPage {
  readonly page: Page;
  readonly serviceCards: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly confirmButton: Locator;
  readonly stepIndicator: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.serviceCards = page.locator('[data-testid="service-card"], [role="button"][data-service]');
    this.nextButton = page.getByRole('button', {
      name: /next|dalsi|pokracovat/i,
    });
    this.backButton = page.getByRole('button', {
      name: /back|zpet|predchozi/i,
    });
    this.confirmButton = page.getByRole('button', {
      name: /confirm|potvrdit|rezervovat/i,
    });
    this.stepIndicator = page.locator('[data-testid="step-indicator"], [class*="step"]');
    this.errorAlert = page.locator('[role="alert"]');
  }

  /** Navigate to the booking wizard page */
  async goto() {
    await this.page.goto('/bookings/new');
  }

  /**
   * Step 1: Select a service by its name text.
   * Clicks on the element containing the service name.
   */
  async selectService(name: string) {
    await this.page.getByText(name, { exact: false }).click();
  }

  /**
   * Step 2: Select a date and time slot.
   *
   * @param date - Date string to locate in the calendar (e.g., "15", "2026-03-15")
   * @param time - Time slot text (e.g., "10:00", "14:30")
   */
  async selectDateTime(date: string, time: string) {
    // Click the date in the calendar/date picker
    await this.page.getByText(date, { exact: true }).click();

    // Select the time slot
    await this.page.getByText(time, { exact: true }).click();
  }

  /**
   * Step 3: Fill customer information fields.
   */
  async fillCustomerInfo(data: { name: string; email: string; phone: string; notes?: string }) {
    // Fill name field - look for input by label or placeholder
    const nameInput = this.page
      .getByLabel(/name|jmeno/i)
      .or(this.page.locator('input[name="name"]'));
    await nameInput.fill(data.name);

    // Fill email field
    const emailInput = this.page.locator('input[type="email"]');
    await emailInput.fill(data.email);

    // Fill phone field
    const phoneInput = this.page
      .getByLabel(/phone|telefon/i)
      .or(this.page.locator('input[type="tel"], input[name="phone"]'));
    await phoneInput.fill(data.phone);

    // Fill notes field (optional)
    if (data.notes) {
      const notesInput = this.page
        .getByLabel(/notes|poznamk/i)
        .or(this.page.locator('textarea[name="notes"], textarea'));
      await notesInput.fill(data.notes);
    }
  }

  /** Click the Next button to proceed to the next step */
  async proceedToNextStep() {
    await this.nextButton.click();
  }

  /** Click the Back button to return to the previous step */
  async goBack() {
    await this.backButton.click();
  }

  /** Click the Confirm button to finalize the booking (Step 4) */
  async confirm() {
    await this.confirmButton.click();
  }

  /**
   * Get the current step number from the step indicator.
   * Returns the step number (1-4) or 0 if not determinable.
   */
  async getCurrentStep(): Promise<number> {
    const text = await this.stepIndicator.textContent();
    if (!text) return 0;

    // Try to extract step number from indicator text
    const match = text.match(/(\d)\s*(?:\/|of|z)\s*4/);
    if (match) return parseInt(match[1], 10);

    // Fallback: check for active step marker
    const activeSteps = this.page.locator(
      '[data-testid="step-indicator"] [data-active="true"], [class*="step"][aria-current]',
    );
    const count = await activeSteps.count();
    return count > 0 ? count : 0;
  }

  /** Check if an error alert is displayed */
  async hasError(): Promise<boolean> {
    try {
      await this.errorAlert.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Get error alert text content */
  async getErrorText(): Promise<string | null> {
    try {
      await this.errorAlert.waitFor({ state: 'visible', timeout: 3000 });
      return await this.errorAlert.textContent();
    } catch {
      return null;
    }
  }
}
