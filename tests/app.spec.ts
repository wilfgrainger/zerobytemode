import { expect, test } from "@playwright/test";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const isApplicationStorageKey = (key: string) => /^(zbm_|zerobytemode)/i.test(key);

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
    await page.screenshot({ path: "test-results/desktop-open-edition.png", fullPage: true });
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
    await expect(page.getByText("0 of 4 ready")).toBeVisible();
  });

  test("makes every codec and output control available", async ({ page }) => {
    const controls = page.getByRole("combobox");
    const format = controls.nth(0);
    const engine = controls.nth(1);

    await expect(format).toBeEnabled();
    await expect(engine).toBeEnabled();
    await expect(engine.locator("option")).toHaveText([
      "Auto-pilot",
      "MozJPEG",
      "OxiPNG",
      "libwebp",
      "libavif",
      "Browser native",
    ]);
    await expect(page.getByRole("slider")).toBeEnabled();
  });

  test("keeps fixed codecs and output formats coherent", async ({ page }) => {
    const format = page.getByRole("combobox").nth(0);
    const engine = page.getByRole("combobox").nth(1);

    await engine.selectOption("mozjpeg");
    await expect(format).toHaveValue("image/jpeg");

    await format.selectOption("image/png");
    await expect(engine).toHaveValue("autopilot");
  });

  test("rejects unsupported image types with a clear local message", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: "vector.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    });

    await expect(page.getByText(/Skipped unsupported file: vector\.svg/)).toBeVisible();
    await expect(page.getByText("Batch queue")).toHaveCount(0);
  });

  test("preview dialog traps focus and restores it when closed", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: "preview.png",
      mimeType: "image/png",
      buffer: PNG,
    });

    const preview = page.getByRole("button", { name: "Preview preview.png" });
    await preview.focus();
    await preview.click();

    const dialog = page.getByRole("dialog");
    const close = dialog.getByRole("button", { name: "Close" });
    await expect(dialog).toBeVisible();
    await expect(close).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(preview).toBeFocused();
  });

  test("does not make external application requests or write identity state", async ({ page, context }) => {
    const applicationOrigin = new URL(page.url()).origin;
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== applicationOrigin) externalRequests.push(request.url());
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    expect(externalRequests).toEqual([]);
    expect(await context.cookies()).toEqual([]);

    const storageKeys = await page.evaluate(() => ({
      local: Object.keys(window.localStorage),
      session: Object.keys(window.sessionStorage),
    }));
    expect(storageKeys.local.filter(isApplicationStorageKey)).toEqual([]);
    expect(storageKeys.session.filter(isApplicationStorageKey)).toEqual([]);
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
