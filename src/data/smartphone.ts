import type { Component, Dependency, Product, Provenance } from '../lib/product';

export const demoSource: Provenance = { sourceType: 'demo', sourceTitle: 'Educational procedural smartphone dataset', confidence: 0, verified: false, lastUpdated: '2026-10-03' };
type Seed = [string, string, string, string, [number, number, number], [number, number, number], string, boolean?];
const seeds: Seed[] = [
  ['housing', 'Housing', 'exterior', 'Protects and mechanically supports the internal assembly.', [0, 0, -0.28], [3.15, 6.2, 0.16], '#667386', true],
  ['display', 'Display', 'exterior', 'Converts display signals into visual output and provides touch input.', [0, 0, 0.34], [2.95, 5.95, 0.12], '#263e53', true],
  ['battery', 'Battery', 'power', 'Stores electrical energy for portable operation.', [-0.34, -0.65, 0], [1.94, 3.35, 0.36], '#cba56c'],
  ['board', 'Main board', 'compute', 'Connects processing, power, data and peripheral circuits.', [0, 1.8, 0], [2.78, 1.8, 0.18], '#397969'],
  ['processor', 'Processor', 'compute', 'Executes software and coordinates application workloads.', [0.25, 1.9, 0.18], [0.88, 0.88, 0.13], '#b6bcc6'],
  ['camera', 'Camera', 'camera', 'Converts incoming light into image data.', [-0.95, 2.15, 0.2], [0.65, 0.9, 0.3], '#587fad'],
  ['speaker', 'Speaker', 'audio', 'Converts electrical audio signals into sound.', [0.6, -2.62, 0], [1.2, 0.38, 0.3], '#aeb6c4'],
  ['microphone', 'Microphone', 'audio', 'Converts sound pressure into electrical signals.', [-1.15, -2.65, 0], [0.25, 0.25, 0.2], '#d1ae79'],
  ['port', 'Charging port', 'power', 'Provides a wired interface for incoming power and data.', [0, -2.93, 0], [0.6, 0.24, 0.25], '#aeb6c4'],
  ['sensors', 'Sensor module', 'compute', 'Measures motion and orientation for software features.', [1.04, 1.55, 0.18], [0.34, 0.45, 0.15], '#d1ae79'],
  ['thermal', 'Heat spreader', 'thermal', 'Distributes heat away from the processor across a larger area.', [0.25, 1.9, -0.17], [1.32, 1.4, 0.06], '#b48064'],
  ['connector', 'Battery connector', 'power', 'Provides the electrical connection between battery and power circuitry.', [0.78, 0.64, 0.08], [0.38, 0.28, 0.16], '#d3b475'],
  ['buttons', 'Side buttons', 'exterior', 'Provide tactile power and volume input.', [1.56, 0.9, 0], [0.12, 1, 0.2], '#adb5c2'],
  ['wireless', 'Wireless module', 'connectivity', 'Supports wireless communication through the antenna system.', [1.02, 2.5, 0.18], [0.36, 0.45, 0.14], '#7b85b0'],
  ['pmic', 'Power controller', 'power', 'Regulates and distributes electrical power to the system.', [0.25, 1.13, 0.18], [0.5, 0.3, 0.13], '#a6b4bf'],
];
const components: Component[] = seeds.map(([id, name, systemId, fn, position, size, color, exterior = false], i) => ({
  id, productId: 'demo-phone', name, category: systemId, systemId, description: `${name} in a generic educational smartphone. Geometry and relationships are illustrative.`,
  function: fn, purpose: fn, modelNodeIds: [id], technicalSpecifications: { 'Data status': 'Illustrative; manufacturer specifications unavailable' },
  parentComponentId: ['processor', 'camera', 'sensors', 'wireless', 'pmic'].includes(id) ? 'board' : undefined,
  provenance: demoSource, factSources: {}, failureModes: ['COMPLETE_FAILURE', 'DEGRADED', 'INTERMITTENT', 'DISCONNECTED', ...(id === 'thermal' || id === 'processor' ? ['OVERHEATING' as const] : [])],
  safetyNotes: ['Educational model only. Use the exact model’s service manual before attempting physical repair.', ...(systemId === 'power' ? ['Damaged, hot or swollen lithium batteries require professional service. Do not puncture, heat or short battery terminals.'] : [])],
  geometry: { position, size, color, exterior, explodedOffset: [exterior ? 0 : (i % 3 - 1) * 1.3, exterior ? 0 : (i % 2 ? 0.4 : -0.4), id === 'housing' ? -2 : id === 'display' ? 3 : 0.7 + (i % 4) * 0.6] },
  repair: { symptoms: [`${name} function unavailable or intermittent`], causes: ['Disconnected interface', 'Component damage', 'Upstream dependency failure'], tools: ['Model-specific service manual', 'Manufacturer-specified service tools'], preparation: ['Power off and disconnect external power.', 'Back up data where possible.', 'Consult a qualified technician for battery or board work.'], difficulty: 'professional', category: 'Inspection / module replacement assessment',
    steps: [{ text: 'Identify the affected assembly in the digital twin. Confirm the exact device model before physical work.', componentIds: [id] }, { text: 'Check upstream dependencies in the graph before concluding that this part needs replacement.', componentIds: [id] }, { text: 'Follow the manufacturer service procedure. No model-specific disassembly procedure is available in this demo.', componentIds: [id] }], verification: ['Verify the original symptom is resolved using manufacturer diagnostics.', 'Confirm surrounding functions and connectors operate normally.'] },
  replacement: { query: `${name} replacement`, requirements: { model: 'demo-phone', connector: `demo-${id}`, voltage: 'unknown', dimensions: 'unknown', firmware: 'unknown' } },
}));
const edgeSeeds: [string, string, Dependency['dependencyType'], Dependency['propagation'], boolean][] = [
  ['battery', 'connector', 'power', 'failed', true], ['connector', 'pmic', 'power', 'failed', true], ['pmic', 'board', 'power', 'failed', true],
  ['board', 'processor', 'electrical', 'failed', true], ['processor', 'display', 'data', 'failed', true], ['board', 'camera', 'power', 'failed', true],
  ['board', 'speaker', 'power', 'failed', true], ['board', 'microphone', 'power', 'failed', true], ['board', 'sensors', 'data', 'failed', true],
  ['board', 'wireless', 'communication', 'failed', true], ['thermal', 'processor', 'thermal', 'degraded', true],
  ['port', 'battery', 'electrical', 'degraded', false], ['buttons', 'board', 'functional', 'degraded', false],
  ['housing', 'display', 'structural', 'degraded', false], ['housing', 'board', 'mechanical', 'degraded', false],
];
export const smartphone: Product = {
  id: 'demo-phone', name: 'Generic Smartphone', manufacturer: 'Educational demo', model: 'DT–01', category: 'Smartphone',
  description: 'A procedural digital twin for exploring component relationships. Not a replica of a commercial device.', images: [], model3D: { type: 'procedural' },
  components, dependencies: edgeSeeds.map(([sourceComponentId, targetComponentId, dependencyType, propagation, required], i) => ({ id: `e${i}`, sourceComponentId, targetComponentId, dependencyType, propagation, required, criticality: required ? 'high' : 'medium', description: `${components.find(c => c.id === targetComponentId)!.name} depends on ${components.find(c => c.id === sourceComponentId)!.name} (${dependencyType}).`, provenance: demoSource })),
  systems: [{id:'exterior',name:'Exterior'}, {id:'power',name:'Power system'}, {id:'compute',name:'Compute'}, {id:'camera',name:'Camera'}, {id:'audio',name:'Audio'}, {id:'thermal',name:'Thermal'}, {id:'connectivity',name:'Connectivity'}],
  specifications: { 'Model fidelity': 'Procedural approximation', 'Components': String(components.length) }, documentation: [], dataSources: [demoSource], confidence: 0,
};
