import { expect, test } from "@playwright/test";

test.describe("local-only security boundary", () => {
  test("CSP permits same-origin assets and local Blob reads only", async ({ page }) => {
    await page.goto("/");
    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute("content");

    expect(policy).toContain("connect-src 'self' blob:");
    expect(policy).toContain("form-action 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toMatch(/stripe|workers\.dev|google-analytics|googletagmanager|resend/i);
  });

  test("page contains no account, checkout or remote submission surface", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.locator('script[src^="http"]')).toHaveCount(0);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.getByText(/checkout|subscription|billing|magic link/i)).toHaveCount(0);
  });
});
