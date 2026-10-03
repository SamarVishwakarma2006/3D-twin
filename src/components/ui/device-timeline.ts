import { smartphone } from "../../data/smartphone";
import { simulateFailure } from "../../lib/simulation";

// Scroll timing adapted from the user-supplied Lycoris Specimen by Kedhareswer.
export const chapters = [
  "Discover",
  "Reveal",
  "Inspect",
  "Connect",
  "Simulate",
  "Understand",
];
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export function sceneCoord(progress: number) {
  const t = clamp01(progress) * 5;
  const i = Math.min(Math.floor(t), 4);
  const f = clamp01((t - i - 0.17) / 0.66);
  const eased = f < 0.5 ? 4 * f ** 3 : 1 - (-2 * f + 2) ** 3 / 2;
  return i + eased;
}
// Rotation, scale, lateral position, explosion, shell opacity.
const keys = [
  [-0.14, -0.48, -0.16, 1, 0.5, 0, 1],
  [0.05, 0.28, 0.04, 1.06, 0.65, 0.04, 0.09],
  [0.12, -0.6, -0.13, 0.79, 0.7, 0.88, 0.23],
  [0.03, -0.28, 0.03, 0.86, 0.72, 0.7, 0.09],
  [-0.08, 0.16, 0.07, 1, 0.67, 0.25, 0.06],
  [-0.1, 0.48, -0.14, 1, 0.5, 0, 1],
];
export function poseAt(coord: number) {
  const bounded = Math.max(0, Math.min(5, coord));
  const i = Math.min(Math.floor(bounded), 4);
  const f = bounded - i;
  return keys[i].map((value, n) => value + (keys[i + 1][n] - value) * f);
}
// Pure preview data: scrolling never writes a scenario into the workspace store.
export const heroSimulation = simulateFailure(smartphone, "battery");
