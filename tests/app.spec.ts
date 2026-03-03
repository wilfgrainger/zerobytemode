
import { test, expect } from '@playwright/test';

test.describe('ZeroByteMode Visual & Functional Review', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Desktop Visual Report', async ({ page }) => {
    await expect(page).toHaveTitle(/ZeroByteMode/);
    // Take screenshot of the hero section
    await page.screenshot({ path: 'test-results/desktop-home.png', fullPage: true });
  });

  test('Mobile Visual Report', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    // Ensure at least one glass-panel is visible on mobile
    await expect(page.locator('.glass-panel').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true });
  });

  test('Pro State Visual Report', async ({ page }) => {
    // Navigate with success param to trigger Pro mock
    await page.goto('/?success=true');
    await expect(page.locator('text=PRO').first()).toBeVisible();
    
    // Check for the Pro Options Bar
    await expect(page.locator('text=Quality')).toBeVisible();
    await expect(page.locator('text=Engine')).toBeVisible();
    await expect(page.locator('text=Format')).toBeVisible();
    
    // Check for engine selection buttons
    await expect(page.locator('button').filter({ hasText: 'MOZJPEG' }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'AVIF' }).first()).toBeVisible();
    
    // Check for the encryption toggle
    await expect(page.locator('text=ENCRYPTION OFF')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/pro-activated-v3.png' });
  });

  test('Queuing & Bulk Interaction Review', async ({ page }) => {
    // Navigate with success param to trigger Pro mock
    await page.goto('/?success=true');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text=Start Compressing');
    const fileChooser = await fileChooserPromise;
    
    // We can't easily simulate a multi-file drop in Playwright without more setup
    // but we can verify the UI elements are ready for it.
    await expect(page.locator('input[type="file"]')).toHaveAttribute('multiple', '');
    
    // Check if the ZIP download button appears when files are added (not possible without actual files here)
  });
});
