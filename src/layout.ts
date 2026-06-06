/**
 * Responsive layout — produces a 3x3 or 3x4 grid of holes adapted to aspect ratio.
 */

export interface Hole {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface GridLayout {
  holes: Hole[];
  cols: number;
  rows: number;
  topInset: number;
  /** virtual canvas size used when laying out */
  W: number;
  H: number;
}

export function computeLayout(W: number, H: number): GridLayout {
  const isPortrait = H > W * 1.05;
  // wider screen -> 4x3, portrait -> 3x4
  const cols = isPortrait ? 3 : 4;
  const rows = isPortrait ? 4 : 3;

  // Reserve top area for HUD
  const topInset = Math.max(80, H * 0.16);
  const bottomInset = Math.max(24, H * 0.04);
  const gridH = H - topInset - bottomInset;
  const gridW = W - 32;

  const cellW = gridW / cols;
  const cellH = gridH / rows;

  const rx = Math.min(cellW * 0.35, cellH * 0.32);
  const ry = rx * 0.45;

  const holes: Hole[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = 16 + cellW * (c + 0.5);
      const cy = topInset + cellH * (r + 0.5);
      holes.push({ cx, cy, rx, ry });
    }
  }
  return { holes, cols, rows, topInset, W, H };
}

export function pointInHole(x: number, y: number, h: Hole): boolean {
  // Use an expanded hit area (~1.5x) so the body above the hole is hittable
  const dx = (x - h.cx) / (h.rx * 1.5);
  const dy = (y - (h.cy - h.ry * 0.6)) / (h.ry * 2.4);
  return dx * dx + dy * dy <= 1;
}
