/**
 * Result scene — animated stars, stats, advance / retry / menu.
 */

import { audio } from "../audio.js";
import { spawnBurst } from "../entities.js";
import type { Game, Scene } from "../game.js";
import type { PointerHit } from "../input.js";
import type { StageResult } from "../scoring.js";
import {
  Button,
  drawButton,
  drawCenteredText,
  drawPanel,
  drawStars,
  pointInRect,
} from "../ui.js";

export class ResultScene implements Scene {
  private game: Game;
  private result: StageResult;
  private fromGameOver: boolean;
  private buttons: Button[] = [];
  private anim = 0;
  private celebratedStars = -1;

  constructor(game: Game, result: StageResult, fromGameOver: boolean) {
    this.game = game;
    this.result = result;
    this.fromGameOver = fromGameOver;
  }

  enter(): void {
    this.layoutButtons();
  }
  exit(): void {
    /* nothing */
  }

  private layoutButtons(): void {
    const W = this.game.width;
    const H = this.game.height;
    const bw = Math.min(240, W * 0.5);
    const bh = 54;
    const y = H - 96;
    const next: Button = this.result.cleared
      ? { x: 0, y, w: bw, h: bh, label: "다음 스테이지 ▶" }
      : { x: 0, y, w: bw, h: bh, label: "다시 시도" };
    const menu: Button = { x: 0, y, w: bw, h: bh, label: "메뉴로" };
    const gap = 16;
    const total = bw * 2 + gap;
    next.x = W / 2 - total / 2;
    menu.x = next.x + bw + gap;
    this.buttons = [next, menu];
  }

  update(dt: number): void {
    this.anim += dt;
    // Spawn celebratory particles as stars pop in
    const earned = this.result.stars;
    for (let i = 0; i < earned; i++) {
      const startTime = i * 0.25;
      if (this.anim >= startTime && this.celebratedStars < i) {
        this.celebratedStars = i;
        const W = this.game.width;
        const H = this.game.height;
        const spacing = 60;
        const start = W / 2 - ((earned - 1) * spacing) / 2;
        const x = start + i * spacing;
        const y = H * 0.4;
        spawnBurst(this.game.particles, x, y, "#ffd866", 30, 280, "star");
        audio.play("combo");
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const W = this.game.width;
    const H = this.game.height;

    // Dim background
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    // Title
    const title = this.fromGameOver
      ? "GAME OVER"
      : this.result.cleared
        ? "STAGE CLEAR!"
        : "실패…";
    const titleColor = this.fromGameOver ? "#ff5f87" : this.result.cleared ? "#7af5ff" : "#ffa64a";
    drawCenteredText(ctx, title, W / 2, H * 0.18, 54, titleColor, 900);
    drawCenteredText(
      ctx,
      `STAGE ${this.result.stage}`,
      W / 2,
      H * 0.26,
      20,
      "rgba(255,255,255,0.7)",
      700,
    );

    // Stars
    drawStars(ctx, W / 2, H * 0.4, 3, this.result.stars, 30, this.anim);

    // Stats panel
    const panelW = Math.min(440, W * 0.85);
    const panelH = 170;
    const panel = { x: W / 2 - panelW / 2, y: H * 0.5, w: panelW, h: panelH };
    drawPanel(ctx, panel);
    const rowH = 28;
    const rows: [string, string, string][] = [
      ["점수", this.result.score.toLocaleString(), "#fff"],
      [
        "정확도",
        `${(this.result.starBreakdown.accuracy * 100).toFixed(0)}%`,
        "#7af5ff",
      ],
      ["최대 콤보", `${this.result.bestCombo}`, "#ffd866"],
      [
        "황금/폭탄/꽃",
        `${this.result.goldenHits} / ${this.result.bombHits} / ${this.result.flowerHits}`,
        "rgba(255,255,255,0.8)",
      ],
    ];
    ctx.textBaseline = "middle";
    for (let i = 0; i < rows.length; i++) {
      const y = panel.y + 20 + i * rowH;
      ctx.font = `600 14px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.textAlign = "left";
      ctx.fillText(rows[i][0], panel.x + 24, y);
      ctx.font = `800 16px system-ui, sans-serif`;
      ctx.fillStyle = rows[i][2];
      ctx.textAlign = "right";
      ctx.fillText(rows[i][1], panel.x + panel.w - 24, y);
    }

    // Buttons
    for (const b of this.buttons) {
      const primary = b.label.includes("다음") || b.label.includes("다시");
      drawButton(ctx, b, false, primary);
    }
  }

  onHit(hit: PointerHit): void {
    if (hit.keyIndex !== -1) return;
    for (let i = 0; i < this.buttons.length; i++) {
      if (pointInRect(hit.x, hit.y, this.buttons[i])) {
        audio.play("click");
        if (i === 0) {
          if (this.result.cleared) this.game.toPlay(this.result.stage + 1);
          else this.game.toPlay(this.result.stage);
        } else {
          this.game.toMenu();
        }
        return;
      }
    }
  }

  onKey(key: string): void {
    if (key === "Enter" || key === " ") {
      if (this.result.cleared) this.game.toPlay(this.result.stage + 1);
      else this.game.toPlay(this.result.stage);
    } else if (key === "Escape") {
      this.game.toMenu();
    }
  }
}
