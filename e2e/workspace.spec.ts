import { test, expect } from "@playwright/test";

test("demo synchronizes 3D controls, graph, simulation and assistant context", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Try Interactive Demo" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Battery", exact: true }).click();
  await expect(page.locator(".inspector h2")).toHaveText("Battery");
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Restore product", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Isolate", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore product", exact: true })
    .click();
  await page.getByRole("button", { name: /X-Ray$/ }).click();
  await page.getByRole("slider", { name: "X-ray intensity" }).fill("0.95");
  await expect(page.locator("output")).toHaveText("95%");
  await page.getByRole("button", { name: /Exploded$/ }).click();
  await page.getByRole("slider", { name: "Explosion factor" }).fill("0.85");
  await page.getByLabel("Explosion group").selectOption("power");
  await expect(page.locator("output")).toHaveText("85%");
  await page
    .getByRole("button", { name: /Dependencies$/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Processor, healthy", exact: true })
    .click();
  await expect(page.locator(".inspector h2")).toHaveText("Processor");
  await page.getByRole("button", { name: "Battery", exact: true }).click();
  await page.getByRole("button", { name: /Simulation$/ }).click();
  await page
    .getByRole("button", { name: "Simulate failure", exact: true })
    .click();
  await expect(
    page.getByText("11 failed · 0 degraded · 4 unaffected"),
  ).toBeVisible();
  await page.getByLabel("Compare: show healthy baseline").check();
  await expect(page.locator(".viewer-controls")).toContainText("BASELINE");
  await page
    .getByRole("button", { name: "Reset simulation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Scenario result" }),
  ).toHaveCount(0);
  await page
    .getByLabel("What-if scenario")
    .fill("What if I remove the camera?");
  await page.getByRole("button", { name: "Analyze scenario" }).click();
  await expect(
    page.getByText("1 failed · 0 degraded · 14 unaffected"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByText("11 failed · 0 degraded · 4 unaffected"),
  ).toBeVisible();
  await page.getByRole("button", { name: /Repair$/ }).click();
  await expect(
    page.getByText("Professional service recommended"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ask Inside ↗", exact: true }).click();
  await page
    .getByRole("button", { name: "Show dependencies", exact: true })
    .click();
  await expect(page.locator(".messages")).toContainText("Battery");
  await page
    .getByRole("button", { name: "Highlight dependency paths" })
    .click();
  await expect(
    page.getByRole("group", { name: "Component dependency graph" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("intake confirms approximate matches and validates uploaded images", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Unknown appliance");
  await page
    .getByRole("button", { name: "Analyze Product", exact: true })
    .click();
  await expect(page.getByText("0% CATEGORY CONFIDENCE")).toBeVisible();
  await expect(page.getByText(/No reliable product match/)).toBeVisible();
  await page.getByLabel("Product images", { exact: true }).setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a png"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "content does not match" }),
  ).toContainText("content does not match");
  await page.getByLabel("Product images", { exact: true }).setInputFiles({
    name: "tiny.png",
    mimeType: "image/png",
    buffer: await page.screenshot(),
  });
  await expect(page.getByAltText("Product view 1")).toBeVisible();
  await page.getByLabel("Product name", { exact: true }).fill("Smartphone");
  await page
    .getByRole("button", { name: "Analyze Product", exact: true })
    .click();
  await expect(page.getByText("55% CATEGORY CONFIDENCE")).toBeVisible();
  await page
    .getByRole("button", { name: "Use educational demo model →" })
    .click();
  await expect(page.locator(".product-title")).toContainText(
    "Generic Smartphone",
  );
});

test("command palette, theme and responsive viewport remain usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try Interactive Demo" }).click();
  await page.getByRole("button", { name: "Command search" }).click();
  await page.getByLabel("Search commands").fill("Focus Battery");
  await page
    .getByRole("button", { name: "Focus Battery ↵", exact: true })
    .click();
  await expect(page.locator(".inspector h2")).toHaveText("Battery");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator(".workspace")).toHaveClass(/light/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page
    .getByRole("button", { name: "Toggle component navigator" })
    .click();
  await expect(page.getByLabel("Search components")).toHaveCount(0);
});
