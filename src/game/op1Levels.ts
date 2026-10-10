/**
 * Operation 1 rooms from the LevelChex structure pack.
 * Tile units. Other operations do not read this file.
 */
import pack from "./op1-structures.json";
import { radioFor } from "./narrative";
import { CHAOS_IDS, OPERATIONS, POWER_KINDS, type ChaosId, type PowerKind } from "./progression";
import { SEED_SIZE, type LevelDef, type Platform, type PlatformForm } from "./types";

const TILE = 40;
const PLAYER_H = 86;

type RawPlat = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: Platform["kind"];
  form?: PlatformForm;
  job?: string;
  id?: string;
  vx?: number;
};

type RawLevel = {
  slot: number;
  name: string;
  blurb: string;
  w: number;
  h: number;
  theme: NonNullable<LevelDef["theme"]>;
  spawn: [number, number];
  boss: boolean;
  plats: RawPlat[];
  birds: { x: number; y: number; w: number; h: number; vx: number; hp: number }[];
  coins: { x: number; y: number; w: number; h: number }[];
  ammo: { x: number; y: number; w: number; h: number; amount: number }[];
  seeds: { x: number; y: number; w: number; h: number; kind: string }[];
  chaos: { x: number; y: number; w: number; h: number; id: string };
};

const LEVELS = (pack as unknown as { levels: RawLevel[] }).levels;

function px(n: number) {
  return n * TILE;
}

function isPower(kind: string): kind is PowerKind {
  return (POWER_KINDS as readonly string[]).includes(kind);
}

function isChaos(id: string): id is ChaosId {
  return (CHAOS_IDS as readonly string[]).includes(id);
}

function mapPlat(p: RawPlat): Platform {
  const job = p.job === "floor" || p.job === "spike" ? undefined : (p.job as Platform["job"]);
  const plat: Platform = {
    x: px(p.x),
    y: px(p.y),
    w: px(p.w),
    h: px(p.h),
    kind: p.kind,
    form: p.form,
    id: p.id,
    job,
  };
  if (p.kind === "conveyor") plat.vx = p.vx ?? 80;
  if (job === "crumble") plat.crumble = 0.7;
  if (job === "moving") {
    plat.kind = "moving";
    plat.vx = 42;
    plat.range = 3 * TILE;
    plat.originX = plat.x;
    plat.originY = plat.y;
    plat.phase = p.x * 0.01;
  }
  return plat;
}

export function buildOp1FromPack(slot: number): LevelDef {
  const src = LEVELS[slot];
  if (!src) throw new Error(`Operation 1 has no structure for slot ${slot}`);
  const op = OPERATIONS[0]!;
  const [name, subtitle] = op.levelNames[slot] ?? [src.name, src.blurb];
  const levelId = slot + 1;
  const powerSeed = src.seeds.find((s) => isPower(s.kind));
  const chaosId = isChaos(src.chaos.id) ? src.chaos.id : "crimson";
  return {
    id: levelId,
    name,
    subtitle,
    width: px(src.w),
    height: px(src.h),
    spawn: { x: px(src.spawn[0]), y: px(src.spawn[1]) - PLAYER_H },
    platforms: src.plats.map(mapPlat),
    coins: src.coins.map((c) => ({ x: px(c.x), y: px(c.y), w: px(c.w), h: px(c.h) })),
    birds: src.birds.map((b) => ({
      x: px(b.x),
      y: px(b.y),
      w: Math.max(48, px(b.w)),
      h: Math.max(36, px(b.h)),
      vx: b.vx,
      vy: 0,
      hp: b.hp,
    })),
    ammo: src.ammo.map((a) => ({
      x: px(a.x),
      y: px(a.y),
      w: px(a.w),
      h: px(a.h),
      amount: a.amount,
    })),
    seeds: powerSeed
      ? [
          {
            x: px(powerSeed.x),
            y: px(powerSeed.y),
            w: SEED_SIZE,
            h: SEED_SIZE,
            kind: powerSeed.kind as PowerKind,
          },
        ]
      : [],
    disasterInterval: src.boss ? 22 : 40,
    boss: src.boss,
    horde: slot === 5,
    cagePart: slot === 5 ? null : undefined,
    theme: src.theme,
    radio: radioFor(1, slot),
    operation: op.id,
    bossName: src.boss ? op.boss : undefined,
    introPower: powerSeed ? (powerSeed.kind as PowerKind) : undefined,
    epic: false,
    chaosId: src.boss ? "indigo" : chaosId,
    chaosGem: {
      x: px(src.chaos.x),
      y: px(src.chaos.y),
      w: 36,
      h: 36,
      id: src.boss ? "indigo" : chaosId,
    },
  };
}
