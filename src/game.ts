/**
 * Main game controller — owns scenes, render loop and shared state.
 */

import { audio } from "./audio.js";
import { drawFloatingTexts, drawParticles, updateFloatingTexts, updateParticles } from "./entities.js";
import type { FloatingText, Particle } from "./entities.js";
import { InputManager } from "./input.js";
import type { PointerHit } from "./input.js";
import { computeLayout } from "./layout.js";
import type { GridLayout } from "./layout.js";
import { loadSave, persistSave, DEFAULT_SAVE } from "./storage.js";
import type { SaveData } from "./storage.js";
import { MenuScene } from "./scenes/menu.js";
import { PlayScene } from "./scenes/play.js";
import { ResultScene } from "./scenes/result.js";
import type { StageResult } from "./scoring.js";

export interface Scene {
  enter(): void;
  exit(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  onHit(hit: PointerHit): void;
  onKey(key: string): void;
}

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  input: InputManager;
  save: SaveData = { ...DEFAULT_SAVE };
  layout: GridLayout;
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];
  /** seconds since game start (for time-based animations) */
  time = 0;

  private scene: Scene | null = null;
  private lastTs = 0;
  private running = false;
  /** internal canvas resolution */
  private vWidth = 960;
  private vHeight = 640;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("Canvas 2D context unavailable");
    this.ctx = c;
    this.input = new InputManager(canvas);
    this.layout = computeLayout(this.vWidth, this.vHeight);
    this.fitCanvas();
    window.addEventListener("resize", () => this.fitCanvas());

    this.input.onHit((hit) => {
      audio.resume();
      if (this.scene) this.scene.onHit(hit);
    });
    this.input.onKey((key) => {
      audio.resume();
      if (this.scene) this.scene.onKey(key);
    });
  }

  get width(): number {
    return this.vWidth;
  }
  get height(): number {
    return this.vHeight;
  }

  async start(): Promise<void> {
    try {
      this.save = await loadSave();
    } catch (_e) {
      this.save = { ...DEFAULT_SAVE };
    }
    this.setScene(new MenuScene(this));
    this.running = true;
    this.lastTs = performance.now();
    requestAnimationFrame(this.frame);
  }

  setScene(s: Scene): void {
    if (this.scene) {
      try {
        this.scene.exit();
      } catch (e) {
        console.warn("[scene exit]", e);
      }
    }
    this.scene = s;
    try {
      this.scene.enter();
    } catch (e) {
      console.warn("[scene enter]", e);
    }
  }

  toMenu(): void {
    this.setScene(new MenuScene(this));
  }

  toPlay(stage: number): void {
    this.setScene(new PlayScene(this, stage));
  }

  toResult(result: StageResult, fromGameOver: boolean): void {
    this.setScene(new ResultScene(this, result, fromGameOver));
  }

  async saveProgress(stage: number, score: number, stars: number): Promise<void> {
    this.save.bestScore = Math.max(this.save.bestScore, score);
    if (stars > 0) {
      this.save.stageStars[stage] = Math.max(this.save.stageStars[stage] ?? 0, stars);
      this.save.maxStageReached = Math.max(this.save.maxStageReached, stage + 1);
    }
    this.save.totalStars = Object.values(this.save.stageStars).reduce((a, b) => a + b, 0);
    this.save.lastPlayed = Date.now();
    try {
      await persistSave(this.save);
    } catch (e) {
      console.warn("[save]", e);
    }
  }

  private frame = (ts: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000); // clamp 50ms
    this.lastTs = ts;
    this.time += dt;
    try {
      updateParticles(this.particles, dt);
      updateFloatingTexts(this.floatingTexts, dt);
      if (this.scene) this.scene.update(dt);
    } catch (e) {
      console.warn("[update]", e);
    }
    try {
      this.render();
    } catch (e) {
      console.warn("[render]", e);
      this.renderFallback();
    }
    requestAnimationFrame(this.frame);
  };

  private render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.vWidth, this.vHeight);
    this.drawBackground();
    if (this.scene) this.scene.render(ctx);
    drawParticles(ctx, this.particles);
    drawFloatingTexts(ctx, this.floatingTexts);
    ctx.restore();
  }

  private renderFallback(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#0a0518";
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);
    ctx.fillStyle = "#ff6464";
    ctx.font = "20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("렌더링 오류 — 새로고침해 주세요", this.vWidth / 2, this.vHeight / 2);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const W = this.vWidth;
    const H = this.vHeight;
    // sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.7);
    skyGrad.addColorStop(0, "#1b0a3a");
    skyGrad.addColorStop(0.6, "#2a1652");
    skyGrad.addColorStop(1, "#42206a");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // stars
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 30; i++) {
      const x = ((i * 977) % W);
      const y = ((i * 613) % (H * 0.4));
      const s = (i % 3) + 1;
      const tw = 0.5 + 0.5 * Math.sin(this.time * 2 + i);
      ctx.globalAlpha = 0.3 + tw * 0.4;
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;

    // ground
    const groundGrad = ctx.createLinearGradient(0, H * 0.6, 0, H);
    groundGrad.addColorStop(0, "#3a2410");
    groundGrad.addColorStop(0.4, "#241406");
    groundGrad.addColorStop(1, "#100a03");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // ground horizon
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.55);
    ctx.lineTo(W, H * 0.55);
    ctx.stroke();
  }

  private fitCanvas(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect() ?? {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const cssW = rect.width;
    const cssH = rect.height;
    const targetAR = 3 / 2;
    const screenAR = cssW / cssH;
    let dispW: number;
    let dispH: number;
    let virtualAR: number;

    // Choose orientation based on actual viewport
    if (screenAR < 0.9) {
      // portrait
      this.vWidth = 540;
      this.vHeight = 800;
      virtualAR = this.vWidth / this.vHeight;
    } else {
      this.vWidth = 960;
      this.vHeight = 640;
      virtualAR = this.vWidth / this.vHeight;
    }
    this.canvas.width = this.vWidth;
    this.canvas.height = this.vHeight;

    if (screenAR > virtualAR) {
      dispH = cssH;
      dispW = cssH * virtualAR;
    } else {
      dispW = cssW;
      dispH = cssW / virtualAR;
    }
    this.canvas.style.width = `${dispW}px`;
    this.canvas.style.height = `${dispH}px`;
    this.layout = computeLayout(this.vWidth, this.vHeight);
  }
}
