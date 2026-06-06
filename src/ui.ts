/**
 * Pure-canvas UI primitives: rounded panels, buttons, text, stars.
 */

import { drawStar } from "./entities.js";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Button extends Rect {
  label: string;
  enabled?: boolean;
}

export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  fill = "rgba(20,8,40,0.85)",
  stroke = "rgba(180,140,255,0.5)",
  radius = 18,
): void {
  ctx.save();
  roundedRect(ctx, r.x, r.y, r.w, r.h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  b: Button,
  hovered = false,
  primary = false,
): void {
  const enabled = b.enabled !== false;
  const bg = !enabled
    ? "rgba(60,40,80,0.4)"
    : primary
      ? hovered
        ? "rgba(160,90,255,0.95)"
        : "rgba(120,70,220,0.9)"
      : hovered
        ? "rgba(60,40,100,0.95)"
        : "rgba(40,20,80,0.85)";
  const fg = !enabled ? "rgba(255,255,255,0.4)" : "#ffffff";
  drawPanel(ctx, b, bg, primary ? "rgba(255,210,90,0.8)" : "rgba(180,140,255,0.6)", 14);
  ctx.font = `800 ${Math.floor(b.h * 0.42)}px system-ui, sans-serif`;
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 2);
}

export function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 800,
  outline = "rgba(0,0,0,0.6)",
): void {
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (outline) {
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawStars(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  total: number,
  earned: number,
  size: number,
  anim = 1,
): void {
  const spacing = size * 2.5;
  const start = cx - ((total - 1) * spacing) / 2;
  for (let i = 0; i < total; i++) {
    const x = start + i * spacing;
    // back (empty)
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    drawStar(ctx, x, cy, size, size * 0.45, 5);
    if (i < earned) {
      const t = Math.max(0, Math.min(1, (anim - i * 0.25) * 1.6));
      if (t <= 0) continue;
      const ease = 1 - Math.pow(1 - t, 3);
      const s = size * (0.4 + 0.6 * ease);
      ctx.save();
      ctx.translate(x, cy);
      ctx.scale(s / size, s / size);
      // glow
      ctx.fillStyle = "rgba(255,220,90,0.4)";
      drawStar(ctx, 0, 0, size * 1.5, size * 0.65, 5);
      const grad = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size * 1.2);
      grad.addColorStop(0, "#fff7c2");
      grad.addColorStop(1, "#ffc02e");
      ctx.fillStyle = grad;
      drawStar(ctx, 0, 0, size, size * 0.45, 5);
      ctx.restore();
    }
  }
}

export function drawHearts(ctx: CanvasRenderingContext2D, x: number, y: number, total: number, alive: number, size: number): void {
  for (let i = 0; i < total; i++) {
    const cx = x + i * (size + 6);
    const filled = i < alive;
    drawHeart(ctx, cx, y, size, filled ? "#ff3a6a" : "rgba(255,255,255,0.18)");
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.bezierCurveTo(cx - s, cy - s * 0.3, cx - s * 0.5, cy - s, cx, cy - s * 0.3);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s, cx + s, cy - s * 0.3, cx, cy + s * 0.3);
  ctx.fill();
}

export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  value: number,
  color: string,
  bg = "rgba(255,255,255,0.12)",
): void {
  roundedRect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  const v = Math.max(0, Math.min(1, value));
  if (v > 0) {
    ctx.save();
    roundedRect(ctx, r.x, r.y, r.w * v, r.h, r.h / 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
}
