import { test, expect } from "@playwright/test";

test("reduced motion keeps chapters and product intake accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".inside-hero-fallback")).toBeVisible();
  await expect(page.locator(".inside-hero-model canvas")).toHaveCount(0);
  await page
    .getByRole("button", { name: "04 Connect", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Nothing works alone." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore dependencies", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dependencies", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Back to product input" }).click();
  await page
    .getByRole("button", { name: "Bring your product", exact: true })
    .last()
    .click();
  await expect(page.locator("#explore")).toBeInViewport();
});

test("WebGL context loss leaves the landing actions usable", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator(".inside-hero-model canvas");
  await expect(canvas).toBeVisible();
  await canvas.evaluate((element) =>
    element.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
  );
  await expect(page.locator(".inside-hero-fallback")).toBeVisible();
  await expect(canvas).toHaveCount(0);
  await page
    .getByRole("button", { name: "Explore the demo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Back to product input" }),
  ).toBeVisible();
});
