import { DependencyGraph } from './graph';
import type { FailureType, Product } from './product';
export type Status = 'failed' | 'degraded' | 'healthy';
export type Simulation = {
  id: string; rootId: string; failureType: FailureType; statuses: Record<string, Status>;
  failedComponents: string[]; directlyAffected: string[]; indirectlyAffected: string[];
  degradedComponents: string[]; unaffectedComponents: string[]; affectedSystems: string[];
  affectedFunctions: string[]; dependencyPaths: Record<string, string[]>;
  severity: 'high' | 'medium' | 'low'; explanationData: string[];
};
export function simulateFailure(product: Product, rootId: string, failureType: FailureType = 'COMPLETE_FAILURE'): Simulation {
  const component = product.components.find(c => c.id === rootId);
  if (!component || !component.failureModes.includes(failureType)) throw new Error('Unsupported component or failure state.');
  const graph = new DependencyGraph(product);
  const statuses: Record<string, Status> = Object.fromEntries(product.components.map(c => [c.id, 'healthy']));
  statuses[rootId] = ['DEGRADED', 'INTERMITTENT', 'OVERHEATING', 'REDUCED_PERFORMANCE'].includes(failureType) ? 'degraded' : 'failed';
  const rank = { healthy: 0, degraded: 1, failed: 2 };
  const queue = [rootId], dependencyPaths: Record<string, string[]> = { [rootId]: [rootId] }, explanationData: string[] = [];
  while (queue.length) {
    const source = queue.shift()!;
    for (const edge of graph.getDependents(source)) {
      if (edge.propagation === 'none' || edge.targetComponentId === rootId || !(edge.targetComponentId in statuses)) continue;
      const next: Status = statuses[source] === 'degraded' || !edge.required || edge.propagation === 'degraded' ? 'degraded' : 'failed';
      if (rank[next] > rank[statuses[edge.targetComponentId]]) {
        statuses[edge.targetComponentId] = next;
        dependencyPaths[edge.targetComponentId] = [...dependencyPaths[source], edge.targetComponentId];
        explanationData.push(`${edge.description} Result: ${next}.`);
        queue.push(edge.targetComponentId);
      }
    }
  }
  const affected = product.components.filter(c => c.id !== rootId && statuses[c.id] !== 'healthy');
  const directIds = new Set(graph.getDependents(rootId).filter(e => e.propagation !== 'none').map(e => e.targetComponentId));
  return { id: crypto.randomUUID(), rootId, failureType, statuses,
    failedComponents: product.components.filter(c => statuses[c.id] === 'failed').map(c => c.id),
    degradedComponents: product.components.filter(c => statuses[c.id] === 'degraded').map(c => c.id),
    unaffectedComponents: product.components.filter(c => statuses[c.id] === 'healthy').map(c => c.id),
    directlyAffected: affected.filter(c => directIds.has(c.id)).map(c => c.id), indirectlyAffected: affected.filter(c => !directIds.has(c.id)).map(c => c.id),
    affectedSystems: [...new Set(product.components.filter(c => statuses[c.id] !== 'healthy').map(c => c.systemId))],
    affectedFunctions: product.components.filter(c => statuses[c.id] !== 'healthy').map(c => c.function), dependencyPaths,
    severity: Object.values(statuses).filter(s => s === 'failed').length > 3 ? 'high' : affected.length ? 'medium' : 'low', explanationData };
}
export function analyzeWhatIf(product: Product, question: string, selectedId?: string) {
  const lower = question.toLowerCase();
  const component = [...product.components].sort((a, b) => b.name.length - a.name.length).find(c => lower.includes(c.name.toLowerCase())) ?? (selectedId ? product.components.find(c => c.id === selectedId) : undefined);
  if (!component) return { kind: 'unknown' as const, message: 'Select a component or use its exact name so the scenario is unambiguous.' };
  if (/replace|recover|restore/.test(lower)) return { kind: 'recovery' as const, message: `Restoring ${component.name} removes its injected failure in this single-fault model. Actual recovery and replacement compatibility require verification; other faults are not ruled out.` };
  const failureType = /disconnect|remove/.test(lower) ? 'DISCONNECTED' : /degrad|slow/.test(lower) ? 'DEGRADED' : /heat/.test(lower) ? 'OVERHEATING' : /fail|break|stop/.test(lower) ? 'COMPLETE_FAILURE' : null;
  if (!failureType) return { kind: 'unknown' as const, message: 'Describe a supported scenario: fail, disconnect, remove, degrade, overheat or replace a component.' };
  if (!component.failureModes.includes(failureType)) return { kind: 'unknown' as const, message: `${failureType} has no supported rule for ${component.name}.` };
  return { kind: 'simulation' as const, simulation: simulateFailure(product, component.id, failureType) };
}
