import { describe, expect, it } from "vitest";
import { smartphone } from "../data/smartphone";
import { validateProduct } from "./product";
import { DependencyGraph } from "./graph";
import { analyzeWhatIf, simulateFailure } from "./simulation";
import { analyzeCompatibility } from "./compatibility";
describe("product validation and graph", () => {
  it("loads the complete demo and rejects duplicate and broken references", () => {
    expect(validateProduct(smartphone).errors).toEqual([]);
    const copy = structuredClone(smartphone);
    copy.components.push(copy.components[0]);
    copy.dependencies[0].targetComponentId = "missing";
    expect(validateProduct(copy).errors).toContain(
      "Duplicate component ID: housing",
    );
    expect(validateProduct(copy).errors).toContain("Broken dependency: e0");
  });
  it("detects invalid model and repair references", () => {
    expect(validateProduct(smartphone, []).errors.length).toBe(15);
    const copy = structuredClone(smartphone);
    copy.components[0].repair.steps[0].componentIds = ["missing"];
    expect(validateProduct(copy).product).toBeNull();
  });
  it("traverses in both directions and finds shortest paths", () => {
    const graph = new DependencyGraph(smartphone);
    expect(graph.getDependencyPath("battery", "processor")).toEqual([
      "battery",
      "connector",
      "pmic",
      "board",
      "processor",
    ]);
    expect(graph.getDependencyPath("display", "battery")).toBeNull();
    expect(graph.getDependencyPath("missing", "missing")).toBeNull();
    expect(graph.getAncestors("processor")).toContain("battery");
    expect(graph.getDescendants("battery")).toContain("display");
  });
  it("detects cycles and terminates traversal", () => {
    const copy = structuredClone(smartphone);
    copy.dependencies.push({
      ...copy.dependencies[0],
      id: "cycle",
      sourceComponentId: "processor",
      targetComponentId: "battery",
    });
    const graph = new DependencyGraph(copy);
    expect(graph.detectDependencyCycles().length).toBeGreaterThan(0);
    expect(graph.getDescendants("battery").length).toBeLessThan(
      copy.components.length,
    );
    expect(simulateFailure(copy, "battery").statuses.processor).toBe("failed");
  });
});
describe("deterministic simulation", () => {
  it("propagates power loss but preserves unrelated components and input data", () => {
    const before = JSON.stringify(smartphone);
    const result = simulateFailure(smartphone, "battery");
    expect(result.statuses.processor).toBe("failed");
    expect(result.statuses.housing).toBe("healthy");
    expect(result.directlyAffected).toEqual(["connector"]);
    expect(result.indirectlyAffected).toContain("display");
    expect(JSON.stringify(smartphone)).toBe(before);
  });
  it("propagates degradation without upgrading it to total failure", () => {
    expect(simulateFailure(smartphone, "thermal").statuses.processor).toBe(
      "degraded",
    );
    expect(
      simulateFailure(smartphone, "battery", "DEGRADED").statuses.display,
    ).toBe("degraded");
    expect(() => simulateFailure(smartphone, "battery", "BLOCKED")).toThrow();
  });
  it("does not propagate disabled rules", () => {
    const copy = structuredClone(smartphone);
    copy.dependencies[0].propagation = "none";
    expect(simulateFailure(copy, "battery").statuses.connector).toBe("healthy");
  });
  it("parses what-if scenarios and refuses unsupported claims", () => {
    expect(
      analyzeWhatIf(smartphone, "What if I remove the battery?").kind,
    ).toBe("simulation");
    expect(analyzeWhatIf(smartphone, "replace camera").kind).toBe("recovery");
    expect(analyzeWhatIf(smartphone, "remove cooling fan").kind).toBe(
      "unknown",
    );
    expect(
      analyzeWhatIf(smartphone, "remove cooling fan", "battery").kind,
    ).toBe("unknown");
    expect(analyzeWhatIf(smartphone, "remove it", "battery").kind).toBe(
      "simulation",
    );
  });
});
it("never verifies compatibility from demo claims or missing values", () => {
  const c = smartphone.components[2];
  expect(
    analyzeCompatibility(c, {
      specifications: c.replacement.requirements,
      provenance: c.provenance,
    }).status,
  ).toBe("POTENTIALLY_COMPATIBLE");
  expect(
    analyzeCompatibility(c, {
      specifications: { model: "different" },
      provenance: c.provenance,
    }).status,
  ).toBe("NOT_COMPATIBLE");
  expect(
    analyzeCompatibility(c, { specifications: {}, provenance: c.provenance })
      .status,
  ).toBe("UNKNOWN");
  expect(
    analyzeCompatibility(
      { ...c, replacement: { ...c.replacement, requirements: {} } },
      {
        specifications: {},
        provenance: {
          ...c.provenance,
          verified: true,
          sourceType: "manufacturer",
        },
      },
    ).status,
  ).toBe("UNKNOWN");
});
