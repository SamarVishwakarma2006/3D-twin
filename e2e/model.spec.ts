import { test, expect } from "@playwright/test";
import { smartphone } from "../src/data/smartphone";

test("imports a mapped GLTF model and preserves a usable fallback for a missing model", async ({
  page,
}) => {
  const vertices = Buffer.from(
    new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0]).buffer,
  );
  const gltf = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: smartphone.components.map((_, i) => i) }],
    nodes: smartphone.components.map((c) => ({
      name: c.id,
      mesh: 0,
      translation: c.geometry.position,
    })),
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [{ doubleSided: true }],
    buffers: [
      {
        uri: `data:application/octet-stream;base64,${vertices.toString("base64")}`,
        byteLength: vertices.length,
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: vertices.length, target: 34962 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [-1, -1, 0],
        max: [1, 1, 0],
      },
    ],
  };
  await page.route("**/test-twin.gltf", (route) =>
    route.fulfill({
      contentType: "model/gltf+json",
      body: JSON.stringify(gltf),
    }),
  );
  await page.route("**/missing-twin.glb", (route) =>
    route.fulfill({ status: 404, body: "Not found" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Try Interactive Demo" }).click();
  await page.locator(".dataset-tools summary").click();
  const product = {
    ...smartphone,
    name: "Imported fixture",
    model3D: { type: "gltf", url: "/test-twin.gltf" },
  };
  await page.getByLabel("Import product JSON").setInputFiles({
    name: "product.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(product)),
  });
  await expect(page.locator(".product-title")).toContainText(
    "Imported fixture",
  );
  await expect(
    page.getByText("Product dataset validated and loaded."),
  ).toBeVisible();
  await expect(page.getByText("GLTF MODEL READY")).toBeVisible();
  await page.getByRole("button", { name: "Battery", exact: true }).click();
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  product.model3D.url = "/missing-twin.glb";
  await page.getByLabel("Import product JSON").setInputFiles({
    name: "product.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(product)),
  });
  await expect(page.getByText(/Showing the procedural fallback/)).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Battery", exact: true }).click();
  await expect(page.locator(".inspector h2")).toHaveText("Battery");
});
