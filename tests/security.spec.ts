
import { test, expect } from '@playwright/test';

test.describe('Security: Authorization Bypass Check', () => {

  test('Should NOT grant Pro access when zbm_pro_tier cookie is manually set', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');

    // 2. Manually set the insecure cookie
    await page.context().addCookies([{
      name: 'zbm_pro_tier',
      value: 'true',
      domain: 'localhost',
      path: '/',
    }]);

    // 3. Reload the page to trigger initialization
    await page.reload();

    // 4. Verify that the Pro badge is NOT visible
    const proBadge = page.locator('text=STUDIO PRO');
    await expect(proBadge).not.toBeVisible();

    // 5. Verify that Pro-only features are still locked/show upgrade prompts
    // The "STUDIO PRO ONLY" overlay appears on hover when !isPro
    const qualityRange = page.locator('#quality-range');
    await expect(qualityRange).toBeDisabled();

    // 6. Check that engine buttons still have the "STUDIO PRO ONLY" hint logic
    const avifButton = page.locator('button', { hasText: 'AVIF' });
    // Since it's locked by the overlay when !isPro, we check for the overlay
    const proOnlyOverlay = page.locator('text=STUDIO PRO ONLY').first();
    // We might need to hover to see it if it's hidden by default, but the presence in DOM (even hidden) is enough if logic is correct
    // Or just check that isPro state remains false by seeing the "Upgrade to Pro" button
    const upgradeButton = page.locator('text=Upgrade to Pro');
    await expect(upgradeButton).toBeVisible();
  });
});
