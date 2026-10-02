import { create } from "zustand";
import { smartphone } from "../data/smartphone";
import { type FailureType, type Product, validateProduct } from "./product";
import { simulateFailure, type Simulation } from "./simulation";

export const modes = [
  "Explore",
  "X-Ray",
  "Exploded",
  "Dependencies",
  "Simulation",
  "Repair",
] as const;
export type Mode = (typeof modes)[number];
type State = {
  product: Product;
  selectedComponentId: string | null;
  mode: Mode;
  xRayIntensity: number;
  explosionFactor: number;
  explosionGroup: string;
  hiddenComponentIds: string[];
  isolatedComponentId: string | null;
  focusedComponentId: string | null;
  cameraVersion: number;
  activeSimulation: Simulation | null;
  simulationHistory: Simulation[];
  compareBefore: boolean;
  activeRepairStep: number;
  dependencyFilters: string[];
  quality: "Auto" | "High" | "Medium" | "Low";
  error: string | null;
  inspectorTab: "Overview" | "Relationships" | "Replacement";
  repairComponentId: string | null;
  modelStatus: "procedural" | "loading" | "loaded" | "fallback";
  select: (id: string | null) => void;
  setMode: (mode: Mode) => void;
  focus: (id: string) => void;
  isolate: (id: string) => void;
  restore: () => void;
  toggleHidden: (id: string) => void;
  resetCamera: () => void;
  simulate: (id: string, type?: FailureType) => void;
  applySimulation: (s: Simulation) => void;
  resetSimulation: () => void;
  undoSimulation: () => void;
  loadProduct: (p: Product) => void;
};
export const useWorkspace = create<State>((set, get) => ({
  product: smartphone,
  selectedComponentId: null,
  mode: "Explore",
  xRayIntensity: 0.8,
  explosionFactor: 0.65,
  explosionGroup: "all",
  hiddenComponentIds: [],
  isolatedComponentId: null,
  focusedComponentId: null,
  cameraVersion: 0,
  activeSimulation: null,
  simulationHistory: [],
  compareBefore: false,
  activeRepairStep: 0,
  dependencyFilters: [],
  quality: "Auto",
  error: null,
  inspectorTab: "Overview",
  repairComponentId: null,
  modelStatus: "procedural",
  select: (id) =>
    set((s) => ({
      selectedComponentId: id,
      repairComponentId: s.mode === "Repair" ? id : s.repairComponentId,
      activeRepairStep: 0,
      focusedComponentId: s.focusedComponentId ? id : null,
      isolatedComponentId: s.isolatedComponentId ? id : null,
      hiddenComponentIds: s.hiddenComponentIds.filter((n) => n !== id),
      cameraVersion: s.cameraVersion + (s.focusedComponentId ? 1 : 0),
    })),
  setMode: (mode) =>
    set((s) => ({
      mode,
      repairComponentId:
        mode === "Repair" ? s.selectedComponentId : s.repairComponentId,
    })),
  focus: (id) =>
    set((s) => ({
      selectedComponentId: id,
      focusedComponentId: id,
      isolatedComponentId: null,
      hiddenComponentIds: s.hiddenComponentIds.filter((n) => n !== id),
      cameraVersion: s.cameraVersion + 1,
    })),
  isolate: (id) =>
    set((s) => ({
      selectedComponentId: id,
      isolatedComponentId: id,
      focusedComponentId: id,
      hiddenComponentIds: s.hiddenComponentIds.filter((n) => n !== id),
      cameraVersion: s.cameraVersion + 1,
    })),
  restore: () =>
    set((s) => ({
      hiddenComponentIds: [],
      isolatedComponentId: null,
      focusedComponentId: null,
      cameraVersion: s.cameraVersion + 1,
    })),
  toggleHidden: (id) =>
    set((s) => ({
      hiddenComponentIds: s.hiddenComponentIds.includes(id)
        ? s.hiddenComponentIds.filter((n) => n !== id)
        : [...s.hiddenComponentIds, id],
    })),
  resetCamera: () =>
    set((s) => ({
      focusedComponentId: null,
      cameraVersion: s.cameraVersion + 1,
    })),
  simulate: (id, type) => {
    try {
      get().applySimulation(simulateFailure(get().product, id, type));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Simulation failed" });
    }
  },
  applySimulation: (simulation) =>
    set((s) => ({
      activeSimulation: simulation,
      simulationHistory: [...s.simulationHistory, simulation].slice(-20),
      compareBefore: false,
      mode: "Simulation",
      error: null,
    })),
  resetSimulation: () => set({ activeSimulation: null, compareBefore: false }),
  undoSimulation: () =>
    set((s) => {
      const history = s.simulationHistory.slice(0, -1);
      return {
        simulationHistory: history,
        activeSimulation: history.at(-1) ?? null,
        compareBefore: false,
      };
    }),
  loadProduct: (input) => {
    const result = validateProduct(input);
    if (!result.product) {
      set({ error: result.errors.join("; ") });
      return;
    }
    set((s) => ({
      product: result.product!,
      modelStatus:
        result.product!.model3D.type === "gltf" ? "loading" : "procedural",
      selectedComponentId: null,
      repairComponentId: null,
      inspectorTab: "Overview",
      mode: "Explore",
      hiddenComponentIds: [],
      isolatedComponentId: null,
      focusedComponentId: null,
      activeSimulation: null,
      simulationHistory: [],
      activeRepairStep: 0,
      compareBefore: false,
      dependencyFilters: [],
      explosionGroup: "all",
      cameraVersion: s.cameraVersion + 1,
      error: null,
    }));
  },
}));
