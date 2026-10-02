import { z } from "zod";
import type { Component, Product } from "./product";
import type { Simulation } from "./simulation";
import { DependencyGraph } from "./graph";
import { analyzeWhatIf } from "./simulation";
import { smartphone } from "../data/smartphone";

export const identificationInput = z
  .object({
    name: z.string().trim().max(150),
    manufacturer: z.string().trim().max(100).default(""),
    model: z.string().trim().max(100).default(""),
    images: z
      .array(
        z.object({
          name: z.string().max(200),
          type: z.enum(["image/jpeg", "image/png", "image/webp"]),
          size: z
            .number()
            .positive()
            .max(8 * 1024 * 1024),
          width: z.number().int().positive().max(12000),
          height: z.number().int().positive().max(12000),
          view: z
            .enum(["front", "back", "left", "right", "top", "bottom", "detail"])
            .default("front"),
        }),
      )
      .max(6)
      .default([]),
  })
  .refine(
    (v) => v.name.length > 0 || v.images.length > 0,
    "Provide a name or a validated image.",
  );
export type IdentificationInput = z.infer<typeof identificationInput>;
export type Candidate = {
  productId: string;
  name: string;
  confidence: number;
  reason: string;
};
export interface ProductIdentificationProvider {
  identifyProduct(
    input: IdentificationInput,
  ): Promise<{ provider: string; candidates: Candidate[]; stages: string[] }>;
}
export interface ProductDataProvider {
  getProduct(id: string): Promise<Product | null>;
}
export interface DigitalTwinProvider {
  getModel(product: Product): Promise<Product["model3D"]>;
}
export interface PartsProvider {
  search(component: Component): Promise<{ query: string; verified: boolean }[]>;
}
export interface RepairDocumentationProvider {
  getRepair(component: Component): Promise<Component["repair"]>;
}
export const localIdentification: ProductIdentificationProvider = {
  async identifyProduct(input) {
    const parsed = identificationInput.parse(input);
    const recognized = /phone|smartphone|iphone|pixel|galaxy/i.test(
      `${parsed.name} ${parsed.model}`,
    );
    return {
      provider: "Local metadata matcher",
      candidates: [
        {
          productId: smartphone.id,
          name: smartphone.name,
          confidence: recognized ? 0.55 : 0,
          reason: recognized
            ? "The supplied name suggests the smartphone category. Only an educational generic model is available; the exact product was not identified."
            : "No reliable product match. You can explicitly choose the generic smartphone demonstration.",
        },
      ],
      stages: [
        ...(parsed.images.length
          ? ["Image metadata validated; pixels were not analyzed"]
          : []),
        "Product metadata processed",
        "Local category matcher queried",
        "Educational candidate available for confirmation",
      ],
    };
  },
};
export type AssistantContext = {
  product: Product;
  selectedComponentId: string | null;
  simulation: Simulation | null;
  mode: string;
  viewer: { hidden: string[]; focused: string | null; isolated: string | null };
  repairStep: number;
  compatibilityContext: string;
};
export type AssistantAnswer = {
  text: string;
  kind: "Structured demo data" | "Simulation result" | "Local explanation";
  source: string;
  actions: {
    label: string;
    type: "focus" | "dependencies" | "simulate" | "repair" | "replacement";
    componentId: string;
  }[];
};
export interface AIProvider {
  answerQuestion(
    question: string,
    context: AssistantContext,
  ): Promise<AssistantAnswer>;
  explainComponent(context: AssistantContext): Promise<AssistantAnswer>;
  explainSimulation(context: AssistantContext): Promise<AssistantAnswer>;
  analyzeWhatIf(
    question: string,
    context: AssistantContext,
  ): Promise<AssistantAnswer>;
  generateRepairExplanation(
    context: AssistantContext,
  ): Promise<AssistantAnswer>;
  analyzeCompatibility(context: AssistantContext): Promise<AssistantAnswer>;
}
async function answerQuestion(
  question: string,
  context: AssistantContext,
): Promise<AssistantAnswer> {
  const { product, simulation } = context;
  const q = question.toLowerCase();
  const c =
    [...product.components]
      .sort((a, b) => b.name.length - a.name.length)
      .find((c) => q.includes(c.name.toLowerCase())) ??
    product.components.find((c) => c.id === context.selectedComponentId);
  const answer: AssistantAnswer = {
    text: "",
    kind: "Local explanation",
    source:
      "Deterministic local assistant · educational dataset · no external AI request",
    actions: [],
  };
  if (/simulation|scenario result/.test(q) && simulation) {
    answer.kind = "Simulation result";
    answer.text = `${product.components.find((c) => c.id === simulation.rootId)?.name}: ${simulation.failureType.replaceAll("_", " ")}. ${simulation.failedComponents.length} failed and ${simulation.degradedComponents.length} degraded components. Affected systems: ${simulation.affectedSystems.join(", ")}. ${simulation.explanationData.join(" ")}`;
    return answer;
  }
  if (!c) {
    answer.text =
      "Select a component or name one in your question. I can explain recorded functions, dependencies, repair context and deterministic scenarios. Verified product-specific information is unavailable.";
    return answer;
  }
  const graph = new DependencyGraph(product);
  if (/what if|remove|disconnect/.test(q)) {
    const result = analyzeWhatIf(product, question, c.id);
    answer.kind = "Simulation result";
    answer.text =
      result.kind === "simulation"
        ? `${c.name}: ${result.simulation.failedComponents.length} failed, ${result.simulation.degradedComponents.length} degraded. Immediate: ${result.simulation.directlyAffected.map((id) => product.components.find((c) => c.id === id)?.name).join(", ") || "none"}. Secondary: ${result.simulation.indirectlyAffected.map((id) => product.components.find((c) => c.id === id)?.name).join(", ") || "none"}. This is a dependency estimate, not a physical damage prediction.`
        : result.message;
  } else if (/simulate.*fail/.test(q)) {
    answer.text =
      "Run the supported failure rule to inspect its deterministic downstream effects.";
    answer.actions = [
      { label: "Run failure simulation", type: "simulate", componentId: c.id },
    ];
  } else if (/repair|fix|symptom/.test(q)) {
    answer.text = `${c.name}: ${c.repair.category}. Symptoms: ${c.repair.symptoms.join("; ")}. ${c.repair.preparation.join(" ")} ${c.safetyNotes.join(" ")}`;
    answer.actions = [
      { label: "Open repair context", type: "repair", componentId: c.id },
    ];
  } else if (/replace|compatib|part/.test(q) && !/explain/.test(q)) {
    answer.text = `No verified replacement is available for ${c.name}. Required checks: ${Object.keys(c.replacement.requirements).join(", ")}. ${context.compatibilityContext}`;
    answer.actions = [
      {
        label: "Inspect replacement requirements",
        type: "replacement",
        componentId: c.id,
      },
    ];
  } else if (/depend|powers|supplies|connected/.test(q)) {
    answer.kind = "Structured demo data";
    answer.text = `${c.name} depends on: ${
      graph
        .getDependencies(c.id)
        .map(
          (e) =>
            `${product.components.find((c) => c.id === e.sourceComponentId)?.name} (${e.dependencyType})`,
        )
        .join(", ") || "no recorded upstream components"
    }. It supports: ${
      graph
        .getDependents(c.id)
        .map(
          (e) =>
            product.components.find((c) => c.id === e.targetComponentId)?.name,
        )
        .join(", ") || "no recorded consumers"
    }.`;
    answer.actions = [
      {
        label: "Highlight dependency paths",
        type: "dependencies",
        componentId: c.id,
      },
    ];
  } else if (/explain|purpose|exist|function|what is|what does/.test(q)) {
    answer.kind = "Structured demo data";
    answer.text = `${c.name}: ${c.function} ${c.description} Current modeled state: ${simulation?.statuses[c.id] ?? "healthy"}.`;
    answer.actions = [
      { label: `Focus ${c.name}`, type: "focus", componentId: c.id },
    ];
  } else {
    answer.text =
      "The local assistant supports component explanations, dependencies, failure scenarios, repairs and replacement requirements. It cannot answer arbitrary factual questions or identify images. Try “Explain this part” or “What if I remove it?”.";
  }
  answer.text +=
    " This explanation uses structured demo relationships; manufacturer-specific verification is unavailable.";
  return answer;
}
export const localAI: AIProvider = {
  answerQuestion,
  explainComponent: (c) => answerQuestion("Explain this part", c),
  explainSimulation: (c) => answerQuestion("Explain current simulation", c),
  analyzeWhatIf: answerQuestion,
  generateRepairExplanation: (c) => answerQuestion("How do I repair it?", c),
  analyzeCompatibility: (c) => answerQuestion("Find replacement", c),
};
export async function withLocalFallback(
  provider: AIProvider | undefined,
  question: string,
  context: AssistantContext,
) {
  try {
    return await (provider ?? localAI).answerQuestion(question, context);
  } catch {
    const result = await localAI.answerQuestion(question, context);
    return {
      ...result,
      source: `External provider unavailable. ${result.source}`,
    };
  }
}
