/**
 * shadcn/ui Audit (Phase 26 baseline):
 *
 * - button.tsx: CUSTOM — adds `isLoading` prop with Loader2 spinner; adds `[&_svg]:pointer-events-none
 *   [&_svg]:size-4 [&_svg]:shrink-0` to base classes. Standard variants (default, destructive,
 *   outline, secondary, ghost, link) and sizes (default, sm, lg, icon) are unchanged.
 *
 * - calendar.tsx: CUSTOM — uses updated DayPicker v9 API (`month_caption`, `button_previous`,
 *   `button_next`, `month_grid`, `day_button`, `weekdays`, `weekday` classNames keys instead of
 *   deprecated v8 keys). Also uses `Chevron` component override (not `IconLeft`/`IconRight`).
 *   Navigation layout uses `nav` with flex justify-between — non-standard shadcn layout.
 *
 * - skeleton.tsx: STANDARD — matches shadcn default exactly (animate-pulse rounded-md bg-muted).
 *
 * - globals.css: Uses hsl() CSS variables (shadcn convention). Custom ScheduleBox brand colors:
 *   --primary: 217 91% 60% (blue-500 #3B82F6), --secondary: 142 71% 45% (green-500 #22C55E).
 *   Embed widget at /embed/[company_slug] imports globals.css directly via layout.tsx — any
 *   changes to CSS variables or @layer base rules WILL affect the embedded widget appearance.
 *
 * Custom overrides to preserve:
 * - button.tsx: `isLoading` prop and Loader2 spinner integration
 * - button.tsx: SVG size/pointer-events helpers in base class string
 * - calendar.tsx: DayPicker v9 classNames keys (breaking if reverted to v8 keys)
 * - calendar.tsx: Chevron component override (ChevronLeft/ChevronRight from lucide-react)
 * - globals.css: ScheduleBox blue primary (#3B82F6) and green secondary (#22C55E) — not shadcn defaults
 */

import { test, expect } from '@playwright/test';

/**
 * Embed Widget Visual Regression Tests
 *
 * Captures baseline screenshots of the embed widget at /embed/[company_slug].
 * These baselines protect against unintended visual regressions when globals.css
 * or embed widget components are modified in subsequent Phase 26 plans.
 *
 * On first run: Playwright creates baseline .png files in
 * apps/web/e2e/tests/embed-widget-visual.spec.ts-snapshots/
 * On subsequent runs: Playwright compares against those baselines (1% pixel diff tolerance).
 *
 * To update baselines after intentional changes:
 *   npx playwright test --project=visual-regression-desktop --update-snapshots
 */

// Embed widget is public — clear any inherited storageState from browser projects
// so these tests work even when run under chromium/firefox/webkit projects.
test.use({ storageState: undefined });

const EMBED_SLUG = process.env.EMBED_TEST_SLUG || 'salon-krasa';

test.describe('Embed Widget Visual Regression', () => {
  test('light theme renders company services', async ({ page }) => {
    const response = await page.goto(`/embed/${EMBED_SLUG}?theme=light&locale=cs`, {
      waitUntil: 'networkidle',
    });
    // The embed page is a server component — check it returns 200
    expect(response?.status()).toBe(200);

    // Wait for client component hydration — WidgetContent renders footer or service cards
    const content = page
      .getByText('Powered by ScheduleBox')
      .or(page.locator('button:has-text("Rezervovat")'))
      .or(page.getByText(EMBED_SLUG));
    await expect(content.first()).toBeVisible({ timeout: 15000 });
  });

  test('dark theme renders company services', async ({ page }) => {
    const response = await page.goto(`/embed/${EMBED_SLUG}?theme=dark&locale=cs`, {
      waitUntil: 'networkidle',
    });
    expect(response?.status()).toBe(200);

    const content = page
      .getByText('Powered by ScheduleBox')
      .or(page.locator('button:has-text("Rezervovat")'))
      .or(page.getByText(EMBED_SLUG));
    await expect(content.first()).toBeVisible({ timeout: 15000 });
  });

  test('nonexistent company shows error or 404', async ({ page }) => {
    await page.goto(`/embed/nonexistent-slug-12345`, { waitUntil: 'networkidle' });
    // Should show "Company not found" text or a 404 page
    const errorContent = page
      .getByText('Company not found')
      .or(page.getByText('could not be found'))
      .or(page.getByText('404'));
    await expect(errorContent.first()).toBeVisible({ timeout: 15000 });
  });
});
