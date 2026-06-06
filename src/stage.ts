/**
 * Stage configuration and spawn heuristics.
 *
 * Designed so difficulty curves smoothly:
 *   - early stages: only normal moles, generous timing.
 *   - stage 4+: occasional golden moles.
 *   - stage 6+: bombs start appearing.
 *   - stage 10+: flowers (traps) appear — a hard tier.
 */

import type { EntityKind } from "./entities.js";

export interface StageConfig {
  stage: number;
  /** seconds per stage round */
  duration: number;
  /** score needed to clear */
  goalScore: number;
  /** seconds between possible spawns */
  spawnInterval: number;
  /** how long entities stay idle (visible) before falling back */
  idleDuration: number;
  /** max concurrent active entities */
  maxConcurrent: number;
  /** probability table — must roughly sum to 1 */
  weights: Record<EntityKind, number>;
}

export function getStageConfig(stage: number): StageConfig {
  const s = Math.max(1, stage);

  // Smooth curves
  const duration = 30; // each stage is 30s
  const goalScore = 300 + (s - 1) * 220;
  const spawnInterval = Math.max(0.32, 0.95 - (s - 1) * 0.06);
  const idleDuration = Math.max(0.55, 1.4 - (s - 1) * 0.08);
  const maxConcurrent = Math.min(6, 2 + Math.floor((s - 1) / 2));

  // Probability mixing
  let mole = 1.0;
  let golden = 0;
  let bomb = 0;
  let flower = 0;

  if (s >= 2) golden = 0.06;
  if (s >= 4) golden = 0.1;
  if (s >= 6) bomb = 0.12;
  if (s >= 8) bomb = 0.18;
  if (s >= 10) {
    flower = 0.18;
    bomb = 0.16;
  }
  if (s >= 12) {
    flower = 0.24;
    bomb = 0.18;
  }
  if (s >= 15) {
    flower = 0.3;
    bomb = 0.2;
    golden = 0.08;
  }

  mole = Math.max(0.2, 1 - golden - bomb - flower);

  return {
    stage: s,
    duration,
    goalScore,
    spawnInterval,
    idleDuration,
    maxConcurrent,
    weights: { mole, golden, bomb, flower },
  };
}

export function pickEntityKind(cfg: StageConfig, rng: () => number = Math.random): EntityKind {
  const w = cfg.weights;
  const total = w.mole + w.golden + w.bomb + w.flower;
  let r = rng() * total;
  if ((r -= w.mole) < 0) return "mole";
  if ((r -= w.golden) < 0) return "golden";
  if ((r -= w.bomb) < 0) return "bomb";
  return "flower";
}
