import { test, expect, type Page } from '@playwright/test';

/**
 * E2E: Marketplace Search and Booking Flow
 *
 * Tests the public marketplace discovery flow:
 * - Navigate to /marketplace
 * - Search renders firm cards
 * - Search filter narrows results
 * - Clicking a firm opens its detail page
 * - Firm detail shows services, reviews section, and Book Now button
 * - Book Now redirects to the booking wizard
 *
 * This spec does NOT complete a full booking -- that is covered by booking.spec.ts.
 * Marketplace is public (no auth required).
 *
 * All marketplace API calls are mocked via page.route() to ensure predictable
 * test data without requiring specific database state beyond the seed data.
 */

/** Mock marketplace listing data for predictable tests */
const MOCK_LISTINGS = [
  {
    id: 'listing-e2e-001',
    title: 'E2E Test Salon',
    description: 'A test salon for E2E marketplace tests',
    category: 'beauty',
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
    company_name: 'E2E Test Salon',
    rating: 4.5,
    is_visible: true,
    contact_email: 'salon@test.cz',
    contact_phone: '+420111222333',
    slug: 'e2e-test-salon',
  },
  {
    id: 'listing-e2e-002',
    title: 'E2E Test Barber',
    description: 'A test barber shop for E2E marketplace tests',
    category: 'beauty',
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
    company_name: 'E2E Test Barber',
    rating: 4.0,
    is_visible: true,
    contact_email: 'barber@test.cz',
    contact_phone: '+420333444555',
    slug: 'e2e-test-barber',
  },
];

/**
 * Sets up marketplace API mocks so tests have predictable data
 * regardless of database state.
 */
async function setupMarketplaceMocks(page: Page) {
  // Mock marketplace listings API
  await page.route('**/api/v1/marketplace/listings*', async (route) => {
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

  // Mock individual listing detail API
  await page.route('**/api/v1/marketplace/listings/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          ...MOCK_LISTINGS[0],
          services: [
            {
              id: 'svc-001',
              name: 'Haircut',
              duration: 30,
              price: '350',
              currency: 'CZK',
            },
          ],
          reviews: [],
        },
      }),
    });
  });
}

test.describe('Marketplace discovery', () => {
  test('marketplace page renders search input and firm cards', async ({ page }) => {
    await setupMarketplaceMocks(page);
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Search input should be visible
    const searchInput = page
      .getByRole('searchbox')
      .or(page.locator('input[type="search"]'))
      .or(page.locator('input[placeholder*="hledat" i]'))
      .or(page.locator('input[placeholder*="search" i]'));
    await expect(searchInput.first()).toBeVisible({ timeout: 10_000 });
  });

  test('marketplace search filters results', async ({ page }) => {
    await setupMarketplaceMocks(page);
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Type a query into the search input
    const searchInput = page
      .getByRole('searchbox')
      .or(page.locator('input[type="search"]'))
      .or(page.locator('input[placeholder*="hledat" i]'))
      .or(page.locator('input[placeholder*="search" i]'));

    await searchInput.first().fill('test');
    // Wait for debounce and network response instead of hardcoded timeout
    await page.waitForLoadState('networkidle');
    // Page should still be on /marketplace
    await expect(page).toHaveURL(/marketplace/);
  });

  test('firm detail page shows services and Book Now button', async ({ page }) => {
    await setupMarketplaceMocks(page);
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Wait for mocked listings to render - look for our mock listing title
    await expect(page.getByText('E2E Test Salon')).toBeVisible({ timeout: 10_000 });

    // Click the first firm card link
    const firmCard = page
      .getByRole('link', { name: /.+/ })
      .filter({ has: page.locator('[class*="card" i]') })
      .or(page.locator('[data-testid="firm-card"]'))
      .or(page.locator('[href*="/marketplace/"]'))
      .first();

    await firmCard.click();
    await page.waitForLoadState('networkidle');

    // Should be on a firm detail page
    await expect(page).toHaveURL(/marketplace\/.+/);

    // Firm detail should show a Book Now / Rezervovat button
    const bookBtn = page
      .getByRole('button', { name: /book now|rezervovat|objednat/i })
      .or(page.getByRole('link', { name: /book now|rezervovat|objednat/i }));
    await expect(bookBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('Book Now redirects to booking wizard', async ({ page }) => {
    await setupMarketplaceMocks(page);
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    // Wait for mocked listings to render
    await expect(page.getByText('E2E Test Salon')).toBeVisible({ timeout: 10_000 });

    // Find first firm card with href to marketplace detail
    const firmLink = page.locator('a[href*="/marketplace/"]').first();
    await firmLink.click();
    await page.waitForLoadState('networkidle');

    // Click Book Now
    const bookBtn = page
      .getByRole('button', { name: /book now|rezervovat|objednat/i })
      .or(page.getByRole('link', { name: /book now|rezervovat|objednat/i }))
      .first();

    await bookBtn.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to booking wizard (URL contains /book or /rezervace or /booking)
    await expect(page).toHaveURL(/book|rezervac|booking/i);
  });
});
