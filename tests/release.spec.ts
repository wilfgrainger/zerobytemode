import { expect, test } from "@playwright/test";

test.describe("release provenance", () => {
  test("shows the deployed version, commit and workflow", async ({ page }) => {
    await page.goto("/");

    const release = page.getByRole("region", { name: /deployed release/i });
    await expect(release).toBeVisible();
    await expect(release).toContainText("Release provenance");
    await expect(release).toContainText("v2.0.0");
    await expect(release.getByRole("link", { name: /run #/i })).toHaveAttribute(
      "href",
      /github\.com\/wilfgrainger\/zerobytemode\/actions/,
    );
    await expect(release.getByRole("link", { name: "Release manifest" })).toHaveAttribute(
      "href",
      "/release.json",
    );
  });

  test("publishes a machine-readable local-only release manifest", async ({ request }) => {
    const response = await request.get("/release.json");
    expect(response.ok()).toBeTruthy();

    const release = await response.json();
    expect(release).toMatchObject({
      schemaVersion: 1,
      product: "ZeroByteMode",
      version: "2.0.0",
      privacy: {
        processing: "local-only",
        imageUploads: false,
        analytics: false,
        accounts: false,
      },
    });
    expect(release.commit).toBeTruthy();
    expect(release.workflowUrl).toContain(
      "github.com/wilfgrainger/zerobytemode/actions",
    );
  });
});
