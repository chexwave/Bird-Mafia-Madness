/** Typed particle emitters + a tiny shared atlas. Presentation-only. */

export type ParticleKind = "spark" | "orb" | "smoke" | "debris" | "trail";

const MAX = 560;
const CELL = 32;
const COLS = 5;

const COL: Record<ParticleKind, number> = {
  spark: 0,
  orb: 1,
  smoke: 2,
  debris: 3,
  trail: 4,
};

type Particle = {
  alive: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  sizeEnd: number;
  rot: number;
  rotV: number;
  color: string;
  gravity: number;
  drag: number;
  stretch: number;
  additive: boolean;
};

function blank(): Particle {
  return {
    alive: false,
    kind: "spark",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    size: 8,
    sizeEnd: 2,
    rot: 0,
    rotV: 0,
    color: "#ffffff",
    gravity: 0,
    drag: 0,
    stretch: 1,
    additive: true,
  };
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function ang(a: number, spd: number) {
  return { vx: Math.cos(a) * spd, vy: Math.sin(a) * spd };
}

function buildAtlas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = CELL * COLS;
  c.height = CELL;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = true;

  // 0 SPARK — needle star, hot core
  {
    g.save();
    g.translate(CELL * 0.5, CELL * 0.5);
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, 14);
    glow.addColorStop(0, "rgba(255,255,255,0.95)");
    glow.addColorStop(0.35, "rgba(255,255,255,0.45)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(0, 0, 14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(15, 0);
    g.lineTo(2, 2.2);
    g.lineTo(-13, 0);
    g.lineTo(2, -2.2);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(2.4, 0);
    g.lineTo(0, 7);
    g.lineTo(-2.4, 0);
    g.closePath();
    g.fill();
    g.restore();
  }

  // 1 ORB — soft energy sphere
  {
    g.save();
    g.translate(CELL * 1.5, CELL * 0.5);
    const rg = g.createRadialGradient(-2, -3, 0, 0, 0, 15);
    rg.addColorStop(0, "rgba(255,255,255,1)");
    rg.addColorStop(0.28, "rgba(255,255,255,0.85)");
    rg.addColorStop(0.62, "rgba(255,255,255,0.28)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(0, 0, 15, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // 2 SMOKE — fluffy overlapping puffs
  {
    g.save();
    g.translate(CELL * 2.5, CELL * 0.5);
    const puff = (ox: number, oy: number, r: number, a: number) => {
      const rg = g.createRadialGradient(ox, oy, r * 0.1, ox, oy, r);
      rg.addColorStop(0, `rgba(255,255,255,${a})`);
      rg.addColorStop(0.55, `rgba(255,255,255,${a * 0.45})`);
      rg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = rg;
      g.beginPath();
      g.arc(ox, oy, r, 0, Math.PI * 2);
      g.fill();
    };
    puff(-3, 1, 12, 0.7);
    puff(4, -2, 11, 0.55);
    puff(1, 4, 9, 0.5);
    puff(-5, -4, 8, 0.4);
    g.restore();
  }

  // 3 DEBRIS — angular shard
  {
    g.save();
    g.translate(CELL * 3.5, CELL * 0.5);
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.beginPath();
    g.moveTo(-9, -3);
    g.lineTo(-2, -12);
    g.lineTo(11, -6);
    g.lineTo(8, 9);
    g.lineTo(-6, 11);
    g.lineTo(-12, 2);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.beginPath();
    g.moveTo(-2, -12);
    g.lineTo(11, -6);
    g.lineTo(3, 1);
    g.closePath();
    g.fill();
    g.restore();
  }

  // 4 TRAIL — head-bright dash ( +X = forward after rotate )
  {
    g.save();
    g.translate(CELL * 4.5, CELL * 0.5);
    const lg = g.createLinearGradient(-15, 0, 14, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)");
    lg.addColorStop(0.45, "rgba(255,255,255,0.35)");
    lg.addColorStop(0.82, "rgba(255,255,255,0.95)");
    lg.addColorStop(1, "rgba(255,255,255,0.4)");
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(-15, 0);
    g.quadraticCurveTo(-4, -5, 10, -3.5);
    g.quadraticCurveTo(15, 0, 10, 3.5);
    g.quadraticCurveTo(-4, 5, -15, 0);
    g.fill();
    const core = g.createRadialGradient(10, 0, 0, 10, 0, 7);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = core;
    g.beginPath();
    g.arc(10, 0, 7, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  return c;
}

export class ParticleSystem {
  private pool: Particle[] = Array.from({ length: MAX }, blank);
  private cursor = 0;
  private atlas: HTMLCanvasElement | null = null;
  private tintCache = new Map<string, HTMLCanvasElement>();

  private ensureAtlas() {
    if (!this.atlas && typeof document !== "undefined") {
      this.atlas = buildAtlas();
    }
    return this.atlas;
  }

  clear() {
    for (const p of this.pool) p.alive = false;
  }

  private spawn(partial: Partial<Particle> & Pick<Particle, "kind" | "x" | "y" | "color">) {
    const p = this.pool[this.cursor]!;
    this.cursor = (this.cursor + 1) % MAX;
    p.alive = true;
    p.kind = partial.kind;
    p.x = partial.x;
    p.y = partial.y;
    p.vx = partial.vx ?? 0;
    p.vy = partial.vy ?? 0;
    p.life = partial.life ?? 0.4;
    p.max = partial.max ?? p.life;
    p.size = partial.size ?? 8;
    p.sizeEnd = partial.sizeEnd ?? p.size * 0.3;
    p.rot = partial.rot ?? 0;
    p.rotV = partial.rotV ?? 0;
    p.color = partial.color;
    p.gravity = partial.gravity ?? 0;
    p.drag = partial.drag ?? 0;
    p.stretch = partial.stretch ?? 1;
    p.additive = partial.additive ?? (partial.kind !== "smoke" && partial.kind !== "debris");
  }

  /** Hot needles flying off an impact. */
  sparks(x: number, y: number, color: string, n: number, dir?: number, spread = Math.PI) {
    const base = dir ?? 0;
    for (let i = 0; i < n; i++) {
      const a = dir == null ? Math.random() * Math.PI * 2 : base + rand(-spread, spread);
      const s = rand(90, 320);
      const v = ang(a, s);
      this.spawn({
        kind: "spark",
        x: x + rand(-3, 3),
        y: y + rand(-3, 3),
        ...v,
        life: rand(0.16, 0.42),
        max: 0.42,
        size: rand(7, 14),
        sizeEnd: 2,
        color,
        gravity: 70,
        drag: 1.6,
        stretch: rand(1.8, 3.2),
        rot: a,
      });
    }
  }

  /** Soft additive energy motes. */
  orbs(x: number, y: number, color: string, n: number, speed = 70) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.35, speed);
      this.spawn({
        kind: "orb",
        x: x + rand(-4, 4),
        y: y + rand(-4, 4),
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - rand(10, 50),
        life: rand(0.35, 0.75),
        max: 0.75,
        size: rand(8, 16),
        sizeEnd: rand(14, 22),
        color,
        gravity: -40,
        drag: 1.8,
      });
    }
  }

  /** Expanding dusty puffs. */
  smoke(x: number, y: number, color: string, n: number, up = true) {
    for (let i = 0; i < n; i++) {
      this.spawn({
        kind: "smoke",
        x: x + rand(-8, 8),
        y: y + rand(-4, 4),
        vx: rand(-40, 40),
        vy: up ? rand(-70, -18) : rand(10, 50),
        life: rand(0.35, 0.85),
        max: 0.85,
        size: rand(10, 18),
        sizeEnd: rand(22, 38),
        color,
        gravity: -25,
        drag: 2.4,
        rot: rand(0, Math.PI * 2),
        rotV: rand(-1.2, 1.2),
        additive: false,
      });
    }
  }

  /** Gravity shards. */
  debris(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-1.2, 1.2);
      const s = rand(80, 260);
      this.spawn({
        kind: "debris",
        x,
        y,
        vx: Math.cos(a) * s * (Math.random() > 0.5 ? 1 : -0.6),
        vy: Math.sin(a) * s,
        life: rand(0.35, 0.75),
        max: 0.75,
        size: rand(5, 11),
        sizeEnd: rand(3, 6),
        color,
        gravity: 620,
        drag: 0.6,
        rot: rand(0, Math.PI * 2),
        rotV: rand(-10, 10),
        additive: false,
      });
    }
  }

  /** Short additive dash along a velocity. */
  trail(x: number, y: number, vx: number, vy: number, color: string, scale = 1) {
    const spd = Math.hypot(vx, vy) || 1;
    this.spawn({
      kind: "trail",
      x,
      y,
      vx: vx * 0.12,
      vy: vy * 0.12,
      life: rand(0.08, 0.18) * scale,
      max: 0.18 * scale,
      size: rand(10, 16) * scale,
      sizeEnd: 4,
      color,
      gravity: 0,
      drag: 4,
      stretch: rand(2.2, 3.6),
      rot: Math.atan2(vy, vx),
    });
    if (spd > 200 && Math.random() < 0.25) {
      this.spawn({
        kind: "spark",
        x: x + rand(-2, 2),
        y: y + rand(-2, 2),
        vx: -vx * 0.08 + rand(-20, 20),
        vy: -vy * 0.08 + rand(-20, 20),
        life: 0.12,
        max: 0.12,
        size: 6,
        sizeEnd: 2,
        color,
        gravity: 0,
        drag: 2,
        stretch: 2,
        rot: Math.atan2(vy, vx),
      });
    }
  }

  land(x: number, y: number, impact = 200) {
    const heavy = impact > 380;
    this.smoke(x, y, heavy ? "#c4a882" : "#d9c4a0", heavy ? 6 : 4);
    this.debris(x, y, "#8a6a48", heavy ? 6 : 3);
    if (heavy) this.sparks(x, y, "#ff9f43", 5, -Math.PI / 2, 1.1);
  }

  /** Slow floating neon motes that sell canyon air. */
  ambient(x: number, y: number, color: string) {
    this.spawn({
      kind: "orb",
      x,
      y,
      vx: rand(-18, 18),
      vy: rand(-36, -8),
      life: rand(1.1, 2.6),
      max: 2.6,
      size: rand(3, 8),
      sizeEnd: rand(1, 3),
      color,
      gravity: -10,
      drag: 0.35,
    });
  }

  /** Soft ember drift for heat-haze biomes. */
  ember(x: number, y: number, color = "#ff9f43") {
    this.spawn({
      kind: "spark",
      x,
      y,
      vx: rand(-16, 16),
      vy: rand(-50, -18),
      life: rand(0.7, 1.4),
      max: 1.4,
      size: rand(4, 8),
      sizeEnd: 1,
      color,
      gravity: -20,
      drag: 0.5,
      stretch: 1.6,
      rot: -Math.PI / 2,
    });
  }

  jump(x: number, y: number, color = "#00f0ff") {
    this.smoke(x, y + 8, "#c4b49a", 3);
    this.sparks(x, y + 6, color, 8, Math.PI / 2, 0.9);
    this.orbs(x, y + 4, color, 2, 50);
  }

  jetpack(x: number, y: number) {
    if (Math.random() < 0.85) {
      this.spawn({
        kind: "spark",
        x: x + rand(-8, 8),
        y: y,
        vx: rand(-40, 40),
        vy: rand(80, 220),
        life: rand(0.12, 0.28),
        max: 0.28,
        size: rand(6, 12),
        sizeEnd: 2,
        color: Math.random() > 0.4 ? "#00f0ff" : "#7af7ff",
        gravity: 40,
        drag: 0.8,
        stretch: 2.4,
        rot: Math.PI / 2,
      });
    }
    if (Math.random() < 0.45) {
      this.smoke(x, y + 4, "#4aa0b8", 1, false);
    }
  }

  runDust(x: number, y: number, facing: number) {
    this.spawn({
      kind: "smoke",
      x,
      y,
      vx: -facing * rand(20, 55),
      vy: rand(-28, -8),
      life: rand(0.22, 0.42),
      max: 0.42,
      size: rand(7, 12),
      sizeEnd: rand(14, 22),
      color: Math.random() > 0.5 ? "#c4a882" : "#e0c8a0",
      gravity: -15,
      drag: 2,
      additive: false,
    });
  }

  muzzle(x: number, y: number, color: string, dir: number) {
    this.sparks(x, y, color, 6, dir > 0 ? 0 : Math.PI, 0.55);
    this.orbs(x, y, "#ffffff", 2, 40);
    this.trail(x, y, dir * 420, 0, color, 1.2);
  }

  hit(x: number, y: number, color: string) {
    this.sparks(x, y, color, 8);
    this.orbs(x, y, "#ffffff", 2, 55);
  }

  birdDeath(x: number, y: number) {
    this.sparks(x, y, "#ff2bd6", 10);
    this.sparks(x, y, "#a78bc4", 8);
    this.orbs(x, y, "#c77dff", 6, 90);
    this.debris(x, y, "#5a3d78", 8);
    this.smoke(x, y, "#6b4a88", 5);
  }

  bossHit(x: number, y: number, phase: 1 | 2 | 3) {
    const col = phase === 3 ? "#ffcc33" : phase === 2 ? "#ff8844" : "#00f0ff";
    this.sparks(x, y, col, 8 + phase * 2);
    this.orbs(x, y, "#ffffff", 3, 70);
    if (phase >= 2) this.debris(x, y, "#ff9f43", 4);
  }

  bossPhase(x: number, y: number, phase: 2 | 3) {
    this.sparks(x, y, phase === 3 ? "#ffcc33" : "#ff4466", 22);
    this.orbs(x, y, phase === 3 ? "#ffe08a" : "#ff2bd6", 12, 140);
    this.smoke(x, y, "#4a2040", 8);
    this.debris(x, y, "#ff8844", 10);
  }

  bossDeath(x: number, y: number) {
    this.sparks(x, y, "#ff2bd6", 28);
    this.sparks(x, y, "#00f0ff", 22);
    this.orbs(x, y, "#ffcc33", 16, 160);
    this.debris(x, y, "#c77dff", 18);
    this.smoke(x, y, "#5a2878", 10);
  }

  collect(x: number, y: number, color: string, rich = false) {
    this.orbs(x, y, color, rich ? 10 : 5, rich ? 110 : 70);
    this.sparks(x, y, color, rich ? 12 : 6, -Math.PI / 2, 1.4);
    if (rich) this.orbs(x, y, "#ffffff", 4, 50);
  }

  spring(x: number, y: number) {
    this.sparks(x, y, "#ff2bd6", 18, -Math.PI / 2, 1.35);
    this.sparks(x, y, "#ffffff", 10, -Math.PI / 2, 1.05);
    this.orbs(x, y - 10, "#00f0ff", 8, 140);
    this.orbs(x, y - 18, "#ff2bd6", 6, 110);
    this.smoke(x, y + 4, "#c77dff", 5);
  }

  hazard(x: number, y: number) {
    this.sparks(x, y, "#ff4466", 10);
    this.smoke(x, y, "#8a3040", 4);
    this.debris(x, y, "#ff8844", 5);
  }

  playerDeath(x: number, y: number) {
    this.sparks(x, y, "#ff2bd6", 18);
    this.orbs(x, y, "#ff4466", 10, 120);
    this.debris(x, y, "#7a2058", 12);
    this.smoke(x, y, "#4a1838", 8);
  }

  shotTrail(x: number, y: number, vx: number, vy: number, color: string, homing = false) {
    this.trail(x, y, vx, vy, color, homing ? 1.15 : 0.9);
    if (homing && Math.random() < 0.45) {
      this.spawn({
        kind: "orb",
        x: x + rand(-3, 3),
        y: y + rand(-3, 3),
        vx: rand(-20, 20),
        vy: rand(-20, 20),
        life: 0.22,
        max: 0.22,
        size: rand(5, 9),
        sizeEnd: 12,
        color,
        gravity: -10,
        drag: 2,
      });
    }
  }

  /** Generic fallback burst (sparks + a couple orbs). */
  burst(x: number, y: number, color: string, n: number) {
    this.sparks(x, y, color, Math.max(3, Math.round(n * 0.7)));
    this.orbs(x, y, color, Math.max(1, Math.round(n * 0.25)), 80);
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      const damp = Math.max(0, 1 - p.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotV * dt;
    }
  }

  private tinted(kind: ParticleKind, color: string): HTMLCanvasElement | null {
    const atlas = this.ensureAtlas();
    if (!atlas) return null;
    const key = kind + color;
    let c = this.tintCache.get(key);
    if (c) return c;
    if (this.tintCache.size > 48) this.tintCache.clear();
    c = document.createElement("canvas");
    c.width = CELL;
    c.height = CELL;
    const t = c.getContext("2d")!;
    t.drawImage(atlas, COL[kind] * CELL, 0, CELL, CELL, 0, 0, CELL, CELL);
    t.globalCompositeOperation = "source-in";
    t.fillStyle = color;
    t.fillRect(0, 0, CELL, CELL);
    this.tintCache.set(key, c);
    return c;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.ensureAtlas()) return;
    this.drawPass(ctx, false);
    this.drawPass(ctx, true);
  }

  private drawPass(ctx: CanvasRenderingContext2D, additive: boolean) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = additive ? "lighter" : "source-over";
    for (const p of this.pool) {
      if (!p.alive || p.additive !== additive) continue;
      const t = Math.max(0, p.life / p.max);
      const ease = p.kind === "smoke" ? t * t : t;
      const img = this.tinted(p.kind, p.color);
      if (!img) continue;
      const size = p.sizeEnd + (p.size - p.sizeEnd) * (p.kind === "smoke" ? 1 - t : t);
      let sx = size;
      let sy = size;
      let rot = p.rot;
      if (p.kind === "spark" || p.kind === "trail") {
        const spd = Math.hypot(p.vx, p.vy);
        rot = Math.atan2(p.vy, p.vx);
        const st = p.stretch * (0.7 + Math.min(1.8, spd / 220));
        sx = size * st;
        sy = size / Math.max(1.05, st * 0.55);
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rot);
      ctx.globalAlpha =
        p.kind === "smoke" ? ease * 0.55 : p.kind === "debris" ? ease * 0.9 : Math.min(1, ease * 1.15);
      ctx.drawImage(img, -sx * 0.5, -sy * 0.5, sx, sy);
      ctx.restore();
    }
    ctx.restore();
  }
}
