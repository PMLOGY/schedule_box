import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Dashboard page.
 *
 * The dashboard is the main authenticated landing page.
 * It displays booking stats, quick actions, and navigation sidebar.
 * Used primarily to verify successful login (dashboard loads after redirect).
 */
export class DashboardPage {
  readonly page: Page;
  readonly mainContent: Locator;
  readonly sidebar: Locator;
  readonly bookingStats: Locator;
  readonly quickActions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainContent = page.locator('main, [role="main"]');
    this.sidebar = page.locator('nav, aside, [role="navigation"], [data-testid="sidebar"]');
    this.bookingStats = page.locator('[data-testid="booking-stats"], [class*="stats"]');
    this.quickActions = page.locator('[data-testid="quick-actions"], [class*="quick-action"]');
  }

  /** Navigate to the dashboard (root path) */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Check if the dashboard is visible (i.e., user is authenticated
   * and the dashboard has loaded).
   */
  async isVisible(): Promise<boolean> {
    try {
      // Wait for the main content area to be visible
      await this.mainContent.waitFor({ state: 'visible', timeout: 10000 });

      // Verify we are NOT on the login page
      const url = this.page.url();
      if (url.includes('/login') || url.includes('/register')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Navigate to a section by clicking a sidebar link.
   * @param section - Text of the sidebar link (e.g., "Bookings", "Services", "Settings")
   */
  async navigateTo(section: string) {
    await this.sidebar.getByRole('link', { name: new RegExp(section, 'i') }).click();
  }

  /** Verify the dashboard loaded with authenticated content */
  async expectAuthenticated() {
    await expect(this.mainContent).toBeVisible();
    // The dashboard should not show login-related content
    await expect(this.page.locator('body')).not.toContainText(/sign in|prihlasit se/i);
  }
}
