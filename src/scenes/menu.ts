/**
 * Main menu — start, stage select, mute toggle, best score.
 */

import { audio } from "../audio.js";
import type { Game, Scene } from "../game.js";
import type { PointerHit } from "../input.js";
import {
  Button,
  drawButton,
  drawCenteredText,
  drawPanel,
  drawStars,
  pointInRect,
} from "../ui.js";

export class MenuScene implements Scene {
  private game: Game;
  private buttons: Button[] = [];
  private hovered = -1;
  private selectedStage = 1;
  private time = 0;

  constructor(game: Game) {
    this.game = game;
  }

  enter(): void {
    this.selectedStage = Math.min(this.game.save.maxStageReached, 30);
    this.layoutButtons();
  }
  exit(): void {
    /* nothing */
  }

  private layoutButtons(): void {
    const W = this.game.width;
    const H = this.game.height;
    const cx = W / 2;
    const bw = Math.min(280, W * 0.55);
    const bh = 64;
    this.buttons = [
      { x: cx - bw / 2, y: H * 0.58, w: bw, h: bh, label: `START — STAGE ${this.selectedStage}` },
      { x: cx - bw / 2 - bh - 12, y: H * 0.58, w: bh, h: bh, label: "◀" },
      { x: cx + bw / 2 + 12, y: H * 0.58, w: bh, h: bh, label: "▶" },
      { x: cx - bw / 2, y: H * 0.58 + bh + 16, w: bw, h: 52, label: "STAGE 1부터 시작" },
      { x: W - 64 - 16, y: 16, w: 64, h: 56, label: audio.isMuted() ? "🔇" : "🔊" },
    ];
  }

  update(dt: number): void {
    this.time += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const W = this.game.width;
    const H = this.game.height;
    // Title
    const pulse = 1 + Math.sin(this.time * 2) * 0.04;
    ctx.save();
    ctx.translate(W / 2, H * 0.22);
    ctx.scale(pulse, pulse);
    drawCenteredText(ctx, "🔨 두더지 잡기", 0, 0, 56, "#ffd866");
    drawCenteredText(ctx, "Whack-a-mole", 0, 46, 22, "rgba(255,255,255,0.7)", 600);
    ctx.restore();

    // Best score panel
    const panelW = Math.min(420, W * 0.7);
    const panel = { x: W / 2 - panelW / 2, y: H * 0.34, w: panelW, h: 130 };
    drawPanel(ctx, panel);
    drawCenteredText(ctx, "BEST SCORE", panel.x + panel.w / 2, panel.y + 28, 16, "rgba(255,255,255,0.65)", 700);
    drawCenteredText(
      ctx,
      this.game.save.bestScore.toLocaleString(),
      panel.x + panel.w / 2,
      panel.y + 64,
      36,
      "#fff",
      900,
    );
    drawCenteredText(
      ctx,
      `⭐ ${this.game.save.totalStars}    🏁 STAGE ${this.game.save.maxStageReached}까지 도달`,
      panel.x + panel.w / 2,
      panel.y + 102,
      14,
      "rgba(255,210,90,0.85)",
      700,
    );

    // Buttons
    for (let i = 0; i < this.buttons.length; i++) {
      const b = this.buttons[i];
      const primary = i === 0;
      drawButton(ctx, b, this.hovered === i, primary);
    }

    // Stage stars row
    const maxShow = 5;
    const startIdx = Math.max(1, this.selectedStage - 2);
    const stageRowY = H * 0.5;
    drawCenteredText(ctx, `현재 선택: STAGE ${this.selectedStage}`, W / 2, stageRowY - 16, 16, "rgba(255,255,255,0.75)", 700);
    const earned = this.game.save.stageStars[this.selectedStage] ?? 0;
    drawStars(ctx, W / 2, stageRowY + 16, 3, earned, 14, 999);

    // Hint
    drawCenteredText(
      ctx,
      "마우스/터치/키패드(QWE-ASD-ZXC, NumPad)로 두더지를 잡으세요",
      W / 2,
      H - 56,
      14,
      "rgba(255,255,255,0.55)",
      600,
    );
    drawCenteredText(
      ctx,
      "🌸 10판부터는 꽃이 함정! 절대 때리지 마세요",
      W / 2,
      H - 32,
      13,
      "rgba(255,150,200,0.85)",
      700,
    );
  }

  onHit(hit: PointerHit): void {
    if (hit.keyIndex !== -1) return;
    this.hovered = -1;
    for (let i = 0; i < this.buttons.length; i++) {
      if (pointInRect(hit.x, hit.y, this.buttons[i])) {
        audio.play("click");
        this.handle(i);
        return;
      }
    }
  }

  onKey(key: string): void {
    if (key === "Enter" || key === " ") {
      audio.play("click");
      this.game.toPlay(this.selectedStage);
    } else if (key === "ArrowLeft") {
      this.selectedStage = Math.max(1, this.selectedStage - 1);
      this.layoutButtons();
      audio.play("click");
    } else if (key === "ArrowRight") {
      this.selectedStage = Math.min(this.game.save.maxStageReached, this.selectedStage + 1);
      this.layoutButtons();
      audio.play("click");
    } else if (key.toLowerCase() === "m") {
      audio.toggleMuted();
      this.layoutButtons();
    }
  }

  private handle(i: number): void {
    if (i === 0) {
      this.game.toPlay(this.selectedStage);
    } else if (i === 1) {
      this.selectedStage = Math.max(1, this.selectedStage - 1);
      this.layoutButtons();
    } else if (i === 2) {
      this.selectedStage = Math.min(this.game.save.maxStageReached, this.selectedStage + 1);
      this.layoutButtons();
    } else if (i === 3) {
      this.selectedStage = 1;
      this.game.toPlay(1);
    } else if (i === 4) {
      audio.toggleMuted();
      this.layoutButtons();
    }
  }
}
