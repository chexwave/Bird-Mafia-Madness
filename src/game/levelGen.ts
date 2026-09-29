/**
 * Chunk-based level generator — unique deterministic stages, not template clones.
 * Each level is assembled from authored chunks (start → beats → setpiece → finish).
 */
import { radioFor } from "./narrative";
import {
  OPERATIONS,
  powerForSlot,
  seedForLevel,
  type PowerKind,
} from "./progression";
import {
  SEED_SIZE,
  type LevelDef,
  type Platform,
  type PlatformForm,
  type PowerSeed,
} from "./types";

type Theme = NonNullable<LevelDef["theme"]>;

export function stampForm(p: Platform, theme: Theme): Platform {
  if (p.form) return p;
  if (p.kind === "oneway") return { ...p, form: "deck" };
  if (p.kind === "moving") return { ...p, form: "girder" };
  if (p.kind === "conveyor") return { ...p, form: "belt" };
  if (p.kind === "hazard") return { ...p, form: "tooth" };
  if (p.kind === "spring" || p.kind === "checkpoint" || p.kind === "goal") return p;
  if (p.h >= 72) {
    if (theme === "vertical" || theme === "hq") return { ...p, form: "pillar" };
    if (theme === "boss") return { ...p, form: "hex" };
    return { ...p, form: "mesa" };
  }
  const map: Record<Theme, PlatformForm> = {
    dunes: p.w > 220 ? "mesa" : "slab",
    storm: "wreck",
    bridges: "deck",
    spikes: "tooth",
    vertical: "girder",
    hq: "panel",
    boss: "hex",
  };
  return { ...p, form: map[theme] ?? "slab" };
}

function stampAll(plats: Platform[], theme: Theme): Platform[] {
  return plats.map((p) => stampForm(p, theme));
}

/** Per-level silhouette kits so Op 1 stages don't all share mesa+pillar. */
const SLOT_FORMS: PlatformForm[][] = [
  ["mesa", "steps", "slab"],
  ["bowl", "mushroom", "mesa"],
  ["cantilever", "pillar", "arch"],
  ["tooth", "ramp", "steps"],
  ["wreck", "ramp", "bowl"],
  ["pillar", "steps", "girder"],
  ["panel", "hex", "arch"],
  ["bowl", "wreck", "arch"],
  ["hex", "cantilever", "panel"],
];

export function paintSlotForms(plats: Platform[], slot: number): Platform[] {
  const kit = SLOT_FORMS[Math.max(0, Math.min(slot, SLOT_FORMS.length - 1))]!;
  let i = 0;
  return plats.map((p) => {
    if (p.kind === "oneway") return { ...p, form: "deck" };
    if (p.kind === "conveyor") return { ...p, form: "belt" };
    if (p.kind === "moving") return { ...p, form: slot === 4 || slot === 7 ? "wreck" : "girder" };
    if (p.kind !== "solid") return p;
    if (p.h >= 90 && p.w <= 72) return { ...p, form: "pillar" };
    const form = kit[i++ % kit.length]!;
    return { ...p, form };
  });
}

export const TILE = 40;
const PLAYER_H = 86;

// ─── platform helpers (tile space) ───────────────────────────────────
function ground(x: number, y: number, wTiles: number, kind: Platform["kind"] = "solid"): Platform {
  // Taller slabs so brick strata / bolts read on mobile
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 64, kind };
}
function plat(x: number, y: number, wTiles: number, kind: Platform["kind"] = "solid"): Platform {
  // Chunky floating ledges (34px was a neon bar)
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 44, kind };
}
function mesa(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 92, kind: "solid", form: "mesa" };
}
function pillar(x: number, y: number, wTiles: number, hTiles = 3): Platform {
  return {
    x: x * TILE,
    y: y * TILE,
    w: Math.max(36, wTiles * TILE),
    h: hTiles * TILE,
    kind: "solid",
    form: "pillar",
  };
}
function deck(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 28, kind: "oneway", form: "deck" };
}
function wreck(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 40, kind: "solid", form: "wreck" };
}
function panel(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 36, kind: "solid", form: "panel" };
}
function hexDock(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 48, kind: "solid", form: "hex" };
}
function bowl(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 80, kind: "solid", form: "bowl" };
}
function rampPlat(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 56, kind: "solid", form: "ramp" };
}
function stepsPlat(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 72, kind: "solid", form: "steps" };
}
function archPlat(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: Math.max(4, wTiles) * TILE, h: 88, kind: "solid", form: "arch" };
}
function cantPlat(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 44, kind: "solid", form: "cantilever" };
}
function shroom(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 40, kind: "solid", form: "mushroom" };
}
function conveyor(x: number, y: number, wTiles: number, dir = 1, speed = 88): Platform {
  return {
    x: x * TILE,
    y: y * TILE,
    w: wTiles * TILE,
    h: 34,
    kind: "conveyor",
    form: "belt",
    vx: dir * speed,
  };
}
function sealedFloor(widthTiles: number, yTiles: number, form: PlatformForm = "mesa"): Platform {
  return {
    x: -2 * TILE,
    y: yTiles * TILE,
    w: (widthTiles + 4) * TILE,
    h: 260,
    kind: "solid",
    form,
  };
}
function moving(
  x: number,
  y: number,
  wTiles: number,
  vx: number,
  range: number,
  phase = 0,
): Platform {
  return {
    x: x * TILE,
    y: y * TILE,
    w: wTiles * TILE,
    h: 42,
    kind: "moving",
    vx,
    range: range * TILE,
    originX: x * TILE,
    originY: y * TILE,
    phase,
  };
}
function spring(x: number, y: number): Platform {
  return { x: x * TILE, y: y * TILE, w: 56, h: 28, kind: "spring" };
}
function spikes(x: number, y: number, wTiles: number): Platform {
  return { x: x * TILE, y: y * TILE + 18, w: wTiles * TILE, h: 22, kind: "hazard" };
}
function checkpoint(x: number, y: number, id: string): Platform {
  return { x: x * TILE, y: y * TILE - 60, w: 28, h: 70, kind: "checkpoint", id, active: false };
}
function goal(x: number, y: number): Platform {
  return { x: x * TILE, y: y * TILE - 80, w: 40, h: 90, kind: "goal", id: "goal" };
}
function coin(x: number, y: number) {
  return { x: x * TILE, y: y * TILE, w: 22, h: 22 };
}
function bird(x: number, y: number, vx: number, hp: number) {
  return { x: x * TILE, y: y * TILE, w: 48, h: 36, vx, vy: 0, hp };
}
function ammo(x: number, y: number, amount: number) {
  return { x: x * TILE, y: y * TILE, w: 28, h: 28, amount };
}

type Role =
  | "start"
  | "rhythm"
  | "vertical"
  | "hazard"
  | "shrine"
  | "ambush"
  | "rails"
  | "setpiece"
  | "finish"
  | "boss";

type ChunkContent = {
  platforms: Platform[];
  coins: { x: number; y: number; w: number; h: number }[];
  birds: { x: number; y: number; w: number; h: number; vx: number; vy: number; hp: number }[];
  ammo: { x: number; y: number; w: number; h: number; amount: number }[];
  seedSpot?: { x: number; y: number };
};

type ChunkDef = {
  id: string;
  role: Role;
  /** Width of this chunk in tiles */
  width: number;
  /** Preferred themes (empty = universal) */
  themes: Theme[];
  build: () => ChunkContent;
};

/** Deterministic PRNG */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, list: T[], avoid?: string, idOf?: (t: T) => string): T {
  if (list.length === 0) throw new Error("empty pick");
  if (list.length === 1) return list[0]!;
  let filtered = list;
  if (avoid && idOf) {
    const alt = list.filter((x) => idOf(x) !== avoid);
    if (alt.length) filtered = alt;
  }
  return filtered[Math.floor(rand() * filtered.length)]!;
}

function shiftContent(c: ChunkContent, dx: number): ChunkContent {
  return {
    platforms: c.platforms.map((p) => ({
      ...p,
      x: p.x + dx,
      originX: p.originX != null ? p.originX + dx : undefined,
    })),
    coins: c.coins.map((o) => ({ ...o, x: o.x + dx })),
    birds: c.birds.map((b) => ({ ...b, x: b.x + dx })),
    ammo: c.ammo.map((a) => ({ ...a, x: a.x + dx })),
    seedSpot: c.seedSpot ? { x: c.seedSpot.x + dx, y: c.seedSpot.y } : undefined,
  };
}

function joinActs(
  spawn: { x: number; y: number },
  height: number,
  parts: { width: number; content: ChunkContent }[],
): {
  platforms: Platform[];
  coins: ChunkContent["coins"];
  birds: ChunkContent["birds"];
  ammo: ChunkContent["ammo"];
  seedSpot?: { x: number; y: number };
  width: number;
  height: number;
  spawn: { x: number; y: number };
} {
  let cursor = 0;
  const platforms: Platform[] = [];
  const coins: ChunkContent["coins"] = [];
  const birds: ChunkContent["birds"] = [];
  const ammo: ChunkContent["ammo"] = [];
  let seedSpot: { x: number; y: number } | undefined;
  for (const part of parts) {
    const shifted = shiftContent(part.content, cursor * TILE);
    platforms.push(...shifted.platforms);
    coins.push(...shifted.coins);
    birds.push(...shifted.birds);
    ammo.push(...shifted.ammo);
    if (shifted.seedSpot) seedSpot = shifted.seedSpot;
    cursor += part.width;
  }
  return {
    platforms,
    coins,
    birds,
    ammo,
    seedSpot,
    width: cursor * TILE,
    height,
    spawn,
  };
}

// ─── Authoring library ───────────────────────────────────────────────
const CHUNKS: ChunkDef[] = [
  // STARTS
  {
    id: "start_flat",
    role: "start",
    width: 16,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 16, 16),
        plat(5, 13, 3, "oneway"),
        plat(10, 11, 3, "oneway"),
      ],
      coins: [coin(6, 12), coin(7, 12), coin(11, 10)],
      birds: [],
      ammo: [ammo(8, 14, 10)],
    }),
  },
  {
    id: "start_step",
    role: "start",
    width: 18,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 17, 8),
        ground(9, 16, 9),
        plat(4, 14, 3, "oneway"),
        spring(11, 15.55),
        plat(14, 13, 3),
      ],
      coins: [coin(5, 13), coin(12, 12), coin(15, 12)],
      birds: [],
      ammo: [ammo(3, 15, 10)],
    }),
  },
  {
    id: "start_shelf",
    role: "start",
    width: 15,
    themes: ["dunes", "storm"],
    build: () => ({
      platforms: [
        ground(0, 16, 15),
        plat(3, 13, 4),
        plat(9, 12, 3, "oneway"),
      ],
      coins: [coin(4, 12), coin(5, 12), coin(10, 11)],
      birds: [bird(12, 10, -40, 2)],
      ammo: [ammo(7, 14, 8)],
    }),
  },

  // RHYTHM
  {
    id: "rhythm_hops",
    role: "rhythm",
    width: 22,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 16, 6),
        ground(8, 15, 5),
        ground(15, 16, 7),
        plat(4, 13, 2, "oneway"),
        plat(11, 12, 3),
        plat(18, 13, 3, "oneway"),
      ],
      coins: [coin(5, 12), coin(12, 11), coin(19, 12), coin(9, 14)],
      birds: [bird(10, 9, 55, 2)],
      ammo: [ammo(16, 14, 10)],
    }),
  },
  {
    id: "rhythm_gaps",
    role: "rhythm",
    width: 24,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 16, 5),
        ground(7, 16, 4),
        ground(13, 15, 5),
        ground(20, 16, 4),
        spring(5, 15.55),
        plat(10, 13, 3, "oneway"),
        spring(18, 14.55),
      ],
      coins: [coin(8, 15), coin(11, 12), coin(14, 14), coin(21, 15)],
      birds: [bird(15, 10, -60, 2), bird(22, 11, 50, 2)],
      ammo: [ammo(3, 14, 12)],
    }),
  },
  {
    id: "rhythm_wave",
    role: "rhythm",
    width: 26,
    themes: ["dunes", "bridges", "storm"],
    build: () => ({
      platforms: [
        ground(0, 17, 5),
        ground(6, 15, 4),
        ground(11, 16, 5),
        ground(17, 14, 4),
        ground(22, 16, 4),
        plat(3, 14, 2, "oneway"),
        plat(13, 13, 3),
        plat(19, 12, 3, "oneway"),
      ],
      coins: [coin(7, 14), coin(12, 12), coin(18, 13), coin(23, 15)],
      birds: [bird(9, 10, 70, 3), bird(20, 9, -65, 3)],
      ammo: [ammo(14, 14, 12)],
    }),
  },

  // VERTICAL
  {
    id: "vert_ladder",
    role: "vertical",
    width: 14,
    themes: ["vertical", "hq", "bridges"],
    build: () => ({
      platforms: [
        ground(0, 18, 14),
        plat(2, 15, 3, "oneway"),
        plat(7, 13, 3, "oneway"),
        plat(3, 11, 3, "oneway"),
        plat(8, 9, 3, "oneway"),
        plat(4, 7, 4),
        spring(11, 17.55),
      ],
      coins: [coin(3, 14), coin(8, 12), coin(4, 10), coin(9, 8), coin(5, 6)],
      birds: [bird(10, 8, -50, 3)],
      ammo: [ammo(6, 16, 12)],
      seedSpot: { x: 5 * TILE, y: 5 * TILE },
    }),
  },
  {
    id: "vert_zig",
    role: "vertical",
    width: 16,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 18, 16),
        plat(1, 15, 3, "oneway"),
        plat(10, 14, 3, "oneway"),
        plat(4, 12, 3),
        plat(11, 10, 3, "oneway"),
        plat(3, 8, 4),
        moving(8, 11, 3, 40, 3, 0),
      ],
      coins: [coin(2, 14), coin(11, 13), coin(5, 11), coin(12, 9), coin(4, 7)],
      birds: [bird(13, 12, -55, 3)],
      ammo: [ammo(14, 16, 10)],
      seedSpot: { x: 4 * TILE, y: 6 * TILE },
    }),
  },

  // HAZARD
  {
    id: "haz_spikes",
    role: "hazard",
    width: 20,
    themes: ["spikes", "hq", "dunes"],
    build: () => ({
      platforms: [
        ground(0, 16, 5),
        ground(7, 16, 4),
        ground(13, 16, 7),
        spikes(5, 15.45, 2),
        spikes(11, 15.45, 2),
        plat(3, 13, 3, "oneway"),
        plat(9, 12, 3),
        plat(15, 13, 3, "oneway"),
        spring(17, 15.55),
      ],
      coins: [coin(4, 12), coin(10, 11), coin(16, 12)],
      birds: [bird(8, 10, 70, 3)],
      ammo: [ammo(14, 14, 12)],
    }),
  },
  {
    id: "haz_squeeze",
    role: "hazard",
    width: 18,
    themes: ["spikes", "storm"],
    build: () => ({
      platforms: [
        ground(0, 16, 4),
        ground(6, 17, 5),
        ground(13, 16, 5),
        spikes(4, 15.45, 2),
        spikes(11, 16.45, 2),
        plat(2, 13, 2, "oneway"),
        plat(8, 14, 3, "oneway"),
        plat(14, 13, 3),
      ],
      coins: [coin(3, 12), coin(9, 13), coin(15, 12)],
      birds: [bird(10, 11, -80, 3)],
      ammo: [ammo(7, 15, 10)],
    }),
  },
  {
    id: "haz_drop",
    role: "hazard",
    width: 22,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 15, 5),
        ground(7, 17, 6),
        ground(15, 15, 7),
        spikes(5, 14.45, 2),
        spikes(13, 16.45, 2),
        spring(9, 16.55),
        plat(3, 12, 3, "oneway"),
        plat(17, 12, 3, "oneway"),
      ],
      coins: [coin(4, 11), coin(10, 15), coin(18, 11)],
      birds: [bird(11, 12, 60, 3), bird(19, 10, -55, 3)],
      ammo: [ammo(16, 13, 12)],
    }),
  },

  // SHRINE (power seed)
  {
    id: "shrine_altar",
    role: "shrine",
    width: 16,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 16, 16),
        plat(4, 13, 3, "oneway"),
        plat(9, 11, 4),
        plat(6, 9, 3, "oneway"),
        spring(13, 15.55),
      ],
      coins: [coin(5, 12), coin(10, 10), coin(11, 10), coin(7, 8)],
      birds: [bird(12, 8, -45, 2)],
      ammo: [ammo(2, 14, 14)],
      seedSpot: { x: 10.5 * TILE, y: 9 * TILE },
    }),
  },
  {
    id: "shrine_tower",
    role: "shrine",
    width: 14,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 17, 14),
        plat(2, 14, 3, "oneway"),
        plat(7, 12, 3, "oneway"),
        plat(4, 10, 4),
        plat(9, 8, 3),
      ],
      coins: [coin(3, 13), coin(8, 11), coin(5, 9), coin(10, 7)],
      birds: [],
      ammo: [ammo(11, 15, 12)],
      seedSpot: { x: 10 * TILE, y: 6.5 * TILE },
    }),
  },
  {
    id: "shrine_nest",
    role: "shrine",
    width: 18,
    themes: ["hq", "dunes"],
    build: () => ({
      platforms: [
        ground(0, 16, 6),
        ground(8, 16, 10),
        moving(5, 13, 3, 45, 3, 0),
        plat(11, 12, 4),
        plat(13, 9, 3, "oneway"),
      ],
      coins: [coin(12, 11), coin(14, 8), coin(15, 8)],
      birds: [bird(9, 10, 50, 3)],
      ammo: [ammo(3, 14, 12)],
      seedSpot: { x: 14 * TILE, y: 7.5 * TILE },
    }),
  },

  // AMBUSH
  {
    id: "ambush_flock",
    role: "ambush",
    width: 20,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 16, 20),
        plat(4, 13, 3, "oneway"),
        plat(10, 12, 4),
        plat(16, 13, 3, "oneway"),
      ],
      coins: [coin(5, 12), coin(11, 11), coin(17, 12)],
      birds: [
        bird(6, 9, -70, 3),
        bird(12, 8, 75, 3),
        bird(15, 10, -60, 3),
        bird(18, 7, 55, 3),
      ],
      ammo: [ammo(8, 14, 16)],
    }),
  },
  {
    id: "ambush_cross",
    role: "ambush",
    width: 18,
    themes: ["hq", "spikes"],
    build: () => ({
      platforms: [
        ground(0, 16, 7),
        ground(9, 16, 9),
        plat(3, 13, 3),
        plat(11, 12, 3, "oneway"),
        spring(7, 15.55),
      ],
      coins: [coin(4, 12), coin(12, 11)],
      birds: [
        bird(5, 9, 80, 4),
        bird(10, 8, -90, 4),
        bird(14, 10, 70, 3),
      ],
      ammo: [ammo(15, 14, 14)],
    }),
  },

  // RAILS (moving platforms)
  {
    id: "rails_dual",
    role: "rails",
    width: 22,
    themes: ["bridges", "vertical", "hq"],
    build: () => ({
      platforms: [
        ground(0, 16, 5),
        ground(17, 16, 5),
        moving(5, 14, 3, 55, 5, 0),
        moving(12, 12, 3, -50, 4, 0.5),
        plat(9, 10, 3, "oneway"),
        spring(19, 15.55),
      ],
      coins: [coin(6, 13), coin(13, 11), coin(10, 9)],
      birds: [bird(11, 8, 60, 3)],
      ammo: [ammo(2, 14, 12)],
    }),
  },
  {
    id: "rails_gauntlet",
    role: "rails",
    width: 24,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 17, 4),
        ground(20, 17, 4),
        moving(4, 15, 3, 60, 4, 0),
        moving(10, 13, 3, -55, 5, 0.3),
        moving(15, 14, 3, 50, 3, 0.8),
        plat(8, 11, 2, "oneway"),
      ],
      coins: [coin(5, 14), coin(11, 12), coin(16, 13)],
      birds: [bird(12, 9, -70, 3)],
      ammo: [ammo(21, 15, 12)],
    }),
  },

  // SETPIECES (one memorable beat)
  {
    id: "set_spring_run",
    role: "setpiece",
    width: 24,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 17, 4),
        ground(20, 14, 4),
        spring(4, 16.55),
        spring(8, 14.55),
        spring(12, 12.55),
        spring(16, 13.55),
        plat(6, 13, 2, "oneway"),
        plat(14, 11, 3, "oneway"),
        plat(18, 12, 2),
      ],
      coins: [coin(5, 14), coin(9, 12), coin(13, 10), coin(17, 11), coin(21, 13)],
      birds: [bird(10, 9, 50, 3)],
      ammo: [ammo(22, 12, 12)],
    }),
  },
  {
    id: "set_skybridge",
    role: "setpiece",
    width: 26,
    themes: ["bridges", "vertical"],
    build: () => ({
      platforms: [
        ground(0, 16, 4),
        ground(22, 16, 4),
        plat(4, 14, 4, "oneway"),
        plat(10, 12, 5, "oneway"),
        plat(17, 14, 4, "oneway"),
        moving(8, 10, 3, 40, 4, 0),
        checkpoint(12, 12, "cp_set"),
      ],
      coins: [coin(5, 13), coin(11, 11), coin(12, 11), coin(18, 13)],
      birds: [bird(14, 8, -65, 3), bird(20, 10, 55, 3)],
      ammo: [ammo(23, 14, 14)],
    }),
  },
  {
    id: "set_pit_maze",
    role: "setpiece",
    width: 22,
    themes: ["spikes", "storm"],
    build: () => ({
      platforms: [
        ground(0, 16, 4),
        ground(18, 16, 4),
        plat(4, 14, 3),
        plat(8, 12, 3, "oneway"),
        plat(12, 14, 3),
        plat(15, 12, 3, "oneway"),
        spikes(6, 15.45, 2),
        spikes(14, 15.45, 2),
        spring(10, 15.55),
      ],
      coins: [coin(5, 13), coin(9, 11), coin(13, 13), coin(16, 11)],
      birds: [bird(11, 9, 80, 4)],
      ammo: [ammo(19, 14, 12)],
    }),
  },
  {
    id: "set_double_rail",
    role: "setpiece",
    width: 28,
    themes: ["bridges", "hq"],
    build: () => ({
      platforms: [
        ground(0, 17, 5),
        ground(23, 17, 5),
        moving(5, 15, 4, 70, 6, 0),
        moving(12, 12, 4, -60, 5, 0.4),
        moving(18, 14, 3, 55, 4, 0.9),
        plat(10, 10, 3, "oneway"),
        checkpoint(14, 12, "cp_set"),
      ],
      coins: [coin(6, 14), coin(13, 11), coin(19, 13), coin(11, 9)],
      birds: [bird(15, 8, -75, 4), bird(20, 10, 60, 3)],
      ammo: [ammo(24, 15, 16)],
    }),
  },

  // Longer beats — stretched campaign
  {
    id: "rhythm_canyon",
    role: "rhythm",
    width: 32,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 16, 5),
        ground(7, 15, 4),
        ground(13, 16, 5),
        ground(20, 14, 4),
        ground(26, 16, 6),
        plat(4, 13, 3, "oneway"),
        plat(10, 12, 3),
        plat(17, 12, 3, "oneway"),
        plat(23, 11, 3),
        spring(12, 14.55),
      ],
      coins: [coin(5, 12), coin(11, 11), coin(18, 11), coin(24, 10), coin(28, 15)],
      birds: [bird(9, 9, 60, 3), bird(22, 8, -65, 3)],
      ammo: [ammo(15, 14, 12)],
    }),
  },
  {
    id: "rails_span",
    role: "rails",
    width: 30,
    themes: ["bridges", "vertical", "hq", "storm"],
    build: () => ({
      platforms: [
        ground(0, 16, 4),
        moving(5, 14, 4, 55, 5, 0),
        moving(12, 12, 3, -50, 5, 0.4),
        plat(16, 10, 3, "oneway"),
        moving(20, 13, 4, 45, 4, 0.8),
        ground(26, 16, 4),
        spring(24, 15.55),
      ],
      coins: [coin(6, 13), coin(13, 11), coin(17, 9), coin(21, 12), coin(27, 15)],
      birds: [bird(10, 8, 70, 3), bird(22, 9, -60, 3)],
      ammo: [ammo(27, 14, 14)],
    }),
  },
  {
    id: "ambush_wave",
    role: "ambush",
    width: 26,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 16, 8),
        ground(10, 15, 6),
        ground(18, 16, 8),
        plat(3, 13, 3, "oneway"),
        plat(12, 12, 4),
        plat(20, 13, 3, "oneway"),
        spring(9, 14.55),
      ],
      coins: [coin(4, 12), coin(13, 11), coin(21, 12)],
      birds: [
        bird(6, 8, 80, 3),
        bird(11, 7, -75, 4),
        bird(16, 9, 70, 3),
        bird(22, 8, -65, 3),
      ],
      ammo: [ammo(14, 13, 16)],
    }),
  },
  {
    id: "haz_longpit",
    role: "hazard",
    width: 28,
    themes: ["spikes", "storm", "dunes"],
    build: () => ({
      platforms: [
        ground(0, 16, 4),
        spikes(4, 16.2, 3),
        ground(7, 16, 3),
        spikes(10, 16.2, 3),
        ground(13, 15, 4),
        spikes(17, 16.2, 3),
        ground(20, 16, 8),
        deck(3, 13, 3),
        deck(9, 12, 3),
        plat(15, 12, 3),
        deck(21, 13, 3),
        spring(19, 14.55),
      ],
      coins: [coin(4, 12), coin(10, 11), coin(16, 11), coin(22, 12)],
      birds: [bird(12, 9, 75, 3), bird(23, 10, -60, 3)],
      ammo: [ammo(14, 13, 12)],
    }),
  },

  // FINISH
  {
    id: "finish_gate",
    role: "finish",
    width: 14,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 16, 14),
        plat(3, 13, 3, "oneway"),
        plat(8, 12, 3),
        goal(11, 16),
        checkpoint(2, 16, "cp_end"),
      ],
      coins: [coin(4, 12), coin(9, 11)],
      birds: [bird(6, 10, -40, 2)],
      ammo: [ammo(5, 14, 12)],
    }),
  },
  {
    id: "finish_climb",
    role: "finish",
    width: 12,
    themes: [],
    build: () => ({
      platforms: [
        ground(0, 17, 12),
        plat(2, 14, 3, "oneway"),
        plat(6, 12, 3, "oneway"),
        spring(4, 16.55),
        goal(9, 17),
        checkpoint(1, 17, "cp_end"),
      ],
      coins: [coin(3, 13), coin(7, 11)],
      birds: [],
      ammo: [ammo(8, 15, 14)],
    }),
  },

  // BOSS ARENAS
  {
    id: "boss_wide",
    role: "boss",
    width: 48,
    themes: ["boss"],
    build: () => ({
      platforms: [
        ground(0, 18, 48),
        plat(4, 14, 4, "oneway"),
        plat(40, 14, 4, "oneway"),
        plat(10, 11, 3, "oneway"),
        plat(35, 11, 3, "oneway"),
        plat(20, 13, 6, "oneway"),
        spring(8, 17.55),
        spring(38, 17.55),
        moving(16, 10, 3, 50, 4, 0),
        moving(28, 10, 3, -50, 4, 0.5),
        checkpoint(2, 18, "cp_boss"),
        goal(44, 18),
      ],
      coins: [coin(12, 12), coin(14, 12), coin(30, 12), coin(32, 12), coin(22, 9), coin(24, 9)],
      birds: [],
      ammo: [ammo(6, 16, 20), ammo(42, 16, 20), ammo(22, 16, 16)],
    }),
  },
  {
    id: "boss_tiers",
    role: "boss",
    width: 44,
    themes: ["boss"],
    build: () => ({
      platforms: [
        ground(0, 18, 44),
        plat(6, 15, 5, "oneway"),
        plat(33, 15, 5, "oneway"),
        plat(14, 12, 4, "oneway"),
        plat(26, 12, 4, "oneway"),
        plat(18, 9, 6, "oneway"),
        spring(3, 17.55),
        spring(39, 17.55),
        moving(10, 11, 3, 45, 4, 0),
        moving(30, 11, 3, -45, 4, 0.6),
        checkpoint(1, 18, "cp_boss"),
        goal(40, 18),
      ],
      coins: [coin(8, 14), coin(16, 11), coin(28, 11), coin(20, 8)],
      birds: [],
      ammo: [ammo(5, 16, 20), ammo(38, 16, 20), ammo(21, 16, 18)],
    }),
  },
  {
    id: "boss_pillars",
    role: "boss",
    width: 50,
    themes: ["boss"],
    build: () => ({
      platforms: [
        ground(0, 18, 50),
        plat(5, 14, 3),
        plat(12, 12, 3, "oneway"),
        plat(22, 14, 4, "oneway"),
        plat(32, 12, 3, "oneway"),
        plat(40, 14, 3),
        spring(8, 17.55),
        spring(28, 17.55),
        spring(42, 17.55),
        moving(16, 10, 3, 55, 5, 0),
        moving(30, 10, 3, -55, 5, 0.5),
        checkpoint(2, 18, "cp_boss"),
        goal(46, 18),
      ],
      coins: [coin(6, 13), coin(13, 11), coin(23, 13), coin(33, 11), coin(41, 13)],
      birds: [],
      ammo: [ammo(4, 16, 22), ammo(24, 16, 18), ammo(44, 16, 22)],
    }),
  },
];

function byRole(role: Role, theme: Theme): ChunkDef[] {
  const all = CHUNKS.filter((c) => c.role === role);
  const themed = all.filter((c) => !c.themes.length || c.themes.includes(theme));
  return themed.length ? themed : all;
}

const THEME_BY_SLOT: Theme[] = [
  "dunes",
  "dunes",
  "bridges",
  "spikes",
  "storm",
  "vertical",
  "hq",
  "storm",
  "hq",
  "boss",
];

/** Role sequence for regular levels — always includes shrine + setpiece */
function rolePlan(slot: number): Role[] {
  const plans: Role[][] = [
    ["start", "rhythm", "rhythm", "shrine", "rhythm", "hazard", "rhythm", "finish"],
    ["start", "rhythm", "ambush", "rhythm", "shrine", "rails", "rhythm", "ambush", "finish"],
    ["start", "rails", "rhythm", "shrine", "setpiece", "rhythm", "rails", "rhythm", "finish"],
    ["start", "hazard", "rhythm", "shrine", "ambush", "rhythm", "hazard", "setpiece", "finish"],
    ["start", "rhythm", "rails", "setpiece", "shrine", "rhythm", "rails", "hazard", "finish"],
    ["start", "vertical", "rhythm", "shrine", "setpiece", "vertical", "rhythm", "rails", "finish"],
    ["start", "ambush", "rails", "hazard", "shrine", "ambush", "rhythm", "setpiece", "finish"],
    ["start", "rhythm", "hazard", "setpiece", "shrine", "ambush", "rhythm", "hazard", "rails", "finish"],
    ["start", "rails", "vertical", "ambush", "shrine", "setpiece", "rhythm", "rails", "hazard", "finish"],
  ];
  return plans[Math.min(slot, plans.length - 1)]!;
}

function assembleFromChunks(
  levelId: number,
  opIdx: number,
  slot: number,
  theme: Theme,
  roles: Role[],
): {
  platforms: Platform[];
  coins: ChunkContent["coins"];
  birds: ChunkContent["birds"];
  ammo: ChunkContent["ammo"];
  seedSpot?: { x: number; y: number };
  width: number;
  height: number;
  spawn: { x: number; y: number };
} {
  const rand = rng(levelId * 7919 + opIdx * 104729 + slot * 13 + 42);
  const scale = 1 + opIdx * 0.12;
  let cursor = 0;
  const platforms: Platform[] = [];
  const coins: ChunkContent["coins"] = [];
  const birds: ChunkContent["birds"] = [];
  const ammo: ChunkContent["ammo"] = [];
  let seedSpot: { x: number; y: number } | undefined;
  let lastId = "";
  let spawnY = 16 * TILE - PLAYER_H;
  let maxY = 20 * TILE;

  roles.forEach((role, ri) => {
    const pool = byRole(role, theme);
    const chunk = pick(rand, pool, lastId, (c) => c.id);
    lastId = chunk.id;
    const local = chunk.build();
    const shifted = shiftContent(local, cursor * TILE);

    // Mid-run checkpoints sit on real ledges, never floating at a fixed Y
    if (ri > 0 && ri < roles.length - 1 && ri % 2 === 1 && role !== "finish") {
      const preferX = cursor * TILE + Math.max(80, chunk.width * TILE * 0.35);
      let best: Platform | null = null;
      let bestS = Infinity;
      for (const p of shifted.platforms) {
        if (p.kind !== "solid" && p.kind !== "oneway" && p.kind !== "moving") continue;
        if (p.w < 48) continue;
        const mid = p.x + p.w * 0.5;
        const s = Math.abs(mid - preferX) + p.y * 0.02;
        if (s < bestS) {
          best = p;
          bestS = s;
        }
      }
      if (best) {
        platforms.push(
          checkpoint((best.x + best.w * 0.45) / TILE, best.y / TILE, `cp_${ri}`),
        );
      }
    }

    platforms.push(...shifted.platforms);
    coins.push(...shifted.coins);
    birds.push(
      ...shifted.birds.map((b) => ({
        ...b,
        hp: Math.max(2, Math.round(b.hp * scale)),
        vx: b.vx * (1 + opIdx * 0.08) * (slot % 2 === 0 ? 1 : -1),
      })),
    );
    ammo.push(...shifted.ammo);
    if (shifted.seedSpot) seedSpot = shifted.seedSpot;

    if (ri === 0) {
      // Spawn above first solid ground near start
      const floor = shifted.platforms.find((p) => p.kind === "solid" && p.x < cursor * TILE + 200);
      if (floor) spawnY = floor.y - PLAYER_H;
    }

    for (const p of shifted.platforms) {
      maxY = Math.max(maxY, p.y + p.h + 200);
    }
    cursor += chunk.width;
  });

  // Extra bird pressure on later ops
  if (opIdx > 0 && birds.length > 0) {
    const b0 = birds[0]!;
    birds.push({
      ...b0,
      x: b0.x + 160,
      hp: Math.round(3 * scale),
      vx: -b0.vx,
    });
  }

  return {
    platforms,
    coins,
    birds,
    ammo,
    seedSpot,
    width: cursor * TILE,
    height: Math.max(20 * TILE, Math.ceil(maxY / TILE) * TILE),
    spawn: { x: 2 * TILE, y: spawnY },
  };
}

/**
 * Op 1 only — ten authored stages with different spatial grammar.
 * Later operations still use the chunk assembler + stamped silhouettes.
 */
function mapDuneRises(): ReturnType<typeof assembleFromChunks> {
  const T = TILE;
  const W = 96;
  return joinActs({ x: 2 * T, y: 16 * T - PLAYER_H }, 22 * T, [
    {
      width: W,
      content: {
        platforms: [
          sealedFloor(W, 18, "mesa"),
          mesa(0, 16, 10),
          mesa(11, 14, 8),
          mesa(20, 12, 10),
          mesa(31, 12, 8),
          mesa(40, 14, 7),
          mesa(48, 16, 8),
          mesa(57, 13, 9),
          mesa(67, 11, 8),
          mesa(76, 13, 8),
          mesa(85, 16, 11),
          spring(22, 11.55),
          spring(68, 10.55),
          checkpoint(21, 12, "cp1"),
          checkpoint(49, 16, "cp2"),
          checkpoint(68, 11, "cp3"),
          goal(92, 16),
        ],
        coins: [
          coin(6, 15), coin(14, 13), coin(24, 11), coin(34, 11),
          coin(42, 13), coin(52, 15), coin(60, 12), coin(70, 10), coin(88, 15),
        ],
        birds: [bird(28, 9, 50, 2), bird(62, 10, -55, 3)],
        ammo: [ammo(8, 14, 12), ammo(78, 12, 12)],
        seedSpot: { x: 70 * T, y: 9.4 * T },
      },
    },
  ]);
}

function mapCaveDip(): ReturnType<typeof assembleFromChunks> {
  const T = TILE;
  const W = 88;
  return joinActs({ x: 2 * T, y: 16 * T - PLAYER_H }, 24 * T, [
    {
      width: W,
      content: {
        platforms: [
          sealedFloor(W, 20, "bowl"),
          mesa(0, 16, 8),
          stepsPlat(8, 14, 6),
          archPlat(15, 11, 7),
          mesa(23, 13, 6),
          bowl(30, 17, 10),
          wreck(41, 18, 6),
          bowl(48, 16, 7),
          stepsPlat(56, 13, 6),
          archPlat(63, 10, 7),
          mesa(71, 13, 6),
          mesa(78, 16, 10),
          deck(18, 9, 4),
          deck(50, 13, 4),
          deck(65, 8, 4),
          spring(33, 16.55),
          checkpoint(16, 11, "cp1"),
          checkpoint(49, 16, "cp2"),
          checkpoint(64, 10, "cp3"),
          goal(85, 16),
        ],
        coins: [coin(10, 13), coin(18, 8), coin(34, 16), coin(51, 12), coin(66, 7), coin(80, 15)],
        birds: [bird(26, 9, 55, 3), bird(46, 14, -50, 3), bird(68, 7, 60, 3)],
        ammo: [ammo(12, 13, 12), ammo(58, 12, 12)],
        seedSpot: { x: 66 * T, y: 6.5 * T },
      },
    },
  ]);
}

function mapBeltPlateau(): ReturnType<typeof assembleFromChunks> {
  const T = TILE;
  const W = 90;
  return joinActs({ x: 2 * T, y: 16 * T - PLAYER_H }, 22 * T, [
    {
      width: W,
      content: {
        platforms: [
          { x: -2 * T, y: 16 * T, w: (W + 4) * T, h: 260, kind: "conveyor", form: "belt", vx: 78 },
          deck(8, 13, 4),
          conveyor(16, 12, 5, -1, 70),
          moving(26, 11, 4, 42, 3, 0.2),
          deck(36, 13, 4),
          conveyor(44, 10, 5, 1, 95),
          moving(54, 12, 4, 40, 3, 0.8),
          deck(64, 13, 4),
          conveyor(72, 11, 5, -1, 80),
          spring(22, 15.55),
          checkpoint(18, 12, "cp1"),
          checkpoint(45, 10, "cp2"),
          checkpoint(73, 11, "cp3"),
          goal(86, 16),
        ],
        coins: [coin(9, 12), coin(17, 11), coin(27, 10), coin(45, 9), coin(65, 12), coin(74, 10)],
        birds: [bird(20, 8, 60, 3), bird(48, 7, -65, 3), bird(70, 8, 55, 3)],
        ammo: [ammo(10, 12, 12), ammo(56, 11, 12)],
        seedSpot: { x: 45 * T, y: 8.4 * T },
      },
    },
  ]);
}

function mapDescender(): ReturnType<typeof assembleFromChunks> {
  const T = TILE;
  return joinActs({ x: 2 * T, y: 4 * T - PLAYER_H }, 36 * T, [
    {
      width: 22,
      content: {
        platforms: [
          mesa(0, 4, 8),
          deck(8, 6, 4),
          pillar(14, 6, 1.3, 6),
          plat(3, 9, 4),
          deck(10, 11, 4),
          stepsPlat(2, 14, 5),
          conveyor(10, 16, 4, 1, 70),
          deck(3, 19, 4),
          plat(10, 22, 4),
          deck(4, 25, 4),
          pillar(14, 22, 1.3, 8),
          mesa(0, 30, 10),
          mesa(12, 32, 10),
          sealedFloor(22, 34, "panel"),
          spring(12, 3.55),
          checkpoint(11, 11, "cp1"),
          checkpoint(11, 16, "cp2"),
          checkpoint(5, 25, "cp3"),
          goal(19, 32),
        ],
        coins: [coin(9, 5), coin(4, 8), coin(11, 10), coin(12, 15), coin(5, 18), coin(11, 21), coin(6, 24)],
        birds: [bird(16, 8, -50, 3), bird(8, 18, 55, 3), bird(16, 26, -60, 3)],
        ammo: [ammo(2, 3, 14), ammo(3, 29, 12)],
        seedSpot: { x: 11 * T, y: 14.4 * T },
      },
    },
  ]);
}

function mapFlatPlateau(): ReturnType<typeof assembleFromChunks> {
  const T = TILE;
  const W = 80;
  return joinActs({ x: 2 * T, y: 16 * T - PLAYER_H }, 20 * T, [
    {
      width: W,
      content: {
        platforms: [
          sealedFloor(W, 16, "slab"),
          checkpoint(20, 16, "cp1"),
          checkpoint(40, 16, "cp2"),
          checkpoint(60, 16, "cp3"),
          goal(76, 16),
        ],
        coins: [
          coin(8, 15), coin(16, 15), coin(24, 15), coin(32, 15),
          coin(48, 15), coin(56, 15), coin(68, 15),
        ],
        birds: [bird(18, 10, 70, 3), bird(38, 8, -75, 3), bird(58, 10, 70, 3)],
        ammo: [ammo(12, 15, 14), ammo(52, 15, 14)],
        seedSpot: { x: 40 * T, y: 14.4 * T },
      },
    },
  ]);
}

function buildSignatureOp1(slot: number): ReturnType<typeof assembleFromChunks> | null {
  if (slot === 9) return null;
  if (slot === 0) return mapDuneRises();
  if (slot === 1) return mapCaveDip();
  if (slot === 4) return mapBeltPlateau();
  if (slot === 6) return mapDescender();
  if (slot === 7) return mapFlatPlateau();
  const T = TILE;
  const layouts: Array<() => ReturnType<typeof assembleFromChunks>> = [
    // 0 Desert Briefing — mesa staircase ~3x
    () =>
      joinActs({ x: 2 * T, y: 17 * T - PLAYER_H }, 22 * T, [
        {
          width: 32,
          content: {
            platforms: [
              mesa(0, 17, 8),
              mesa(9, 16, 6),
              mesa(16, 15, 7),
              mesa(24, 16, 8),
              plat(4, 14, 3, "oneway"),
              plat(12, 13, 3, "oneway"),
              plat(19, 12, 3),
              spring(22, 14.55),
              checkpoint(11, 16, "cp1"),
            ],
            coins: [coin(5, 13), coin(13, 12), coin(20, 11), coin(26, 15)],
            birds: [],
            ammo: [ammo(7, 15, 10)],
          },
        },
        {
          width: 34,
          content: {
            platforms: [
              mesa(0, 16, 6),
              mesa(8, 14, 5),
              mesa(15, 15, 6),
              mesa(23, 13, 5),
              mesa(29, 16, 5),
              plat(5, 12, 3, "oneway"),
              plat(18, 11, 3, "oneway"),
              spring(27, 12.55),
              checkpoint(16, 15, "cp2"),
            ],
            coins: [coin(4, 15), coin(9, 13), coin(19, 10), coin(24, 12), coin(30, 15)],
            birds: [bird(12, 10, 50, 2)],
            ammo: [ammo(10, 13, 12)],
            seedSpot: { x: 24 * T, y: 11 * T },
          },
        },
        {
          width: 30,
          content: {
            platforms: [
              mesa(0, 16, 6),
              mesa(8, 15, 7),
              mesa(17, 16, 6),
              mesa(24, 15, 6),
              plat(4, 13, 3, "oneway"),
              plat(12, 12, 3),
              plat(20, 12, 3, "oneway"),
              checkpoint(18, 16, "cp3"),
              goal(28, 15),
            ],
            coins: [coin(5, 12), coin(13, 11), coin(21, 11), coin(25, 14)],
            birds: [bird(14, 9, -45, 2)],
            ammo: [ammo(9, 14, 10)],
          },
        },
      ]),
    // 1 Neon Dunes — island buttes ~3x
    () =>
      joinActs({ x: 2 * T, y: 17 * T - PLAYER_H }, 22 * T, [
        {
          width: 36,
          content: {
            platforms: [
              mesa(0, 17, 5),
              mesa(8, 15, 4),
              mesa(15, 17, 5),
              mesa(23, 14, 4),
              mesa(30, 16, 6),
              plat(5, 13, 2, "oneway"),
              plat(12, 12, 3, "oneway"),
              plat(20, 12, 3),
              spring(18, 16.55),
              checkpoint(16, 17, "cp1"),
            ],
            coins: [coin(9, 14), coin(13, 11), coin(24, 13), coin(31, 15)],
            birds: [bird(11, 11, 50, 2), bird(26, 10, -55, 2)],
            ammo: [ammo(16, 15, 12)],
          },
        },
        {
          width: 34,
          content: {
            platforms: [
              mesa(0, 16, 4),
              mesa(7, 14, 4),
              mesa(14, 16, 5),
              mesa(22, 13, 4),
              mesa(29, 15, 5),
              plat(4, 12, 3, "oneway"),
              plat(18, 11, 3, "oneway"),
              spring(27, 12.55),
              checkpoint(15, 16, "cp2"),
            ],
            coins: [coin(8, 13), coin(15, 15), coin(23, 12), coin(30, 14)],
            birds: [bird(10, 9, 60, 2), bird(25, 8, -60, 3)],
            ammo: [ammo(8, 13, 12)],
            seedSpot: { x: 23 * T, y: 11 * T },
          },
        },
        {
          width: 32,
          content: {
            platforms: [
              mesa(0, 16, 5),
              mesa(8, 14, 4),
              mesa(15, 16, 5),
              mesa(23, 15, 9),
              plat(5, 12, 3, "oneway"),
              plat(12, 11, 3),
              checkpoint(16, 16, "cp3"),
              goal(29, 15),
            ],
            coins: [coin(4, 15), coin(9, 13), coin(16, 15), coin(25, 14)],
            birds: [bird(18, 10, 55, 2)],
            ammo: [ammo(24, 13, 12)],
          },
        },
      ]),
    // 2 Sky Bridges — decks + pylons + one green belt intro

    () =>
      joinActs({ x: 1.5 * T, y: 18 * T - PLAYER_H }, 22 * T, [
        {
          width: 40,
          content: {
            platforms: [
              pillar(0, 14, 1.2, 6),
              mesa(0, 18, 4),
              deck(5, 14, 5),
              pillar(11, 12, 1.1, 8),
              deck(13, 12, 6),
              moving(16, 10, 3, 50, 4, 0),
              conveyor(20, 8, 4, 1, 72),
              pillar(22, 11, 1.1, 8),
              deck(24, 11, 5),
              deck(30, 9, 4),
              mesa(34, 17, 6),
              spring(10, 17.55),
              checkpoint(14, 12, "cp1"),
            ],
            coins: [coin(7, 13), coin(15, 11), coin(18, 9), coin(26, 10), coin(31, 8)],
            birds: [bird(18, 7, 70, 3), bird(28, 7, -60, 3)],
            ammo: [ammo(13, 16, 12)],
          },
        },
        {
          width: 36,
          content: {
            platforms: [
              mesa(0, 17, 4),
              deck(5, 13, 5),
              pillar(11, 11, 1.1, 8),
              deck(13, 11, 5),
              moving(19, 9, 3, 45, 5, 0.3),
              pillar(26, 10, 1.1, 8),
              deck(28, 10, 5),
              mesa(34, 16, 2),
              spring(3, 16.55),
              checkpoint(14, 11, "cp2"),
            ],
            coins: [coin(6, 12), coin(15, 10), coin(21, 8), coin(29, 9)],
            birds: [bird(17, 6, 65, 3), bird(30, 6, -70, 3)],
            ammo: [ammo(8, 15, 12)],
            seedSpot: { x: 29 * T, y: 8 * T },
          },
        },
        {
          width: 34,
          content: {
            platforms: [
              mesa(0, 16, 4),
              deck(5, 12, 5),
              pillar(11, 10, 1.2, 8),
              deck(13, 9, 5),
              moving(19, 11, 3, -50, 4, 0.6),
              deck(25, 12, 4),
              mesa(30, 17, 4),
              checkpoint(14, 9, "cp3"),
              goal(32, 17),
            ],
            coins: [coin(6, 11), coin(15, 8), coin(21, 10), coin(26, 11)],
            birds: [bird(17, 5, 70, 3)],
            ammo: [ammo(7, 14, 12)],
          },
        },
      ]),
    // 3 Spike Gorge — pit run ~3x
    () =>
      joinActs({ x: 2 * T, y: 16 * T - PLAYER_H }, 22 * T, [
        {
          width: 28,
          content: {
            platforms: [
              mesa(0, 16, 5),
              spikes(5, 16.2, 3),
              mesa(8, 16, 3),
              spikes(11, 16.2, 3),
              mesa(14, 15, 4),
              spikes(18, 16.2, 4),
              mesa(22, 16, 6),
              deck(4, 13, 3),
              deck(10, 12, 3),
              plat(16, 12, 3),
              deck(21, 13, 3),
              spring(20, 14.55),
              checkpoint(15, 15, "cp1"),
            ],
            coins: [coin(5, 12), coin(11, 11), coin(17, 11), coin(22, 12)],
            birds: [bird(12, 9, 75, 3)],
            ammo: [ammo(9, 14, 12)],
          },
        },
        {
          width: 30,
          content: {
            platforms: [
              mesa(0, 16, 4),
              spikes(4, 16.2, 3),
              mesa(7, 15, 4),
              spikes(11, 16.2, 4),
              mesa(15, 16, 4),
              spikes(19, 16.2, 3),
              mesa(22, 14, 4),
              mesa(27, 16, 3),
              deck(3, 13, 3),
              deck(12, 12, 3),
              plat(20, 12, 3, "oneway"),
              spring(26, 13.55),
              checkpoint(16, 16, "cp2"),
            ],
            coins: [coin(4, 12), coin(13, 11), coin(21, 11), coin(23, 13)],
            birds: [bird(10, 9, -70, 3), bird(24, 10, 60, 3)],
            ammo: [ammo(8, 13, 12)],
            seedSpot: { x: 21 * T, y: 10 * T },
          },
        },
        {
          width: 28,
          content: {
            platforms: [
              mesa(0, 16, 5),
              spikes(5, 16.2, 3),
              mesa(8, 15, 5),
              spikes(13, 16.2, 3),
              mesa(16, 16, 5),
              mesa(22, 15, 6),
              deck(4, 13, 3),
              deck(11, 12, 3),
              checkpoint(17, 16, "cp3"),
              goal(26, 15),
            ],
            coins: [coin(5, 12), coin(12, 11), coin(18, 15), coin(23, 14)],
            birds: [bird(14, 9, 65, 3)],
            ammo: [ammo(10, 13, 12)],
          },
        },
      ]),
    // 4 Sandstorm Run — wreckage + rails ~2.7x
    () =>
      joinActs({ x: 2 * T, y: 17 * T - PLAYER_H }, 22 * T, [
        {
          width: 40,
          content: {
            platforms: [
              wreck(0, 17, 6),
              wreck(8, 15, 4),
              moving(13, 14, 4, 55, 4, 0.4),
              wreck(20, 16, 4),
              wreck(26, 13, 3),
              moving(30, 12, 3, 40, 3, 1.2),
              wreck(36, 16, 4),
              deck(6, 13, 3),
              spring(24, 15.55),
              checkpoint(21, 16, "cp1"),
            ],
            coins: [coin(9, 14), coin(15, 13), coin(27, 12), coin(32, 11)],
            birds: [bird(16, 10, 80, 3), bird(33, 8, -70, 3)],
            ammo: [ammo(11, 13, 12)],
          },
        },
        {
          width: 36,
          content: {
            platforms: [
              wreck(0, 16, 5),
              wreck(7, 14, 4),
              moving(12, 13, 4, 50, 4, 0.2),
              wreck(19, 15, 4),
              wreck(25, 12, 3),
              moving(29, 14, 3, -45, 3, 0.7),
              wreck(33, 16, 3),
              deck(4, 12, 3),
              spring(24, 11.55),
              checkpoint(20, 15, "cp2"),
            ],
            coins: [coin(8, 13), coin(14, 12), coin(26, 11), coin(30, 13)],
            birds: [bird(15, 9, 70, 3), bird(28, 8, -65, 3)],
            ammo: [ammo(9, 13, 12)],
            seedSpot: { x: 26 * T, y: 10 * T },
          },
        },
        {
          width: 32,
          content: {
            platforms: [
              wreck(0, 16, 5),
              wreck(7, 14, 4),
              moving(13, 13, 4, 45, 3, 0),
              wreck(20, 16, 5),
              wreck(26, 15, 6),
              deck(4, 12, 3),
              checkpoint(21, 16, "cp3"),
              goal(30, 15),
            ],
            coins: [coin(5, 11), coin(14, 12), coin(22, 15), coin(27, 14)],
            birds: [bird(16, 9, 60, 3)],
            ammo: [ammo(8, 13, 12)],
          },
        },
      ]),
    // 5 Vertical Ascent — taller climb + upper traverse
    () =>
      joinActs({ x: 2 * T, y: 28 * T - PLAYER_H }, 34 * T, [
        {
          width: 18,
          content: {
            platforms: [
              mesa(0, 28, 16),
              pillar(1, 24, 2, 4),
              deck(4, 25, 3),
              deck(9, 22, 3),
              pillar(13, 20, 1.4, 8),
              deck(3, 20, 3),
              deck(8, 17, 3),
              plat(12, 15, 3),
              spring(14, 27.55),
              checkpoint(9, 22, "cp1"),
            ],
            coins: [coin(5, 24), coin(10, 21), coin(4, 19), coin(9, 16)],
            birds: [bird(7, 18, -50, 3)],
            ammo: [ammo(2, 26, 14)],
          },
        },
        {
          width: 16,
          content: {
            platforms: [
              mesa(0, 28, 4),
              deck(3, 14, 3),
              plat(8, 12, 4),
              deck(4, 10, 3),
              plat(9, 8, 4),
              deck(3, 6, 4),
              plat(9, 4, 5),
              checkpoint(8, 12, "cp2"),
              checkpoint(10, 4, "cp3"),
            ],
            coins: [coin(4, 13), coin(9, 11), coin(5, 9), coin(10, 7), coin(4, 5), coin(11, 3)],
            birds: [bird(12, 9, 55, 3), bird(6, 5, -50, 3)],
            ammo: [ammo(2, 26, 10)],
            seedSpot: { x: 10 * T, y: 2.4 * T },
          },
        },
        {
          width: 22,
          content: {
            platforms: [
              plat(0, 4, 4),
              deck(5, 6, 4),
              plat(11, 5, 4),
              deck(16, 7, 3),
              mesa(18, 12, 4),
              goal(20, 12),
            ],
            coins: [coin(6, 5), coin(12, 4), coin(17, 6)],
            birds: [bird(14, 2, 60, 3)],
            ammo: [ammo(8, 4, 12)],
          },
        },
      ]),
    // 6 Bird Ambush — HQ galleries ~2.7x
    () =>
      joinActs({ x: 2 * T, y: 18 * T - PLAYER_H }, 22 * T, [
        {
          width: 34,
          content: {
            platforms: [
              mesa(0, 18, 6),
              panel(7, 16, 4),
              panel(13, 14, 4),
              panel(19, 16, 5),
              pillar(6, 12, 1.2, 6),
              pillar(18, 12, 1.2, 6),
              deck(8, 12, 4),
              deck(14, 10, 4),
              panel(24, 13, 4),
              mesa(28, 17, 6),
              spring(22, 15.55),
              checkpoint(14, 14, "cp1"),
            ],
            coins: [coin(8, 15), coin(14, 13), coin(16, 9), coin(25, 12)],
            birds: [bird(10, 10, 70, 3), bird(20, 8, -75, 3), bird(26, 10, 60, 3)],
            ammo: [ammo(4, 16, 14)],
          },
        },
        {
          width: 32,
          content: {
            platforms: [
              mesa(0, 17, 5),
              panel(6, 15, 4),
              panel(12, 13, 5),
              pillar(11, 10, 1.2, 6),
              deck(7, 11, 4),
              deck(14, 9, 4),
              panel(20, 14, 4),
              mesa(26, 16, 6),
              spring(24, 13.55),
              checkpoint(13, 13, "cp2"),
            ],
            coins: [coin(7, 14), coin(13, 12), coin(16, 8), coin(27, 15)],
            birds: [bird(9, 8, 75, 3), bird(18, 7, -80, 3), bird(24, 10, 65, 3)],
            ammo: [ammo(5, 15, 14)],
            seedSpot: { x: 16 * T, y: 7.5 * T },
          },
        },
        {
          width: 30,
          content: {
            platforms: [
              mesa(0, 16, 5),
              panel(6, 14, 5),
              deck(12, 11, 4),
              panel(18, 13, 4),
              mesa(24, 16, 6),
              checkpoint(19, 13, "cp3"),
              goal(28, 16),
            ],
            coins: [coin(7, 13), coin(13, 10), coin(19, 12), coin(25, 15)],
            birds: [bird(15, 8, 70, 3)],
            ammo: [ammo(8, 12, 12)],
          },
        },
      ]),
    // 7 Flooded Canyon — low wreck + high decks ~2.7x
    () =>
      joinActs({ x: 2 * T, y: 18 * T - PLAYER_H }, 22 * T, [
        {
          width: 34,
          content: {
            platforms: [
              wreck(0, 18, 5),
              wreck(6, 17, 4),
              wreck(12, 18, 5),
              wreck(20, 17, 4),
              wreck(26, 18, 8),
              deck(3, 14, 4),
              deck(10, 12, 4),
              moving(16, 11, 4, 45, 3, 0),
              deck(23, 13, 4),
              spring(8, 16.55),
              checkpoint(13, 18, "cp1"),
            ],
            coins: [coin(4, 13), coin(11, 11), coin(18, 10), coin(24, 12)],
            birds: [bird(14, 14, 55, 3), bird(22, 9, -65, 3)],
            ammo: [ammo(7, 16, 12)],
          },
        },
        {
          width: 32,
          content: {
            platforms: [
              wreck(0, 18, 5),
              wreck(6, 16, 4),
              wreck(12, 18, 5),
              wreck(19, 16, 4),
              wreck(25, 18, 7),
              deck(4, 13, 4),
              deck(11, 11, 4),
              moving(17, 10, 3, 40, 3, 0.4),
              deck(22, 12, 4),
              spring(8, 15.55),
              checkpoint(13, 18, "cp2"),
            ],
            coins: [coin(5, 12), coin(12, 10), coin(18, 9), coin(23, 11)],
            birds: [bird(15, 13, 60, 3), bird(24, 8, -70, 3)],
            ammo: [ammo(7, 15, 12)],
            seedSpot: { x: 18 * T, y: 8.5 * T },
          },
        },
        {
          width: 30,
          content: {
            platforms: [
              wreck(0, 18, 6),
              wreck(8, 17, 5),
              wreck(16, 18, 6),
              wreck(24, 17, 6),
              deck(4, 14, 4),
              deck(12, 12, 4),
              deck(20, 13, 4),
              checkpoint(17, 18, "cp3"),
              goal(28, 17),
            ],
            coins: [coin(5, 13), coin(13, 11), coin(21, 12), coin(25, 16)],
            birds: [bird(14, 10, 55, 3)],
            ammo: [ammo(9, 16, 12)],
          },
        },
      ]),
    // 8 Mafia Approach — fortress tiers ~2.6x
    () =>
      joinActs({ x: 2 * T, y: 18 * T - PLAYER_H }, 22 * T, [
        {
          width: 40,
          content: {
            platforms: [
              mesa(0, 18, 5),
              panel(6, 16, 4),
              pillar(11, 12, 1.4, 8),
              deck(13, 14, 5),
              panel(19, 12, 4),
              hexDock(24, 10, 5),
              pillar(30, 8, 1.4, 10),
              deck(32, 12, 4),
              hexDock(37, 16, 3),
              spring(17, 17.55),
              checkpoint(14, 14, "cp1"),
              checkpoint(25, 10, "cp2"),
            ],
            coins: [coin(7, 15), coin(15, 13), coin(21, 11), coin(26, 9), coin(33, 11)],
            birds: [bird(16, 10, 80, 4), bird(27, 7, -80, 4), bird(35, 9, 70, 3)],
            ammo: [ammo(4, 16, 16), ammo(32, 14, 12)],
          },
        },
        {
          width: 36,
          content: {
            platforms: [
              hexDock(0, 16, 4),
              panel(5, 14, 4),
              pillar(10, 10, 1.4, 8),
              deck(12, 12, 5),
              hexDock(18, 9, 5),
              pillar(24, 8, 1.3, 9),
              deck(26, 11, 4),
              panel(31, 14, 5),
              spring(8, 15.55),
              checkpoint(19, 9, "cp3"),
            ],
            coins: [coin(6, 13), coin(13, 11), coin(20, 8), coin(27, 10), coin(32, 13)],
            birds: [bird(15, 8, 75, 4), bird(28, 7, -75, 4)],
            ammo: [ammo(7, 12, 14)],
            seedSpot: { x: 20 * T, y: 7.5 * T },
          },
        },
        {
          width: 32,
          content: {
            platforms: [
              panel(0, 15, 5),
              hexDock(6, 12, 5),
              pillar(12, 8, 1.4, 10),
              deck(14, 10, 4),
              hexDock(20, 14, 5),
              mesa(26, 16, 6),
              checkpoint(21, 14, "cp4"),
              goal(30, 16),
            ],
            coins: [coin(7, 11), coin(15, 9), coin(21, 13), coin(27, 15)],
            birds: [bird(16, 6, 80, 4), bird(24, 10, -70, 3)],
            ammo: [ammo(8, 13, 14)],
          },
        },
      ]),
  ];
  const make = layouts[slot];
  return make ? make() : null;
}

function pickChaosSpot(
  plats: Platform[],
  width: number,
  avoid?: { x: number; y: number },
): { x: number; y: number } {
  const solids = plats.filter(
    (p) => p.kind === "solid" || p.kind === "oneway" || p.kind === "moving",
  );
  const cps = plats.filter((p) => p.kind === "checkpoint").sort((a, b) => a.x - b.x);
  const targetX = cps.length >= 2 ? cps[1]!.x + 48 : width * 0.58;
  let best = solids[0];
  let bestD = 1e9;
  for (const p of solids) {
    if (p.w < 40) continue;
    const cx = p.x + p.w * 0.5;
    let d = Math.abs(cx - targetX);
    if (avoid && Math.hypot(cx - avoid.x, p.y - avoid.y) < 80) d += 200;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  if (!best) return { x: width * 0.55, y: 220 };
  return { x: best.x + best.w * 0.5 - 18, y: best.y - 52 };
}

function withChaosGem(L: LevelDef): LevelDef {
  const id = seedForLevel(L.id);
  const avoid = L.seeds?.[0];
  const spot = pickChaosSpot(L.platforms, L.width, avoid);
  L.chaosId = id;
  L.chaosGem = { x: spot.x, y: spot.y, w: 36, h: 36, id };
  return L;
}

function buildLevel(opIdx: number, slot: number): LevelDef {
  const op = OPERATIONS[opIdx]!;
  const levelId = opIdx * 10 + slot + 1;
  const [name, subtitle] = op.levelNames[slot]!;
  const themeBase = THEME_BY_SLOT[slot]!;
  // Rotate theme slightly by operation so Op 5 dunes ≠ Op 1 dunes layouts
  const themes: Theme[] = ["dunes", "bridges", "spikes", "storm", "vertical", "hq"];
  const theme: Theme =
    slot === 9 ? "boss" : themes[(themes.indexOf(themeBase as Theme) + opIdx) % themes.length] ?? themeBase;

  const power = powerForSlot(op.id, slot);
  const radio = radioFor(op.id, slot);

  if (slot === 9) {
    const rand = rng(levelId * 99991);
    const bossPool = byRole("boss", "boss");
    const bossChunk = pick(rand, bossPool);
    const content = bossChunk.build();
    return {
      id: levelId,
      name,
      subtitle,
      width: bossChunk.width * TILE,
      height: 20 * TILE,
      spawn: { x: 4 * TILE, y: 18 * TILE - PLAYER_H },
      platforms: stampAll(content.platforms, "boss"),
      coins: content.coins,
      birds: [],
      ammo: content.ammo,
      seeds: [],
      disasterInterval: Math.max(10, 18 - opIdx),
      boss: true,
      theme: "boss",
      radio,
      operation: op.id,
      bossName: op.boss,
      epic: opIdx === 9,
    };
  }

  const assembled =
    opIdx === 0 ? buildSignatureOp1(slot) ?? assembleFromChunks(levelId, opIdx, slot, theme, rolePlan(slot))
    : assembleFromChunks(levelId, opIdx, slot, theme, rolePlan(slot));
  assembled.platforms = paintSlotForms(stampAll(assembled.platforms, theme), slot);
  const seeds: Omit<PowerSeed, "collected" | "bob">[] = [];
  if (assembled.seedSpot) {
    seeds.push({
      x: assembled.seedSpot.x - (SEED_SIZE - 28) / 2,
      y: assembled.seedSpot.y - (SEED_SIZE - 28) / 2,
      w: SEED_SIZE,
      h: SEED_SIZE,
      kind: power,
    });
  } else if (assembled.coins.length) {
    const c = assembled.coins[Math.floor(assembled.coins.length / 2)]!;
    seeds.push({
      x: c.x - (SEED_SIZE - 28) / 2,
      y: c.y - 48,
      w: SEED_SIZE,
      h: SEED_SIZE,
      kind: power,
    });
  }

  return {
    id: levelId,
    name,
    subtitle,
    width: assembled.width,
    height: assembled.height,
    spawn: assembled.spawn,
    platforms: assembled.platforms,
    coins: assembled.coins,
    birds: assembled.birds,
    ammo: assembled.ammo,
    seeds,
    disasterInterval: Math.max(10, 42 - slot * 2 - opIdx),
    boss: false,
    theme,
    radio,
    operation: op.id,
    introPower: power,
    epic: false,
  };
}

export const CAMPAIGN: LevelDef[] = (() => {
  const out: LevelDef[] = [];
  for (let op = 0; op < 10; op++) {
    for (let slot = 0; slot < 10; slot++) {
      out.push(withChaosGem(buildLevel(op, slot)));
    }
  }
  return out;
})();

/** Debug: unique chunk ids used across campaign */
export function campaignChunkStats() {
  return {
    levels: CAMPAIGN.length,
    chunksAuthored: CHUNKS.length,
    sampleIds: CAMPAIGN.slice(0, 5).map((L) => ({
      id: L.id,
      w: L.width,
      plats: L.platforms.length,
      birds: L.birds.length,
      theme: L.theme,
    })),
  };
}
