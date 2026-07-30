import { expect, test } from "@playwright/test";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function compressWith(page: import("@playwright/test").Page, engine: string, filename: string) {
  await page.goto("/");
  await page.getByLabel("Engine").selectOption({ label: engine });
  await page.locator('input[type="file"]').setInputFiles({
    name: filename,
    mimeType: "image/png",
    buffer: PNG,
  });
  await page.getByRole("button", { name: "Compress batch" }).click();
  await expect(page.getByText("done", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Download", exact: true })).toBeVisible();
}

test.describe("local compression engines", () => {
  test("Auto-pilot processes an image", async ({ page }) => {
    await compressWith(page, "Auto-pilot", "auto.png");
  });

  test("OxiPNG processes an image", async ({ page }) => {
    await compressWith(page, "OxiPNG", "oxipng.png");
  });

  test("libavif processes or safely falls back", async ({ page }) => {
    await compressWith(page, "libavif", "avif-source.png");
  });
});
