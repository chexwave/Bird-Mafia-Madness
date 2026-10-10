import { gameAudio } from "./audio";
import { CAMPAIGN } from "./campaign";
import { input } from "./input";
import {
  CHAOS_META,
  POWER_META,
  grantLevelChaos,
  hasLevelChaos,
  loadSave,
  markCleared,
  bossArmed,
  opOfLevel,
  passivesFrom,
  seedForLevel,
  unlockPower,
  type ChaosId,
  type PowerKind,
  type SaveData,
} from "./progression";
import { cageCheer, cagePartBeat, chaosBeat, collectBeat, formatRadio } from "./narrative";
import { ParticleSystem } from "./particles";
import { SEED_SIZE } from "./types";
import type {
  Bird,
  BossState,
  CharacterId,
  Coin,
  HazardEvent,
  HudState,
  Laser,
  LevelDef,
  Platform,
  PowerSeed,
  Rect,
  WeaponId,
  AmmoPickup,
} from "./types";

const LEVELS = CAMPAIGN;

/** Neon Chaos edge cycle — full synthwave palette, not just player accents */
const NEON_CHAOS = ["#ff2bd6", "#00f0ff", "#ffcc33", "#39ff9a", "#c77dff", "#ff9f43", "#ff4466", "#7ef9ff"];

/** ART v10 stamp is DEV ONLY — prod playfield stays clean. */
function isBmmDebug(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage?.getItem("bmmDebug") === "1") return true;
  } catch {
    /* private mode */
  }
  try {
    return new URLSearchParams(window.location.search).get("debug") === "1";
  } catch {
    return false;
  }
}

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "").slice(0, 6);
  const aa = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${h}${aa}`;
}

let VIEW_W = 960;
let VIEW_H = 720;

/** Larger, wider player for readability */
const PLAYER_W = 84;
const PLAYER_H = 86;
const HIT_OX = 16;
const HIT_OY = 12;
const HIT_W = 50;
/** Must reach sprite feet (PLAYER_H - HIT_OY) so ground snap keeps AABB contact */
const HIT_H = PLAYER_H - HIT_OY; // 74 — was 70 (4px gap → grounded flicker)
const GROUND_SKIN = 6;
const BIRD_SCALE = 1.5;
const FIXED_DT = 1 / 60;
/** Bounce pads must clear at least 5 body heights (asymmetric rise gravity 1400). */
const GRAV_UP = 1400;
const GRAV_DOWN = 2200;
const SPRING_HEIGHT = PLAYER_H * 5;
const SPRING_VY = -Math.sqrt(2 * GRAV_UP * SPRING_HEIGHT) * 1.1;

const WEAPONS: Record<
  WeaponId,
  {
    name: string;
    cost: number;
    dmg: number;
    speed: number;
    cooldown: number;
    spread: number;
    stamina: number;
    pattern: "line" | "beam" | "fan" | "seek" | "charge" | "nova" | "bounce";
  }
> = {
  pulse: { name: "Pulse", cost: 1, dmg: 1, speed: 520, cooldown: 0.18, spread: 0, stamina: 4, pattern: "line" },
  beam: { name: "Beam", cost: 2, dmg: 2, speed: 780, cooldown: 0.32, spread: 0, stamina: 10, pattern: "beam" },
  spread: { name: "Spread", cost: 3, dmg: 1, speed: 480, cooldown: 0.4, spread: 3, stamina: 14, pattern: "fan" },
  homing: { name: "Homing", cost: 2, dmg: 2, speed: 340, cooldown: 0.35, spread: 0, stamina: 8, pattern: "seek" },
  charge: { name: "Charge", cost: 3, dmg: 4, speed: 900, cooldown: 0.15, spread: 0, stamina: 16, pattern: "charge" },
  nova: { name: "Nova", cost: 4, dmg: 2, speed: 280, cooldown: 0.55, spread: 8, stamina: 18, pattern: "nova" },
  ricochet: { name: "Prism", cost: 2, dmg: 2, speed: 520, cooldown: 0.28, spread: 0, stamina: 10, pattern: "bounce" },
};

const WEAPON_ORDER: WeaponId[] = [
  "homing",
  "pulse",
  "beam",
  "spread",
  "charge",
  "nova",
  "ricochet",
];

function aabb(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function isStudioChroma(r: number, g: number, b: number, a: number) {
  if (a < 10) return true;
  if (g > 220 && r < 50 && b < 50) return true;
  // classic #FF00FF
  if (r > 190 && b > 170 && g < 110) return true;
  // live sheets: rose plate ~ (176–221, 24–40, 110–153), not hot magenta
  if (r > 140 && g < 90 && b > 70 && r - g > 70 && b - g > 30) return true;
  return false;
}

type FrameBox = { sx: number; sy: number; sw: number; sh: number };

function prepHeroSheet(img: HTMLImageElement, cols = 2, rows = 2): {
  canvas: HTMLCanvasElement;
  frames: FrameBox[];
} {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, img.naturalWidth || img.width);
  canvas.height = Math.max(1, img.naturalHeight || img.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { canvas, frames: [] };
  ctx.drawImage(img, 0, 0);
  const w = canvas.width;
  const h = canvas.height;
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return { canvas, frames: [] };
  }
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (isStudioChroma(px[i], px[i + 1], px[i + 2], px[i + 3])) {
      px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  const fw = w / cols;
  const fh = h / rows;
  const frames: FrameBox[] = [];
  for (let f = 0; f < cols * rows; f++) {
    const col = f % cols;
    const row = Math.floor(f / cols);
    const x0 = Math.floor(col * fw);
    const y0 = Math.floor(row * fh);
    const x1 = Math.floor(x0 + fw);
    const y1 = Math.floor(y0 + fh);
    let minX = x1, minY = y1, maxX = x0, maxY = y0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (px[(y * w + x) * 4 + 3] > 12) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) {
      frames.push({ sx: x0, sy: y0, sw: fw, sh: fh });
      continue;
    }
    const padX = Math.max(2, (maxX - minX) * 0.08);
    const padY = Math.max(2, (maxY - minY) * 0.06);
    const sx = Math.max(x0, minX - padX);
    const sy = Math.max(y0, minY - padY);
    const sw = Math.min(x1, maxX + padX + 1) - sx;
    const sh = Math.min(y1, maxY + padY + 1) - sy;
    frames.push({ sx, sy, sw, sh });
  }
  return { canvas, frames };
}

export type EngineCallbacks = {
  onHud: (hud: HudState) => void;
  onScreen: (screen: "playing" | "dead" | "win" | "paused") => void;
};

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private running = false;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private character: CharacterId = "grok";
  private levelIdx = 0;
  private level!: LevelDef;
  private platforms: Platform[] = [];
  private coins: Coin[] = [];
  private birds: Bird[] = [];
  private ammoPickups: AmmoPickup[] = [];
  private lasers: Laser[] = [];
  private fx = new ParticleSystem();
  private powerSeeds: PowerSeed[] = [];
  private hazard: HazardEvent | null = null;
  private hazardTimer = 0;
  private lightningBolts: { x: number; warn: number; struck: boolean }[] = [];

  private px = 0;
  private py = 0;
  private pvx = 0;
  private pvy = 0;
  private facing = 1;
  private grounded = false;
  private wasGrounded = false;
  private coyote = 0;
  private jumpBuf = 0;
  private jumpsLeft = 2;
  private anim = 0;
  private frame = 0;
  private fireCd = 0;
  private invuln = 0;
  private hurtFlash = 0;
  private platformRideVx = 0;

  /** Phase 3 juice */
  private chromPulse = 0;
  private powerPulse = 0;
  private slowMo = 0;
  private chaosEdge = 0;
  private vignetteBoost = 0;
  private homingBurst = 0;
  private overloadT = 0;
  private rapidT = 0;
  private zapperT = 0;
  private bossSeedCd = 0;
  private radio = "";
  private lastChaos: ChaosId | undefined;
  private chaosGem: {
    x: number;
    y: number;
    w: number;
    h: number;
    collected: boolean;
    bob: number;
    id: ChaosId;
  } | null = null;
  private plateBuf: HTMLCanvasElement | null = null;
  private save: SaveData = loadSave();
  private passives = passivesFrom(loadSave(), false);

  private score = 0;
  private coinCount = 0;
  private health = 100;
  private maxHealth = 100;
  private stamina = 100;
  private maxStamina = 100;
  private ammo = 24;
  private maxAmmo = 40;
  private weapon: WeaponId = "homing";
  private lives = 3;
  private checkpointId: string | null = null;
  private spawnX = 0;
  private spawnY = 0;
  /** Seconds of fall-death immunity after spawn/respawn */
  private spawnProtect = 0;
  private camX = 0;
  private camY = 0;
  private shake = 0;
  private time = 0;
  private paused = false;
  private won = false;
  private dead = false;
  private beamActive = 0;
  private keepProgress = false;
  /** Max hold-time seconds */
  private maxShield = 5;
  /** Current shield energy in seconds of hold */
  private shield = 5;
  private shielding = false;
  private shieldRegenAcc = 0;
  /** Grok jetpack / Goblin multi-jump state */
  private airJumpsUsed = 0;
  private jetpacking = false;
  /** Ignore jump-cut / jetpack so a bounce pad can finish its arc */
  private springLock = 0;
  private jumpRings: { x: number; y: number; life: number; max: number }[] = [];
  /** Phase 4 — cinematic motion ghosts */
  private ghosts: {
    x: number;
    y: number;
    frame: number;
    facing: number;
    life: number;
    max: number;
    air: boolean;
    running: boolean;
  }[] = [];
  private ghostAcc = 0;
  private landSquash = 0;
  private landRing = 0;
  private muzzleFlash = 0;
  private muzzleColor = "#00f0ff";
  private lookX = 0;
  private lookY = 0;
  private attackT = 0;
  private hurtPoseT = 0;
  private boss: BossState | null = null;
  private lastBossPhase: 1 | 2 | 3 = 1;
  private bossGoalOpen = true;
  private weaponCharge = 0;
  private chargeFiring = false;

  private imgs: Record<string, HTMLImageElement | HTMLCanvasElement> = {};
  private frameBoxes = new WeakMap<CanvasImageSource, FrameBox[]>();
  private ready = false;
  private cbs: EngineCallbacks;

  constructor(canvas: HTMLCanvasElement, cbs: EngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context missing");
    this.ctx = ctx;
    this.cbs = cbs;
    if (!canvas.width) canvas.width = 960;
    if (!canvas.height) canvas.height = 720;
    this.syncView();
  }

  /** Keep camera/world view matched to the live canvas buffer (fills the stage). */
  syncView() {
    VIEW_W = Math.max(640, this.canvas.width || 960);
    VIEW_H = Math.max(560, this.canvas.height || 720);
  }

  private adoptHeroSheet(key: string, img: HTMLImageElement | null) {
    if (!img) return;
    try {
      const prepped = prepHeroSheet(img);
      this.imgs[key] = prepped.canvas;
      if (prepped.frames.length) this.frameBoxes.set(prepped.canvas, prepped.frames);
    } catch {
      this.imgs[key] = img;
    }
  }

  async load() {
    const loadHero = (src: string) =>
      fetch(src, { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          return loadImage(url).finally(() => URL.revokeObjectURL(url));
        })
        .catch(() => loadImage(src).catch(() => null));
    const [
      grokIdle, grokRun, grokJump, grokAttack, grokHurt,
      goblinIdle, goblinRun, goblinJump, goblinAttack, goblinHurt,
      bird, boss, props
    ] = await Promise.all([
      loadHero("/sprites/characters/grok-idle.png?v=hero6"),
      loadHero("/sprites/characters/grok-run.png?v=hero6"),
      loadHero("/sprites/characters/grok-jump.png?v=jump3"),
      loadHero("/sprites/characters/grok-attack.png?v=hero6"),
      loadHero("/sprites/characters/grok-hurt.png?v=hero6"),
      loadHero("/sprites/characters/goblin-idle.png?v=hero6"),
      loadHero("/sprites/characters/goblin-run.png?v=hero6"),
      loadHero("/sprites/characters/goblin-jump.png?v=hero6"),
      loadHero("/sprites/characters/goblin-attack.png?v=hero6"),
      loadHero("/sprites/characters/goblin-hurt.png?v=hero6"),
      loadHero("/sprites/bird.png?v=bird2"),
      loadImage("/sprites/don-corvone.png?v=don1"),
      loadImage("/sprites/props.png"),
    ]);
    this.adoptHeroSheet("grokIdle", grokIdle);
    this.adoptHeroSheet("grokRun", grokRun);
    this.adoptHeroSheet("grokJump", grokJump);
    this.adoptHeroSheet("grokAttack", grokAttack);
    this.adoptHeroSheet("grokHurt", grokHurt);
    this.adoptHeroSheet("goblinIdle", goblinIdle);
    this.adoptHeroSheet("goblinRun", goblinRun);
    this.adoptHeroSheet("goblinJump", goblinJump);
    this.adoptHeroSheet("goblinAttack", goblinAttack);
    this.adoptHeroSheet("goblinHurt", goblinHurt);
    this.adoptHeroSheet("bird", bird);
    this.imgs.boss = boss;
    this.imgs.props = props;
    // Op 1 visual kit plates — optional; procedural mesas remain the fallback
    try {
      this.imgs.bgFar = await loadImage("/sprites/bg/op1-far.jpg");
      this.imgs.bgMid = await loadImage("/sprites/bg/op1-mid.jpg");
    } catch {
      /* keep procedural-only */
    }
    for (let i = 1; i <= 9; i++) {
      try {
        this.imgs[`bgL${i}`] = await loadImage(`/sprites/bg/l${i}-far.jpg?v=sky1`);
      } catch {
        /* plate optional */
      }
    }
    this.ready = true;
  }

  /**
   * @param keepProgress when true (Next Level), keep score/lives/ammo instead of full reset
   */
  startLevel(character: CharacterId, levelIndex: number, keepProgress = false) {
    this.character = character;
    this.levelIdx = Math.max(0, Math.min(LEVELS.length - 1, levelIndex));
    this.level = LEVELS[this.levelIdx]!;
    this.keepProgress = keepProgress;
    this.save = loadSave();
    this.applyPassives();
    this.resetLevel(!keepProgress);
    this.paused = false;
    this.won = false;
    this.dead = false;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this.radio = this.level.radio ?? "";
    // Kill stuck run/fire from previous stage (especially mobile D-pad)
    input.lockFor(450);
    cancelAnimationFrame(this.raf);
    this.loop(this.last);
    gameAudio.playMusic(this.level.boss ? "battle" : "play");
    this.emitHud();
    this.cbs.onScreen("playing");
    this.exposeControlsTest();
  }

  private applyPassives() {
    this.save = loadSave();
    this.passives = passivesFrom(this.save, !!this.level?.epic);
    this.maxHealth = this.passives.maxHealth;
    this.maxStamina = this.passives.maxStamina;
    this.maxAmmo = this.passives.maxAmmo;
    this.maxShield = this.passives.maxShield;
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    input.clear();
    if (this.canvas?.style) this.canvas.style.filter = "";
    this.slowMo = 0;
    this.chromPulse = 0;
  }

  setPaused(p: boolean, silent = false) {
    if (this.won || this.dead) return;
    this.paused = p;
    if (p) input.clear();
    if (!silent) this.cbs.onScreen(p ? "paused" : "playing");
  }

  togglePause() {
    this.setPaused(!this.paused);
  }

  restartFromCheckpoint() {
    input.lockFor(450);
    if (this.lives <= 0) {
      this.lives = 3;
      this.score = Math.max(0, this.score - 200);
      this.checkpointId = null;
      this.spawnX = this.level.spawn.x;
      this.spawnY = this.level.spawn.y;
    }
    this.dead = false;
    this.paused = false;
    this.won = false;
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.ammo = Math.max(this.ammo, 12);
    this.applySpawnPose();
    this.lasers = [];
    this.hazard = null;
    this.shield = Math.max(this.shield, this.maxShield * 0.4);
    this.shielding = false;
    this.shieldRegenAcc = 0;
    this.cbs.onScreen("playing");
    gameAudio.playMusic(this.level.boss ? "battle" : "play");
    this.emitHud();
  }

  private resetLevel(full: boolean) {
    const L = this.level;
    this.platforms = L.platforms.map((p) => ({ ...p }));
    this.coins = L.coins.map((c, i) => ({ ...c, collected: false, bob: i * 0.4 }));
    this.birds = L.birds.map((b) => ({
      ...b,
      w: Math.round(b.w * BIRD_SCALE),
      h: Math.round(b.h * BIRD_SCALE),
      frame: 0,
      t: Math.random() * 10,
      dead: false,
    }));
    this.ammoPickups = L.ammo.map((a) => ({ ...a, collected: false }));
    this.powerSeeds = (L.seeds ?? []).map((s, i) => ({
      ...s,
      x: s.x + (s.w - SEED_SIZE) / 2,
      y: s.y + (s.h - SEED_SIZE) / 2,
      w: SEED_SIZE,
      h: SEED_SIZE,
      collected: false,
      bob: i * 0.7,
    }));
    // Regular levels: guarantee the Operation's assigned power type appears
    if (this.powerSeeds.length === 0 && !L.boss && L.introPower) {
      const c = this.coins[Math.min(1, this.coins.length - 1)];
      if (c) {
        this.powerSeeds.push({
          x: c.x - (SEED_SIZE - 28) / 2,
          y: c.y - 40,
          w: SEED_SIZE,
          h: SEED_SIZE,
          collected: false,
          bob: 0.5,
          kind: L.introPower,
        });
      }
    }
    this.placeChaosGem();
    // Boss arenas start dry unless inventory already has unlocks — those spawn in-fight
    this.homingBurst = 0;
    this.overloadT = 0;
    this.rapidT = 0;
    this.zapperT = 0;
    this.bossSeedCd = 2.5;
    this.lastChaos = undefined;
    this.lasers = [];
    this.fx.clear();
    this.chromPulse = 0;
    this.powerPulse = 0;
    this.slowMo = 0;
    this.chaosEdge = 0;
    this.vignetteBoost = 0;
    this.ghosts = [];
    this.ghostAcc = 0;
    this.landSquash = 0;
    this.landRing = 0;
    this.muzzleFlash = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.attackT = 0;
    this.hurtPoseT = 0;
    this.hazard = null;
    this.lightningBolts = [];
    this.hazardTimer = L.disasterInterval * 0.55;
    this.spawnX = L.spawn.x;
    this.spawnY = L.spawn.y;
    this.checkpointId = null;
    this.applySpawnPose();
    this.facing = 1;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumpsLeft = 2;
    this.fireCd = 0;
    this.invuln = 1.0;
    this.anim = 0;
    this.frame = 0;
    this.camX = Math.max(0, this.px - VIEW_W * 0.3);
    {
      const maxCamY = this.level.height - VIEW_H;
      const minCamY = Math.min(0, maxCamY);
      const targetY = this.py - VIEW_H * 0.55;
      this.camY = Math.max(minCamY, Math.min(maxCamY, targetY));
    }
    this.shake = 0;
    this.time = 0;
    this.beamActive = 0;
    this.shield = this.maxShield;
    this.shielding = false;
    this.shieldRegenAcc = 0;
    this.airJumpsUsed = 0;
    this.jetpacking = false;
    this.jumpRings = [];
    this.weaponCharge = 0;
    this.chargeFiring = false;
    this.boss = null;
    this.bossGoalOpen = !L.boss && !L.horde;
    if (L.horde) {
      for (const pl of this.platforms) {
        if (pl.kind === "goal") pl.active = false;
      }
    }
    if (L.boss) {
      const op = opOfLevel(L.id);
      if (!bossArmed(this.save, op.id)) {
        this.boss = null;
        this.bossGoalOpen = true;
        this.radio = "GROK-9 · No handler. Level 6 was not finished. The cage at the top of the vertical ascent is still shut.";
      } else {
        const hp = Math.round((L.epic ? 220 : 80) * (1 + (op.id - 1) * 0.18));
        this.boss = {
          x: L.width * 0.5 - 60,
          y: 100,
          w: 168,
          h: 128,
          hp,
          maxHp: hp,
          phase: 1,
          t: 0,
          vx: 80,
          vy: 0,
          dead: false,
          flash: 0,
          attackCd: 1.2,
        };
        this.bossGoalOpen = false;
        this.lastBossPhase = 1;
        for (const pl of this.platforms) {
          if (pl.kind === "goal") pl.active = false;
        }
      }
    }
    if (full) {
      this.health = this.maxHealth;
      this.stamina = this.maxStamina;
      this.ammo = 36;
      this.weapon = "homing";
      this.coinCount = 0;
      this.lives = 3;
      this.score = 0;
    } else {
      // next level: top off a bit
      this.health = Math.max(this.health, 60);
      this.stamina = this.maxStamina;
      this.ammo = Math.max(this.ammo, 16);
    }
  }

  private emitHud() {
    const op = opOfLevel(this.level.id);
    const unlocked = this.save.inventory[op.id] ?? [];
    const buffs: string[] = [];
    if (this.slowMo > 0) buffs.push("SLOW");
    if (this.homingBurst > 0) buffs.push("HOM");
    if (this.overloadT > 0) buffs.push("OVR");
    if (this.rapidT > 0) buffs.push("RPD");
    if (this.zapperT > 0) buffs.push("ZAP");
    this.cbs.onHud({
      score: this.score,
      coins: this.coinCount,
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      ammo: this.ammo,
      maxAmmo: this.maxAmmo,
      weapon: this.weapon,
      character: this.character,
      level: this.level.id,
      lives: this.lives,
      checkpoint: this.checkpointId,
      shield: this.shield,
      maxShield: this.maxShield,
      shielding: this.shielding,
      bossHp: this.boss && !this.boss.dead ? this.boss.hp : undefined,
      bossMaxHp: this.boss && !this.boss.dead ? this.boss.maxHp : undefined,
      bossName: this.boss && !this.boss.dead ? (this.level.bossName ?? "BOSS") : undefined,
      weaponCharge: this.weapon === "charge" ? this.weaponCharge : undefined,
      unlockedPowers: unlocked,
      radio: this.radio,
      operation: op.id,
      chaosGot: (Object.entries(this.save.chaos) as [ChaosId, number][])
        .filter(([, n]) => n > 0)
        .map(([id]) => id),
      lastChaos: this.lastChaos,
      flags: this.platforms
        .filter((p) => p.kind === "checkpoint")
        .sort((a, b) => a.x - b.x)
        .map((p) => !!p.active),
      chaosHere: this.level.chaosId ?? seedForLevel(this.level.id),
      chaosHereGot: hasLevelChaos(this.save, this.level.id) || !!this.chaosGem?.collected,
      chaosSlots: Array.from({ length: 10 }, (_, slot) =>
        hasLevelChaos(this.save, (op.id - 1) * 10 + slot + 1),
      ),
      activeBuffs: buffs,
    });
  }

  private loop = (now: number) => {
    if (!this.running) return;
    this.syncView();
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.acc += raw;
    while (this.acc >= FIXED_DT) {
      if (!this.paused && !this.dead && !this.won) this.fixedUpdate(FIXED_DT);
      this.acc -= FIXED_DT;
    }
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private fixedUpdate(dt: number) {
    // SLOW-MO seed: compress simulation time (juice stays readable)
    const scale = this.slowMo > 0 ? 0.38 : 1;
    dt = dt * scale;
    this.time += dt / scale; // real-time clock for UI pulses
    const inp = input.poll();

    if (inp.pause) {
      this.togglePause();
      return;
    }
    if (inp.weaponPick) {
      this.weapon = inp.weaponPick;
      gameAudio.play("select", { volume: 0.5 });
      this.emitHud();
    }
    if (inp.weaponNext) this.cycleWeapon(1);
    if (inp.weaponPrev) this.cycleWeapon(-1);

    // Shield: hold to block attacks. Max 5s use. Regen 20% (1s) every 2s when not held.
    this.updateShield(dt, inp.shield);

    this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.chromPulse > 0) this.chromPulse -= dt;
    if (this.powerPulse > 0) this.powerPulse -= dt;
    if (this.vignetteBoost > 0) this.vignetteBoost -= dt;
    if (this.slowMo > 0) this.slowMo = Math.max(0, this.slowMo - dt);
    if (this.chaosEdge > 0) this.chaosEdge = Math.max(0, this.chaosEdge - dt);
    if (this.homingBurst > 0) this.homingBurst = Math.max(0, this.homingBurst - dt);
    if (this.overloadT > 0) this.overloadT = Math.max(0, this.overloadT - dt);
    if (this.rapidT > 0) {
      this.rapidT = Math.max(0, this.rapidT - dt);
      this.ammo = Math.min(this.maxAmmo, this.ammo + 4 * dt);
    }
    if (this.zapperT > 0) this.zapperT = Math.max(0, this.zapperT - dt);
    if (this.landSquash > 0) this.landSquash = Math.max(0, this.landSquash - dt * 7);
    if (this.landRing > 0) this.landRing = Math.max(0, this.landRing - dt * 2.4);
    if (this.muzzleFlash > 0) this.muzzleFlash = Math.max(0, this.muzzleFlash - dt * 12);
    this.tickBossSeeds(dt);
    // Bird hit-flash decay
    for (const b of this.birds) {
      if (b.hitFlash && b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt);
    }
    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.beamActive > 0) this.beamActive -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 8);

    for (const p of this.platforms) {
      if (p.kind === "moving" && p.originX != null && p.range != null && p.vx != null) {
        p.phase = (p.phase ?? 0) + dt;
        const ox = p.originX;
        p.x = ox + Math.sin(p.phase * (p.vx / 40)) * p.range;
      }
    }

    const accel = this.grounded ? 2200 : 1400 * this.passives.airMul;
    const maxSpeed = (this.character === "grok" ? 280 : 300) * (1 + (this.passives.airMul - 1) * 0.4);
    const friction = this.grounded ? 1800 : 400;
    let ax = 0;
    if (inp.left) ax -= 1;
    if (inp.right) ax += 1;
    if (ax !== 0) {
      this.pvx += ax * accel * dt;
      this.facing = ax > 0 ? 1 : -1;
    } else {
      const f = friction * dt;
      if (Math.abs(this.pvx) <= f) this.pvx = 0;
      else this.pvx -= Math.sign(this.pvx) * f;
    }
    this.pvx = Math.max(-maxSpeed, Math.min(maxSpeed, this.pvx));

    if (inp.jumpPressed) this.jumpBuf = 0.12;
    else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (this.grounded) {
      this.coyote = 0.1;
      this.jumpsLeft = 2;
      this.airJumpsUsed = 0;
      this.jetpacking = false;
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
    }

    // Jump / special air abilities
    if (this.springLock > 0) this.springLock = Math.max(0, this.springLock - dt);
    if (this.jumpBuf > 0 && this.springLock <= 0) {
      if (this.grounded || this.coyote > 0) {
        // Ground / coyote jump
        this.jumpsLeft = 1;
        this.airJumpsUsed = 0;
        this.pvy = (this.character === "goblin" ? -520 : -500) * this.passives.jumpMul;
        this.coyote = 0;
        this.jumpBuf = 0;
        this.grounded = false;
        this.jetpacking = false;
        gameAudio.play("jump", { volume: 0.55, rate: 1 });
        this.fx.jump(this.px + PLAYER_W * 0.5, this.py + PLAYER_H - 4, this.character === "grok" ? "#00f0ff" : "#39ff9a");
      } else if (this.character === "goblin") {
        // Goblin: continuous mid-air jumps
        this.pvy = -480 * this.passives.jumpMul;
        this.airJumpsUsed += 1;
        this.jumpBuf = 0;
        this.grounded = false;
        this.spawnJumpRing();
        this.fx.jump(this.px + PLAYER_W * 0.5, this.py + PLAYER_H - 6, "#00f0ff");
        gameAudio.play("spring", { volume: 0.5, rate: 1.05 + Math.min(0.4, this.airJumpsUsed * 0.05) });
      } else if (this.jumpsLeft > 0) {
        // Grok: single double-jump, then jetpack at peak
        this.jumpsLeft -= 1;
        this.airJumpsUsed += 1;
        this.pvy = -460;
        this.jumpBuf = 0;
        this.grounded = false;
        this.fx.jump(this.px + PLAYER_W * 0.5, this.py + PLAYER_H - 4, "#00f0ff");
        gameAudio.play("spring", { volume: 0.55, rate: 1.2 });
      }
    }

    // Variable jump cut (first jump only, not jetpack or bounce-pad launches)
    if (!inp.jump && this.pvy < -80 && !this.jetpacking && this.springLock <= 0) {
      this.pvy *= 0.55;
    }

    // Grok jetpack: after double-jump, HOLD jump to climb slowly (not hover)
    if (
      this.character === "grok" &&
      !this.grounded &&
      this.airJumpsUsed >= 1 &&
      inp.jump &&
      this.springLock <= 0
    ) {
      this.jetpacking = true;
      // Continuous gentle lift — rises over time while held
      this.pvy = Math.max(this.pvy - 520 * dt, -165);
      this.fx.jetpack(
        this.px + PLAYER_W * 0.5 + (Math.random() - 0.5) * 16,
        this.py + PLAYER_H - 2,
      );
    } else if (!inp.jump) {
      this.jetpacking = false;
    }

    const gravUp = GRAV_UP;
    const gravDown = GRAV_DOWN;
    if (!this.jetpacking) {
      this.pvy += (this.pvy < 0 ? gravUp : gravDown) * dt;
    } else {
      // light residual gravity so release falls cleanly; lift already applied above
      this.pvy += 20 * dt;
    }
    if (this.pvy > 900) this.pvy = 900;

    if (this.hazard?.active) {
      if (this.hazard.kind === "sandstorm") {
        this.pvx += 40 * dt * (Math.sin(this.time * 3) > 0 ? 1 : -1);
        this.pvx *= 0.992;
      } else if (this.hazard.kind === "quake") {
        this.shake = Math.max(this.shake, 6);
        if (this.grounded && Math.random() < 0.02) this.pvy = -120;
      } else if (this.hazard.kind === "lightning" && !this.shielding) {
        const cx = this.px + PLAYER_W * 0.5;
        for (const bolt of this.lightningBolts) {
          if (bolt.struck && Math.abs(cx - bolt.x) < 30) {
            this.hurt(16, 0);
            break;
          }
        }
      }
    }

    this.px += (this.pvx + this.platformRideVx) * dt;
    this.platformRideVx = 0;
    this.resolveX();

    this.py += this.pvy * dt;
    this.wasGrounded = this.grounded;
    this.grounded = false;
    this.resolveY();
    this.updateSetpieces(dt);

    // Keep player on-screen / in world (special jumps can't leave map)
    this.clampToWorld();

    // Jump rings fade
    for (const r of this.jumpRings) r.life -= dt;
    this.jumpRings = this.jumpRings.filter((r) => r.life > 0);

    // Run dust puffs
    if (this.grounded && Math.abs(this.pvx) > 80 && Math.random() < 0.18) {
      this.fx.runDust(
        this.px + PLAYER_W * 0.5 - this.facing * 10,
        this.py + PLAYER_H - 4,
        this.facing,
      );
    }

    // Phase 4 — afterimages + canyon air motes
    this.updateCinematicFx(dt);

    this.anim += dt;
    if (this.spawnProtect > 0) this.spawnProtect = Math.max(0, this.spawnProtect - dt);
    if (this.hurtPoseT > 0) this.hurtPoseT = Math.max(0, this.hurtPoseT - dt);
    if (this.attackT > 0) this.attackT = Math.max(0, this.attackT - dt);
    if (this.hurtPoseT > 0) {
      this.frame = Math.min(3, Math.floor((1 - this.hurtPoseT / 0.38) * 4));
    } else if (this.attackT > 0) {
      this.frame = Math.min(3, Math.floor((1 - this.attackT / 0.22) * 4));
    } else if (!this.grounded) {
      // Jump sheet: 0 crouch, 1 rise (upright), 2 apex tuck, 3 fall (feet-down).
      // Never hold the old nosedive on the way down.
      if (this.pvy < 0) this.frame = 1;
      else this.frame = 3;
    } else if (Math.abs(this.pvx) > 20) {
      // Run sheet 4 frames
      this.frame = Math.floor(this.anim * 12) % 4;
    } else {
      // Idle sheet 4 frames breathe
      this.frame = Math.floor(this.anim * 4) % 4;
    }

    // Charge weapon accumulates while fire held
    if (this.weapon === "charge") {
      if (inp.fire) {
        this.weaponCharge = Math.min(1, this.weaponCharge + dt * 0.85);
        if (this.weaponCharge >= 1 && this.fireCd <= 0) {
          this.tryFire(true);
        }
      } else if (this.weaponCharge >= 0.35 && this.fireCd <= 0) {
        this.tryFire(true);
      } else if (!inp.fire) {
        this.weaponCharge = Math.max(0, this.weaponCharge - dt * 0.5);
      }
    } else if ((inp.fire || inp.firePressed) && this.fireCd <= 0) {
      this.tryFire(false);
    }

    this.updateBirds(dt);
    this.updateBoss(dt);
    this.updateLasers(dt);
    this.updateParticles(dt);
    this.updateHazards(dt);
    this.checkPickups();
    this.checkGoal();

    if (this.py > this.level.height + 80) {
      if (this.spawnProtect > 0) {
        this.applySpawnPose();
      } else {
        this.killPlayer();
      }
    }

    const lookTx = this.facing * 36 + this.pvx * 0.16;
    const lookTy = Math.max(-18, Math.min(48, this.pvy * 0.07));
    this.lookX += (lookTx - this.lookX) * Math.min(1, 5 * dt);
    this.lookY += (lookTy - this.lookY) * Math.min(1, 4 * dt);
    const targetX = this.px + 20 - VIEW_W * 0.38 + this.lookX;
    const targetY = this.py + 30 - VIEW_H * 0.55 + this.lookY;
    this.camX += (targetX - this.camX) * Math.min(1, 8 * dt);
    this.camY += (targetY - this.camY) * Math.min(1, 6 * dt);
    // Short levels: allow negative camY so the ground pins to the bottom of the tall view
    const maxCamX = Math.max(0, this.level.width - VIEW_W);
    const maxCamY = this.level.height - VIEW_H; // may be negative
    const minCamY = Math.min(0, maxCamY);
    this.camX = Math.max(0, Math.min(maxCamX, this.camX));
    this.camY = Math.max(minCamY, Math.min(maxCamY, this.camY));

    this.emitHud();
  }

  private playerBox(): Rect {
    return { x: this.px + HIT_OX, y: this.py + HIT_OY, w: HIT_W, h: HIT_H };
  }

  /** Record a standing pose on the ledge under a checkpoint flag, not inside the pole. */
  private rememberCheckpoint(cp: Platform) {
    const hintX = cp.x + cp.w * 0.5;
    const hintY = cp.y + cp.h; // pole base ≈ platform top
    const pose = this.safeStandPose(hintX, hintY);
    this.spawnX = pose.x;
    this.spawnY = pose.y;
  }

  private placeChaosGem() {
    const L = this.level;
    if (L.id === 10) {
      const ready = [1, 2, 3, 4, 5, 6, 7, 8, 9].every((id) => hasLevelChaos(this.save, id));
      if (!ready) {
        this.chaosGem = null;
        return;
      }
    }
    const id = L.chaosId ?? seedForLevel(L.id);
    const already = hasLevelChaos(this.save, L.id);
    const baked = L.chaosGem;
    this.chaosGem = {
      x: baked?.x ?? L.width * 0.6,
      y: baked?.y ?? L.height * 0.35,
      w: baked?.w ?? 36,
      h: baked?.h ?? 36,
      collected: already,
      bob: 0,
      id,
    };
  }

  /**
   * Find a landable platform near (worldX, hintY) and return player top-left
   * so feet sit 2px above the top (first frame falls onto it, never through).
   */
  private safeStandPose(worldX: number, hintY: number): { x: number; y: number } {
    let best: Platform | null = null;
    let bestScore = Infinity;
    for (const p of this.platforms) {
      if (p.kind !== "solid" && p.kind !== "oneway" && p.kind !== "moving" && p.kind !== "conveyor") continue;
      if (p.w < 36) continue;
      const contains = worldX >= p.x && worldX <= p.x + p.w;
      const dx = contains ? 0 : worldX < p.x ? p.x - worldX : worldX - (p.x + p.w);
      const dy = Math.abs(p.y - hintY);
      const score = dy + dx * 0.55 + (contains ? 0 : 90);
      if (dy < 200 && score < bestScore) {
        best = p;
        bestScore = score;
      }
    }
    if (!best) {
      return { x: worldX - PLAYER_W * 0.5, y: hintY - PLAYER_H - 8 };
    }
    const pad = 8;
    const minX = best.x - HIT_OX + pad;
    const maxX = best.x + best.w - HIT_OX - HIT_W - pad;
    const x =
      maxX >= minX
        ? Math.max(minX, Math.min(maxX, worldX - PLAYER_W * 0.5))
        : best.x + (best.w - PLAYER_W) * 0.5;
    return { x, y: best.y - PLAYER_H - 2 };
  }

  private applySpawnPose() {
    const pose = this.safeStandPose(this.spawnX + PLAYER_W * 0.5, this.spawnY + PLAYER_H);
    this.px = pose.x;
    this.py = pose.y;
    this.pvx = 0;
    this.pvy = 140;
    this.invuln = Math.max(this.invuln, 1.15);
    this.spawnProtect = 0.7;
    this.grounded = false;
    this.airJumpsUsed = 0;
    this.jetpacking = false;
    this.hurtPoseT = 0;
    this.springLock = 0;
  }

  private resolveX() {
    const box = this.playerBox();
    for (const p of this.platforms) {
      if (p.gone) continue;
      if (p.job === "shoot") continue;
      if (p.kind === "hazard" || p.kind === "checkpoint" || p.kind === "goal") continue;
      if (p.kind === "oneway" || p.kind === "spring" || p.kind === "conveyor") continue;
      if (p.h >= 180) continue; // sealed floor is a walk plane, not a wall
      if (!aabb(box, p)) continue;
      if (this.pvx > 0) {
        this.px = p.x - (HIT_OX + HIT_W);
        this.pvx = 0;
      } else if (this.pvx < 0) {
        this.px = p.x + p.w - HIT_OX;
        this.pvx = 0;
      }
      box.x = this.px + HIT_OX;
    }
    this.px = Math.max(-20, Math.min(this.level.width - PLAYER_W + 10, this.px));
  }

  private resolveY() {
    const box = this.playerBox();
    for (const p of this.platforms) {
      if (p.gone) continue;
      if (p.job === "shoot") continue;
      if (p.kind === "checkpoint" || p.kind === "goal") continue;

      if (p.kind === "hazard") {
        if (aabb(box, p) && !this.shielding) {
          if (this.invuln <= 0) this.fx.hazard(box.x + box.w * 0.5, box.y + box.h * 0.6);
          this.hurt(25, -Math.sign(this.facing || 1) * 180);
        }
        continue;
      }

      if (p.kind === "oneway" || p.kind === "spring" || p.kind === "moving" || p.kind === "solid" || p.kind === "conveyor") {
        const solid = p.kind === "solid" || p.kind === "moving" || p.kind === "conveyor";

        // Horizontal overlap required (with a tiny margin)
        if (box.x + box.w <= p.x + 1 || box.x >= p.x + p.w - 1) continue;

        const feet = box.y + box.h;
        const prevFeet = feet - this.pvy * FIXED_DT;

        if (!solid) {
          // One-way / spring: only from above while falling
          if (this.pvy < 0 || prevFeet > p.y + 8) continue;
        }

        // Ground contact: feet at or slightly above platform, or just crossed it
        const onTop =
          this.pvy >= 0 &&
          feet >= p.y - GROUND_SKIN &&
          prevFeet <= p.y + 12 &&
          box.y < p.y; // not fully below platform

        if (onTop || (solid && aabb(box, p) && this.pvy >= 0 && prevFeet <= p.y + 12 && box.y < p.y)) {
          const fallSpeed = this.pvy;
          // Snap sprite feet flush to platform top (hitbox bottom matches)
          this.py = p.y - PLAYER_H;
          this.pvy = 0;
          this.grounded = true;
          box.y = this.py + HIT_OY;

          // Landing dust — only when arriving from air
          if (!this.wasGrounded) {
            this.fx.land(this.px + PLAYER_W * 0.5, p.y, fallSpeed);
            this.landSquash = Math.min(0.38, 0.08 + fallSpeed / 1400);
            this.landRing = Math.min(1, fallSpeed / 520);
            if (fallSpeed > 420) this.shake = Math.max(this.shake, 3 + fallSpeed / 280);
          }

          if (p.kind === "spring") {
            this.pvy = SPRING_VY;
            this.grounded = false;
            this.jumpsLeft = 1;
            this.airJumpsUsed = 0;
            this.jetpacking = false;
            this.coyote = 0;
            this.jumpBuf = 0;
            this.springLock = 0.65;
            gameAudio.play("spring", { volume: 0.85, rate: 0.92 });
            this.fx.spring(this.px + PLAYER_W * 0.5, p.y);
          }
          if (p.kind === "moving" && p.originX != null && p.range != null && p.vx != null) {
            const phase = p.phase ?? 0;
            this.platformRideVx = Math.cos(phase * (p.vx / 40)) * p.range * (p.vx / 40);
          }
          if (p.kind === "conveyor") {
            this.platformRideVx = p.vx ?? 80;
          }
          if (p.job === "crumble") {
            p.timer = (p.timer ?? 0) + FIXED_DT;
            if (p.timer > (p.crumble ?? 0.5)) p.gone = true;
          }
        } else if (solid && aabb(box, p) && this.pvy < 0 && box.y >= p.y + p.h - 16) {
          this.py = p.y + p.h - HIT_OY;
          this.pvy = 0;
        }
      }
    }
  }

  /** Soft aim at the nearest bird, lofted so overhead flocks are hittable. */
  private aimShot(speed: number): { vx: number; vy: number } {
    const ox = this.px + PLAYER_W * 0.5;
    const oy = this.py + PLAYER_H * 0.32;
    let bestDx = this.facing * 200;
    let bestDy = -90;
    let best = 1e12;
    for (const p of this.platforms) {
      if (p.gone || (p.job !== "bridge" && p.job !== "cheer")) continue;
      const dx = p.x + p.w * 0.5 - ox;
      const dy = p.y + p.h * 0.4 - oy;
      if (dx * this.facing < -24) continue;
      const d = dx * dx + dy * dy;
      if (d < 320 * 320 && d < best) {
        best = d;
        bestDx = dx;
        bestDy = dy;
      }
    }
    for (const b of this.birds) {
      if (b.dead) continue;
      const dx = b.x + b.w * 0.5 - ox;
      const dy = b.y + b.h * 0.5 - oy;
      const facingPenalty = dx * this.facing < -30 ? 180 : 0;
      const d = dx * dx + dy * dy + facingPenalty * facingPenalty;
      if (d < best) {
        best = d;
        bestDx = dx;
        bestDy = dy;
      }
    }
    if (this.level.horde && !this.bossGoalOpen && this.birds.length > 0 && this.birds.every((b) => b.dead)) {
      this.bossGoalOpen = true;
      for (const pl of this.platforms) {
        if (pl.kind === "goal") pl.active = true;
      }
      const partBeat = cagePartBeat(this.level.operation ?? 1);
      this.radio = formatRadio(partBeat ?? cageCheer());
      gameAudio.play("goal", { volume: 0.8 });
    }
    if (this.boss && !this.boss.dead) {
      const dx = this.boss.x + this.boss.w * 0.5 - ox;
      const dy = this.boss.y + this.boss.h * 0.35 - oy;
      const d = dx * dx + dy * dy;
      if (d < best) {
        bestDx = dx;
        bestDy = dy;
      }
    }
    const len = Math.hypot(bestDx, bestDy) || 1;
    let vx = (bestDx / len) * speed;
    let vy = (bestDy / len) * speed;
    if (vx * this.facing < speed * 0.2) vx = this.facing * speed * 0.55;
    // Always keep a little loft so shots aren't glued to the horizon
    if (vy > -40) vy = Math.min(vy, -55);
    return { vx, vy };
  }

  private cycleWeapon(dir: number) {
    const i = WEAPON_ORDER.indexOf(this.weapon);
    this.weapon = WEAPON_ORDER[(i + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length]!;
    gameAudio.play("select", { volume: 0.5 });
    this.emitHud();
  }

  private clampToWorld() {
    const minX = -4;
    const maxX = this.level.width - 48;
    const minY = -PLAYER_H * 6; // bounce pads may arc above the stage
    if (this.px < minX) {
      this.px = minX;
      this.pvx = Math.max(0, this.pvx);
    }
    if (this.px > maxX) {
      this.px = maxX;
      this.pvx = Math.min(0, this.pvx);
    }
    if (this.py < minY) {
      this.py = minY;
      if (this.pvy < 0) this.pvy = 0;
      // end jetpack / multi-jump climb at ceiling
      this.jetpacking = false;
    }
  }

  private spawnJumpRing() {
    this.jumpRings.push({
      x: this.px + 26,
      y: this.py + 56,
      life: 0.4,
      max: 0.4,
    });
  }

  private updateShield(dt: number, hold: boolean) {
    const want = hold && this.shield > 0.02;
    if (want) {
      this.shielding = true;
      this.shield = Math.max(0, this.shield - dt);
      this.shieldRegenAcc = 0;
      if (this.shield <= 0) {
        this.shield = 0;
        this.shielding = false;
      }
    } else {
      this.shielding = false;
      // 20% of max (1s) every 2s → 0.5 shield-seconds per real second
      if (this.shield < this.maxShield) {
        this.shieldRegenAcc += dt;
        while (this.shieldRegenAcc >= 2) {
          this.shieldRegenAcc -= 2;
          this.shield = Math.min(this.maxShield, this.shield + this.maxShield * 0.2);
        }
      } else {
        this.shieldRegenAcc = 0;
      }
    }
  }

  private tryFire(fromCharge = false) {
    const w = WEAPONS[this.weapon];
    if (this.weapon === "charge" && !fromCharge) return;
    const chargeMul = this.weapon === "charge" ? 0.5 + this.weaponCharge * 1.2 : 1;
    const cost = w.cost;
    if (this.ammo < cost || this.stamina < w.stamina * (this.weapon === "charge" ? 0.6 + this.weaponCharge * 0.6 : 1)) {
      gameAudio.play("hurt", { volume: 0.25, rate: 0.7 });
      return;
    }
    this.ammo -= cost;
    this.stamina -= w.stamina * (this.weapon === "charge" ? 0.6 + this.weaponCharge * 0.6 : 1);
    const cdScale = this.passives.fireMul * (this.rapidT > 0 ? 0.5 : 1);
    this.fireCd = (this.weapon === "charge" ? 0.45 : w.cooldown) * cdScale;
    const dmgMul = this.passives.dmgMul * (this.overloadT > 0 ? 2 : 1);
    const forceHoming = this.homingBurst > 0 || this.weapon === "homing";
    const pierce = Math.random() < this.passives.pierce;
    this.attackT = this.weapon === "nova" || this.weapon === "charge" ? 0.28 : 0.2;
    gameAudio.play("shoot", {
      volume: 0.55,
      rate: this.weapon === "beam" ? 0.8 : this.weapon === "nova" ? 0.65 : 1.1,
    });

    const ox = this.px + (this.facing > 0 ? PLAYER_W - 10 : 4);
    const oy = this.py + PLAYER_H * 0.42;
    const dir = this.facing;
    const aim = this.aimShot(w.speed);

    if (this.weapon === "spread") {
      for (let i = -1; i <= 1; i++) {
        this.lasers.push({
          x: ox, y: oy + i * 6, w: 18, h: 6,
          vx: aim.vx, vy: aim.vy + i * 95, life: 0.7, dmg: w.dmg * dmgMul,
          color: "#39ff9a", fromPlayer: true, homing: forceHoming, pierce,
        });
      }
    } else if (this.weapon === "beam") {
      this.beamActive = 0.22;
      this.lasers.push({
        x: ox, y: oy - 2, w: 90, h: 10,
        vx: aim.vx * 1.15, vy: aim.vy, life: 0.22, dmg: w.dmg * dmgMul,
        color: "#00f0ff", fromPlayer: true, homing: forceHoming, pierce,
      });
    } else if (this.weapon === "homing") {
      this.lasers.push({
        x: ox, y: oy, w: 16, h: 16,
        vx: aim.vx, vy: aim.vy - 30, life: 1.6, dmg: w.dmg * dmgMul,
        color: "#c77dff", fromPlayer: true, homing: true, pierce,
      });
    } else if (this.weapon === "charge") {
      const p = this.weaponCharge;
      this.lasers.push({
        x: ox, y: oy - 4, w: 28 + p * 40, h: 10 + p * 8,
        vx: aim.vx * (0.85 + p * 0.3), vy: aim.vy,
        life: 0.35 + p * 0.2, dmg: Math.ceil(w.dmg * chargeMul * dmgMul),
        color: p > 0.85 ? "#ffffff" : "#ffcc33", fromPlayer: true, homing: forceHoming, pierce,
      });
      this.fx.muzzle(ox, oy, p > 0.85 ? "#ffffff" : "#ffcc33", dir);
      this.fx.sparks(ox, oy, "#ffcc33", 6 + Math.floor(p * 8), dir > 0 ? 0 : Math.PI, 0.7);
      this.muzzleFlash = 1.2;
      this.muzzleColor = p > 0.85 ? "#ffffff" : "#ffcc33";
      this.weaponCharge = 0;
    } else if (this.weapon === "nova") {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.lasers.push({
          x: this.px + 20, y: this.py + 28, w: 14, h: 14,
          vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed,
          life: 0.45, dmg: w.dmg * dmgMul, color: "#ff2bd6", fromPlayer: true, nova: true, pierce,
        });
      }
      this.fx.muzzle(this.px + 26, this.py + 30, "#ff2bd6", dir);
      this.fx.orbs(this.px + 26, this.py + 30, "#ff2bd6", 8, 140);
      this.muzzleFlash = 1.05;
      this.muzzleColor = "#ff2bd6";
    } else if (this.weapon === "ricochet") {
      this.lasers.push({
        x: ox, y: oy, w: 14, h: 14,
        vx: aim.vx, vy: aim.vy - 80, life: 1.8, dmg: w.dmg * dmgMul,
        color: "#00f0ff", fromPlayer: true, bounces: 3, homing: forceHoming, pierce,
      });
    } else {
      this.lasers.push({
        x: ox, y: oy, w: 22, h: 8,
        vx: aim.vx, vy: aim.vy, life: 0.85, dmg: w.dmg * dmgMul,
        color: "#ff2bd6", fromPlayer: true, homing: forceHoming, pierce,
      });
    }
    if (this.weapon !== "charge" && this.weapon !== "nova") {
      const muzzleColor =
        this.weapon === "beam"
          ? "#00f0ff"
          : this.weapon === "spread"
            ? "#39ff9a"
            : this.weapon === "homing"
              ? "#c77dff"
              : this.weapon === "ricochet"
                ? "#00f0ff"
                : "#ff2bd6";
      this.fx.muzzle(ox, oy, muzzleColor, dir);
      this.muzzleFlash = 1;
      this.muzzleColor = muzzleColor;
    }
    this.emitHud();
  }

  private updateBirds(dt: number) {
    for (const b of this.birds) {
      if (b.dead) continue;
      if (b.hitFlash && b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt);
      if (b.windup && b.windup > 0) b.windup = Math.max(0, b.windup - dt);

      b.t += dt;
      // Faster flap when diving / winding up
      const flapRate = (b.windup && b.windup > 0) || b.vy > 40 ? 14 : 8;
      b.frame = Math.floor(b.t * flapRate) % 4;
      // Squash-stretch: compressed on upstroke, stretched on downstroke
      b.flap = 1 + Math.sin(b.t * flapRate * Math.PI * 0.5) * 0.12;

      b.x += b.vx * dt;
      // Idle hover — tighter when far, agitated near player
      const near = Math.abs(b.x - this.px) < 260 && Math.abs(b.y - this.py) < 200;
      const hoverAmp = near ? 42 : 28;
      b.y += Math.sin(b.t * 3.2 + b.x * 0.01) * hoverAmp * dt;
      if (b.x < 40 || b.x > this.level.width - 80) b.vx *= -1;

      // Telegraph dive when near player
      if (near && (!b.windup || b.windup <= 0) && Math.random() < 0.012) {
        b.windup = 0.45;
      }
      if (b.windup && b.windup > 0 && b.windup < 0.12 && Math.abs(b.vy) < 20) {
        // Commit dive toward player
        b.vy = 160 + Math.random() * 40;
        b.vx += Math.sign(this.px - b.x) * 30;
      }
      b.y += b.vy * dt;
      b.vy *= 0.96;

      if (this.zapperT > 0 && aabb(this.playerBox(), b)) {
        b.hp -= 18 * dt;
        b.hitFlash = 0.15;
        if (b.hp <= 0) {
          b.dead = true;
          this.score += 150;
          this.fx.birdDeath(b.x + 24, b.y + 18);
        }
      } else if (this.invuln <= 0 && !this.shielding && aabb(this.playerBox(), b)) {
        this.hurt(18, -Math.sign(b.vx || 1) * 200);
      }

      // Shot with brief windup glow
      if (near && Math.random() < 0.006) {
        if (!b.windup || b.windup <= 0) b.windup = 0.28;
      }
      if (b.windup && b.windup > 0 && b.windup < 0.08 && Math.random() < 0.35) {
        this.lasers.push({
          x: b.x + 10,
          y: b.y + 20,
          w: 12,
          h: 12,
          vx: Math.sign(this.px - b.x) * 200,
          vy: 60 + Math.random() * 40,
          life: 2,
          dmg: 10,
          color: "#ff4466",
          fromPlayer: false,
        });
        // Muzzle puff
        this.fx.muzzle(b.x + b.w * 0.5, b.y + b.h * 0.5, "#ff4466", Math.sign(this.px - b.x) || 1);
      }
    }
  }

  private updateLasers(dt: number) {
    for (const l of this.lasers) {
      // Homing toward nearest living bird or boss
      if (l.homing && l.fromPlayer) {
        let tx = l.x + l.vx;
        let ty = l.y + l.vy;
        let best = 1e12;
        for (const b of this.birds) {
          if (b.dead) continue;
          const d = (b.x - l.x) ** 2 + (b.y - l.y) ** 2;
          if (d < best) {
            best = d;
            tx = b.x + 24;
            ty = b.y + 18;
          }
        }
        if (this.boss && !this.boss.dead) {
          const d = (this.boss.x - l.x) ** 2 + (this.boss.y - l.y) ** 2;
          if (d < best) {
            tx = this.boss.x + this.boss.w / 2;
            ty = this.boss.y + this.boss.h / 2;
          }
        }
        const ang = Math.atan2(ty - l.y, tx - l.x);
        const spd = Math.hypot(l.vx, l.vy) || 340;
        l.vx = l.vx * 0.88 + Math.cos(ang) * spd * 0.12;
        l.vy = l.vy * 0.88 + Math.sin(ang) * spd * 0.12;
      }

      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.life -= dt;

      this.fx.shotTrail(l.x + l.w * 0.5, l.y + l.h * 0.5, l.vx, l.vy, l.color, !!l.homing);

      // Ricochet off world bounds / floor-ish
      if (l.bounces != null && l.bounces > 0) {
        if (l.x < 0 || l.x > this.level.width) {
          l.vx *= -1;
          l.bounces -= 1;
          l.x = Math.max(0, Math.min(this.level.width - l.w, l.x));
          this.fx.hit(l.x, l.y, l.color);
        }
        if (l.y < 0 || l.y > this.level.height - 40) {
          l.vy *= -1;
          l.bounces -= 1;
          l.y = Math.max(0, Math.min(this.level.height - 40, l.y));
          this.fx.hit(l.x, l.y, l.color);
        }
      }

      if (l.fromPlayer) {
        for (const b of this.birds) {
          if (b.dead) continue;
          if (aabb(l, b)) {
            b.hp -= l.dmg;
            b.hitFlash = 0.28;
            if (!l.nova && !l.pierce) l.life = 0;
            this.fx.hit(b.x + 20, b.y + 16, l.color);
            gameAudio.play("hit", { volume: 0.45, rate: 1.2 });
            if (b.hp <= 0) {
              b.dead = true;
              b.hitFlash = 0.15;
              this.score += 150;
              this.fx.birdDeath(b.x + 24, b.y + 18);
              gameAudio.play("coin", { volume: 0.35, rate: 0.8 });
            }
          }
        }
        if (this.boss && !this.boss.dead && aabb(l, this.boss)) {
          this.damageBoss(l.dmg);
          if (!l.nova && !l.pierce) l.life = 0;
        }
        for (const p of this.platforms) {
          if (p.gone || (p.job !== "bridge" && p.job !== "cheer")) continue;
          if (!aabb(l, p)) continue;
          if (!l.nova && !l.pierce) l.life = 0;
          this.breakProp(p);
          this.fx.hit(p.x + p.w * 0.5, p.y + 12, l.color);
        }
      } else if (aabb(l, this.playerBox())) {
        if (this.shielding) {
          l.life = 0;
          this.fx.hit(l.x, l.y, "#00f0ff");
        } else if (this.invuln <= 0) {
          this.hurt(l.dmg, l.vx * 0.3);
          l.life = 0;
        }
      }
    }
    this.lasers = this.lasers.filter((l) => l.life > 0);
  }

  private breakProp(p: Platform) {
    if (p.job === "cheer") {
      p.gone = true;
      this.radio = formatRadio(cageCheer());
      gameAudio.play("goal", { volume: 0.55, rate: 1.2 });
      return;
    }
    if (p.job === "bridge") {
      p.job = "bridge-go";
      p.kind = "conveyor";
      p.vx = 980;
      p.timer = 0;
      gameAudio.play("hit", { volume: 0.6, rate: 0.7 });
    }
  }

  private updateSetpieces(dt: number) {
    for (const p of this.platforms) {
      if (p.job !== "bridge-go" || p.gone) continue;
      p.timer = (p.timer ?? 0) + dt;
      if ((p.timer ?? 0) > 1.05) p.gone = true;
    }
  }

  private damageBoss(dmg: number) {
    if (!this.boss || this.boss.dead) return;
    this.boss.hp -= dmg;
    this.boss.flash = 0.22;
    this.shake = Math.max(this.shake, 4);
    this.chromPulse = Math.max(this.chromPulse, 0.12);
    const bx = this.boss.x + this.boss.w * 0.5;
    const by = this.boss.y + this.boss.h * 0.4;
    this.fx.bossHit(bx, by, this.boss.phase);
    gameAudio.play("hit", { volume: 0.55, rate: 0.75 });
    const pct = this.boss.hp / this.boss.maxHp;
    if (pct <= 0.33) this.boss.phase = 3;
    else if (pct <= 0.66) this.boss.phase = 2;
    if (this.boss.phase !== this.lastBossPhase && this.boss.hp > 0) {
      this.fx.bossPhase(bx, by, this.boss.phase as 2 | 3);
      this.shake = Math.max(this.shake, 10);
      this.lastBossPhase = this.boss.phase;
    }
    if (this.boss.hp <= 0) {
      this.boss.hp = 0;
      this.boss.dead = true;
      this.score += 2500;
      this.bossGoalOpen = true;
      for (const pl of this.platforms) {
        if (pl.kind === "goal") pl.active = true;
      }
      this.fx.bossDeath(this.boss.x + this.boss.w * 0.5, this.boss.y + this.boss.h * 0.5);
      grantLevelChaos(this.save, this.level.id);
      this.lastChaos = seedForLevel(this.level.id);
      this.radio = formatRadio(chaosBeat(this.lastChaos, !!this.level.epic));
      gameAudio.play("goal", { volume: 0.8 });
      gameAudio.playMusic("battle");
    }
    this.emitHud();
  }

  private updateBoss(dt: number) {
    const b = this.boss;
    if (!b || b.dead) return;
    b.t += dt;
    if (b.flash > 0) b.flash -= dt;
    b.attackCd -= dt;

    // Hover figure-eight / sweep
    const cx = this.level.width * 0.5;
    const baseY = 100 + (b.phase - 1) * 20;
    if (b.phase === 1) {
      b.x += b.vx * dt;
      if (b.x < 80 || b.x > this.level.width - 180) b.vx *= -1;
      b.y = baseY + Math.sin(b.t * 2) * 30;
    } else if (b.phase === 2) {
      b.x = cx - 50 + Math.sin(b.t * 1.4) * 220;
      b.y = baseY + Math.cos(b.t * 2.2) * 50;
      // summon mafia bird occasionally
      if (!this.level.horde && Math.random() < 0.008 && this.birds.filter((x) => !x.dead).length < 5) {
        this.birds.push({
          x: b.x,
          y: b.y + 40,
          w: Math.round(48 * BIRD_SCALE),
          h: Math.round(36 * BIRD_SCALE),
          vx: (Math.random() > 0.5 ? 1 : -1) * (70 + Math.random() * 40),
          vy: 0,
          hp: 3,
          frame: 0,
          t: 0,
          dead: false,
        });
      }
    } else {
      // Phase 3: dive at player
      const tx = this.px - 20;
      const ty = this.py - 20;
      b.vx += Math.sign(tx - b.x) * 200 * dt;
      b.vy += Math.sign(ty - b.y) * 160 * dt;
      b.vx = Math.max(-220, Math.min(220, b.vx));
      b.vy = Math.max(-180, Math.min(180, b.vy));
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.x = Math.max(40, Math.min(this.level.width - b.w - 40, b.x));
      b.y = Math.max(40, Math.min(this.level.height - 200, b.y));
    }

    // Attacks
    if (b.attackCd <= 0) {
      const rate = b.phase === 1 ? 1.4 : b.phase === 2 ? 1.0 : 0.7;
      b.attackCd = rate;
      const shots = b.phase === 1 ? 3 : b.phase === 2 ? 5 : 7;
      for (let i = 0; i < shots; i++) {
        const ang = Math.atan2(this.py - b.y, this.px - b.x) + (i - (shots - 1) / 2) * 0.18;
        const spd = 160 + b.phase * 40;
        this.lasers.push({
          x: b.x + b.w / 2,
          y: b.y + b.h / 2,
          w: 14,
          h: 14,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 2.5,
          dmg: 12 + b.phase * 2,
          color: b.phase === 3 ? "#ffcc33" : "#ff4466",
          fromPlayer: false,
        });
      }
      if (b.phase >= 2 && Math.random() < 0.4) {
        // meteor marker
        this.lasers.push({
          x: this.px + (Math.random() - 0.5) * 80,
          y: -20,
          w: 20,
          h: 28,
          vx: (Math.random() - 0.5) * 40,
          vy: 320,
          life: 2,
          dmg: 20,
          color: "#ff8844",
          fromPlayer: false,
        });
      }
      gameAudio.play("shoot", { volume: 0.4, rate: 0.55 });
    }

    // Contact damage
    if (!this.shielding && this.invuln <= 0 && aabb(this.playerBox(), b)) {
      this.hurt(22, -Math.sign(this.facing || 1) * 240);
    }
  }

  private updateParticles(dt: number) {
    this.fx.update(dt);
  }

  private tickLightning(dt: number) {
    for (const bolt of this.lightningBolts) {
      bolt.warn -= dt;
      if (!bolt.struck && bolt.warn <= 0) {
        bolt.struck = true;
        bolt.warn = 0.18;
        this.shake = Math.max(this.shake, 8);
        this.chromPulse = Math.max(this.chromPulse, 0.35);
        this.fx.sparks(bolt.x, this.camY + 80, "#7ef9ff", 12);
        gameAudio.play("hit", { volume: 0.35, rate: 1.6 });
      }
    }
    this.lightningBolts = this.lightningBolts.filter((b) => !(b.struck && b.warn <= 0));
    const live = this.lightningBolts.filter((b) => !b.struck).length;
    if (live < 2 && Math.random() < 0.045) {
      const near = this.px + PLAYER_W * 0.5 + (Math.random() - 0.35) * 280;
      this.lightningBolts.push({
        x: Math.max(this.camX + 40, Math.min(this.camX + VIEW_W - 40, near)),
        warn: 0.55,
        struck: false,
      });
    }
  }

  private updateHazards(dt: number) {
    this.hazardTimer -= dt;
    if (this.hazard?.active) {
      this.hazard.t += dt;
      if (this.hazard.kind === "meteor" && Math.random() < 0.08) {
        const x = this.camX + Math.random() * VIEW_W;
        this.lasers.push({
          x,
          y: this.camY - 20,
          w: 16,
          h: 28,
          vx: -40,
          vy: 420,
          life: 2.5,
          dmg: 22,
          color: "#ffcc33",
          fromPlayer: false,
        });
      }
      if (this.hazard.kind === "lightning") {
        this.tickLightning(dt);
      }
      if (this.hazard.t >= this.hazard.duration) {
        this.hazard.active = false;
        this.hazard = null;
        this.lightningBolts = [];
        gameAudio.playMusic("play");
      }
    } else if (this.hazardTimer <= 0) {
      const kinds: HazardEvent["kind"][] = ["sandstorm", "quake", "meteor", "lightning"];
      const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
      this.hazard = { kind, t: 0, duration: kind === "quake" ? 4 : kind === "lightning" ? 6 : 7, active: true };
      this.hazardTimer = this.level.disasterInterval;
      this.shake = 10;
      this.lightningBolts = [];
      const hx = this.px + PLAYER_W * 0.5;
      const hy = this.py + PLAYER_H * 0.5;
      if (kind === "quake") this.fx.debris(hx, this.py + PLAYER_H, "#c4a882", 14);
      else if (kind === "meteor") this.fx.sparks(hx, hy, "#ff8844", 16);
      else if (kind === "sandstorm") this.fx.smoke(hx, hy, "#d4b48a", 10);
      else this.fx.sparks(hx, hy, "#7ef9ff", 18);
      gameAudio.playMusic("battle");
      gameAudio.play("engine", { volume: 0.35, rate: kind === "lightning" ? 1.4 : 0.9 });
    }
  }

  private checkPickups() {
    const box = this.playerBox();
    const mag = this.passives.magnet;
    if (mag > 0) {
      const cx = this.px + PLAYER_W / 2;
      const cy = this.py + PLAYER_H / 2;
      const pull = (x: number, y: number) => {
        const dx = cx - x;
        const dy = cy - y;
        const d = Math.hypot(dx, dy);
        if (d > 1 && d < mag) return { x: x + (dx / d) * 180 * FIXED_DT, y: y + (dy / d) * 180 * FIXED_DT };
        return { x, y };
      };
      for (const c of this.coins) {
        if (c.collected) continue;
        const p = pull(c.x, c.y);
        c.x = p.x;
        c.y = p.y;
      }
      for (const a of this.ammoPickups) {
        if (a.collected) continue;
        const p = pull(a.x, a.y);
        a.x = p.x;
        a.y = p.y;
      }
      for (const s of this.powerSeeds) {
        if (s.collected) continue;
        const p = pull(s.x, s.y);
        s.x = p.x;
        s.y = p.y;
      }
      if (this.chaosGem && !this.chaosGem.collected) {
        const p = pull(this.chaosGem.x, this.chaosGem.y);
        this.chaosGem.x = p.x;
        this.chaosGem.y = p.y;
      }
    }
    for (const c of this.coins) {
      if (c.collected) continue;
      c.bob += FIXED_DT;
      const r = { x: c.x, y: c.y + Math.sin(c.bob * 4) * 5, w: c.w, h: c.h };
      if (aabb(box, r)) {
        c.collected = true;
        this.coinCount += 1;
        this.score += 50;
        gameAudio.play("coin", { volume: 0.5, rate: 1 + Math.random() * 0.15 });
        this.fx.collect(c.x + 10, c.y + 10, "#ffcc33");
        this.powerPulse = Math.max(this.powerPulse, 0.2);
      }
    }
    for (const a of this.ammoPickups) {
      if (a.collected) continue;
      if (aabb(box, a)) {
        a.collected = true;
        this.ammo = Math.min(this.maxAmmo, this.ammo + a.amount);
        gameAudio.play("confirm", { volume: 0.5 });
        this.fx.collect(a.x + 10, a.y + 10, "#00f0ff", true);
        this.powerPulse = 0.35;
        this.chromPulse = Math.max(this.chromPulse, 0.18);
      }
    }
    for (const s of this.powerSeeds) {
      if (s.collected) continue;
      s.bob += FIXED_DT;
      const r = { x: s.x, y: s.y + Math.sin(s.bob * 5) * 6, w: s.w, h: s.h };
      if (aabb(box, r)) {
        s.collected = true;
        this.score += 75;
        this.powerPulse = 0.55;
        this.chromPulse = 0.4;
        this.vignetteBoost = 0.3;
        if (s.kind === "slowmo") {
          this.slowMo = 4.5;
          gameAudio.play("checkpoint", { volume: 0.65, rate: 0.7 });
          this.fx.collect(s.x + 12, s.y + 12, "#c77dff", true);
        } else if (s.kind === "health") {
          this.health = this.maxHealth;
          this.fx.collect(s.x + 12, s.y + 12, "#ff4466", true);
          gameAudio.play("confirm", { volume: 0.6 });
        } else if (s.kind === "stamina") {
          this.stamina = this.maxStamina;
          this.fx.collect(s.x + 12, s.y + 12, "#39ff9a", true);
          gameAudio.play("confirm", { volume: 0.6 });
        } else if (s.kind === "ammo") {
          this.ammo = this.maxAmmo;
          this.fx.collect(s.x + 12, s.y + 12, "#00f0ff", true);
          gameAudio.play("confirm", { volume: 0.6 });
        } else if (s.kind === "shield") {
          this.shield = this.maxShield;
          this.health = Math.min(this.maxHealth, this.health + 15);
          this.fx.collect(s.x + 12, s.y + 12, "#7ef9ff", true);
          gameAudio.play("confirm", { volume: 0.6 });
        } else if (s.kind === "homing") {
          this.homingBurst = 8;
          this.weapon = "homing";
          this.fx.collect(s.x + 12, s.y + 12, "#c77dff", true);
          gameAudio.play("goal", { volume: 0.45, rate: 1.3 });
        } else if (s.kind === "overload") {
          this.overloadT = 8;
          this.chaosEdge = 6;
          this.fx.collect(s.x + 12, s.y + 12, "#ff9f43", true);
          gameAudio.play("goal", { volume: 0.45, rate: 1.3 });
        } else if (s.kind === "rapid") {
          this.rapidT = 8;
          this.fx.collect(s.x + 12, s.y + 12, "#ffcc33", true);
          gameAudio.play("confirm", { volume: 0.6 });
        } else if (s.kind === "zapper") {
          this.zapperT = 8;
          this.shield = this.maxShield;
          this.fx.collect(s.x + 12, s.y + 12, "#39ff9a", true);
          gameAudio.play("checkpoint", { volume: 0.6 });
        }
        const op = opOfLevel(this.level.id);
        unlockPower(this.save, op.id, s.kind);
        this.radio = formatRadio(collectBeat(s.kind));
      }
    }
    if (this.chaosGem && !this.chaosGem.collected) {
      this.chaosGem.bob += FIXED_DT;
      const g = this.chaosGem;
      const r = { x: g.x, y: g.y + Math.sin(g.bob * 5) * 6, w: g.w, h: g.h };
      if (aabb(box, r)) {
        g.collected = true;
        grantLevelChaos(this.save, this.level.id);
        this.lastChaos = g.id;
        this.score += 250;
        this.powerPulse = 0.7;
        this.chromPulse = 0.5;
        this.vignetteBoost = 0.35;
        this.chaosEdge = 5;
        this.radio = formatRadio(chaosBeat(g.id, !!this.level.epic));
        this.fx.collect(g.x + 18, g.y + 18, CHAOS_META[g.id].color, true);
        gameAudio.play("goal", { volume: 0.7, rate: 1.15 });
      }
    }
    for (const p of this.platforms) {
      if (p.kind === "checkpoint" && !p.active && aabb(box, p)) {
        p.active = true;
        this.checkpointId = p.id ?? "cp";
        this.rememberCheckpoint(p);
        this.score += 100;
        this.health = Math.min(this.maxHealth, this.health + 20);
        gameAudio.play("checkpoint", { volume: 0.7 });
        this.fx.collect(p.x + 10, p.y + 30, "#39ff9a", true);
        this.powerPulse = 0.4;
        this.chromPulse = Math.max(this.chromPulse, 0.2);
      }
    }
  }

  private checkGoal() {
    const box = this.playerBox();
    for (const p of this.platforms) {
      if (p.kind === "goal" && this.bossGoalOpen && (p.active !== false) && aabb(box, p)) {
        this.won = true;
        this.pvx = 0;
        this.pvy = 0;
        input.clear();
        this.score += 1000 + this.coinCount * 25 + this.health * 2;
        markCleared(this.save, this.level.id);
        gameAudio.play("goal", { volume: 0.8 });
        gameAudio.playMusic("win");
        this.cbs.onScreen("win");
        this.emitHud();
      }
    }
  }

  private hurt(amount: number, knockX: number) {
    if (this.invuln > 0 || this.dead || this.won) return;
    this.health -= amount * this.passives.dmgTaken;
    this.invuln = 0.9;
    this.hurtFlash = 0.2;
    this.hurtPoseT = 0.38;
    this.chromPulse = 0.35;
    this.vignetteBoost = 0.45;
    this.pvx = knockX;
    this.pvy = -180;
    this.shake = 5;
    gameAudio.play("hurt", { volume: 0.6 });
    this.fx.hazard(this.px + PLAYER_W * 0.5, this.py + PLAYER_H * 0.45);
    if (this.health <= 0) {
      this.health = 0;
      this.killPlayer();
    }
    this.emitHud();
  }

  private killPlayer() {
    if (this.dead) return;
    this.dead = true;
    this.lives -= 1;
    this.pvx = 0;
    this.pvy = 0;
    input.clear();
    this.fx.playerDeath(this.px + PLAYER_W * 0.5, this.py + PLAYER_H * 0.45);
    gameAudio.play("hurt", { volume: 0.8, rate: 0.6 });
    this.cbs.onScreen("dead");
    this.emitHud();
  }

  private drawLaser(ctx: CanvasRenderingContext2D, l: Laser) {
    const cx = l.x + l.w * 0.5;
    const cy = l.y + l.h * 0.5;
    const ang = Math.atan2(l.vy, l.vx);
    const isBeam = l.w >= 50;
    const trailLen = l.homing ? 42 : isBeam ? 78 : l.nova ? 22 : 32;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.globalCompositeOperation = "lighter";
    const grd = ctx.createLinearGradient(-trailLen, 0, l.w * 0.35, 0);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(0.45, l.color);
    grd.addColorStop(0.82, "#ffffff");
    grd.addColorStop(1, l.color);
    ctx.fillStyle = grd;
    const th = Math.max(l.h * 0.55, l.homing ? 7 : 4);
    ctx.beginPath();
    ctx.ellipse(-trailLen * 0.15, 0, trailLen * 0.55 + l.w * 0.35, th, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(5, l.w * 0.28), Math.max(2.5, l.h * 0.28), 0, 0, Math.PI * 2);
    ctx.fill();
    if (l.homing) {
      ctx.globalAlpha = 0.45 + Math.sin(this.time * 18) * 0.15;
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 10 + Math.sin(this.time * 14) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private draw() {
    const ctx = this.ctx;
    const w = VIEW_W;
    const h = VIEW_H;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const cx = this.camX;
    const cy = this.camY;
    this.drawThemedParallax(ctx, cx, cy);

    const shx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 2 : 0;
    const shy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 2 : 0;
    ctx.translate(-cx + shx, -cy + shy);

    this.drawCanyonDecor(ctx);

    for (const p of this.platforms) this.drawPlatform(ctx, p);

    // Setpiece ambient FX — altars, skybridge cables, spike-pit warnings, spring auras
    this.drawSetpieceFX(ctx);

    for (const c of this.coins) {
      if (c.collected) continue;
      this.drawCoin(ctx, c);
    }

    for (const a of this.ammoPickups) {
      if (a.collected) continue;
      this.drawAmmoPickup(ctx, a);
    }

    for (const s of this.powerSeeds) {
      if (s.collected) continue;
      this.drawPowerSeed(ctx, s);
    }
    if (this.chaosGem && !this.chaosGem.collected) {
      this.drawChaosGem(ctx, this.chaosGem);
    }

    // Neon Chaos world-edge palette cycle (full strip, not player-only)
    this.drawNeonChaosEdges(ctx);

    for (const b of this.birds) {
      if (b.dead) continue;
      this.drawBirdOutlined(ctx, b);
    }

    if (this.boss && !this.boss.dead) {
      this.drawBoss(ctx, this.boss);
    } else if (this.boss?.dead) {
      // residual particles already; show defeated glow
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#ff2bd6";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("DON CORVONE DEFEATED", this.level.width * 0.5 - 120, 80);
      ctx.restore();
    }

    for (const l of this.lasers) {
      this.drawLaser(ctx, l);
    }

    this.drawHeroCinematic(ctx);
    if (this.shielding) {
      this.drawShieldAura(ctx, this.px + PLAYER_W * 0.5, this.py + PLAYER_H * 0.45);
    }
    // Goblin multi-jump rings
    for (const r of this.jumpRings) {
      const t = 1 - r.life / r.max;
      const rad = 8 + t * 36;
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.life / r.max);
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#ff2bd6";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#ff2bd6";
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Grok jetpack flame (under feet)
    if (this.jetpacking) {
      this.drawJetpackFlame(ctx, this.px + PLAYER_W * 0.5, this.py + PLAYER_H - 2);
    }

    this.fx.draw(ctx);
    ctx.globalAlpha = 1;

    ctx.restore();

    // ── Screen-space juice (Phase 3) ─────────────────────────────
    this.drawScreenJuice(ctx, w, h);

    if (this.hazard?.active) {
      ctx.save();
      if (this.hazard.kind === "sandstorm") {
        ctx.fillStyle = "rgba(255,180,80,0.12)";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,200,100,0.25)";
        for (let i = 0; i < 40; i++) {
          const x = ((i * 70 + this.time * 300) % (w + 40)) - 20;
          const y = (i * 37 + this.time * 40) % h;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 30, y + 4);
          ctx.stroke();
        }
      } else if (this.hazard.kind === "lightning") {
        ctx.fillStyle = "rgba(180,230,255,0.06)";
        ctx.fillRect(0, 0, w, h);
        for (const bolt of this.lightningBolts) {
          const sx = bolt.x - this.camX;
          if (bolt.struck) {
            ctx.strokeStyle = "#e8ffff";
            ctx.shadowColor = "#7ef9ff";
            ctx.shadowBlur = 22;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx + 8, h * 0.35);
            ctx.lineTo(sx - 10, h * 0.62);
            ctx.lineTo(sx + 4, h);
            ctx.stroke();
            ctx.fillStyle = "rgba(200,255,255,0.12)";
            ctx.fillRect(sx - 18, 0, 36, h);
          } else {
            ctx.fillStyle = `rgba(126,249,255,${0.08 + (0.55 - bolt.warn) * 0.2})`;
            ctx.fillRect(sx - 16, 0, 32, h);
            ctx.strokeStyle = "rgba(126,249,255,0.55)";
            ctx.setLineDash([6, 8]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx, 8);
            ctx.lineTo(sx, h - 8);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      } else if (this.hazard.kind === "quake") {
        ctx.fillStyle = "rgba(255,60,80,0.08)";
        ctx.fillRect(0, 0, w, h);
      } else if (this.hazard.kind === "meteor") {
        ctx.fillStyle = "rgba(255,100,40,0.1)";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.fillStyle = "rgba(10,6,20,0.7)";
      ctx.fillRect(w / 2 - 140, 56, 280, 32);
      ctx.strokeStyle = "#ff2bd6";
      ctx.strokeRect(w / 2 - 140, 56, 280, 32);
      ctx.fillStyle = "#ffcc33";
      ctx.font = "bold 14px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`⚠ ${this.hazard.kind.toUpperCase()} ⚠`, w / 2, 77);
      ctx.restore();
    }

    if (!this.ready) {
      ctx.fillStyle = "#0a0614";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#00f0ff";
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Loading canyon…", w / 2, h / 2);
    }

    // Build stamp — DEV ONLY (`?debug=1` or localStorage.bmmDebug === "1")
    if (isBmmDebug()) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#7ef9ff";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("ART v10 · tlc", 8, h - 8);
      ctx.restore();
    }
  }

  /**
   * Makes chunk setpieces read at a glance on mobile:
   * - Shrine / power-seed: glowing altar base + rune pillars
   * - Skybridge (high oneways): suspension cables + tower stubs
   * - Spike pits: ground danger stripes + haze
   * - Spring runs: residual bounce rings on floor
   */
  private drawSetpieceFX(ctx: CanvasRenderingContext2D) {
    const pal = this.themePalette();
    const t = this.time;
    const plats = this.platforms;

    // ── Shrine / power-seed altars ──────────────────────────────────
    for (const s of this.powerSeeds) {
      if (s.collected) continue;
      const cx = s.x + s.w / 2;
      const baseY = s.y + s.h + 22;
      // Stone pedestal
      ctx.fillStyle = "#1a1018";
      ctx.fillRect(cx - 40, baseY - 10, 80, 22);
      ctx.fillStyle = pal.decor;
      ctx.fillRect(cx - 34, baseY - 16, 68, 12);
      // Neon ring on pedestal
      ctx.save();
      ctx.shadowColor = pal.neon;
      ctx.shadowBlur = 18 + Math.sin(t * 3) * 8;
      ctx.strokeStyle = pal.neon;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 12, 30, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // Side rune pillars
      for (const side of [-1, 1]) {
        const px = cx + side * 48;
        const ph = 44 + Math.sin(t * 2 + side) * 5;
        ctx.fillStyle = "#120810";
        ctx.fillRect(px - 6, baseY - ph, 12, ph);
        ctx.fillStyle = pal.neon;
        ctx.globalAlpha = 0.5 + Math.sin(t * 4 + side * 2) * 0.2;
        ctx.fillRect(px - 2.5, baseY - ph + 4, 5, ph - 10);
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(px, baseY - ph - 12 + Math.sin(t * 3.5 + side) * 3);
        ctx.rotate(Math.PI / 4 + t * 0.4 * side);
        ctx.fillStyle = pal.neon + "cc";
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
      }
      // Soft vertical god-ray from seed
      const ray = ctx.createLinearGradient(cx, s.y - 50, cx, s.y + 100);
      ray.addColorStop(0, pal.neon + "00");
      ray.addColorStop(0.4, pal.neon + "33");
      ray.addColorStop(1, pal.neon + "00");
      ctx.fillStyle = ray;
      ctx.fillRect(cx - 22, s.y - 60, 44, 180);
    }

    // ── Skybridge cables (high oneway clusters) ─────────────────────
    const oneways = plats.filter((p) => p.kind === "oneway" && p.y < this.level.height * 0.55);
    if (oneways.length >= 2) {
      // Sort by x and draw cables between neighbors
      const sorted = [...oneways].sort((a, b) => a.x - b.x);
      ctx.save();
      ctx.strokeStyle = pal.neon + "55";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = pal.neon;
      ctx.shadowBlur = 6;
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i]!;
        const b = sorted[i + 1]!;
        if (b.x - a.x > 280) continue;
        const ay = a.y + 4;
        const by = b.y + 4;
        ctx.beginPath();
        ctx.moveTo(a.x + a.w * 0.5, ay);
        const midX = (a.x + a.w * 0.5 + b.x + b.w * 0.5) / 2;
        const sag = 18 + Math.sin(t * 1.5 + i) * 4;
        ctx.quadraticCurveTo(midX, Math.max(ay, by) + sag, b.x + b.w * 0.5, by);
        ctx.stroke();
      }
      // Tower stubs under outermost high oneways
      for (const p of [sorted[0], sorted[sorted.length - 1]]) {
        if (!p) continue;
        const tx = p.x + p.w * 0.5 - 8;
        const top = p.y + p.h;
        const groundY = this.level.height - 40;
        ctx.fillStyle = "#14101c";
        ctx.fillRect(tx, top, 16, Math.min(120, groundY - top));
        ctx.fillStyle = pal.neon + "44";
        ctx.fillRect(tx, top, 16, 4);
      }
      ctx.restore();
    }

    // ── Spike pit danger stripes + haze ─────────────────────────────
    const hazards = plats.filter((p) => p.kind === "hazard");
    for (const h of hazards) {
      // Ground warning band under / around spikes
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(t * 5 + h.x * 0.02) * 0.1;
      ctx.fillStyle = "#ff2244";
      // Diagonal stripes
      ctx.beginPath();
      ctx.rect(h.x - 8, h.y + h.h - 2, h.w + 16, 14);
      ctx.clip();
      for (let s = -20; s < h.w + 40; s += 14) {
        ctx.beginPath();
        ctx.moveTo(h.x + s, h.y + h.h - 2);
        ctx.lineTo(h.x + s + 8, h.y + h.h - 2);
        ctx.lineTo(h.x + s + 2, h.y + h.h + 12);
        ctx.lineTo(h.x + s - 6, h.y + h.h + 12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // Soft red haze above pit
      const haze = ctx.createRadialGradient(
        h.x + h.w / 2, h.y + h.h, 4,
        h.x + h.w / 2, h.y + h.h, h.w * 0.7,
      );
      haze.addColorStop(0, "rgba(255,40,60,0.22)");
      haze.addColorStop(1, "rgba(255,40,60,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(h.x - 20, h.y - 30, h.w + 40, h.h + 50);
    }

    // ── Spring run residual rings ───────────────────────────────────
    const springs = plats.filter((p) => p.kind === "spring");
    for (const sp of springs) {
      const pulse = 0.5 + Math.sin(t * 4 + sp.x * 0.05) * 0.35;
      ctx.save();
      ctx.globalAlpha = 0.25 * pulse;
      ctx.strokeStyle = "#ff2bd6";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#ff2bd6";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(
        sp.x + sp.w / 2,
        sp.y + sp.h + 6,
        22 + pulse * 6,
        7,
        0, 0, Math.PI * 2,
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(
        sp.x + sp.w / 2,
        sp.y + sp.h + 6,
        14 + pulse * 4,
        4,
        0, 0, Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawCoin(ctx: CanvasRenderingContext2D, c: Coin) {
    const bob = Math.sin(c.bob * 4 + this.time * 2) * 5;
    const by = c.y + bob;
    const cx = c.x + c.w / 2;
    const cy = by + c.h / 2;
    // Spin: squash X with sine so the sprite “turns”
    const spin = Math.abs(Math.sin(c.bob * 5 + this.time * 4));
    const scaleX = 0.35 + spin * 0.65;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, 1);
    // Soft gold halo
    ctx.shadowColor = "#ffcc33";
    ctx.shadowBlur = 10 + spin * 6;
    this.drawSpriteSheet(ctx, this.imgs.props, 0, -c.w / 2, -c.h / 2, c.w, c.h, false);
    ctx.restore();
    // Occasional sparkle
    if (spin > 0.92) {
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.8;
      ctx.fillRect(cx + 6, cy - 8, 2, 2);
      ctx.fillRect(cx - 8, cy + 2, 2, 2);
      ctx.globalAlpha = 1;
    }
  }

  private drawAmmoPickup(ctx: CanvasRenderingContext2D, a: AmmoPickup) {
    const bob = Math.sin(this.time * 3 + a.x * 0.05) * 4;
    const cx = a.x + a.w / 2;
    const cy = a.y + a.h / 2 + bob;
    const pulse = 0.7 + Math.sin(this.time * 5) * 0.3;
    ctx.save();
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 12 * pulse;
    ctx.strokeStyle = `rgba(0,240,255,${0.35 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 16 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    this.drawSpriteSheet(ctx, this.imgs.props, 3, a.x, a.y + bob, a.w, a.h, false);
    ctx.restore();
  }

  private drawPowerSeed(ctx: CanvasRenderingContext2D, s: PowerSeed) {
    const by = s.y + Math.sin(s.bob * 5 + this.time * 3) * 8;
    const cx = s.x + s.w / 2;
    const cy = by + s.h / 2;
    const meta = POWER_META[s.kind] ?? POWER_META.slowmo;
    const col = meta.color;
    const spin = this.time * 2.2 + s.bob;
    ctx.save();
    // High-contrast disc so the seed never melts into canyon neon
    const disc = ctx.createRadialGradient(cx, cy, 4, cx, cy, 38);
    disc.addColorStop(0, "#0a0614ee");
    disc.addColorStop(0.55, "#0a0614cc");
    disc.addColorStop(1, "#0a061400");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fill();
    // Outer glow halo
    ctx.shadowColor = col;
    ctx.shadowBlur = 28;
    ctx.fillStyle = col + "55";
    ctx.beginPath();
    ctx.arc(cx, cy, 26 + Math.sin(this.time * 3.2 + s.bob) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Orbiting motes
    for (let i = 0; i < 4; i++) {
      const ang = spin + (i * Math.PI * 2) / 4;
      const ox = Math.cos(ang) * 30;
      const oy = Math.sin(ang) * 16;
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pulse rings
    const ring = 26 + Math.sin(this.time * 4 + s.bob) * 6;
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, ring + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Rotating diamond core
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(spin * 0.5) * 0.35);
    ctx.shadowColor = col;
    ctx.shadowBlur = 24;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(20, 0);
    ctx.lineTo(0, 24);
    ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.fillStyle = "#ffffffee";
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Label on a dark chip
    ctx.save();
    const label = meta.short;
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tw = Math.max(36, ctx.measureText(label).width + 14);
    const ly = cy + 36;
    ctx.fillStyle = "#0a0614ee";
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, ly - 9, tw, 18, 6);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.fillText(label, cx, ly);
    ctx.restore();
  }

  private drawChaosGem(
    ctx: CanvasRenderingContext2D,
    g: { x: number; y: number; w: number; h: number; bob: number; id: ChaosId },
  ) {
    const col = CHAOS_META[g.id].color;
    const by = g.y + Math.sin(g.bob * 5 + this.time * 3) * 7;
    const cx = g.x + g.w / 2;
    const cy = by + g.h / 2;
    const pulse = 0.7 + Math.sin(this.time * 4) * 0.3;
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(this.time * 1.6) * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.fillStyle = col + "55";
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 9);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fillStyle = "#ffffffcc";
    ctx.fill();
    ctx.restore();
  }

  private tickBossSeeds(dt: number) {
    if (!this.boss || this.boss.dead || !this.level.boss) return;
    const op = opOfLevel(this.level.id);
    const unlocked = this.save.inventory[op.id] ?? [];
    if (unlocked.length === 0) return;
    this.bossSeedCd -= dt;
    const live = this.powerSeeds.filter((s) => !s.collected).length;
    if (this.bossSeedCd > 0 || live >= 2) return;
    let kind: PowerKind = unlocked[Math.floor(Math.random() * unlocked.length)]!;
    const hpPct = this.health / this.maxHealth;
    if (hpPct < 0.4 && unlocked.includes("health")) kind = "health";
    else if (this.ammo < 8 && unlocked.includes("ammo")) kind = "ammo";
    else if (this.shield < this.maxShield * 0.3 && unlocked.includes("shield")) kind = "shield";
    this.powerSeeds.push({
      x: this.level.width * 0.25 + Math.random() * this.level.width * 0.5,
      y: 180 + Math.random() * 80,
      w: SEED_SIZE,
      h: SEED_SIZE,
      collected: false,
      bob: Math.random(),
      kind,
    });
    this.bossSeedCd = Math.max(4.2, 9 - unlocked.length * 0.45);
  }

  /** Full palette cycle along world bounds — Neon Chaos juice */
  private drawNeonChaosEdges(ctx: CanvasRenderingContext2D) {
    const L = this.level;
    if (!L) return;
    const active = this.chaosEdge > 0;
    const speed = active ? 8 : 2.2;
    const thick = active ? 10 : 5;
    const alpha = active ? 0.85 : 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = thick;
    ctx.shadowBlur = active ? 18 : 8;
    const segs = 24;
    // Top edge omitted — it read as a neon zipper across the sky.
    // Bottom edge
    for (let i = 0; i < segs; i++) {
      const t = i / segs;
      const x0 = t * L.width;
      const x1 = ((i + 1) / segs) * L.width;
      const col = NEON_CHAOS[Math.floor((this.time * speed + i + 4) % NEON_CHAOS.length)]!;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.beginPath();
      ctx.moveTo(x0, L.height - 4);
      ctx.lineTo(x1, L.height - 4);
      ctx.stroke();
    }
    // Left / right vertical strips
    const vSegs = 16;
    for (let i = 0; i < vSegs; i++) {
      const t = i / vSegs;
      const y0 = t * L.height;
      const y1 = ((i + 1) / vSegs) * L.height;
      const colL = NEON_CHAOS[Math.floor((this.time * speed + i + 2) % NEON_CHAOS.length)]!;
      const colR = NEON_CHAOS[Math.floor((this.time * speed + i + 6) % NEON_CHAOS.length)]!;
      ctx.strokeStyle = colL;
      ctx.shadowColor = colL;
      ctx.beginPath();
      ctx.moveTo(4, y0);
      ctx.lineTo(4, y1);
      ctx.stroke();
      ctx.strokeStyle = colR;
      ctx.shadowColor = colR;
      ctx.beginPath();
      ctx.moveTo(L.width - 4, y0);
      ctx.lineTo(L.width - 4, y1);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Vignette + chromatic pulse + slow-mo desaturate overlay */
  private drawScreenJuice(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Vignette (always mild; boosts on damage)
    const vig = 0.28 + this.vignetteBoost * 0.55 + (this.slowMo > 0 ? 0.12 : 0);
    const g = ctx.createRadialGradient(w * 0.5, h * 0.48, h * 0.2, w * 0.5, h * 0.5, h * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.65, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(8,4,18,${Math.min(0.85, vig)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Chromatic pulse — RGB fringe on damage / power-ups
    const pulse = Math.max(this.chromPulse, this.powerPulse * 0.7);
    if (pulse > 0.02) {
      const shift = 3 + pulse * 10;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = Math.min(0.45, pulse * 1.2);
      // Red channel offset left
      ctx.fillStyle = "rgba(255,40,80,0.35)";
      ctx.fillRect(-shift, 0, w, h);
      // Cyan channel offset right
      ctx.fillStyle = "rgba(0,240,255,0.3)";
      ctx.fillRect(shift, 0, w, h);
      // Magenta vertical fringe
      ctx.fillStyle = "rgba(255,43,214,0.18)";
      ctx.fillRect(0, -shift * 0.4, w, h);
      ctx.restore();
    }

    // SLOW-MO: desaturate + cool grade + banner
    if (this.slowMo > 0) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#1a1030";
      ctx.globalCompositeOperation = "saturation";
      // fallback if saturation not honored: grey overlay
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#6080c0";
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(10,6,20,0.65)";
      ctx.fillRect(w / 2 - 90, 18, 180, 28);
      ctx.strokeStyle = "#c77dff";
      ctx.lineWidth = 2;
      ctx.strokeRect(w / 2 - 90, 18, 180, 28);
      ctx.fillStyle = "#e8d0ff";
      ctx.font = "bold 13px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`⏱ SLOW-MO  ${this.slowMo.toFixed(1)}s`, w / 2, 37);
      ctx.restore();
    }

    // Canvas CSS filter for true desaturate when slow-mo is active
    if (typeof this.canvas !== "undefined" && this.canvas.style) {
      if (this.slowMo > 0) {
        this.canvas.style.filter = "saturate(0.4) brightness(0.92) contrast(1.05)";
      } else if (this.chromPulse > 0.15) {
        this.canvas.style.filter = "contrast(1.08) saturate(1.15)";
      } else {
        this.canvas.style.filter = "contrast(1.06) saturate(1.08)";
      }
    }

    this.drawCinematicGrade(ctx, w, h);
  }

  /** Phase 4 screen finish: grade, scanlines, grain, speed lines, letterbox. */
  private drawCinematicGrade(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    // Split-tone grade — teal shadows / magenta highlights
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.16;
    const grade = ctx.createLinearGradient(0, 0, 0, h);
    grade.addColorStop(0, "#3a1060");
    grade.addColorStop(0.45, "#0a1828");
    grade.addColorStop(1, "#3a1208");
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = "#00f0ff";
    ctx.fillRect(0, 0, w, h * 0.35);
    ctx.fillStyle = "#ff2bd6";
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.restore();

    // Fine scanlines
    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = "#000";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.restore();

    // Film grain (stable-ish per frame)
    ctx.save();
    ctx.globalAlpha = 0.035;
    const seed = Math.floor(this.time * 24);
    for (let i = 0; i < 70; i++) {
      const gx = ((i * 97 + seed * 13) % w);
      const gy = ((i * 53 + seed * 29) % h);
      ctx.fillStyle = i % 2 === 0 ? "#fff" : "#000";
      ctx.fillRect(gx, gy, 2, 2);
    }
    ctx.restore();

    // Speed lines when diving / jetpacking
    const speed = Math.hypot(this.pvx, this.pvy);
    const rush = this.jetpacking ? 0.45 : this.pvy > 380 ? Math.min(0.7, (this.pvy - 280) / 600) : speed > 240 ? 0.18 : 0;
    if (rush > 0.04) {
      ctx.save();
      ctx.globalAlpha = rush * 0.55;
      ctx.strokeStyle = this.character === "grok" ? "rgba(0,240,255,0.55)" : "rgba(57,255,154,0.5)";
      ctx.lineWidth = 1.4;
      const cx = w * 0.42;
      const cy = h * 0.52;
      for (let i = 0; i < 14; i++) {
        const a = -0.35 + i * 0.055 + Math.sin(this.time * 9 + i) * 0.02;
        const len = 80 + rush * 160 + (i % 3) * 20;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 40);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * (len * 0.45));
        ctx.stroke();
      }
      ctx.restore();
    }

    // Cinematic letterbox — stronger in slow-mo / boss
    const box = this.slowMo > 0 ? 28 : this.level?.boss ? 16 : 8;
    if (box > 0) {
      ctx.fillStyle = "rgba(6,2,14,0.82)";
      ctx.fillRect(0, 0, w, box);
      ctx.fillRect(0, h - box, w, box);
    }
  }

  private themePalette() {
    const theme = this.level?.theme ?? "dunes";
    // Lighter, readable palettes per biome (still neon-synthwave)
    const map: Record<
      string,
      {
        sky: [string, string, string, string];
        sun: [string, string];
        far: string;
        mid: string;
        near: string;
        haze: string;
        floorA: string;
        floorB: string;
        grid: string;
        decor: string;
        neon: string;
        stars: boolean;
        clouds: boolean;
      }
    > = {
      dunes: {
        sky: ["#2a0a48", "#6a2080", "#e06040", "#ffb070"],
        sun: ["#ffe6a0", "#ff6a30"],
        far: "#4a1868",
        mid: "#7a2858",
        near: "#a03830",
        haze: "rgba(255,140,90,0.22)",
        floorA: "rgba(255,110,50,0.18)",
        floorB: "rgba(40,12,18,0.72)",
        grid: "rgba(255,90,50,0.22)",
        decor: "#5a2040",
        neon: "#ff9f43",
        stars: true,
        clouds: true,
      },
      bridges: {
        sky: ["#1a3a7a", "#3a70b8", "#70b0e0", "#c0e8ff"],
        sun: ["#ffffff", "#80d0ff"],
        far: "#2a5088",
        mid: "#3a70a8",
        near: "#5088b8",
        haze: "rgba(100,200,255,0.16)",
        floorA: "rgba(0,200,255,0.12)",
        floorB: "rgba(20,40,80,0.5)",
        grid: "rgba(0,240,255,0.3)",
        decor: "#204070",
        neon: "#00f0ff",
        stars: false,
        clouds: true,
      },
      spikes: {
        sky: ["#3a1040", "#6a1848", "#b04050", "#e87860"],
        sun: ["#ffcc88", "#ff4466"],
        far: "#4a1848",
        mid: "#6a2040",
        near: "#8a3038",
        haze: "rgba(255,80,100,0.14)",
        floorA: "rgba(255,60,80,0.12)",
        floorB: "rgba(40,10,20,0.55)",
        grid: "rgba(255,70,90,0.28)",
        decor: "#501828",
        neon: "#ff4466",
        stars: true,
        clouds: false,
      },
      storm: {
        sky: ["#3a3050", "#6a6078", "#b0a090", "#e0d0b0"],
        sun: ["#fff0c0", "#ffcc66"],
        far: "#504860",
        mid: "#706858",
        near: "#908070",
        haze: "rgba(255,220,160,0.2)",
        floorA: "rgba(220,180,100,0.14)",
        floorB: "rgba(50,40,30,0.5)",
        grid: "rgba(255,200,100,0.22)",
        decor: "#605848",
        neon: "#ffcc33",
        stars: false,
        clouds: true,
      },
      vertical: {
        sky: ["#302060", "#5060b0", "#90a0e0", "#d0e0ff"],
        sun: ["#e8f0ff", "#a090ff"],
        far: "#403888",
        mid: "#5060a8",
        near: "#6878b8",
        haze: "rgba(160,180,255,0.16)",
        floorA: "rgba(120,140,255,0.12)",
        floorB: "rgba(30,30,70,0.5)",
        grid: "rgba(160,140,255,0.28)",
        decor: "#384078",
        neon: "#c77dff",
        stars: true,
        clouds: true,
      },
      hq: {
        sky: ["#201040", "#502080", "#a040b0", "#f080c0"],
        sun: ["#ff80ff", "#00f0ff"],
        far: "#401860",
        mid: "#602888",
        near: "#8030a0",
        haze: "rgba(255,80,220,0.14)",
        floorA: "rgba(255,43,214,0.12)",
        floorB: "rgba(40,10,50,0.55)",
        grid: "rgba(255,43,214,0.3)",
        decor: "#501870",
        neon: "#ff2bd6",
        stars: true,
        clouds: false,
      },
      boss: {
        sky: ["#180828", "#401050", "#802060", "#c04040"],
        sun: ["#ff4466", "#ff2bd6"],
        far: "#300840",
        mid: "#501050",
        near: "#701838",
        haze: "rgba(255,40,120,0.16)",
        floorA: "rgba(255,43,214,0.14)",
        floorB: "rgba(30,5,25,0.6)",
        grid: "rgba(255,43,214,0.32)",
        decor: "#401030",
        neon: "#ff2bd6",
        stars: true,
        clouds: false,
      },
    };
    return map[theme] ?? map.dunes!;
  }

  /** Multi-layer parallax sky / terrain — Op 1 visual kit + theme fallbacks */
  private drawThemedParallax(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    const w = VIEW_W;
    const h = VIEW_H;
    const pal = this.themePalette();
    const t = this.time;
    const slot = Math.max(0, ((this.level?.id ?? 1) - 1) % 10);
    const slotPlate = slot >= 0 && slot < 9 ? this.imgs[`bgL${slot + 1}`] : undefined;
    const dunes = (this.level?.theme ?? "dunes") === "dunes";

    // Layer 0 — sky gradient
    const skyShift = Math.min(40, camY * 0.04);
    const sky = ctx.createLinearGradient(0, -skyShift, 0, h - skyShift * 0.3);
    sky.addColorStop(0, pal.sky[0]!);
    sky.addColorStop(0.32, pal.sky[1]!);
    sky.addColorStop(0.62, pal.sky[2]!);
    sky.addColorStop(1, pal.sky[3]!);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Layer 1 — stars
    if (pal.stars) {
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 90; i++) {
        const sx = ((i * 97 - camX * 0.04 + t * 2) % (w + 40) + w + 40) % (w + 40) - 20;
        const sy = ((i * 53 - camY * 0.025) % (h * 0.5) + h * 0.5) % (h * 0.5);
        ctx.globalAlpha = 0.2 + (i % 5) * 0.12;
        ctx.fillRect(sx, sy, i % 7 === 0 ? 3 : 1.5, i % 7 === 0 ? 3 : 1.5);
      }
      ctx.globalAlpha = 1;
    }

    // Layer 2 — clouds
    if (pal.clouds) {
      for (let i = 0; i < 7; i++) {
        const cx = ((i * 210 - camX * 0.07 + t * 10) % (w + 220) + w + 220) % (w + 220) - 110;
        const cy = 50 + (i % 3) * 36 + Math.sin(t * 0.35 + i) * 7 - camY * 0.03;
        const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90);
        cg.addColorStop(0, "rgba(255,200,180,0.16)");
        cg.addColorStop(1, "rgba(255,180,200,0)");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 80 + (i % 3) * 18, 20 + (i % 2) * 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Layer 3 — one sun + soft corona, in the sky gradient only
    this.drawSkySun(ctx, camX, camY, pal);

    // Layer 4 — far plate. Crop past the painted sun. Overlap the sky and melt 14px.
    if (slotPlate) {
      const farY = h * 0.22 - 16;
      this.drawParallaxPlate(ctx, slotPlate, camX * 0.08, camY * 0.02, farY, 0.9, 0.64);
      this.blendSkyJoin(ctx, farY, pal);
    } else if (dunes && this.imgs.bgFar) {
      const farY = h * 0.28 - 16;
      this.drawParallaxPlate(ctx, this.imgs.bgFar, camX * 0.08, camY * 0.02, farY, 0.8, 0.64);
      this.blendSkyJoin(ctx, farY, pal);
    } else {
      this.drawMesaLayer(ctx, camX * 0.1, h * 0.5, pal.far, 1.4, 0.5, false, pal.neon);
      this.blendSkyJoin(ctx, h * 0.42, pal);
    }

    // Soft depth fog between far and mid
    const fog1 = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.68);
    fog1.addColorStop(0, "rgba(0,0,0,0)");
    fog1.addColorStop(0.45, pal.haze);
    fog1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fog1;
    ctx.fillRect(0, h * 0.36, w, h * 0.4);

    // Layer 5 — mid art plate / mesas
    // Mid plate only on L1 so later stages don't reuse the same desert photo
    if (slot === 0 && this.imgs.bgMid) {
      this.drawParallaxPlate(ctx, this.imgs.bgMid, camX * 0.22, camY * 0.04, h * 0.34, 0.75, 0.22);
    } else {
      this.drawMesaLayer(ctx, camX * 0.26, h * 0.56, pal.mid, 1.05, 0.72, true, pal.neon);
    }

    // Layer 6 — near procedural mesas with neon ridge (always — readable gameplay depth)
    this.drawMesaLayer(ctx, camX * 0.45, h * 0.64, pal.near, 0.78, 0.92, true, pal.neon);

    // Atmospheric ground haze
    const haze = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.85);
    haze.addColorStop(0, "rgba(0,0,0,0)");
    haze.addColorStop(0.4, pal.haze);
    haze.addColorStop(1, "rgba(20,5,15,0.35)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, h * 0.48, w, h * 0.45);

    // Layer 7 — canyon floor
    this.drawGridFloor(ctx, camX * 0.7, camY * 0.2, pal);

    // Heat shimmer bands (dunes)
    if (dunes) {
      ctx.save();
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < 5; i++) {
        const y = h * 0.58 + i * 22 + Math.sin(t * 2 + i) * 4;
        ctx.fillStyle = i % 2 === 0 ? "#ffcc88" : "#ff80c0";
        ctx.fillRect(0, y, w, 3 + Math.sin(t * 3 + i) * 1.5);
      }
      ctx.restore();
    }

    // Near dust motes
    ctx.fillStyle = pal.neon;
    for (let i = 0; i < 24; i++) {
      const mx = ((i * 130 - camX * 0.9 + t * 35) % (w + 30) + w + 30) % (w + 30) - 15;
      const my = h * 0.52 + ((i * 71 + t * 22) % (h * 0.42));
      ctx.globalAlpha = 0.12 + (i % 4) * 0.05;
      ctx.beginPath();
      ctx.arc(mx, my, 1.2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Sun lives in the sky gradient — soft corona, no plate-edge sticker, no stroke. */
  private drawSkySun(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    pal: ReturnType<GameEngine["themePalette"]>,
  ) {
    const w = VIEW_W;
    const h = VIEW_H;
    const t = this.time;
    const sunX = w * 0.74 - camX * 0.02;
    const sunY = h * 0.12 - camY * 0.015;

    const corona = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 190);
    corona.addColorStop(0, "#fff8e8");
    corona.addColorStop(0.07, pal.sun[0]!);
    corona.addColorStop(0.18, hexA(pal.sun[1]!, 0.55));
    corona.addColorStop(0.42, hexA(pal.sun[1]!, 0.16));
    corona.addColorStop(1, "#00000000");
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 190, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.04;
    for (let i = -3; i <= 3; i++) {
      const ang = i * 0.12 + Math.sin(t * 0.2) * 0.02;
      ctx.fillStyle = pal.sun[0]!;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.sin(ang) * 520, sunY + Math.cos(ang) * 520);
      ctx.lineTo(sunX + Math.sin(ang + 0.035) * 520, sunY + Math.cos(ang + 0.035) * 520);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const core = ctx.createRadialGradient(sunX - 3, sunY - 3, 1, sunX, sunY, 24);
    core.addColorStop(0, "#fffef4");
    core.addColorStop(0.45, pal.sun[0]!);
    core.addColorStop(1, hexA(pal.sun[1]!, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Night → far plate. The plate's own top 14px is already transparent. */
  private blendSkyJoin(
    _ctx: CanvasRenderingContext2D,
    _plateTop: number,
    _pal: ReturnType<GameEngine["themePalette"]>,
  ) {
    /* join is the plate alpha fade — a painted band reads as a zipper */
  }

  private drawParallaxPlate(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | HTMLCanvasElement,
    scrollX: number,
    scrollY: number,
    yOffset: number,
    alpha: number,
    /** Crop top fraction of source image (sky) so procedural sky/sun stay clean */
    srcTopCrop = 0.25,
  ) {
    const w = VIEW_W;
    const h = VIEW_H;
    const srcY = img.height * srcTopCrop;
    const srcH = img.height * (1 - srcTopCrop);
    const aspect = img.width / Math.max(1, srcH);
    const drawH = h * 0.58;
    const drawW = drawH * aspect;
    const x = -((scrollX % drawW) + drawW) % drawW;
    if (!this.plateBuf) this.plateBuf = document.createElement("canvas");
    const buf = this.plateBuf;
    if (buf.width !== w || buf.height !== h) {
      buf.width = w;
      buf.height = h;
    }
    const b = buf.getContext("2d");
    if (!b) return;
    b.clearRect(0, 0, w, h);
    b.imageSmoothingEnabled = true;
    const drawY = yOffset - scrollY * 0.3;
    for (let i = -1; i <= 2; i++) {
      b.drawImage(img, 0, srcY, img.width, srcH, x + i * drawW, drawY, drawW, drawH);
    }
    // Fade only the plate, so the sky gradient shows through. No stroke, no color band.
    b.save();
    b.globalCompositeOperation = "destination-out";
    const melt = b.createLinearGradient(0, drawY, 0, drawY + 16);
    melt.addColorStop(0, "rgba(0,0,0,1)");
    melt.addColorStop(0.55, "rgba(0,0,0,0.45)");
    melt.addColorStop(1, "rgba(0,0,0,0)");
    b.fillStyle = melt;
    b.fillRect(0, drawY, w, 16);
    b.restore();
    const fade = b.createLinearGradient(0, drawY + drawH * 0.5, 0, drawY + drawH);
    fade.addColorStop(0, "rgba(10,4,18,0)");
    fade.addColorStop(1, "rgba(10,4,18,0.9)");
    b.fillStyle = fade;
    b.fillRect(0, drawY + drawH * 0.5, w, drawH * 0.55);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(buf, 0, 0);
    ctx.restore();
  }

  /** Flat-top mesa silhouettes — reads as desert canyon, not sine waves */
  private drawMesaLayer(
    ctx: CanvasRenderingContext2D,
    scroll: number,
    baseY: number,
    color: string,
    scale: number,
    alpha: number,
    strata: boolean,
    neonRim?: string,
  ) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const mesas = [
      { x: 0, w: 180, h: 90 },
      { x: 200, w: 120, h: 60 },
      { x: 360, w: 200, h: 110 },
      { x: 600, w: 90, h: 45 },
      { x: 720, w: 160, h: 80 },
      { x: 920, w: 140, h: 70 },
      { x: 1100, w: 190, h: 100 },
      { x: 1320, w: 100, h: 50 },
    ];
    const period = 1500;
    const off = ((scroll % period) + period) % period;

    for (let rep = -1; rep <= 1; rep++) {
      for (const m of mesas) {
        const x = m.x - off + rep * period;
        const mh = m.h * scale;
        const mw = m.w * scale;
        const top = baseY - mh;
        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, baseY + 80);
        ctx.lineTo(x + mw * 0.08, top + mh * 0.25);
        ctx.lineTo(x + mw * 0.12, top);
        ctx.lineTo(x + mw * 0.88, top);
        ctx.lineTo(x + mw * 0.95, top + mh * 0.3);
        ctx.lineTo(x + mw, baseY + 80);
        ctx.closePath();
        ctx.fill();
        // Flat top highlight
        ctx.fillStyle = "rgba(255,220,200,0.12)";
        ctx.fillRect(x + mw * 0.12, top, mw * 0.76, 5);
        // Rock strata bands
        if (strata) {
          ctx.strokeStyle = "rgba(0,0,0,0.18)";
          ctx.lineWidth = 2;
          for (let s = 1; s <= 3; s++) {
            const sy = top + (mh * s) / 4;
            ctx.beginPath();
            ctx.moveTo(x + mw * 0.1, sy);
            ctx.lineTo(x + mw * 0.9, sy + 2);
            ctx.stroke();
          }
        }
        // Neon ridge rim
        if (neonRim) {
          ctx.save();
          ctx.shadowColor = neonRim;
          ctx.shadowBlur = 10;
          ctx.strokeStyle = neonRim;
          ctx.globalAlpha = 0.45 * alpha;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x + mw * 0.12, top + 1);
          ctx.lineTo(x + mw * 0.88, top + 1);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    // Fill under mesas
    ctx.fillStyle = color;
    ctx.fillRect(0, baseY + 40, VIEW_W, VIEW_H - baseY);
    ctx.restore();
  }

  private drawMountains(
    ctx: CanvasRenderingContext2D,
    scroll: number,
    baseY: number,
    color: string,
    scale: number,
    alpha = 1,
  ) {
    this.drawMesaLayer(ctx, scroll, baseY, color, scale, alpha, true);
  }

  private drawGridFloor(
    ctx: CanvasRenderingContext2D,
    cx: number,
    _cy: number,
    pal?: ReturnType<GameEngine["themePalette"]>,
  ) {
    const p = pal ?? this.themePalette();
    const theme = this.level?.theme ?? "dunes";
    const horizon = VIEW_H * 0.72;
    const tech = theme === "bridges" || theme === "hq" || theme === "vertical";

    // Fade the earth band into the canyon — no cream table under the stage
    const earth = ctx.createLinearGradient(0, horizon - 80, 0, VIEW_H);
    earth.addColorStop(0, "rgba(0,0,0,0)");
    earth.addColorStop(0.2, "rgba(0,0,0,0)");
    earth.addColorStop(0.4, tech ? "rgba(20,30,55,0.16)" : "rgba(60,25,30,0.14)");
    earth.addColorStop(0.68, tech ? "rgba(20,30,55,0.46)" : "rgba(60,25,30,0.48)");
    earth.addColorStop(1, p.floorB);
    ctx.fillStyle = earth;
    ctx.fillRect(0, horizon - 80, VIEW_W, VIEW_H - horizon + 80);

    // Surface detail sits below the join so it doesn't print a table edge
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon + 18, VIEW_W, VIEW_H - horizon - 18);
    ctx.clip();
    if (tech) {
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const x0 = ((i * 110 - cx * 0.35) % (VIEW_W + 100)) - 50;
        ctx.beginPath();
        ctx.moveTo(x0, horizon + 8);
        ctx.lineTo(x0, VIEW_H);
        ctx.stroke();
        ctx.fillStyle = p.neon + "55";
        for (let r = 0; r < 4; r++) {
          ctx.beginPath();
          ctx.arc(x0, horizon + 30 + r * 40, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) {
        const x0 = ((i * 97 - cx * 0.4) % (VIEW_W + 80)) - 40;
        const y0 = horizon + 28 + (i % 5) * 28;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(x0 + 30, y0 + 12, x0 + 55, y0 - 4);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Perspective grid — alpha ramps from 0 at the join so the floor belongs to the canyon
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon, VIEW_W, VIEW_H - horizon);
    ctx.clip();
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 16; i++) {
      const t = i / 16;
      const y = horizon + Math.pow(t, 1.6) * (VIEW_H - horizon);
      ctx.globalAlpha = 0.03 + t * 0.26;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_W, y);
      ctx.stroke();
    }
    for (let i = -16; i <= 16; i++) {
      const x0 = VIEW_W / 2 + i * 40 - ((cx * 0.3) % 40);
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.moveTo(VIEW_W / 2, horizon + 10);
      ctx.lineTo(x0 + i * 55, VIEW_H);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCanyonDecor(ctx: CanvasRenderingContext2D) {
    const pal = this.themePalette();
    const theme = this.level?.theme ?? "dunes";
    const ground = this.level.height - 56;
    const t = this.time;

    // Dense midground props — spaced for readability on mobile
    for (let i = 0; i < 22; i++) {
      const x = i * 240 + 40;
      const variant = (i * 3 + (theme.length * 7)) % 7;

      if (variant === 0) {
        // Neon mile / signal pillar
        const hh = 130 + (i % 4) * 32;
        const y = ground - hh;
        ctx.fillStyle = pal.decor;
        ctx.fillRect(x, y, 40, hh);
        ctx.fillStyle = "#0e0610";
        ctx.fillRect(x + 5, y + 14, 30, 44);
        ctx.fillStyle = pal.neon;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x + 9, y + 20, 22, 9);
        ctx.fillRect(x + 9, y + 34, 16, 6);
        ctx.globalAlpha = 1;
        ctx.fillStyle = pal.neon + "66";
        ctx.fillRect(x, y, 40, 5);
        // Pulsing window
        ctx.fillStyle = pal.neon;
        ctx.globalAlpha = 0.35 + Math.sin(t * 3 + i) * 0.2;
        ctx.fillRect(x + 14, y + 70, 12, Math.max(20, hh - 95));
        ctx.globalAlpha = 1;
        // Top beacon
        ctx.save();
        ctx.shadowColor = pal.neon;
        ctx.shadowBlur = 12;
        ctx.fillStyle = pal.neon;
        ctx.fillRect(x + 12, y - 8, 16, 8);
        ctx.restore();
      } else if (variant === 1) {
        // Rock / crystal spire
        const h2 = 80 + (i % 5) * 22;
        ctx.fillStyle = pal.near;
        ctx.beginPath();
        ctx.moveTo(x, ground);
        ctx.lineTo(x + 18, ground - h2);
        ctx.lineTo(x + 28, ground - h2 * 0.85);
        ctx.lineTo(x + 52, ground);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = pal.neon + "77";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + 8, ground - h2 * 0.25);
        ctx.lineTo(x + 18, ground - h2);
        ctx.lineTo(x + 38, ground - h2 * 0.3);
        ctx.stroke();
        // Tip glow
        ctx.fillStyle = pal.neon + "55";
        ctx.beginPath();
        ctx.arc(x + 18, ground - h2, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (variant === 2) {
        // Honey Bun crumb trail
        for (let c = 0; c < 5; c++) {
          const cx = x + c * 16;
          const cy = ground - 10 - (c % 3) * 5;
          ctx.fillStyle = "#e8a050";
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff0c0aa";
          ctx.beginPath();
          ctx.arc(cx - 1.5, cy - 1.5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (variant === 3) {
        // Antenna / raven perch
        const y = ground - 120 - (i % 3) * 20;
        ctx.strokeStyle = "#1a1018";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 22, ground);
        ctx.lineTo(x + 22, y);
        ctx.stroke();
        ctx.strokeStyle = pal.neon;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 12);
        ctx.lineTo(x + 42, y + 12);
        ctx.moveTo(x + 22, y);
        ctx.lineTo(x + 22, y - 22);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.shadowColor = pal.neon;
        ctx.shadowBlur = 10;
        ctx.fillStyle = pal.neon;
        ctx.beginPath();
        ctx.arc(x + 22, y - 24, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (variant === 4) {
        // Low rock / metal shelf + neon lip
        const ww = 80 + (i % 3) * 20;
        ctx.fillStyle = pal.decor;
        ctx.fillRect(x, ground - 32, ww, 32);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x, ground - 32, ww, 6);
        ctx.fillStyle = pal.neon + "55";
        ctx.fillRect(x, ground - 32, ww, 4);
        // Bolts
        for (let b = 0; b < 3; b++) {
          ctx.fillStyle = pal.neon + "88";
          ctx.beginPath();
          ctx.arc(x + 14 + b * 24, ground - 16, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (variant === 5) {
        // Theme-specific: bridge cable / hazard barrel / shrine pedestal
        if (theme === "bridges" || theme === "vertical") {
          // Suspension cable + tower stub
          ctx.strokeStyle = "#1a2838";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x, ground - 180);
          ctx.quadraticCurveTo(x + 60, ground - 40, x + 120, ground - 160);
          ctx.stroke();
          ctx.fillStyle = pal.decor;
          ctx.fillRect(x + 8, ground - 90, 28, 90);
          ctx.fillStyle = pal.neon + "66";
          ctx.fillRect(x + 8, ground - 90, 28, 5);
        } else if (theme === "spikes" || theme === "boss") {
          // Hazard barrel
          ctx.fillStyle = "#3a1018";
          ctx.fillRect(x + 6, ground - 48, 36, 48);
          ctx.fillStyle = "#ff4466";
          ctx.globalAlpha = 0.7 + Math.sin(t * 4 + i) * 0.2;
          ctx.fillRect(x + 10, ground - 40, 28, 8);
          ctx.fillRect(x + 14, ground - 28, 20, 6);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#ff6688";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 6, ground - 48, 36, 48);
        } else if (theme === "hq") {
          // Neon billboard stub
          ctx.fillStyle = "#2a1038";
          ctx.fillRect(x, ground - 70, 70, 50);
          ctx.fillStyle = pal.neon;
          ctx.globalAlpha = 0.6 + Math.sin(t * 2 + i) * 0.25;
          ctx.fillRect(x + 6, ground - 62, 58, 12);
          ctx.fillRect(x + 10, ground - 42, 40, 8);
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#1a0818";
          ctx.fillRect(x + 28, ground - 20, 14, 20);
        } else {
          // Dunes / storm: cactus-like neon rock
          ctx.fillStyle = pal.near;
          ctx.fillRect(x + 14, ground - 70, 18, 70);
          ctx.fillRect(x, ground - 45, 14, 12);
          ctx.fillRect(x + 32, ground - 55, 14, 12);
          ctx.fillStyle = pal.neon + "44";
          ctx.fillRect(x + 14, ground - 70, 18, 4);
        }
      } else {
        // Shrine-style pedestal / floating rune stone
        const pulse = 0.5 + Math.sin(t * 2.5 + i * 0.7) * 0.3;
        ctx.fillStyle = pal.decor;
        ctx.fillRect(x + 8, ground - 40, 44, 40);
        ctx.fillStyle = "#0a0610";
        ctx.fillRect(x + 14, ground - 32, 32, 24);
        ctx.save();
        ctx.shadowColor = pal.neon;
        ctx.shadowBlur = 14 * pulse;
        ctx.fillStyle = pal.neon;
        ctx.globalAlpha = 0.55 + pulse * 0.35;
        ctx.fillRect(x + 20, ground - 26, 20, 12);
        ctx.restore();
        ctx.globalAlpha = 1;
        // Floating diamond above
        ctx.save();
        ctx.translate(x + 30, ground - 58 + Math.sin(t * 3 + i) * 4);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = pal.neon + "aa";
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
      }
    }

    // Occasional long cable / power line for bridges & hq
    if (theme === "bridges" || theme === "hq" || theme === "vertical") {
      ctx.strokeStyle = pal.neon + "33";
      ctx.lineWidth = 2;
      for (let c = 0; c < 3; c++) {
        const y0 = ground - 200 - c * 40;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        for (let sx = 0; sx < 2000; sx += 80) {
          ctx.lineTo(sx, y0 + Math.sin(sx * 0.02 + c) * 12);
        }
        ctx.stroke();
      }
    }
  }

  private drawPlatform(ctx: CanvasRenderingContext2D, p: Platform) {
    if (p.gone) return;
    if (p.job === "seed") {
      this.drawSeedBlock(ctx, p);
      return;
    }
    if (p.job === "cheer") {
      this.drawCheerCage(ctx, p);
      return;
    }
    if (p.job === "shock") {
      this.drawShock(ctx, p);
      return;
    }
    if (p.job === "crumble") {
      this.drawCrumble(ctx, p);
      return;
    }
    if (p.job === "bridge" || p.job === "bridge-go") {
      this.drawShotBridge(ctx, p);
      return;
    }
    if (p.job === "shoot") {
      this.drawShootPlate(ctx, p);
      return;
    }
    if (p.kind === "checkpoint") {
      const on = !!p.active;
      const col = on ? "#39ff9a" : "#c77dff";
      // Pole
      ctx.fillStyle = "#1a1220";
      ctx.fillRect(p.x + 11, p.y, 5, p.h);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(p.x + 12, p.y, 3, p.h);
      ctx.globalAlpha = 1;
      // Flag
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = on ? 14 : 6;
      ctx.fillStyle = col;
      const flutter = Math.sin(this.time * (on ? 6 : 2) + p.x) * 3;
      ctx.beginPath();
      ctx.moveTo(p.x + 16, p.y + 2);
      ctx.lineTo(p.x + 42 + flutter, p.y + 14);
      ctx.lineTo(p.x + 16, p.y + 26);
      ctx.closePath();
      ctx.fill();
      // Base plate
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#2a1a30";
      ctx.fillRect(p.x + 4, p.y + p.h - 6, 20, 6);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(p.x + 6, p.y + p.h - 5, 16, 2);
      ctx.restore();
      return;
    }
    if (p.kind === "goal") {
      if (p.job === "don" || p.id === "don") {
        this.drawDonPortal(ctx, p);
        return;
      }
      if (p.job === "drop") {
        this.drawDropShaft(ctx, p);
        return;
      }
      const on = p.active !== false;
      const gPulse = 0.7 + Math.sin(this.time * 4) * 0.3;
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h * 0.42;
      const rx = 18 + gPulse * 3;
      const ry = 26 + gPulse * 4;
      ctx.save();
      ctx.shadowColor = on ? "#00f0ff" : "#7a4aa0";
      ctx.shadowBlur = on ? 18 + gPulse * 10 : 6;
      ctx.strokeStyle = on ? "#00f0ff" : "#c77dff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = on ? "#ff2bd6" : "#5a3060";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = on ? 0.22 * gPulse : 0.08;
      ctx.fillStyle = "#00f0ff";
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.45, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = on ? 0.2 * gPulse : 0.08;
      ctx.fillRect(cx - 2, p.y - 36, 4, 36);
      ctx.restore();
      if (p.job === "extract") {
        ctx.save();
        ctx.fillStyle = on ? "#ffcc33" : "#7a4aa0";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("EXTRACT", cx, p.y - 8);
        ctx.restore();
      }
      if (this.level.horde) this.drawCageBars(ctx, p.x - 16, p.y - 20, p.w + 36, p.h + 28, on);
      return;
    }
    if (p.kind === "spring") {
      const bounce = 1 + Math.sin(this.time * 6 + p.x * 0.05) * 0.08;
      const dy = (1 - bounce) * 6;
      ctx.save();
      ctx.shadowColor = "#ff2bd6";
      ctx.shadowBlur = 12 + Math.sin(this.time * 5) * 4;
      this.drawSpriteSheet(
        ctx,
        this.imgs.props,
        1,
        p.x - 4,
        p.y - 8 + dy,
        p.w + 8,
        (p.h + 12) * bounce,
        false,
      );
      // Pulse ring under spring
      ctx.globalAlpha = 0.35 + Math.sin(this.time * 5) * 0.15;
      ctx.strokeStyle = "#ff2bd6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h, 18 + Math.sin(this.time * 4) * 3, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (p.kind === "hazard") {
      ctx.fillStyle = "#1a0818";
      ctx.fillRect(p.x, p.y + 8, p.w, p.h);
      const spikes = Math.floor(p.w / 12);
      const throb = 0.85 + Math.sin(this.time * 7 + p.x * 0.1) * 0.15;
      for (let i = 0; i < spikes; i++) {
        const sx = p.x + i * 12 + 2;
        const tip = p.y + (1 - throb) * 4;
        ctx.fillStyle = i % 2 === 0 ? "#ff4466" : "#ff6a88";
        ctx.beginPath();
        ctx.moveTo(sx, p.y + p.h);
        ctx.lineTo(sx + 5, tip);
        ctx.lineTo(sx + 10, p.y + p.h);
        ctx.fill();
      }
      // Danger glow
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(this.time * 6) * 0.1;
      ctx.shadowColor = "#ff4466";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ff4466";
      ctx.fillRect(p.x, p.y + p.h - 4, p.w, 3);
      ctx.restore();
      return;
    }

    // Kind-specific detailed platforms (not flat neon boxes)
    if (p.kind === "oneway") {
      this.drawOnewayPlate(ctx, p);
      return;
    }
    if (p.kind === "moving") {
      this.drawMovingRail(ctx, p);
      return;
    }
    if (p.kind === "conveyor") {
      this.drawConveyorBelt(ctx, p);
      return;
    }
    this.drawRockLedge(ctx, p);
  }

  private drawShootPlate(ctx: CanvasRenderingContext2D, p: Platform) {
    ctx.save();
    ctx.fillStyle = "#071820";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 12;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SHOOT", p.x + p.w * 0.5, p.y + p.h * 0.7);
    ctx.restore();
  }

  private drawDropShaft(ctx: CanvasRenderingContext2D, p: Platform) {
    ctx.save();
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h + 40);
    g.addColorStop(0, "rgba(0,0,0,0.15)");
    g.addColorStop(1, "rgba(0,240,255,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = "#ff2bd6";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 10;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.restore();
  }

  private drawCageBars(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    open: boolean,
  ) {
    ctx.save();
    ctx.strokeStyle = open ? "#ffcc33" : "#ff2bd6";
    ctx.lineWidth = 4;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.strokeRect(x, y, w, h);
    ctx.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      const bx = x + (w / 5) * i;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx, y + h);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCrumble(ctx: CanvasRenderingContext2D, p: Platform) {
    const k = Math.min(1, (p.timer ?? 0) / (p.crumble ?? 0.5));
    ctx.save();
    ctx.fillStyle = "#6a3a28";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#c47a45";
    ctx.fillRect(p.x, p.y, p.w, 6);
    ctx.strokeStyle = `rgba(20,8,4,${0.35 + k * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + 8, p.y + 4);
    ctx.lineTo(p.x + p.w * (0.3 + k * 0.4), p.y + p.h);
    ctx.moveTo(p.x + p.w * 0.6, p.y);
    ctx.lineTo(p.x + p.w * 0.4, p.y + p.h);
    ctx.stroke();
    ctx.restore();
  }

  private drawShotBridge(ctx: CanvasRenderingContext2D, p: Platform) {
    const go = p.job === "bridge-go";
    ctx.save();
    ctx.fillStyle = go ? "#ff4466" : "#1a3a55";
    ctx.fillRect(p.x, p.y, p.w, 16);
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = go ? 4 : 12;
    ctx.strokeRect(p.x, p.y, p.w, 16);
    const cx = p.x + p.w * 0.5;
    const cy = p.y + 36;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.moveTo(cx - 22, cy);
    ctx.lineTo(cx + 22, cy);
    ctx.moveTo(cx, cy - 22);
    ctx.lineTo(cx, cy + 22);
    ctx.stroke();
    ctx.restore();
  }

  private drawCheerCage(ctx: CanvasRenderingContext2D, p: Platform) {
    this.drawCageBars(ctx, p.x, p.y, p.w, p.h, false);
    ctx.save();
    ctx.fillStyle = "#ffcc33";
    ctx.font = "10px sans-serif";
    ctx.fillText("SHOOT", p.x + 6, p.y + p.h + 12);
    ctx.restore();
  }

  private drawShock(ctx: CanvasRenderingContext2D, p: Platform) {
    ctx.save();
    ctx.strokeStyle = "#7ef9ff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 12;
    const bolts = Math.max(1, Math.floor(p.w / 18));
    for (let i = 0; i < bolts; i++) {
      const x = p.x + 8 + i * 18;
      const jag = Math.sin(this.time * 18 + i) * 4;
      ctx.beginPath();
      ctx.moveTo(x, p.y);
      ctx.lineTo(x + jag, p.y + p.h * 0.45);
      ctx.lineTo(x - jag, p.y + p.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSeedBlock(ctx: CanvasRenderingContext2D, p: Platform) {
    ctx.save();
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, "#ffe66a");
    g.addColorStop(1, "#ff2bd6");
    ctx.fillStyle = g;
    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 10);
    ctx.fill();
    ctx.strokeStyle = "#1a0614";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + 8, p.y + 8);
    ctx.lineTo(p.x + p.w - 10, p.y + p.h - 6);
    ctx.moveTo(p.x + p.w - 12, p.y + 10);
    ctx.lineTo(p.x + 10, p.y + p.h - 8);
    ctx.stroke();
    ctx.restore();
  }

  private drawDonPortal(ctx: CanvasRenderingContext2D, p: Platform) {
    const cx = p.x + p.w * 0.5;
    const bob = Math.sin(this.time * 3) * 4;
    ctx.save();
    ctx.fillStyle = "#140810";
    ctx.beginPath();
    ctx.ellipse(cx, p.y + p.h * 0.55 + bob, 26, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(cx - 22, p.y + 8 + bob, 44, 8);
    ctx.fillStyle = "#00f0ff";
    ctx.fillRect(cx - 10, p.y + 28 + bob, 6, 3);
    ctx.fillRect(cx + 4, p.y + 28 + bob, 6, 3);
    ctx.strokeStyle = "#ff2bd6";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 12;
    ctx.strokeRect(p.x - 6, p.y, p.w + 12, p.h);
    ctx.restore();
  }

  private drawHoneyBun(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.fillStyle = "#e8b15a";
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillRect(x - 12, y - 4, 24, 5);
    ctx.fillStyle = "#00f0ff";
    ctx.fillRect(x - 8, y - 3, 5, 3);
    ctx.fillRect(x + 3, y - 3, 5, 3);
    ctx.restore();
  }

  private drawConveyorBelt(ctx: CanvasRenderingContext2D, p: Platform) {
    const { x, y, w } = p;
    const dir = Math.sign(p.vx ?? 80) || 1;
    const speed = Math.abs(p.vx ?? 80);
    const pulse = 0.65 + Math.sin(this.time * 6) * 0.2;
    const scroll = ((this.time * speed * 0.45) % 22) * dir;
    const hh = 28;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(x + 4, y + hh, w - 8, 6);
    const body = ctx.createLinearGradient(x, y, x, y + hh);
    body.addColorStop(0, "#b8ff9a");
    body.addColorStop(0.35, "#3dff6a");
    body.addColorStop(1, "#0a3a18");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.roundRect(x, y, w, hh, 5);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 6, y + 6, w - 12, 16);
    ctx.clip();
    ctx.fillStyle = "rgba(10,40,16,0.45)";
    for (let i = -2; i < w / 22 + 3; i++) {
      const ax = x + i * 22 + scroll;
      ctx.beginPath();
      ctx.moveTo(ax, y + 8);
      ctx.lineTo(ax + 10 * dir, y + 14);
      ctx.lineTo(ax, y + 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.shadowColor = "#3dff6a";
    ctx.shadowBlur = 12 * pulse;
    ctx.strokeStyle = `rgba(180,255,160,${0.75 + pulse * 0.2})`;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, hh - 1);
    ctx.restore();
  }

  /** Theme-aware solid ledges — rock / metal / tech / crimson variants, large features for mobile */
  private drawRockLedge(ctx: CanvasRenderingContext2D, p: Platform) {
    const x = p.x;
    const y = p.y;
    const w = p.w;
    const h = p.h;
    const rimPulse = 0.6 + Math.sin(this.time * 2.2 + x * 0.01) * 0.12;
    const lip = Math.min(16, Math.max(11, Math.floor(h * 0.36)));
    const theme = this.level?.theme ?? "dunes";
    const pal = this.themePalette();

    // Material kits — high contrast, large blocks so 1px details don't vanish on phone
    type Mat = {
      body0: string; body1: string; body2: string;
      brickA: string; brickB: string; brickHi: string;
      top0: string; top1: string; top2: string; top3: string;
      edge: string; rim: string; rimGlow: string; bolt: string; stroke: string;
    };
    const mats: Record<string, Mat> = {
      dunes: {
        body0: "#5c3424", body1: "#3a2014", body2: "#140a08",
        brickA: "rgba(100,60,38,0.7)", brickB: "rgba(35,18,12,0.6)", brickHi: "rgba(255,200,150,0.12)",
        top0: "#ffe0b0", top1: "#ffb05a", top2: "#d07838", top3: "#5c3424",
        edge: "#8a4a28", rim: "#ffc878", rimGlow: "#ff9f43", bolt: "#ffe0b0", stroke: "rgba(255,180,100,0.45)",
      },
      storm: {
        body0: "#5a5040", body1: "#383028", body2: "#181410",
        brickA: "rgba(90,80,60,0.7)", brickB: "rgba(40,35,28,0.6)", brickHi: "rgba(255,230,180,0.1)",
        top0: "#f0e0c0", top1: "#d0b080", top2: "#a08858", top3: "#504830",
        edge: "#706050", rim: "#ffcc66", rimGlow: "#ffaa33", bolt: "#fff0c0", stroke: "rgba(255,220,140,0.4)",
      },
      bridges: {
        body0: "#2a4868", body1: "#183048", body2: "#0a1420",
        brickA: "rgba(50,90,120,0.65)", brickB: "rgba(20,40,60,0.55)", brickHi: "rgba(160,220,255,0.12)",
        top0: "#c0e8ff", top1: "#70b0e0", top2: "#4080b0", top3: "#204060",
        edge: "#306080", rim: "#7ef9ff", rimGlow: "#00e0ff", bolt: "#e0f8ff", stroke: "rgba(120,220,255,0.45)",
      },
      vertical: {
        body0: "#384878", body1: "#283050", body2: "#101828",
        brickA: "rgba(70,90,140,0.65)", brickB: "rgba(30,40,70,0.55)", brickHi: "rgba(180,200,255,0.12)",
        top0: "#d0e0ff", top1: "#90a8e0", top2: "#6070b0", top3: "#304060",
        edge: "#405080", rim: "#c0a0ff", rimGlow: "#a070ff", bolt: "#e8e0ff", stroke: "rgba(180,160,255,0.45)",
      },
      hq: {
        body0: "#482868", body1: "#301848", body2: "#140820",
        brickA: "rgba(90,50,120,0.65)", brickB: "rgba(40,20,60,0.55)", brickHi: "rgba(255,160,255,0.12)",
        top0: "#ffb0f0", top1: "#e060c0", top2: "#a03090", top3: "#501860",
        edge: "#703088", rim: "#ff6ad5", rimGlow: "#ff2bd6", bolt: "#ffd0f0", stroke: "rgba(255,120,220,0.45)",
      },
      spikes: {
        body0: "#4a2030", body1: "#301018", body2: "#140808",
        brickA: "rgba(100,40,50,0.7)", brickB: "rgba(40,15,20,0.6)", brickHi: "rgba(255,140,150,0.12)",
        top0: "#ffb0a0", top1: "#e06060", top2: "#a03040", top3: "#501828",
        edge: "#803040", rim: "#ff6688", rimGlow: "#ff4466", bolt: "#ffd0d0", stroke: "rgba(255,120,140,0.45)",
      },
      boss: {
        body0: "#401030", body1: "#280818", body2: "#100408",
        brickA: "rgba(90,30,50,0.7)", brickB: "rgba(40,10,20,0.6)", brickHi: "rgba(255,80,160,0.14)",
        top0: "#ff80c0", top1: "#e04080", top2: "#a02050", top3: "#400820",
        edge: "#702040", rim: "#ff2bd6", rimGlow: "#ff4466", bolt: "#ffb0d0", stroke: "rgba(255,80,180,0.5)",
      },
    };
    const m = mats[theme] ?? mats.dunes!;
    const form = p.form ?? (theme === "dunes" ? "mesa" : theme === "bridges" ? "deck" : theme === "spikes" ? "tooth" : theme === "storm" ? "wreck" : theme === "vertical" ? "girder" : theme === "hq" ? "panel" : theme === "boss" ? "hex" : "slab");

    // Visual body is TALLER than the hitbox so short ledges still read as buttes / pylons.
    const visH =
      form === "mesa" ? Math.max(h + 62, 118)
      : form === "bowl" ? Math.max(h + 50, 100)
      : form === "steps" ? Math.max(h + 40, 96)
      : form === "arch" ? Math.max(h + 36, 100)
      : form === "ramp" ? h + 36
      : form === "mushroom" ? h + 48
      : form === "cantilever" ? h + 28
      : form === "tooth" ? h + 34
      : form === "wreck" ? h + 28
      : form === "pillar" ? Math.max(h + 20, 90)
      : form === "hex" ? h + 16
      : form === "slab" ? h + 22
      : h + 10;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + visH + 8, w * 0.38, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    this.pathPlatformForm(ctx, x, y, w, visH, form, p.x);
    ctx.clip();

    const bodyGrad = ctx.createLinearGradient(x, y, x, y + visH);
    bodyGrad.addColorStop(0, m.body0);
    bodyGrad.addColorStop(0.35, m.body1);
    bodyGrad.addColorStop(1, m.body2);
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(x - 28, y - 8, w + 56, visH + 28);

    if (form === "mesa" || form === "slab" || form === "tooth") {
      // Big sedimentary bands — not a brick wall
      for (let i = 0; i < 8; i++) {
        const sy = y + 16 + i * 14;
        ctx.fillStyle = i % 2 === 0 ? "rgba(0,0,0,0.28)" : "rgba(255,200,140,0.08)";
        ctx.beginPath();
        ctx.moveTo(x - 20, sy);
        ctx.lineTo(x + w + 20, sy + (i % 3) * 3);
        ctx.lineTo(x + w + 20, sy + 7);
        ctx.lineTo(x - 20, sy + 5);
        ctx.fill();
      }
      // Crack
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.35, y + 18);
      ctx.lineTo(x + w * 0.32, y + visH * 0.7);
      ctx.lineTo(x + w * 0.4, y + visH - 8);
      ctx.stroke();
    } else if (form === "panel" || form === "girder" || form === "hex") {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(x + 8, y + 14, w - 16, visH - 24);
      ctx.strokeStyle = m.stroke;
      ctx.strokeRect(x + 8, y + 14, w - 16, visH - 24);
    } else if (form === "wreck") {
      ctx.fillStyle = m.brickA;
      ctx.fillRect(x + 10, y + 18, w * 0.4, 10);
      ctx.strokeStyle = "#2a2010";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 12);
      ctx.lineTo(x + w - 10, y + visH - 10);
      ctx.stroke();
    }

    const topGrad = ctx.createLinearGradient(x, y, x, y + 16);
    topGrad.addColorStop(0, m.top0);
    topGrad.addColorStop(0.45, m.top1);
    topGrad.addColorStop(1, m.top3);
    ctx.fillStyle = topGrad;
    ctx.fillRect(x - 20, y - 2, w + 40, 16);
    ctx.fillStyle = `rgba(255,255,255,${0.5 * rimPulse})`;
    ctx.fillRect(x + 8, y + 2, w - 16, 3);
    ctx.restore();

    ctx.save();
    this.pathPlatformForm(ctx, x, y, w, visH, form, p.x);
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowColor = m.rimGlow;
    ctx.shadowBlur = 16 + rimPulse * 10;
    ctx.strokeStyle = m.rim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 1, y + 1);
    ctx.lineTo(x + w + 1, y + 1);
    ctx.stroke();
    ctx.restore();

    if (form === "mesa" || form === "slab") {
      // Tiny cap rocks sitting on the walk line — breaks the postage-stamp read
      ctx.fillStyle = m.top2;
      ctx.fillRect(x + 10, y - 7, 16, 8);
      ctx.fillRect(x + w - 28, y - 6, 12, 7);
    }

    if (form === "deck") {
      ctx.save();
      ctx.strokeStyle = pal.neon;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 8, y);
      ctx.quadraticCurveTo(x + w * 0.5, y - 36, x + w - 8, y);
      ctx.stroke();
      ctx.fillStyle = m.body1;
      ctx.fillRect(x - 7, y - 4, 10, visH + 8);
      ctx.fillRect(x + w - 3, y - 4, 10, visH + 8);
      ctx.restore();
    }

    if (form === "pillar") {
      ctx.fillStyle = m.bolt;
      for (let i = 1; i < visH / 16; i++) {
        ctx.fillRect(x + 3, y + i * 16, 7, 3);
        ctx.fillRect(x + w - 10, y + i * 16, 7, 3);
      }
    }
  }

  /** Non-rectangular walkable silhouettes. Top edge stays flat at y for collision honesty. */
  private pathPlatformForm(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    form: string,
    seed: number,
  ) {
    const inset = Math.min(22, w * 0.14);
    ctx.beginPath();
    if (form === "mesa") {
      const heel = Math.min(40, w * 0.22);
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + w - 2, y);
      ctx.lineTo(x + w + 10, y + 14);
      ctx.lineTo(x + w - heel, y + h);
      ctx.quadraticCurveTo(x + w * 0.7, y + h + 18, x + w * 0.52, y + h - 12);
      ctx.quadraticCurveTo(x + w * 0.28, y + h + 16, x + heel, y + h);
      ctx.lineTo(x - 10, y + 14);
    } else if (form === "tooth") {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h * 0.45);
      const teeth = Math.max(3, Math.floor(w / 18));
      for (let i = teeth; i >= 0; i--) {
        const tx = x + (w * i) / teeth;
        const tip = y + h + (i % 2 === 0 ? 10 : 2);
        ctx.lineTo(tx, tip);
      }
    } else if (form === "wreck") {
      const jig = ((seed * 13) % 9) - 4;
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + w - 8, y);
      ctx.lineTo(x + w + 4, y + 8 + jig);
      ctx.lineTo(x + w - 10, y + h - 4);
      ctx.lineTo(x + w * 0.55, y + h + 6);
      ctx.lineTo(x + 8, y + h - 2);
      ctx.lineTo(x - 6, y + 10);
    } else if (form === "girder" || form === "deck") {
      ctx.moveTo(x - 2, y);
      ctx.lineTo(x + w + 2, y);
      ctx.lineTo(x + w - 4, y + h);
      ctx.lineTo(x + 4, y + h);
    } else if (form === "pillar") {
      ctx.moveTo(x + 6, y);
      ctx.lineTo(x + w - 6, y);
      ctx.lineTo(x + w, y + 10);
      ctx.lineTo(x + w - 4, y + h);
      ctx.lineTo(x + 4, y + h);
      ctx.lineTo(x, y + 10);
    } else if (form === "panel") {
      const c = 10;
      ctx.moveTo(x + c, y);
      ctx.lineTo(x + w - c, y);
      ctx.lineTo(x + w, y + c);
      ctx.lineTo(x + w, y + h - c);
      ctx.lineTo(x + w - c, y + h);
      ctx.lineTo(x + c, y + h);
      ctx.lineTo(x, y + h - c);
      ctx.lineTo(x, y + c);
    } else if (form === "hex") {
      ctx.moveTo(x + w * 0.18, y);
      ctx.lineTo(x + w * 0.82, y);
      ctx.lineTo(x + w + 4, y + h * 0.5);
      ctx.lineTo(x + w * 0.82, y + h);
      ctx.lineTo(x + w * 0.18, y + h);
      ctx.lineTo(x - 4, y + h * 0.5);
    } else if (form === "bowl") {
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + w - 2, y);
      ctx.lineTo(x + w - 8, y + 16);
      ctx.quadraticCurveTo(x + w * 0.5, y + h + 28, x + 8, y + 16);
    } else if (form === "ramp") {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + 12);
      ctx.lineTo(x + 10, y + h);
      ctx.lineTo(x, y + h * 0.45);
    } else if (form === "steps") {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + 18);
      ctx.lineTo(x + w * 0.72, y + 18);
      ctx.lineTo(x + w * 0.72, y + 36);
      ctx.lineTo(x + w * 0.44, y + 36);
      ctx.lineTo(x + w * 0.44, y + 54);
      ctx.lineTo(x + 8, y + h);
      ctx.lineTo(x, y + 20);
    } else if (form === "arch") {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w * 0.72, y + h);
      ctx.lineTo(x + w * 0.72, y + 28);
      ctx.quadraticCurveTo(x + w * 0.5, y + 8, x + w * 0.28, y + 28);
      ctx.lineTo(x + w * 0.28, y + h);
      ctx.lineTo(x, y + h);
    } else if (form === "cantilever") {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + 16);
      ctx.lineTo(x + 22, y + 16);
      ctx.lineTo(x + 22, y + h);
      ctx.lineTo(x, y + h);
    } else if (form === "mushroom") {
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + w - 4, y);
      ctx.lineTo(x + w + 8, y + 20);
      ctx.lineTo(x + w * 0.62, y + 26);
      ctx.lineTo(x + w * 0.62, y + h);
      ctx.lineTo(x + w * 0.38, y + h);
      ctx.lineTo(x + w * 0.38, y + 26);
      ctx.lineTo(x - 8, y + 20);
    } else {
      // slab — slight under-bevel so it isn't a postage stamp
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - 6, y + h);
      ctx.lineTo(x + 6, y + h);
    }
    ctx.closePath();
  }

  /** Magenta one-way — thick glass + large up arrows */
  private drawOnewayPlate(ctx: CanvasRenderingContext2D, p: Platform) {
    const { x, y, w, h } = p;
    const pulse = 0.55 + Math.sin(this.time * 3.5 + x * 0.02) * 0.2;

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(x + 4, y + h, w - 6, 6);

    // Thin glass catwalk — not a candy brick
    ctx.save();
    ctx.strokeStyle = "rgba(255,43,214,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y + h + 18);
    ctx.lineTo(x + 8, y + 4);
    ctx.moveTo(x + w * 0.85, y + h + 18);
    ctx.lineTo(x + w - 8, y + 4);
    ctx.stroke();
    ctx.restore();

    const g = ctx.createLinearGradient(x, y, x, y + 16);
    g.addColorStop(0, "rgba(255,180,240,0.95)");
    g.addColorStop(0.45, "rgba(255,43,214,0.75)");
    g.addColorStop(1, "rgba(40,8,40,0.35)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, w, Math.min(h, 16), 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,200,250,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 14;
    ctx.fillStyle = `rgba(255,160,240,${0.85 + pulse * 0.15})`;
    ctx.fillRect(x + 1, y + 1, w - 2, 6);
    ctx.restore();

    const chevN = Math.max(1, Math.floor(w / 30));
    for (let i = 0; i < chevN; i++) {
      const cx = x + (w / (chevN + 1)) * (i + 1);
      const cy = y + h * 0.58;
      ctx.fillStyle = `rgba(255,200,250,${0.6 + pulse * 0.35})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx + 8, cy + 5);
      ctx.lineTo(cx - 8, cy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 6, cy + 9);
      ctx.lineTo(cx - 6, cy + 9);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = `rgba(255,138,232,${0.75 + pulse * 0.2})`;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  /** Cyan moving rail — panel seams, big rivets, thrusters */
  private drawMovingRail(ctx: CanvasRenderingContext2D, p: Platform) {
    const { x, y, w, h } = p;
    const phase = p.phase ?? 0;
    const dir =
      p.originX != null && p.range != null && p.vx != null
        ? Math.cos(phase * (p.vx / 40))
        : 0;
    const pulse = 0.6 + Math.sin(this.time * 5 + x * 0.02) * 0.25;

    ctx.save();
    for (let g = 1; g <= 4; g++) {
      ctx.globalAlpha = 0.12 / g;
      ctx.fillStyle = "#7ef9ff";
      ctx.fillRect(x - dir * g * 8, y + 1, w, h - 2);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(x + 4, y + h, w - 6, 6);

    const body = ctx.createLinearGradient(x, y, x, y + h);
    body.addColorStop(0, "#2a6080");
    body.addColorStop(0.35, "#0d3048");
    body.addColorStop(1, "#040c14");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.roundRect(x - 2, y, w + 4, Math.max(18, h * 0.7), 6);
    ctx.fill();
    // Underside thrusters
    ctx.fillStyle = `rgba(0,240,255,${0.35 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.25, y + h + 2, 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.75, y + h + 2, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const panels = Math.max(2, Math.floor(w / 22));
    for (let i = 0; i < panels; i++) {
      const px = x + 3 + i * (w / panels);
      const pw = w / panels - 5;
      ctx.fillStyle = i % 2 === 0 ? "rgba(0,240,255,0.12)" : "rgba(0,0,0,0.3)";
      ctx.fillRect(px, y + 9, pw, h - 18);
      ctx.strokeStyle = "rgba(126,249,255,0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, y + 9.5, pw - 1, h - 19);
      ctx.fillStyle = "#b8ffff";
      for (const [rx, ry] of [
        [px + 4, y + 13],
        [px + pw - 4, y + 13],
        [px + 4, y + h - 13],
        [px + pw - 4, y + h - 13],
      ] as const) {
        ctx.beginPath();
        ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 14 * pulse;
    ctx.fillStyle = "rgba(180,255,255,0.95)";
    ctx.fillRect(x + 1, y + 1, w - 2, 7);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.55 + pulse * 0.35;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#7ef9ff";
    const tx = dir >= 0 ? x + 6 : x + w - 18;
    ctx.fillRect(tx, y + h - 9, 12, 6);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.75;
    ctx.fillRect(tx + 2, y + h - 8, 8, 2);
    ctx.restore();

    ctx.strokeStyle = `rgba(126,249,255,${0.7 + pulse * 0.25})`;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private drawBirdOutlined(ctx: CanvasRenderingContext2D, b: Bird) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const hit = (b.hitFlash ?? 0) > 0;
    const wind = (b.windup ?? 0) > 0;
    const windT = b.windup ?? 0;
    ctx.save();
    if (wind) {
      const warn = 20 + (0.45 - windT) * 50;
      ctx.strokeStyle = `rgba(255,80,60,${0.25 + windT})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, warn, warn * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (hit) {
      ctx.strokeStyle = "rgba(255,43,214,0.75)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, b.w * 0.55, b.h * 0.48, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const flap = b.flap ?? 1;
    const vis = 1.15;
    const dw = b.w * (2 - flap) * vis;
    const dh = b.h * flap * vis;
    const dx = cx - dw / 2;
    const dy = cy - dh / 2;
    this.drawSpriteSheet(ctx, this.imgs.bird, b.frame, dx, dy, dw, dh, b.vx > 0);
    ctx.restore();
  }

  private drawBoss(ctx: CanvasRenderingContext2D, b: BossState) {
    const pulse = 1 + Math.sin(this.time * 6) * 0.04;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.save();
    if (b.flash > 0 && Math.floor(this.time * 30) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }
    // Light outline so boss pops from background
    ctx.shadowColor = "#e8ffff";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = "#f5fffd";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, b.w * 0.55, b.h * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Ground projector so the boss occupies space
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "rgba(8,0,16,0.8)";
    ctx.beginPath();
    ctx.ellipse(cx, b.y + b.h + 6, b.w * 0.42, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Wing aura
    ctx.shadowColor = b.phase === 3 ? "#ffcc33" : "#ff2bd6";
    ctx.shadowBlur = 22;
    const wing = 38 * pulse + b.phase * 4;
    ctx.fillStyle = "rgba(255,43,214,0.25)";
    ctx.beginPath();
    ctx.ellipse(cx - 36, cy + 8, wing, wing * 0.55, -0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + 36, cy + 8, wing, wing * 0.55, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Phase corona
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.22 + b.phase * 0.06;
    const corona = ctx.createRadialGradient(cx, cy, 20, cx, cy, 80 + b.phase * 10);
    corona.addColorStop(0, b.phase === 3 ? "rgba(255,204,51,0.45)" : "rgba(255,43,214,0.4)");
    corona.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(cx, cy, 86 + b.phase * 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Don Corvone sheet (fedora + chain). Fallback to grunt raven.
    const frame = Math.floor(b.t * 6) % 4;
    this.drawSpriteSheet(ctx, this.imgs.boss || this.imgs.bird, frame, b.x, b.y, b.w, b.h, b.vx > 0);
    // Phase ring — flashes white/gold when boss takes damage
    const hitBoss = b.flash > 0;
    ctx.strokeStyle = hitBoss
      ? "#ffffff"
      : b.phase === 1
        ? "#00f0ff"
        : b.phase === 2
          ? "#ff2bd6"
          : "#ffcc33";
    ctx.lineWidth = hitBoss ? 5 : 3;
    ctx.shadowColor = hitBoss ? "#ffcc33" : ctx.strokeStyle;
    ctx.shadowBlur = hitBoss ? 22 : 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 58 + b.phase * 6 + (hitBoss ? 6 : 0), 0, Math.PI * 2);
    ctx.stroke();
    if (hitBoss) {
      ctx.strokeStyle = "#ff4466";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 70 + b.phase * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // HP bar under boss
    const bw = 120;
    const pct = Math.max(0, b.hp / b.maxHp);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1c1030";
    ctx.fillRect(cx - bw / 2, b.y - 18, bw, 8);
    ctx.fillStyle = pct > 0.33 ? "#ff2bd6" : "#ff4466";
    ctx.fillRect(cx - bw / 2, b.y - 18, bw * pct, 8);
    ctx.strokeStyle = "#f4e8ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - bw / 2, b.y - 18, bw, 8);
    ctx.fillStyle = "#f4e8ff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`DON CORVONE · P${b.phase}`, cx, b.y - 24);
    if (this.level.operation === 1) this.drawHoneyBun(ctx, b.x + b.w - 6, b.y + 16);
    ctx.restore();
  }

  private drawJetpackFlame(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.save();
    const flick = 0.85 + Math.sin(this.time * 28) * 0.15;
    ctx.globalCompositeOperation = "lighter";
    // Wide additive bloom
    const bloom = ctx.createRadialGradient(cx, cy + 8, 0, cx, cy + 10, 28);
    bloom.addColorStop(0, "rgba(255,255,255,0.55)");
    bloom.addColorStop(0.35, "rgba(0,240,255,0.35)");
    bloom.addColorStop(1, "rgba(0,240,255,0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 18, 22 * flick, 0, 0, Math.PI * 2);
    ctx.fill();
    // Outer cyan cone
    const g = ctx.createLinearGradient(cx, cy, cx, cy + 34 * flick);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.22, "rgba(0,240,255,0.95)");
    g.addColorStop(0.55, "rgba(255,43,214,0.35)");
    g.addColorStop(1, "rgba(0,240,255,0)");
    ctx.fillStyle = g;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy);
    ctx.lineTo(cx + 11, cy);
    ctx.lineTo(cx + 5 * flick, cy + 32 * flick);
    ctx.lineTo(cx - 5 * flick, cy + 32 * flick);
    ctx.closePath();
    ctx.fill();
    // Hot core
    ctx.fillStyle = "rgba(220,255,255,0.95)";
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx, cy + 18 * flick);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawShieldAura(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const pulse = 1 + Math.sin(this.time * 10) * 0.06;
    const r = 48 * pulse;
    ctx.save();
    // Magenta outer ring
    ctx.strokeStyle = "rgba(255,43,214,0.85)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.stroke();
    // Cyan inner ring
    ctx.strokeStyle = "rgba(0,240,255,0.9)";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.stroke();
    // Soft fill
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, r + 6);
    g.addColorStop(0, "rgba(0,240,255,0.12)");
    g.addColorStop(0.55, "rgba(255,43,214,0.1)");
    g.addColorStop(1, "rgba(0,240,255,0)");
    ctx.fillStyle = g;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fill();
    // Orbit sparks
    for (let i = 0; i < 6; i++) {
      const a = this.time * 4 + (i * Math.PI) / 3;
      const sx = cx + Math.cos(a) * r;
      const sy = cy + Math.sin(a) * r;
      ctx.fillStyle = i % 2 === 0 ? "#00f0ff" : "#ff2bd6";
      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }
    ctx.restore();
  }

  private currentHeroSheet(): HTMLImageElement | HTMLCanvasElement | undefined {
    if (this.character === "grok") {
      if (this.hurtPoseT > 0 && this.imgs.grokHurt) return this.imgs.grokHurt;
      if (this.attackT > 0 && this.imgs.grokAttack) return this.imgs.grokAttack;
      if (!this.grounded) return this.imgs.grokJump;
      if (Math.abs(this.pvx) > 20) return this.imgs.grokRun;
      return this.imgs.grokIdle;
    }
    if (this.hurtPoseT > 0 && this.imgs.goblinHurt) return this.imgs.goblinHurt;
    if (this.attackT > 0 && this.imgs.goblinAttack) return this.imgs.goblinAttack;
    if (!this.grounded) return this.imgs.goblinJump;
    if (Math.abs(this.pvx) > 20) return this.imgs.goblinRun;
    return this.imgs.goblinIdle;
  }

  private updateCinematicFx(dt: number) {
    const pal = this.themePalette();
    const speed = Math.hypot(this.pvx, this.pvy);
    this.ghostAcc += dt;
    const wantGhost =
      this.jetpacking ||
      speed > 210 ||
      (!this.grounded && this.pvy > 260) ||
      this.overloadT > 0;
    if (wantGhost && this.ghostAcc > 0.03) {
      this.ghostAcc = 0;
      this.ghosts.push({
        x: this.px,
        y: this.py,
        frame: this.frame,
        facing: this.facing,
        life: this.jetpacking ? 0.26 : 0.2,
        max: this.jetpacking ? 0.26 : 0.2,
        air: !this.grounded,
        running: Math.abs(this.pvx) > 20,
      });
      if (this.ghosts.length > 12) this.ghosts.shift();
    }
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);

    // Ambient canyon air — cheap, camera-relative
    if (Math.random() < 0.42) {
      this.fx.ambient(
        this.camX + Math.random() * VIEW_W,
        this.camY + 20 + Math.random() * (VIEW_H * 0.82),
        Math.random() > 0.55 ? pal.neon : this.character === "grok" ? "#00f0ff" : "#39ff9a",
      );
    }
    const theme = this.level?.theme ?? "dunes";
    if ((theme === "dunes" || theme === "storm" || theme === "spikes") && Math.random() < 0.18) {
      this.fx.ember(
        this.camX + Math.random() * VIEW_W,
        this.camY + VIEW_H * 0.55 + Math.random() * VIEW_H * 0.35,
        theme === "spikes" ? "#ff4466" : "#ff9f43",
      );
    }
  }

  private drawHeroCinematic(ctx: CanvasRenderingContext2D) {
    const pal = this.themePalette();
    const accent = this.character === "grok" ? "#00f0ff" : "#39ff9a";
    const cx = this.px + PLAYER_W * 0.5;
    const feetY = this.py + PLAYER_H;
    const squash = this.landSquash;
    const dw = PLAYER_W * (1 + squash * 0.28);
    const dh = PLAYER_H * (1 - squash * 0.34);
    const dx = (this.grounded ? Math.round(this.px) : this.px) - (dw - PLAYER_W) * 0.5;
    const dy = (this.grounded ? Math.round(this.py) : this.py) + (PLAYER_H - dh);

    // Contact shadow — grounds the sprite on platforms
    ctx.save();
    ctx.globalAlpha = this.grounded ? 0.38 : Math.max(0.08, 0.28 - Math.min(0.2, Math.abs(this.pvy) / 1400));
    ctx.fillStyle = "rgba(4,0,12,0.75)";
    ctx.beginPath();
    ctx.ellipse(cx, feetY - 2, 26 + squash * 16, 7 + squash * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Landing shock ring
    if (this.landRing > 0.02) {
      const t = 1 - this.landRing;
      ctx.save();
      ctx.globalAlpha = this.landRing * 0.7;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(cx, feetY - 1, 18 + t * 54, 6 + t * 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = pal.neon;
      ctx.globalAlpha = this.landRing * 0.35;
      ctx.beginPath();
      ctx.ellipse(cx, feetY - 1, 10 + t * 78, 4 + t * 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Motion ghosts
    for (const g of this.ghosts) {
      const a = Math.max(0, g.life / g.max);
      let sheet: HTMLImageElement | HTMLCanvasElement | undefined;
      if (this.character === "grok") {
        sheet = g.air ? this.imgs.grokJump : g.running ? this.imgs.grokRun : this.imgs.grokIdle;
      } else {
        sheet = g.air ? this.imgs.goblinJump : g.running ? this.imgs.goblinRun : this.imgs.goblinIdle;
      }
      ctx.save();
      ctx.globalAlpha = a * 0.38;
      ctx.globalCompositeOperation = "lighter";
      this.drawSpriteSheet(ctx, sheet, g.frame, g.x, g.y, PLAYER_W, PLAYER_H, g.facing < 0);
      ctx.restore();
    }

    // Theme rim halo behind hero
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createRadialGradient(cx, this.py + PLAYER_H * 0.48, 6, cx, this.py + PLAYER_H * 0.5, 52);
    halo.addColorStop(0, accent + "55");
    halo.addColorStop(0.45, pal.neon + "22");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.ellipse(cx, this.py + PLAYER_H * 0.5, 46, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.hurtFlash <= 0 || Math.floor(this.time * 20) % 2 === 0) {
      this.drawSpriteSheet(ctx, this.currentHeroSheet(), this.frame, dx, dy, dw, dh, this.facing < 0);
    }

    // Muzzle flash cone
    if (this.muzzleFlash > 0.04) {
      const mx = this.px + (this.facing > 0 ? PLAYER_W - 10 : 10);
      const my = this.py + 34;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(1, this.muzzleFlash);
      ctx.translate(mx, my);
      ctx.scale(this.facing, 1);
      const fg = ctx.createLinearGradient(0, 0, 42, 0);
      fg.addColorStop(0, "#ffffff");
      fg.addColorStop(0.25, this.muzzleColor);
      fg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(38, -14 * this.muzzleFlash);
      ctx.lineTo(46, 0);
      ctx.lineTo(38, 14 * this.muzzleFlash);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(2, 0, 5 + this.muzzleFlash * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSpriteSheet(
    ctx: CanvasRenderingContext2D,
    img: CanvasImageSource | undefined,
    frame: number,
    x: number, y: number, dw: number, dh: number,
    flip: boolean,
  ) {
    const readyImg =
      img instanceof HTMLImageElement ? img.complete && img.naturalWidth > 0 : !!img;
    if (!img || !readyImg) {
      ctx.save();
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 8, y + 4, dw - 16, dh - 8);
      ctx.restore();
      return;
    }
    const boxes = this.frameBoxes.get(img);
    const cols = 2, rows = 2;
    const iw = img instanceof HTMLImageElement ? img.naturalWidth || img.width : (img as HTMLCanvasElement).width;
    const ih = img instanceof HTMLImageElement ? img.naturalHeight || img.height : (img as HTMLCanvasElement).height;
    const fw = iw / cols, fh = ih / rows;
    const col = frame % cols;
    const row = Math.floor(frame / cols) % rows;
    const box = boxes?.[frame % (cols * rows)];
    const sx = box ? box.sx : col * fw;
    const sy = box ? box.sy : row * fh;
    const sw = box ? box.sw : fw;
    const sh = box ? box.sh : fh;
    const scale = Math.min(dw / sw, dh / sh);
    const outW = sw * scale, outH = sh * scale;
    const ox = x + (dw - outW) * 0.5;
    const oy = y + (dh - outH);
    ctx.save();
    if (flip) {
      ctx.translate(ox + outW, oy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, ox, oy, outW, outH);
    }
    ctx.restore();
  }

  private exposeControlsTest() {
    if (typeof window === "undefined") return;
    window.__controlsTest = {
      getYaw: () => 0,
      getSpeed: () => Math.abs(this.pvx),
      getX: () => this.px,
      getY: () => this.py,
      getJet: () => this.jetpacking,
      getFacing: () => this.facing,
      getGrounded: () => this.grounded,
      getWeapon: () => this.weapon,
      getCheckpoint: () => this.checkpointId,
      die: () => this.killPlayer(),
      respawn: () => this.restartFromCheckpoint(),
      armCheckpoint: () => {
        const cp = this.platforms.find((p) => p.kind === "checkpoint");
        if (!cp) throw new Error("no checkpoint");
        cp.active = true;
        this.checkpointId = cp.id ?? "cp";
        this.rememberCheckpoint(cp);
        return {
          id: this.checkpointId,
          spawnX: this.spawnX,
          spawnY: this.spawnY,
          platY: cp.y,
        };
      },
      standOnSpring: () => {
        const sp = this.platforms.find((p) => p.kind === "spring");
        if (!sp) throw new Error("no spring");
        this.px = sp.x + sp.w * 0.5 - PLAYER_W * 0.5;
        this.py = sp.y - PLAYER_H - 4;
        this.pvx = 0;
        this.pvy = 220;
        this.grounded = false;
        this.springLock = 0;
        this.jetpacking = false;
        this.airJumpsUsed = 0;
        return { x: this.px, y: this.py, springY: sp.y };
      },
      goToSeed: () => {
        const s = this.powerSeeds.find((p) => !p.collected);
        if (!s) throw new Error("no seed");
        this.px = s.x + s.w * 0.5 - PLAYER_W * 0.5;
        this.py = s.y + s.h + 8;
        this.pvx = 0;
        this.pvy = 0;
        this.camX = Math.max(0, this.px - VIEW_W * 0.4);
        this.camY = this.py - VIEW_H * 0.5;
        return { x: s.x, y: s.y, w: s.w, h: s.h, kind: s.kind };
      },
      setKeys: (codes: string[]) => input.setKeys(codes),
      assertLeft: () => this.facing < 0 || this.pvx < 0,
      assertRight: () => this.facing > 0 || this.pvx > 0,
    };
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      getJet: () => boolean;
      getFacing: () => number;
      getGrounded: () => boolean;
      getWeapon: () => string;
      getCheckpoint: () => string | null;
      die: () => void;
      respawn: () => void;
      armCheckpoint: () => { id: string | null; spawnX: number; spawnY: number; platY: number };
      standOnSpring: () => { x: number; y: number; springY: number };
      goToSeed: () => { x: number; y: number; w: number; h: number; kind: string };
      setKeys: (codes: string[]) => void;
      assertLeft: () => boolean;
      assertRight: () => boolean;
    };
  }
}
