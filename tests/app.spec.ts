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
    // Ensure a key element like the upload dropzone or optimization panel is visible on mobile
    await expect(page.getByText('Deploy Assets.')).toBeVisible();
    await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true });
  });

  test('Pro State Visual Report', async ({ page }) => {
    // Navigate with success param to trigger Pro mock
    await page.goto('/?success=true');
    await expect(page.locator('#pro-status-badge')).toBeVisible();

    // Check for the Pro Options Bar
    await expect(page.getByText('Quality', { exact: true })).toBeVisible();
    await expect(page.getByText('Optimization', { exact: true })).toBeVisible();
    await expect(page.getByText('Format', { exact: true })).toBeVisible();

    // Check for engine selection buttons
    await expect(page.locator('button').filter({ hasText: 'MOZ' }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'AVIF' }).first()).toBeVisible();

    // Check for the encryption toggle
    await expect(page.getByText('STANDARD ZIP')).toBeVisible();

    await page.screenshot({ path: 'test-results/pro-activated-v3.png' });
  });

  test('Queuing & Bulk Interaction Review', async ({ page }) => {
    // Navigate with success param to trigger Pro mock
    await page.goto('/?success=true');

    // Since 'Start Compressing' or similar button only appears after a file is selected,
    // we can't click it immediately. Instead, verify the input accepts multiple files.
    await expect(page.locator('input[type="file"]')).toHaveAttribute('multiple', '');

    // Check if the ZIP download button appears when files are added (not possible without actual files here)
  });
});
