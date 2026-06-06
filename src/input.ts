/**
 * Multi-input handler: mouse, touch, keyboard.
 * Translates raw coordinates into the canvas's internal coordinate space.
 *
 * Keyboard mapping for the 3×3 grid (top-left → bottom-right):
 *   QWE / ASD / ZXC      (also numpad 789 / 456 / 123)
 */

export interface PointerHit {
  x: number;
  y: number;
  /** 0..8 grid index if the input was a key press, otherwise -1 */
  keyIndex: number;
}

export type HitListener = (hit: PointerHit) => void;

const KEY_TO_INDEX: Record<string, number> = {
  // QWE / ASD / ZXC
  q: 0, w: 1, e: 2,
  a: 3, s: 4, d: 5,
  z: 6, x: 7, c: 8,
  // numpad
  Numpad7: 0, Numpad8: 1, Numpad9: 2,
  Numpad4: 3, Numpad5: 4, Numpad6: 5,
  Numpad1: 6, Numpad2: 7, Numpad3: 8,
};

export class InputManager {
  private canvas: HTMLCanvasElement;
  private listeners: HitListener[] = [];
  private keyListeners: ((key: string) => void)[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.attach();
  }

  onHit(fn: HitListener): void {
    this.listeners.push(fn);
  }

  onKey(fn: (key: string) => void): void {
    this.keyListeners.push(fn);
  }

  private attach(): void {
    const handleMouse = (e: MouseEvent) => {
      const hit = this.translate(e.clientX, e.clientY, -1);
      this.emit(hit);
    };
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (e.changedTouches.length === 0) return;
      const t = e.changedTouches[0];
      const hit = this.translate(t.clientX, t.clientY, -1);
      this.emit(hit);
    };
    const handleKey = (e: KeyboardEvent) => {
      // Notify key listeners for menu navigation (Enter, Esc, etc.)
      for (const l of this.keyListeners) l(e.key);

      // Direct grid mapping
      const key = e.code in KEY_TO_INDEX ? e.code : e.key.toLowerCase();
      const idx = KEY_TO_INDEX[key];
      if (idx === undefined) return;
      e.preventDefault();
      // x,y will be resolved by the game scene against its current grid layout
      this.emit({ x: -1, y: -1, keyIndex: idx });
    };

    this.canvas.addEventListener("mousedown", handleMouse);
    this.canvas.addEventListener("touchstart", handleTouch, { passive: false });
    window.addEventListener("keydown", handleKey);
  }

  private translate(clientX: number, clientY: number, keyIndex: number): PointerHit {
    const rect = this.canvas.getBoundingClientRect();
    // Map screen coords back to the canvas's internal coordinate system
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      keyIndex,
    };
  }

  private emit(hit: PointerHit): void {
    for (const l of this.listeners) l(hit);
  }
}
