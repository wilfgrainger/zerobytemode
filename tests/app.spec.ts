import { expect, test } from "@playwright/test";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.describe("ZeroByteMode open local edition", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("publishes one complete open edition", async ({ page }) => {
    await expect(page).toHaveTitle(/Open-source local image compressor/);
    await expect(page.getByRole("heading", { name: /Serious image compression/ })).toBeVisible();
    await expect(page.getByText("No account. No paywall.")).toBeVisible();
    await expect(page.getByText("All unlocked")).toBeVisible();
    await expect(page.getByText("Paid tier")).toBeVisible();
    await expect(page.getByText("None", { exact: true })).toHaveCount(3);

    await expect(page.getByText(/Go Pro|Upgrade|Billing|Sign in/i)).toHaveCount(0);
    await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
  });

  test("accepts a batch larger than the old free limit", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(
      [1, 2, 3, 4].map((number) => ({
        name: `image-${number}.png`,
        mimeType: "image/png",
        buffer: PNG,
      })),
    );

    for (const number of [1, 2, 3, 4]) {
      await expect(page.getByText(`image-${number}.png`)).toBeVisible();
    }
    await expect(page.getByText("0 of 4 complete")).toBeVisible();
  });

  test("makes every codec and output control available", async ({ page }) => {
    const engine = page.getByLabel("Engine");
    await expect(engine).toBeEnabled();
    await expect(engine.locator("option")).toHaveText([
      "Auto-pilot",
      "MozJPEG",
      "OxiPNG",
      "libwebp",
      "libavif",
      "Browser native",
    ]);

    const format = page.getByLabel("Format");
    await expect(format).toBeEnabled();
    await expect(page.getByRole("slider", { name: "Quality" })).toBeEnabled();
  });

  test("does not make external application requests or write identity state", async ({ page, context }) => {
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== "http://localhost:3000") externalRequests.push(request.url());
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    expect(externalRequests).toEqual([]);
    expect(await context.cookies()).toEqual([]);
    expect(
      await page.evaluate(() => ({
        local: window.localStorage.length,
        session: window.sessionStorage.length,
      })),
    ).toEqual({ local: 0, session: 0 });
  });

  test("is usable at a narrow mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();

    await expect(page.getByRole("button", { name: "Choose images" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    await page.screenshot({ path: "test-results/mobile-open-edition.png", fullPage: true });
  });
});
