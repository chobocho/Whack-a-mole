/**
 * Game entities — moles, golden moles, bombs, flowers — plus particles.
 * All visuals are drawn procedurally with Canvas API primitives.
 */

export type EntityKind = "mole" | "golden" | "bomb" | "flower";

export const enum EntityState {
  Rising = 0,
  Idle = 1,
  Falling = 2,
  Dead = 3,
}

export interface Entity {
  kind: EntityKind;
  holeIndex: number;
  state: EntityState;
  /** seconds remaining in the current state */
  stateTimer: number;
  /** seconds the entity has been alive */
  age: number;
  /** how much of the body is above the ground, 0..1 */
  rise: number;
  /** non-zero while a hit animation is playing */
  hitFlash: number;
  /** procedural color seed */
  seed: number;
  alive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  shape: "dot" | "star" | "spark";
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export function createEntity(kind: EntityKind, holeIndex: number, lifeSeconds: number): Entity {
  return {
    kind,
    holeIndex,
    state: EntityState.Rising,
    stateTimer: 0.18,
    age: 0,
    rise: 0,
    hitFlash: 0,
    seed: Math.random(),
    alive: true,
  };
}

export function updateEntity(e: Entity, dt: number, idleDuration: number): void {
  e.age += dt;
  e.stateTimer -= dt;
  if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);

  switch (e.state) {
    case EntityState.Rising:
      e.rise = Math.min(1, e.rise + dt / 0.18);
      if (e.stateTimer <= 0) {
        e.state = EntityState.Idle;
        e.stateTimer = idleDuration;
        e.rise = 1;
      }
      break;
    case EntityState.Idle:
      if (e.stateTimer <= 0) {
        e.state = EntityState.Falling;
        e.stateTimer = 0.22;
      }
      break;
    case EntityState.Falling:
      e.rise = Math.max(0, e.rise - dt / 0.22);
      if (e.stateTimer <= 0) {
        e.state = EntityState.Dead;
        e.alive = false;
      }
      break;
    case EntityState.Dead:
      e.alive = false;
      break;
  }
}

/* -------------------- Drawing -------------------- */

interface HoleLayout {
  cx: number;
  cy: number;
  /** horizontal radius of the hole opening */
  rx: number;
  /** vertical radius of the hole opening */
  ry: number;
}

export function drawHole(ctx: CanvasRenderingContext2D, h: HoleLayout): void {
  // dirt mound around hole
  const grad = ctx.createRadialGradient(h.cx, h.cy + h.ry * 0.4, h.rx * 0.2, h.cx, h.cy + h.ry * 0.5, h.rx * 1.6);
  grad.addColorStop(0, "#3a2718");
  grad.addColorStop(0.6, "#241408");
  grad.addColorStop(1, "rgba(36,20,8,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(h.cx, h.cy + h.ry * 0.4, h.rx * 1.5, h.ry * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // hole opening
  ctx.fillStyle = "#0a0503";
  ctx.beginPath();
  ctx.ellipse(h.cx, h.cy, h.rx, h.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // rim highlight
  ctx.strokeStyle = "rgba(255,200,140,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(h.cx, h.cy - 1, h.rx * 0.95, h.ry * 0.9, 0, Math.PI * 0.05, Math.PI * 0.95);
  ctx.stroke();
}

export function drawEntity(ctx: CanvasRenderingContext2D, e: Entity, h: HoleLayout): void {
  // Clip to the hole so the entity rises out of it cleanly
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(h.cx, h.cy, h.rx, h.ry, 0, 0, Math.PI * 2);
  ctx.rect(h.cx - h.rx * 1.6, h.cy - h.ry * 4, h.rx * 3.2, h.ry * 4);
  ctx.clip();

  const popOffset = (1 - e.rise) * h.ry * 1.8;
  const baseY = h.cy - h.ry * 0.2 + popOffset;
  const bodyW = h.rx * 1.4;
  const bodyH = h.ry * 1.8;

  switch (e.kind) {
    case "mole":
      drawMole(ctx, h.cx, baseY, bodyW, bodyH, "#7a5a3a", "#a8845a", e);
      break;
    case "golden":
      drawMole(ctx, h.cx, baseY, bodyW, bodyH, "#c79420", "#ffd866", e);
      drawCrown(ctx, h.cx, baseY - bodyH * 0.55, bodyW * 0.5);
      break;
    case "bomb":
      drawBomb(ctx, h.cx, baseY, bodyW, bodyH, e);
      break;
    case "flower":
      drawFlower(ctx, h.cx, baseY, bodyW, bodyH, e);
      break;
  }

  ctx.restore();
}

function drawMole(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  dark: string,
  light: string,
  e: Entity,
): void {
  // body
  const bodyGrad = ctx.createRadialGradient(cx - w * 0.2, cy - h * 0.3, w * 0.1, cx, cy, w);
  bodyGrad.addColorStop(0, light);
  bodyGrad.addColorStop(1, dark);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.1, w * 0.7, h * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // belly
  ctx.fillStyle = "rgba(255,230,200,0.5)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.05, w * 0.35, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // ears (small arcs)
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(cx - w * 0.42, cy - h * 0.45, w * 0.12, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.42, cy - h * 0.45, w * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffb7a3";
  ctx.beginPath();
  ctx.arc(cx - w * 0.42, cy - h * 0.45, w * 0.06, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.42, cy - h * 0.45, w * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  const eyeY = cy - h * 0.2;
  const eyeDX = w * 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(cx - eyeDX, eyeY, w * 0.05, 0, Math.PI * 2);
  ctx.arc(cx + eyeDX, eyeY, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  // eye highlight
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx - eyeDX + w * 0.018, eyeY - w * 0.018, w * 0.018, 0, Math.PI * 2);
  ctx.arc(cx + eyeDX + w * 0.018, eyeY - w * 0.018, w * 0.018, 0, Math.PI * 2);
  ctx.fill();

  // nose (bezier petal)
  ctx.fillStyle = "#ff6f61";
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.05);
  ctx.bezierCurveTo(cx - w * 0.08, cy - h * 0.12, cx - w * 0.08, cy - h * 0.02, cx, cy - h * 0.0);
  ctx.bezierCurveTo(cx + w * 0.08, cy - h * 0.02, cx + w * 0.08, cy - h * 0.12, cx, cy - h * 0.05);
  ctx.fill();

  // whiskers
  ctx.strokeStyle = "rgba(20,10,5,0.5)";
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    if (i === 0) continue;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.05, cy - h * 0.02);
    ctx.lineTo(cx - w * 0.35, cy - h * 0.02 + i * 4);
    ctx.moveTo(cx + w * 0.05, cy - h * 0.02);
    ctx.lineTo(cx + w * 0.35, cy - h * 0.02 + i * 4);
    ctx.stroke();
  }

  // hit flash overlay
  if (e.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${e.hitFlash * 0.6})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy - h * 0.1, w * 0.7, h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCrown(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number): void {
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + w * 0.4);
  ctx.lineTo(cx - w * 0.66, cy - w * 0.3);
  ctx.lineTo(cx - w * 0.33, cy + w * 0.2);
  ctx.lineTo(cx, cy - w * 0.5);
  ctx.lineTo(cx + w * 0.33, cy + w * 0.2);
  ctx.lineTo(cx + w * 0.66, cy - w * 0.3);
  ctx.lineTo(cx + w, cy + w * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(120,80,0,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // jewel
  ctx.fillStyle = "#ff3060";
  ctx.beginPath();
  ctx.arc(cx, cy + w * 0.05, w * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawBomb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  e: Entity,
): void {
  // pulse
  const pulse = 1 + Math.sin(e.age * 16) * 0.04;
  // body
  const r = w * 0.5 * pulse;
  const grad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
  grad.addColorStop(0, "#5a5a6a");
  grad.addColorStop(1, "#161620");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.35, cy - r * 0.35, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // fuse holder
  ctx.fillStyle = "#2a1810";
  ctx.fillRect(cx - r * 0.18, cy - r * 1.05, r * 0.36, r * 0.18);
  // fuse curve (bezier)
  ctx.strokeStyle = "#8b6b3a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 1.05);
  ctx.bezierCurveTo(cx + r * 0.6, cy - r * 1.5, cx - r * 0.4, cy - r * 1.8, cx + r * 0.2, cy - r * 2.0);
  ctx.stroke();
  // spark
  const sparkX = cx + r * 0.2;
  const sparkY = cy - r * 2.0;
  ctx.fillStyle = "#ffeb3b";
  ctx.beginPath();
  ctx.arc(sparkX, sparkY, r * 0.18 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,160,40,0.7)";
  ctx.beginPath();
  ctx.arc(sparkX, sparkY, r * 0.3 * pulse, 0, Math.PI * 2);
  ctx.fill();

  if (e.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,180,80,${e.hitFlash * 0.7})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  e: Entity,
): void {
  const petalColor = e.seed > 0.66 ? "#ff5fa2" : e.seed > 0.33 ? "#a45cff" : "#ff7c4a";
  const petalLight = e.seed > 0.66 ? "#ffb1ce" : e.seed > 0.33 ? "#d3a4ff" : "#ffb98e";
  // stem
  ctx.strokeStyle = "#3aa84e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy + h * 0.45);
  ctx.bezierCurveTo(cx + w * 0.05, cy + h * 0.15, cx - w * 0.05, cy - h * 0.05, cx, cy - h * 0.15);
  ctx.stroke();

  // leaf (bezier)
  ctx.fillStyle = "#4ec25e";
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.02, cy + h * 0.1);
  ctx.bezierCurveTo(cx + w * 0.3, cy + h * 0.0, cx + w * 0.35, cy + h * 0.25, cx + w * 0.05, cy + h * 0.2);
  ctx.closePath();
  ctx.fill();

  // 6 petals (alternating dark/light)
  const sway = Math.sin(e.age * 4) * 0.1;
  const petalR = w * 0.22;
  const cxBlossom = cx;
  const cyBlossom = cy - h * 0.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + sway;
    const px = cxBlossom + Math.cos(a) * petalR * 0.9;
    const py = cyBlossom + Math.sin(a) * petalR * 0.9;
    const grad = ctx.createRadialGradient(px, py, 1, px, py, petalR);
    grad.addColorStop(0, petalLight);
    grad.addColorStop(1, petalColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(px, py, petalR * 0.95, petalR * 0.7, a, 0, Math.PI * 2);
    ctx.fill();
  }

  // center
  ctx.fillStyle = "#ffd84a";
  ctx.beginPath();
  ctx.arc(cxBlossom, cyBlossom, petalR * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b67d10";
  ctx.beginPath();
  ctx.arc(cxBlossom, cyBlossom, petalR * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Subtle "danger" pulse outline
  const dangerPulse = 0.4 + Math.sin(e.age * 8) * 0.15;
  ctx.strokeStyle = `rgba(255,60,80,${dangerPulse * 0.5})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cxBlossom, cyBlossom, petalR * 1.4, 0, Math.PI * 2);
  ctx.stroke();

  if (e.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,60,80,${e.hitFlash * 0.7})`;
    ctx.beginPath();
    ctx.arc(cxBlossom, cyBlossom, petalR * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* -------------------- Particles -------------------- */

export function spawnBurst(
  arr: Particle[],
  x: number,
  y: number,
  color: string,
  count: number,
  speed = 220,
  shape: "dot" | "star" | "spark" = "dot",
): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.8);
    arr.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - speed * 0.3,
      life: 0.6 + Math.random() * 0.3,
      maxLife: 0.9,
      size: 2 + Math.random() * 3,
      color,
      gravity: 600,
      shape,
    });
  }
}

export function updateParticles(arr: Particle[], dt: number): void {
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    p.life -= dt;
    if (p.life <= 0) {
      arr.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, arr: Particle[]): void {
  for (const p of arr) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.shape === "dot") {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === "star") {
      drawStar(ctx, p.x, p.y, p.size * 1.6, p.size * 0.7, 5);
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/* -------------------- Floating text -------------------- */

export function spawnFloatingText(
  arr: FloatingText[],
  x: number,
  y: number,
  text: string,
  color: string,
  size = 28,
): void {
  arr.push({
    x,
    y,
    vy: -90,
    text,
    color,
    life: 1.0,
    maxLife: 1.0,
    size,
  });
}

export function updateFloatingTexts(arr: FloatingText[], dt: number): void {
  for (let i = arr.length - 1; i >= 0; i--) {
    const t = arr[i];
    t.life -= dt;
    t.y += t.vy * dt;
    t.vy += 20 * dt; // gentle deceleration
    if (t.life <= 0) arr.splice(i, 1);
  }
}

export function drawFloatingTexts(ctx: CanvasRenderingContext2D, arr: FloatingText[]): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const t of arr) {
    const a = Math.max(0, t.life / t.maxLife);
    ctx.globalAlpha = a;
    ctx.font = `900 ${t.size}px system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
