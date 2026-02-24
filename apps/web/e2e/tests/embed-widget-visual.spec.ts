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

const EMBED_SLUG = process.env.EMBED_TEST_SLUG || 'test-company';

test.describe('Embed Widget Visual Regression', () => {
  test('light theme baseline', async ({ page }) => {
    await page.goto(`/embed/${EMBED_SLUG}?theme=light&locale=cs`);
    // Wait for the footer text to confirm full render (server component + client hydration)
    await page.waitForSelector('text=Powered by ScheduleBox');
    await expect(page).toHaveScreenshot('embed-widget-light.png', {
      fullPage: true,
    });
  });

  test('dark theme baseline', async ({ page }) => {
    await page.goto(`/embed/${EMBED_SLUG}?theme=dark&locale=cs`);
    // Wait for the footer text to confirm full render
    await page.waitForSelector('text=Powered by ScheduleBox');
    await expect(page).toHaveScreenshot('embed-widget-dark.png', {
      fullPage: true,
    });
  });

  test('widget with no services shows empty state', async ({ page }) => {
    await page.goto(`/embed/nonexistent-slug-12345`);
    // Wait for the error state heading
    await page.waitForSelector('text=Company not found');
    await expect(page).toHaveScreenshot('embed-widget-not-found.png', {
      fullPage: true,
    });
  });
});
