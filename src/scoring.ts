/**
 * Score, combo, fever and star-rating logic.
 */

import { audio } from "./audio.js";

export interface ScoreState {
  score: number;
  combo: number;
  bestCombo: number;
  fever: boolean;
  feverTimer: number;
  /** how full the fever gauge is, 0..1 */
  feverGauge: number;
  hits: number;
  misses: number;
  flowerHits: number;
  bombHits: number;
  goldenHits: number;
  lives: number;
}

export interface StageResult {
  score: number;
  cleared: boolean;
  stage: number;
  remainingTime: number;
  totalTime: number;
  hits: number;
  misses: number;
  flowerHits: number;
  bombHits: number;
  bestCombo: number;
  goldenHits: number;
  stars: number;
  /** breakdown so the UI can explain the rating */
  starBreakdown: {
    accuracy: number;
    combo: number;
    timeBonus: number;
  };
}

export function makeScoreState(lives = 3): ScoreState {
  return {
    score: 0,
    combo: 0,
    bestCombo: 0,
    fever: false,
    feverTimer: 0,
    feverGauge: 0,
    hits: 0,
    misses: 0,
    flowerHits: 0,
    bombHits: 0,
    goldenHits: 0,
    lives,
  };
}

const FEVER_DURATION = 5; // seconds
const FEVER_REQUIRED_COMBO = 12;

export function onHitMole(s: ScoreState): number {
  s.hits++;
  s.combo++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  const mult = s.fever ? 3 : 1 + Math.floor(s.combo / 5);
  const points = 100 * mult;
  s.score += points;
  audio.play("hit");
  if (s.combo % 5 === 0 && s.combo > 0) audio.play("combo");
  bumpFeverGauge(s, 0.08);
  return points;
}

export function onHitGolden(s: ScoreState): number {
  s.hits++;
  s.goldenHits++;
  s.combo++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  const mult = s.fever ? 3 : 1 + Math.floor(s.combo / 5);
  const points = 500 * mult;
  s.score += points;
  audio.play("golden");
  bumpFeverGauge(s, 0.2);
  return points;
}

export function onHitBomb(s: ScoreState): number {
  s.bombHits++;
  s.combo = 0;
  s.score = Math.max(0, s.score - 300);
  s.lives = Math.max(0, s.lives - 1);
  audio.play("bomb");
  s.feverGauge = Math.max(0, s.feverGauge - 0.2);
  return -300;
}

export function onHitFlower(s: ScoreState): number {
  s.flowerHits++;
  s.combo = 0;
  s.score = Math.max(0, s.score - 500);
  s.lives = Math.max(0, s.lives - 1);
  audio.play("flower");
  s.feverGauge = Math.max(0, s.feverGauge - 0.3);
  return -500;
}

export function onMiss(s: ScoreState): void {
  s.misses++;
  s.combo = 0;
  audio.play("miss");
}

export function tickFever(s: ScoreState, dt: number): void {
  if (s.fever) {
    s.feverTimer -= dt;
    if (s.feverTimer <= 0) {
      s.fever = false;
      s.feverTimer = 0;
      s.feverGauge = 0;
    }
  }
}

function bumpFeverGauge(s: ScoreState, amount: number): void {
  if (s.fever) return;
  s.feverGauge = Math.min(1, s.feverGauge + amount);
  if (s.feverGauge >= 1 || s.combo >= FEVER_REQUIRED_COMBO) {
    s.fever = true;
    s.feverTimer = FEVER_DURATION;
    audio.play("fever");
  }
}

export function computeStars(
  s: ScoreState,
  totalTime: number,
  remainingTime: number,
  goalScore: number,
): StageResult["starBreakdown"] & { total: number } {
  // Accuracy (excluding bomb/flower misses)
  const attempts = s.hits + s.misses;
  const accuracy = attempts === 0 ? 0 : s.hits / attempts;
  // Combo factor: best combo relative to a benchmark
  const comboFactor = Math.min(1, s.bestCombo / 15);
  // Time bonus: fraction of time left
  const timeBonus = Math.max(0, remainingTime) / totalTime;

  let score = 0;
  // Always 1 star if cleared
  score = 1;
  if (accuracy >= 0.75 && comboFactor >= 0.6) score = 2;
  if (accuracy >= 0.88 && comboFactor >= 0.85 && timeBonus >= 0.2) score = 3;
  // Soft floor: penalize many flower/bomb hits
  if (s.flowerHits + s.bombHits >= 3) score = Math.max(1, score - 1);

  // If goal not met, no stars
  if (s.score < goalScore) score = 0;

  return { accuracy, combo: comboFactor, timeBonus, total: score };
}
