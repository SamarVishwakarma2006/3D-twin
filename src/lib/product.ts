import { z } from "zod";

export const dependencyTypes = [
  "electrical",
  "mechanical",
  "thermal",
  "power",
  "structural",
  "data",
  "functional",
  "hydraulic",
  "pneumatic",
  "optical",
  "communication",
] as const;
export const failureTypes = [
  "COMPLETE_FAILURE",
  "DEGRADED",
  "INTERMITTENT",
  "DISCONNECTED",
  "OVERHEATING",
  "REDUCED_PERFORMANCE",
  "SHORT_CIRCUIT",
  "BLOCKED",
  "MECHANICAL_DAMAGE",
] as const;
export const provenanceSchema = z
  .object({
    sourceType: z.enum([
      "manufacturer",
      "serviceManual",
      "structuredDataset",
      "userProvided",
      "aiGenerated",
      "inferred",
      "demo",
    ]),
    sourceUrl: z.url().optional(),
    sourceTitle: z.string(),
    confidence: z.number().min(0).max(1),
    verified: z.boolean(),
    lastUpdated: z.string(),
  })
  .refine(
    (source) =>
      !source.verified ||
      ["manufacturer", "serviceManual", "structuredDataset"].includes(
        source.sourceType,
      ),
    "Inferred, generated, user-provided and demo sources cannot claim verification",
  );
const vector = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);
export const componentSchema = z.object({
  id: z.string().min(1),
  productId: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  function: z.string(),
  purpose: z.string(),
  systemId: z.string(),
  parentComponentId: z.string().optional(),
  modelNodeIds: z.array(z.string()).min(1),
  technicalSpecifications: z.record(z.string(), z.string()),
  provenance: provenanceSchema,
  factSources: z.record(z.string(), provenanceSchema).default({}),
  failureModes: z.array(z.enum(failureTypes)).min(1),
  safetyNotes: z.array(z.string()),
  geometry: z.object({
    position: vector,
    size: vector,
    explodedOffset: vector,
    color: z.string(),
    exterior: z.boolean(),
    detail: z
      .enum(["battery", "circuit", "lens", "screen", "grille", "chip", "port"])
      .optional(),
  }),
  repair: z.object({
    symptoms: z.array(z.string()),
    causes: z.array(z.string()),
    tools: z.array(z.string()),
    preparation: z.array(z.string()),
    difficulty: z.enum(["easy", "moderate", "professional"]),
    category: z.string(),
    steps: z.array(
      z.object({ text: z.string(), componentIds: z.array(z.string()) }),
    ),
    verification: z.array(z.string()),
  }),
  replacement: z.object({
    query: z.string(),
    requirements: z.record(z.string(), z.string()),
  }),
});
export const dependencySchema = z.object({
  id: z.string(),
  sourceComponentId: z.string(),
  targetComponentId: z.string(),
  dependencyType: z.enum(dependencyTypes),
  criticality: z.enum(["low", "medium", "high"]),
  required: z.boolean(),
  propagation: z.enum(["failed", "degraded", "none"]),
  description: z.string(),
  provenance: provenanceSchema,
});
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  category: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  model3D: z.object({
    type: z.enum(["procedural", "gltf"]),
    url: z
      .string()
      .regex(/^(\/[^/]|https:\/\/)/, "Use a same-origin path or HTTPS URL")
      .optional(),
  }),
  components: z.array(componentSchema).min(1),
  dependencies: z.array(dependencySchema),
  systems: z.array(z.object({ id: z.string(), name: z.string() })),
  specifications: z.record(z.string(), z.string()),
  documentation: z.array(z.object({ title: z.string(), url: z.url() })),
  dataSources: z.array(provenanceSchema).min(1),
  confidence: z.number().min(0).max(1),
});
export type Product = z.infer<typeof productSchema>;
export type Component = z.infer<typeof componentSchema>;
export type Dependency = z.infer<typeof dependencySchema>;
export type FailureType = (typeof failureTypes)[number];
export type Provenance = z.infer<typeof provenanceSchema>;

export function validateProduct(input: unknown, availableNodes?: string[]) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success)
    return {
      product: null,
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      ),
      warnings: [] as string[],
    };
  const product = parsed.data;
  const errors: string[] = [],
    warnings: string[] = [];
  const ids = new Set<string>();
  const systems = new Set(product.systems.map((s) => s.id));
  if (systems.size !== product.systems.length)
    errors.push("Duplicate system IDs");
  if (product.model3D.type === "gltf" && !product.model3D.url)
    errors.push("GLTF source URL is required");
  const nodes = new Set<string>();
  for (const c of product.components) {
    if (ids.has(c.id)) errors.push(`Duplicate component ID: ${c.id}`);
    ids.add(c.id);
    if (c.productId !== product.id)
      errors.push(`Wrong product reference: ${c.id}`);
    if (!systems.has(c.systemId)) errors.push(`Unknown system: ${c.systemId}`);
    if (c.geometry.size.some((n) => n <= 0))
      errors.push(`Invalid dimensions: ${c.id}`);
    if (
      availableNodes &&
      c.modelNodeIds.some((n) => !availableNodes.includes(n))
    )
      errors.push(`Unknown model nodes: ${c.id}`);
    for (const node of c.modelNodeIds) {
      if (nodes.has(node)) errors.push(`Ambiguous model node mapping: ${node}`);
      nodes.add(node);
    }
  }
  const edgeIds = new Set<string>();
  for (const e of product.dependencies) {
    if (edgeIds.has(e.id)) errors.push(`Duplicate dependency ID: ${e.id}`);
    edgeIds.add(e.id);
    if (!ids.has(e.sourceComponentId) || !ids.has(e.targetComponentId))
      errors.push(`Broken dependency: ${e.id}`);
    if (e.sourceComponentId === e.targetComponentId)
      errors.push(`Self dependency: ${e.id}`);
  }
  for (const c of product.components) {
    if (c.parentComponentId && !ids.has(c.parentComponentId))
      errors.push(`Unknown parent: ${c.id}`);
    const seen = new Set([c.id]);
    let parent = c.parentComponentId;
    while (parent && ids.has(parent)) {
      if (seen.has(parent)) {
        errors.push(`Hierarchy cycle: ${c.id}`);
        break;
      }
      seen.add(parent);
      parent = product.components.find(
        (n) => n.id === parent,
      )?.parentComponentId;
    }
    if (
      !product.dependencies.some(
        (e) => e.sourceComponentId === c.id || e.targetComponentId === c.id,
      )
    )
      warnings.push(`Unconnected component: ${c.id}`);
    for (const step of c.repair.steps)
      if (step.componentIds.some((id) => !ids.has(id)))
        errors.push(`Unknown repair reference: ${c.id}`);
  }
  const active = new Set<string>(),
    done = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) {
      warnings.push(
        `Dependency cycle through ${id}; fixed-point simulation will terminate.`,
      );
      return;
    }
    if (done.has(id)) return;
    active.add(id);
    for (const e of product.dependencies.filter(
      (e) => e.sourceComponentId === id,
    ))
      visit(e.targetComponentId);
    active.delete(id);
    done.add(id);
  };
  for (const id of ids) visit(id);
  return { product: errors.length ? null : product, errors, warnings };
}
