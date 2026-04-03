import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

/**
 * E2E: Marketplace Search and Booking Flow
 *
 * Tests the marketplace discovery flow:
 * - Navigate to /marketplace (dashboard page, requires auth)
 * - Search renders firm cards
 * - Search filter narrows results
 * - Clicking a firm navigates to /{locale}/{company_slug} (server-rendered detail page)
 *
 * The listing page uses client-side fetching via useMarketplaceListings hook
 * (GET /api/v1/marketplace/listings) which can be mocked via page.route().
 *
 * The detail page at /{locale}/{company_slug} is server-rendered and queries DB
 * directly, so it cannot be mocked. Detail page tests navigate to a real company
 * from the deployed app's seed data.
 *
 * This spec does NOT complete a full booking -- that is covered by booking.spec.ts.
 */

/** Mock marketplace listing data matching the MarketplaceListing interface */
const MOCK_LISTINGS = [
  {
    id: 'listing-e2e-001',
    title: 'E2E Test Salon',
    description: 'A test salon for E2E marketplace tests',
    category: 'Beauty',
    subcategory: 'hair',
    address_street: 'Testovaci 123',
    address_city: 'Praha',
    address_zip: '11000',
    latitude: '50.0755',
    longitude: '14.4378',
    images: [],
    average_rating: '4.5',
    review_count: 12,
    price_range: '$$',
    featured: true,
    verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: null,
    company_slug: 'e2e-test-salon',
  },
  {
    id: 'listing-e2e-002',
    title: 'E2E Test Barber',
    description: 'A test barber shop for E2E marketplace tests',
    category: 'Beauty',
    subcategory: 'barber',
    address_street: 'Barbershop 456',
    address_city: 'Brno',
    address_zip: '60200',
    latitude: '49.1951',
    longitude: '16.6068',
    images: [],
    average_rating: '4.0',
    review_count: 5,
    price_range: '$',
    featured: false,
    verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: null,
    company_slug: 'e2e-test-barber',
  },
];

/**
 * Sets up marketplace API mocks so listing tests have predictable data.
 * Only mocks the listings endpoint (client-side fetch). The detail page
 * is server-rendered and cannot be mocked this way.
 */
async function setupMarketplaceMocks(page: Page) {
  // Mock marketplace listings API — matches both /api/v1/marketplace/listings
  // and /api/v1/marketplace/listings?search=... (query string variants)
  await page.route('**/api/v1/marketplace/listings**', async (route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search') || '';

    // Filter listings by search term if provided
    const filtered = search
      ? MOCK_LISTINGS.filter(
          (l) =>
            l.title.toLowerCase().includes(search.toLowerCase()) ||
            l.description?.toLowerCase().includes(search.toLowerCase()),
        )
      : MOCK_LISTINGS;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: filtered,
        meta: { total: filtered.length, total_pages: 1 },
      }),
    });
  });
}

test.describe('Marketplace discovery', () => {
  test('marketplace page renders search input and firm cards', async ({
    authenticatedPage: page,
  }) => {
    await setupMarketplaceMocks(page);
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // The search input is a regular <input> with placeholder "Hledat firmy..." (Czech)
    // or "Search businesses..." (English). It is NOT type="search" nor role="searchbox".
    const searchInput = page.locator(
      'input[placeholder*="Hledat firmy" i], input[placeholder*="Search businesses" i], input[placeholder*="Hľadať firmy" i]',
    );
    await expect(searchInput.first()).toBeVisible({ timeout: 15_000 });

    // Mocked firm cards should be rendered (use .first() — card title may appear in multiple places)
    await expect(page.getByText('E2E Test Salon').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('E2E Test Barber').first()).toBeVisible({ timeout: 10_000 });
  });

  test('marketplace search filters results', async ({ authenticatedPage: page }) => {
    await setupMarketplaceMocks(page);
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Wait for initial listings to render
    await expect(page.getByText('E2E Test Salon').first()).toBeVisible({ timeout: 10_000 });

    // Type a query that matches only one listing
    const searchInput = page.locator(
      'input[placeholder*="Hledat firmy" i], input[placeholder*="Search businesses" i], input[placeholder*="Hľadať firmy" i]',
    );
    await searchInput.first().fill('Barber');

    // Wait for debounce (300ms) and re-fetch
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // Page should still be on /marketplace
    await expect(page).toHaveURL(/marketplace/);

    // Only the Barber listing should be visible, Salon should be filtered out
    await expect(page.getByText('E2E Test Barber').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('E2E Test Salon')).toHaveCount(0);
  });

  test('clicking a firm card navigates to company detail page', async ({
    authenticatedPage: page,
  }) => {
    await setupMarketplaceMocks(page);
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Wait for mocked listings to render
    await expect(page.getByText('E2E Test Salon').first()).toBeVisible({ timeout: 10_000 });

    // The firm cards are <div> elements with onClick (not <a> links).
    // They use router.push('/' + locale + '/' + company_slug).
    // Click the card containing "E2E Test Salon".
    const firmCard = page.getByText('E2E Test Salon').first();
    await firmCard.click();

    // Should navigate to company detail page — URL may or may not include locale prefix
    // (next-intl localePrefix: 'as-needed' omits default locale 'cs')
    await expect(page).toHaveURL(/e2e-test-salon/, { timeout: 10_000 });
  });

  test('company detail page renders from seed data', async ({ authenticatedPage: page }) => {
    // Navigate directly to the known seed company (Salon Krasa)
    // This is server-rendered from DB — no mocking needed
    await page.goto('/salon-krasa');
    await page.waitForLoadState('networkidle');

    // The company detail page should render services with "Rezervovat" (Book) links
    await expect(page.getByRole('link', { name: /rezervovat|book/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Verify at least one service name from the seed data is visible
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible({ timeout: 10_000 });
  });
});
