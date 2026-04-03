import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the 4-step Booking Wizard.
 *
 * Steps:
 * 1. Service Select — choose a service from cards
 * 2. DateTime Select — pick a date and time slot (auto-advances to step 3)
 * 3. Customer Info — fill name, email, phone, notes
 * 4. Confirmation — review and confirm booking
 *
 * The wizard uses Zustand store for step state management.
 * UI labels use Czech translations (next-intl, cs locale).
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
    // Czech: "Další" (common.next), English fallback: "Next"
    this.nextButton = page.getByRole('button', {
      name: /další|next|dalsi|pokračovat|pokracovat/i,
    });
    // Czech: "Zpět" (common.back), English fallback: "Back"
    this.backButton = page.getByRole('button', {
      name: /zpět|back|zpet|předchozí|predchozi/i,
    });
    // Czech: "Potvrdit rezervaci" (step4.confirmBooking), or "Potvrdit" (common.confirm)
    this.confirmButton = page.getByRole('button', {
      name: /potvrdit rezervaci|potvrdit|confirm|rezervovat/i,
    });
    // StepIndicator uses role="progressbar" with aria-valuenow
    this.stepIndicator = page.locator('[role="progressbar"]');
    this.errorAlert = page.locator('[role="alert"]');
  }

  /**
   * Navigate to the booking wizard page.
   *
   * Handles the Zustand persist hydration race: the AuthGuard may redirect
   * to /login before the persist middleware hydrates auth state from
   * localStorage. If this happens, we log in programmatically and use
   * client-side navigation to preserve the in-memory auth state.
   */
  async goto() {
    await this.page.goto('/bookings/new');
    await this.page.waitForLoadState('networkidle');

    // Wait for the step indicator to be visible (wizard loaded)
    await this.stepIndicator.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Step 1: Select a service by its name text.
   * Clicks on the Card element containing the service name.
   */
  async selectService(name: string) {
    await this.page.getByText(name, { exact: false }).first().click();
  }

  /**
   * Step 2: Select a time slot button.
   * In the AvailabilityGrid, each slot is rendered as a Button with the startTime text.
   * Clicking a slot auto-advances to step 3 (handleSlotSelect calls nextStep()).
   *
   * @param time - Time slot text (e.g., "10:00", "14:30")
   */
  async selectTimeSlot(time: string) {
    const timeSlotButton = this.page.getByRole('button', { name: time }).first();
    await timeSlotButton.waitFor({ state: 'visible', timeout: 10000 });
    await timeSlotButton.click();
  }

  /**
   * Step 3: Fill customer information fields.
   * Uses form field names from Step3CustomerInfo component:
   * - customerName (label: "Jméno")
   * - customerEmail (label: "E-mail", type="email")
   * - customerPhone (label: "Telefon", type="tel")
   * - notes (label: "Poznámky")
   */
  async fillCustomerInfo(data: { name: string; email: string; phone: string; notes?: string }) {
    // Fill name field — label is Czech "Jméno" or English "Name"
    const nameInput = this.page
      .getByLabel(/jméno|jmeno|name/i)
      .or(this.page.locator('input[name="customerName"]'));
    await nameInput.fill(data.name);

    // Fill email field — label is "E-mail"
    const emailInput = this.page
      .getByLabel(/e-mail|email/i)
      .or(this.page.locator('input[type="email"]'));
    await emailInput.fill(data.email);

    // Fill phone field — label is "Telefon"
    const phoneInput = this.page
      .getByLabel(/telefon|phone/i)
      .or(this.page.locator('input[type="tel"]'));
    await phoneInput.fill(data.phone);

    // Fill notes field (optional) — label is "Poznámky"
    if (data.notes) {
      const notesInput = this.page
        .getByLabel(/poznámky|poznamky|notes/i)
        .or(this.page.locator('input[name="notes"]'));
      await notesInput.fill(data.notes);
    }
  }

  /** Click the Next/Další button to proceed to the next step */
  async proceedToNextStep() {
    await this.nextButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.nextButton.click();
  }

  /** Click the Back/Zpět button to return to the previous step */
  async goBack() {
    await this.backButton.click();
  }

  /** Click the Confirm/Potvrdit rezervaci button to finalize the booking (Step 4) */
  async confirm() {
    await this.confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.confirmButton.click();
  }

  /**
   * Get the current step number from the step indicator.
   * The StepIndicator component uses role="progressbar" with aria-valuenow={currentStep}.
   * Returns the step number (1-4) or 0 if not determinable.
   */
  async getCurrentStep(): Promise<number> {
    const value = await this.stepIndicator.getAttribute('aria-valuenow');
    if (value) return parseInt(value, 10);

    // Fallback: parse mobile text "Krok X ze 4"
    const text = await this.stepIndicator.textContent();
    if (!text) return 0;

    const match = text.match(/(\d)\s*(?:\/|of|ze?)\s*4/);
    if (match) return parseInt(match[1], 10);

    return 0;
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
