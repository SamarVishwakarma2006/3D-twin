import { Mesh, type Object3D, type Material, Vector3 } from "three";
import type { Product } from "./product";
import { validateProduct } from "./product";

export function componentForNode(node: Object3D | null, product: Product) {
  for (let current = node; current; current = current.parent) {
    const component = product.components.find((c) =>
      c.modelNodeIds.includes(current!.name),
    );
    if (component) return component;
  }
  return undefined;
}

export function prepareModel(scene: Object3D, product: Product) {
  const names: string[] = [];
  scene.traverse((n) => {
    if (n.name) names.push(n.name);
  });
  const result = validateProduct(product, names);
  if (result.errors.length) throw new Error(result.errors.join("; "));
  const root = scene.clone(true),
    materials: Material[] = [];
  const originals = new Map<string, Vector3>();
  root.traverse((n) => {
    originals.set(n.uuid, n.position.clone());
    if (n instanceof Mesh) {
      const source = Array.isArray(n.material) ? n.material : [n.material];
      const owned = source.map((m) => {
        const copy = m.clone();
        materials.push(copy);
        return copy;
      });
      n.material = Array.isArray(n.material) ? owned : owned[0];
    }
  });
  return {
    root,
    originals,
    dispose: () => materials.forEach((m) => m.dispose()),
  };
}
