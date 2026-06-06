/**
 * Entry point — boot the game once the DOM is ready.
 */

import { Game } from "./game.js";

function boot(): void {
  const canvas = document.getElementById("game") as HTMLCanvasElement | null;
  if (!canvas) {
    console.error("Canvas element #game not found");
    return;
  }
  try {
    const game = new Game(canvas);
    void game.start();
    (window as unknown as { _game?: Game })._game = game;
  } catch (e) {
    console.error("Boot failed", e);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0a0518";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff6464";
      ctx.font = "20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("게임 초기화 실패", canvas.width / 2, canvas.height / 2);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
