import { describe, expect, it, vi } from "vitest";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { smartphone } from "../data/smartphone";
import { componentForNode, prepareModel } from "./model";
import { validateProduct } from "./product";
describe("model mapping and resource ownership", () => {
  it("rejects missing component node mappings", () => {
    expect(() => prepareModel(new Group(), smartphone)).toThrow(
      "Unknown model nodes",
    );
  });
  it("resolves nested meshes to their explicit logical component root", () => {
    const root = new Group();
    root.name = "battery";
    const nested = new Group();
    const mesh = new Mesh();
    root.add(nested);
    nested.add(mesh);
    expect(componentForNode(mesh, smartphone)?.id).toBe("battery");
  });
  it("clones only instance materials and disposes them without affecting the shared asset", () => {
    const scene = new Group(),
      geometry = new BoxGeometry(),
      material = new MeshStandardMaterial();
    for (const c of smartphone.components) {
      const mesh = new Mesh(geometry, material);
      mesh.name = c.modelNodeIds[0];
      scene.add(mesh);
    }
    const originalDispose = vi.spyOn(material, "dispose");
    const prepared = prepareModel(scene, smartphone);
    const owned = (prepared.root.children[0] as Mesh)
      .material as MeshStandardMaterial;
    expect(owned).not.toBe(material);
    expect((prepared.root.children[0] as Mesh).geometry).toBe(geometry);
    const ownedDispose = vi.spyOn(owned, "dispose");
    prepared.dispose();
    expect(ownedDispose).toHaveBeenCalledOnce();
    expect(originalDispose).not.toHaveBeenCalled();
    geometry.dispose();
    material.dispose();
  });
  it("reports cycles and rejects ambiguous mappings and unsafe model schemes", () => {
    const copy = structuredClone(smartphone);
    copy.dependencies.push({
      ...copy.dependencies[0],
      id: "loop",
      sourceComponentId: "processor",
      targetComponentId: "battery",
    });
    expect(
      validateProduct(copy).warnings.some((w) => w.includes("cycle")),
    ).toBe(true);
    copy.components[1].modelNodeIds = ["housing"];
    expect(validateProduct(copy).product).toBeNull();
    copy.model3D = { type: "gltf", url: "javascript:alert(1)" };
    expect(validateProduct(copy).product).toBeNull();
  });
});
