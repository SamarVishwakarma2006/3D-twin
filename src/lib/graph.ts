import type { Dependency, Product } from './product';

/** Edges point from a provider to its consumer. Traversals include all edge types. */
export class DependencyGraph {
  constructor(readonly product: Product) {}
  getDependencies(id: string) { return this.product.dependencies.filter(e => e.targetComponentId === id); }
  getDependents(id: string) { return this.product.dependencies.filter(e => e.sourceComponentId === id); }
  getCriticalDependencies(id: string) { return this.getDependencies(id).filter(e => e.required && e.criticality === 'high'); }
  private traverse(id: string, reverse: boolean) {
    const visited = new Set([id]); const queue = [id]; const result: string[] = [];
    while (queue.length) for (const e of reverse ? this.getDependencies(queue.shift()!) : this.getDependents(queue.shift()!)) {
      const next = reverse ? e.sourceComponentId : e.targetComponentId;
      if (!visited.has(next)) { visited.add(next); queue.push(next); result.push(next); }
    }
    return result;
  }
  getAncestors(id: string) { return this.traverse(id, true); }
  getDescendants(id: string) { return this.traverse(id, false); }
  getAffectedComponents(id: string) { return this.getDescendants(id); }
  getDependencyPath(source: string, target: string): string[] | null {
    const queue = [[source]], seen = new Set([source]);
    while (queue.length) {
      const path = queue.shift()!; const last = path.at(-1)!;
      if (last === target) return path;
      for (const e of this.getDependents(last)) if (!seen.has(e.targetComponentId)) { seen.add(e.targetComponentId); queue.push([...path, e.targetComponentId]); }
    }
    return null;
  }
  detectDependencyCycles() {
    const done = new Set<string>(), active = new Set<string>(), cycles: string[][] = [];
    const visit = (id: string, path: string[]) => {
      if (active.has(id)) { cycles.push([...path.slice(path.indexOf(id)), id]); return; }
      if (done.has(id)) return;
      active.add(id);
      for (const e of this.getDependents(id)) visit(e.targetComponentId, [...path, id]);
      active.delete(id); done.add(id);
    };
    for (const c of this.product.components) visit(c.id, []);
    return cycles;
  }
  validateDependencyGraph() {
    const ids = new Set(this.product.components.map(c => c.id));
    return { invalidEdges: this.product.dependencies.filter(e => !ids.has(e.sourceComponentId) || !ids.has(e.targetComponentId)), cycles: this.detectDependencyCycles() };
  }
}
export function edgeLabel(e: Dependency) { return `${e.dependencyType}: ${e.description}`; }
