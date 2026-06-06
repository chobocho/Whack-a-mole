/**
 * Playing scene — moles spawn, get whacked, score climbs, stage clears.
 */

import { audio } from "../audio.js";
import {
  createEntity,
  drawEntity,
  drawHole,
  EntityState,
  spawnBurst,
  spawnFloatingText,
  updateEntity,
} from "../entities.js";
import type { Entity, EntityKind } from "../entities.js";
import type { Game, Scene } from "../game.js";
import type { PointerHit } from "../input.js";
import { pointInHole } from "../layout.js";
import {
  computeStars,
  makeScoreState,
  onHitBomb,
  onHitFlower,
  onHitGolden,
  onHitMole,
  onMiss,
  tickFever,
} from "../scoring.js";
import type { ScoreState, StageResult } from "../scoring.js";
import { getStageConfig, pickEntityKind } from "../stage.js";
import type { StageConfig } from "../stage.js";
import {
  Button,
  drawButton,
  drawCenteredText,
  drawHearts,
  drawPanel,
  drawProgressBar,
  pointInRect,
  roundedRect,
} from "../ui.js";

export class PlayScene implements Scene {
  private game: Game;
  private stage: number;
  private cfg: StageConfig;
  private entities: Entity[] = [];
  private state: ScoreState;
  private elapsed = 0;
  private spawnTimer = 0;
  private paused = false;
  private pauseButtons: Button[] = [];
  private gameOverScheduled = false;
  /** countdown before stage starts (READY → GO!) */
  private intro = 1.4;

  constructor(game: Game, stage: number) {
    this.game = game;
    this.stage = stage;
    this.cfg = getStageConfig(stage);
    this.state = makeScoreState(3);
  }

  enter(): void {
    audio.resume();
    this.layoutPauseButtons();
  }
  exit(): void {
    this.entities = [];
  }

  private layoutPauseButtons(): void {
    const W = this.game.width;
    const H = this.game.height;
    const bw = Math.min(240, W * 0.55);
    const bh = 56;
    this.pauseButtons = [
      { x: W / 2 - bw / 2, y: H / 2, w: bw, h: bh, label: "▶ 계속하기" },
      { x: W / 2 - bw / 2, y: H / 2 + bh + 12, w: bw, h: bh, label: "메뉴로" },
    ];
  }

  update(dt: number): void {
    if (this.paused) return;
    if (this.intro > 0) {
      this.intro -= dt;
      return;
    }
    this.elapsed += dt;
    tickFever(this.state, dt);
    const cfg = this.cfg;

    // spawn
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.trySpawn();
      const variance = cfg.spawnInterval * (0.6 + Math.random() * 0.7);
      this.spawnTimer = variance;
    }

    // update entities
    for (const e of this.entities) {
      updateEntity(e, dt, cfg.idleDuration);
      // Auto-miss when a mole/golden escapes without being hit
      if (!e.alive && e.state === EntityState.Dead && !(e as Entity & { _scored?: boolean })._scored) {
        (e as Entity & { _scored?: boolean })._scored = true;
        if (e.kind === "mole" || e.kind === "golden") {
          onMiss(this.state);
        }
      }
    }
    this.entities = this.entities.filter((e) => e.alive);

    // Fever screen burst
    if (this.state.fever && Math.random() < 0.4) {
      const W = this.game.width;
      const H = this.game.height;
      spawnBurst(
        this.game.particles,
        Math.random() * W,
        Math.random() * H * 0.6,
        ["#ff5fa2", "#ffd866", "#7af5ff", "#a45cff"][Math.floor(Math.random() * 4)],
        2,
        80,
        "spark",
      );
    }

    // End-of-stage check
    if (this.elapsed >= cfg.duration || this.state.lives <= 0) {
      this.finishStage();
    }
  }

  private trySpawn(): void {
    if (this.entities.filter((e) => e.alive).length >= this.cfg.maxConcurrent) return;
    const layout = this.game.layout;
    const usedHoles = new Set(this.entities.map((e) => e.holeIndex));
    const free: number[] = [];
    for (let i = 0; i < layout.holes.length; i++) {
      if (!usedHoles.has(i)) free.push(i);
    }
    if (free.length === 0) return;
    const holeIndex = free[Math.floor(Math.random() * free.length)];
    const kind: EntityKind = pickEntityKind(this.cfg);
    this.entities.push(createEntity(kind, holeIndex, this.cfg.idleDuration));
  }

  private finishStage(): void {
    if (this.gameOverScheduled) return;
    this.gameOverScheduled = true;
    const remaining = Math.max(0, this.cfg.duration - this.elapsed);
    const cleared = this.state.score >= this.cfg.goalScore && this.state.lives > 0;
    const stars = computeStars(this.state, this.cfg.duration, remaining, this.cfg.goalScore);
    const result: StageResult = {
      score: this.state.score,
      cleared,
      stage: this.stage,
      remainingTime: remaining,
      totalTime: this.cfg.duration,
      hits: this.state.hits,
      misses: this.state.misses,
      flowerHits: this.state.flowerHits,
      bombHits: this.state.bombHits,
      bestCombo: this.state.bestCombo,
      goldenHits: this.state.goldenHits,
      stars: stars.total,
      starBreakdown: {
        accuracy: stars.accuracy,
        combo: stars.combo,
        timeBonus: stars.timeBonus,
      },
    };
    audio.play(cleared ? "stage_clear" : "game_over");
    void this.game.saveProgress(this.stage, this.state.score, stars.total);
    setTimeout(() => this.game.toResult(result, !cleared), 600);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const W = this.game.width;
    const H = this.game.height;

    // draw holes
    const layout = this.game.layout;
    for (const h of layout.holes) drawHole(ctx, h);

    // draw entities — sort by y so back row is behind front row visually
    const sorted = [...this.entities].sort(
      (a, b) => layout.holes[a.holeIndex].cy - layout.holes[b.holeIndex].cy,
    );
    for (const e of sorted) drawEntity(ctx, e, layout.holes[e.holeIndex]);

    this.drawHUD(ctx);

    if (this.intro > 0) {
      this.drawIntroOverlay(ctx);
    }

    if (this.state.fever) this.drawFeverOverlay(ctx);

    if (this.paused) this.drawPauseOverlay(ctx);
  }

  private drawHUD(ctx: CanvasRenderingContext2D): void {
    const W = this.game.width;
    const H = this.game.height;
    // Top translucent strip
    ctx.fillStyle = "rgba(10,5,24,0.55)";
    ctx.fillRect(0, 0, W, this.game.layout.topInset - 8);

    // Stage
    drawCenteredText(ctx, `STAGE ${this.stage}`, 80, 26, 22, "#ffd866", 800);
    drawCenteredText(
      ctx,
      `목표 ${this.cfg.goalScore}`,
      80,
      54,
      14,
      "rgba(255,255,255,0.75)",
      600,
    );

    // Score (center)
    drawCenteredText(ctx, this.state.score.toLocaleString(), W / 2, 36, 36, "#fff", 900);
    drawCenteredText(
      ctx,
      `COMBO ${this.state.combo}${this.state.combo > 0 ? " ×" + (this.state.fever ? 3 : 1 + Math.floor(this.state.combo / 5)) : ""}`,
      W / 2,
      72,
      14,
      this.state.combo > 0 ? "#ffd866" : "rgba(255,255,255,0.55)",
      700,
    );

    // Time remaining
    const remaining = Math.max(0, this.cfg.duration - this.elapsed);
    const timeColor = remaining < 5 ? "#ff5f87" : "#7af5ff";
    drawCenteredText(ctx, `${remaining.toFixed(1)}s`, W - 90, 36, 26, timeColor, 800);

    // Lives
    drawHearts(ctx, W - 150, 64, 3, this.state.lives, 14);

    // Goal progress bar
    const barRect = { x: W / 2 - 160, y: 92, w: 320, h: 8 };
    drawProgressBar(
      ctx,
      barRect,
      this.state.score / this.cfg.goalScore,
      this.state.score >= this.cfg.goalScore ? "#7af5ff" : "#a45cff",
    );

    // Fever gauge
    const fgRect = { x: 16, y: 80, w: 130, h: 6 };
    drawProgressBar(ctx, fgRect, this.state.feverGauge, "#ff5fa2");
    drawCenteredText(ctx, this.state.fever ? "FEVER!" : "FEVER", 80, 92, 11, this.state.fever ? "#ffd866" : "rgba(255,255,255,0.55)", 800);

    // Pause button (top-right corner inside HUD)
    const pb = { x: W - 56, y: 8, w: 40, h: 40, label: this.paused ? "▶" : "II" };
    drawButton(ctx, pb, false, false);
    (this as PlayScene & { _pauseBtn?: Button })._pauseBtn = pb;
  }

  private drawIntroOverlay(ctx: CanvasRenderingContext2D): void {
    const W = this.game.width;
    const H = this.game.height;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, W, H);
    const t = 1.4 - this.intro;
    const msg = this.intro > 0.5 ? "READY" : "GO!";
    const size = msg === "GO!" ? 100 : 70;
    const scale = 1 + Math.sin(t * 4) * 0.05;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    drawCenteredText(ctx, msg, 0, 0, size, msg === "GO!" ? "#7af5ff" : "#ffd866");
    ctx.restore();
  }

  private drawFeverOverlay(ctx: CanvasRenderingContext2D): void {
    const W = this.game.width;
    const H = this.game.height;
    const alpha = 0.06 + Math.sin(this.game.time * 12) * 0.04;
    ctx.fillStyle = `rgba(255,80,140,${Math.max(0.04, alpha)})`;
    ctx.fillRect(0, 0, W, H);
    drawCenteredText(ctx, "🔥 FEVER!", W / 2, 130, 28, "#ffd866", 900);
  }

  private drawPauseOverlay(ctx: CanvasRenderingContext2D): void {
    const W = this.game.width;
    const H = this.game.height;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, W, H);
    drawCenteredText(ctx, "일시 정지", W / 2, H / 2 - 80, 44, "#fff");
    for (const b of this.pauseButtons) drawButton(ctx, b, false, b.label.includes("계속"));
  }

  onHit(hit: PointerHit): void {
    // Pause/play overlay handling first
    if (this.paused) {
      if (hit.keyIndex !== -1) return;
      for (let i = 0; i < this.pauseButtons.length; i++) {
        if (pointInRect(hit.x, hit.y, this.pauseButtons[i])) {
          audio.play("click");
          if (i === 0) this.paused = false;
          else this.game.toMenu();
          return;
        }
      }
      return;
    }

    if (this.intro > 0) return;

    // Pause button
    const pb = (this as PlayScene & { _pauseBtn?: Button })._pauseBtn;
    if (pb && hit.keyIndex === -1 && pointInRect(hit.x, hit.y, pb)) {
      this.paused = true;
      audio.play("click");
      return;
    }

    const layout = this.game.layout;
    let holeIndex = -1;
    let hitX = hit.x;
    let hitY = hit.y;
    if (hit.keyIndex !== -1) {
      // Key input — map to the visual top-left 3x3 keypad against the actual grid
      holeIndex = mapKeyIndexToHole(hit.keyIndex, layout.cols, layout.rows);
      if (holeIndex === -1) return;
      hitX = layout.holes[holeIndex].cx;
      hitY = layout.holes[holeIndex].cy;
    } else {
      for (let i = 0; i < layout.holes.length; i++) {
        if (pointInHole(hit.x, hit.y, layout.holes[i])) {
          holeIndex = i;
          break;
        }
      }
    }
    if (holeIndex === -1) {
      onMiss(this.state);
      return;
    }
    // Find topmost hittable entity in this hole
    const target = this.entities.find(
      (e) => e.holeIndex === holeIndex && e.alive && e.state !== EntityState.Falling && e.rise > 0.3,
    );
    if (!target) {
      onMiss(this.state);
      return;
    }
    target.hitFlash = 0.4;
    target.state = EntityState.Falling;
    target.stateTimer = 0.18;
    (target as Entity & { _scored?: boolean })._scored = true;

    const h = layout.holes[holeIndex];
    switch (target.kind) {
      case "mole": {
        const pts = onHitMole(this.state);
        spawnBurst(this.game.particles, h.cx, h.cy - h.ry, "#a8845a", 14, 240, "dot");
        spawnFloatingText(this.game.floatingTexts, h.cx, h.cy - h.ry * 2, `+${pts}`, "#ffd866", 24);
        break;
      }
      case "golden": {
        const pts = onHitGolden(this.state);
        spawnBurst(this.game.particles, h.cx, h.cy - h.ry, "#ffd866", 24, 320, "star");
        spawnFloatingText(this.game.floatingTexts, h.cx, h.cy - h.ry * 2, `+${pts} GOLDEN!`, "#ffd866", 28);
        break;
      }
      case "bomb": {
        onHitBomb(this.state);
        spawnBurst(this.game.particles, h.cx, h.cy - h.ry, "#ff7a40", 30, 360, "spark");
        spawnFloatingText(this.game.floatingTexts, h.cx, h.cy - h.ry * 2, "-300 💥", "#ff5f87", 26);
        break;
      }
      case "flower": {
        onHitFlower(this.state);
        spawnBurst(this.game.particles, h.cx, h.cy - h.ry, "#ff5fa2", 26, 320, "dot");
        spawnFloatingText(this.game.floatingTexts, h.cx, h.cy - h.ry * 2, "-500 🌸", "#ff5f87", 26);
        break;
      }
    }
  }

  onKey(key: string): void {
    if (key === "Escape" || key === "p" || key === "P") {
      this.paused = !this.paused;
      audio.play("click");
    } else if (key.toLowerCase() === "m") {
      audio.toggleMuted();
    }
  }
}

/**
 * Map a 3×3 keypad index (0..8 in row-major order) to a hole index
 * in the actual grid layout (which may be 3×3, 4×3, or 3×4).
 * We pick the visually closest cell so QWE feels like top row, ZXC like bottom.
 */
function mapKeyIndexToHole(keyIdx: number, cols: number, rows: number): number {
  const kr = Math.floor(keyIdx / 3);
  const kc = keyIdx % 3;
  // Stretch the 3×3 onto the available grid
  const tr = Math.min(rows - 1, Math.round((kr / 2) * (rows - 1)));
  const tc = Math.min(cols - 1, Math.round((kc / 2) * (cols - 1)));
  return tr * cols + tc;
}
