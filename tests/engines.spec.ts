import { test, expect } from '@playwright/test';

test.describe('Compression Codecs', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate with success param to unlock Pro engines
    await page.goto('/?success=true');
    await page.waitForLoadState('networkidle');
  });

  // Tests converted to interact with UI per guidelines for avoiding worker context destruction

  test('MozJPEG WASM initializes and compresses an image', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text="Drop files here or tap to browse"');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
    });

    // Wait for the file to appear in the queue
    await expect(page.locator('text=test.jpg')).toBeVisible();

    // Start compression
    await page.click('button:has-text("Process Queue")');

    // Check if it finishes processing (the text "✨ Click to Compare" becomes visible when done)
    await expect(page.locator('text=Click to Compare').first()).toBeVisible({ timeout: 15000 });
  });

  test('OxiPNG WASM initializes and compresses an image', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text="Drop files here or tap to browse"');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
    });

    // Wait for the file to appear in the queue
    await expect(page.locator('text=test.png')).toBeVisible();

    // Start compression
    await page.click('button:has-text("Process Queue")');

    // Check if it finishes processing
    await expect(page.locator('text=Click to Compare').first()).toBeVisible({ timeout: 15000 });
  });

  test('AVIF WASM initializes and compresses an image (Single-thread bypass)', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text="Drop files here or tap to browse"');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')
    });

    // Wait for the file to appear in the queue
    await expect(page.locator('text=test.webp')).toBeVisible();

    // Start compression
    await page.click('button:has-text("Process Queue")');

    // Check if it finishes processing
    await expect(page.locator('text=Click to Compare').first()).toBeVisible({ timeout: 15000 });
  });

});
