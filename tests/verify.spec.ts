import { test, expect } from '@playwright/test';

test.describe('Verify Page', () => {
  test('shows error when no token is provided', async ({ page }) => {
    await page.goto('/verify');

    await expect(page.locator('text=Login Failed')).toBeVisible();
    await expect(page.locator('text=No login token found in URL.')).toBeVisible();

    const returnHomeButton = page.locator('button', { hasText: 'Return Home' });
    await expect(returnHomeButton).toBeVisible();

    await returnHomeButton.click();
    await expect(page).toHaveURL('/');
  });
});
