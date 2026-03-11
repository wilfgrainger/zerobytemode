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

  test('Support modal opens and closes from footer', async ({ page }) => {
    // Find and click the Support button in the footer
    const supportButton = page.locator('footer button[aria-label="Open support modal"]');
    await expect(supportButton).toBeVisible();
    await supportButton.click();

    // Verify the Support modal is open
    const modal = page.locator('[role="dialog"][aria-labelledby="support-modal-title"]');
    await expect(modal).toBeVisible();
    await expect(page.locator('#support-modal-title')).toBeVisible();

    // Close with the X button
    await page.locator('[aria-label="Close"]').first().click();
    await expect(modal).not.toBeVisible();
  });

  test('Support modal closes on Escape key', async ({ page }) => {
    const supportButton = page.locator('footer button[aria-label="Open support modal"]');
    await supportButton.click();

    const modal = page.locator('[role="dialog"][aria-labelledby="support-modal-title"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('Sign in modal closes on Escape key', async ({ page }) => {
    const signInButton = page.locator('button', { hasText: 'Sign In' }).first();
    await signInButton.click();

    const modal = page.locator('[role="dialog"][aria-labelledby="signin-modal-title"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('Upgrade modal opens and closes from Go Pro button', async ({ page }) => {
    const goProButton = page.locator('button', { hasText: 'Go Pro' }).first();
    await expect(goProButton).toBeVisible();
    await goProButton.click();

    const modal = page.locator('[role="dialog"][aria-labelledby="upgrade-modal-title"]');
    await expect(modal).toBeVisible();
    await expect(page.locator('#upgrade-modal-title')).toHaveText('Activate Pro Compression');

    await page.locator('[aria-label="Close"]').first().click();
    await expect(modal).not.toBeVisible();
  });

  test('Footer has accessible Support button', async ({ page }) => {
    await expect(page.locator('footer button[aria-label="Open support modal"]')).toBeVisible();
  });
});
