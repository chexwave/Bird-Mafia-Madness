import type { LevelDef, Platform } from "./types";

const TILE = 40;
const PLAYER_H = 86;

function ground(x: number, y: number, wTiles: number, kind: Platform["kind"] = "solid"): Platform {
  // Thicker ground slabs for readability
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 56, kind };
}

function plat(x: number, y: number, wTiles: number, kind: Platform["kind"] = "solid"): Platform {
  // Chunky floating platforms
  return { x: x * TILE, y: y * TILE, w: wTiles * TILE, h: 34, kind };
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
    h: 34,
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

function spawnOn(groundTileY: number, xTiles = 2) {
  return { x: xTiles * TILE, y: groundTileY * TILE - PLAYER_H };
}

function coinRow(startX: number, y: number, n: number, step = 3) {
  return Array.from({ length: n }, (_, i) => ({
    x: (startX + i * step) * TILE,
    y: y * TILE,
    w: 22,
    h: 22,
  }));
}

export const LEVELS: LevelDef[] = [
  // ─── 1 Tutorial ───────────────────────────────────────────────
  {
    id: 1,
    name: "Desert Briefing",
    subtitle: "Honey Bun AI is gone — learn the moves, start the hunt",
    width: 72 * TILE,
    height: 20 * TILE,
    spawn: spawnOn(14),
    disasterInterval: 999,
    theme: "dunes",
    platforms: [
      ground(0, 14, 18),
      ground(20, 14, 12),
      ground(34, 13, 10),
      ground(46, 14, 14),
      ground(62, 14, 10),
      plat(8, 11, 3, "oneway"),
      plat(14, 9, 3, "oneway"),
      spring(22, 13.55),
      plat(28, 11, 4),
      plat(36, 10, 3, "oneway"),
      checkpoint(40, 13, "cp1"),
      plat(48, 11, 3),
      spring(54, 13.55),
      plat(58, 10, 3, "oneway"),
      goal(68, 14),
    ],
    coins: [...coinRow(9, 10, 4, 2), ...coinRow(29, 9.5, 3, 2), ...coinRow(49, 9.5, 4, 2)],
    birds: [
      { x: 24 * TILE, y: 9 * TILE, w: 48, h: 36, vx: -50, vy: 0, hp: 2 },
      { x: 50 * TILE, y: 8 * TILE, w: 48, h: 36, vx: 55, vy: 0, hp: 2 },
    ],
    ammo: [
      { x: 16 * TILE, y: 12 * TILE, w: 28, h: 28, amount: 10 },
      { x: 42 * TILE, y: 12 * TILE, w: 28, h: 28, amount: 10 },
    ],
  },

  // ─── 2 Neon Dunes ─────────────────────────────────────────────
  {
    id: 2,
    name: "Neon Dunes",
    subtitle: "First Bird Mafia patrol — crumbs point this way",
    width: 100 * TILE,
    height: 20 * TILE,
    spawn: spawnOn(16),
    disasterInterval: 32,
    theme: "dunes",
    platforms: [
      ground(0, 16, 14),
      ground(16, 16, 8),
      ground(26, 15, 10),
      ground(38, 16, 12),
      ground(52, 14, 8),
      ground(62, 16, 10),
      ground(74, 15, 10),
      ground(86, 16, 14),
      plat(7, 13, 3, "oneway"),
      plat(12, 11, 3, "oneway"),
      plat(20, 12, 4),
      spring(24, 15.55),
      moving(30, 11, 3, 55, 4, 0),
      plat(40, 12, 3, "oneway"),
      spikes(42, 15.45, 3),
      checkpoint(48, 16, "cp1"),
      plat(54, 11, 3),
      moving(60, 10, 3, -50, 5, 1),
      spring(68, 15.55),
      plat(72, 12, 3, "oneway"),
      spikes(78, 14.45, 3),
      plat(82, 11, 4),
      checkpoint(90, 16, "cp2"),
      goal(96, 16),
    ],
    coins: [
      ...coinRow(8, 12, 5, 2),
      ...coinRow(31, 9, 4, 2),
      ...coinRow(55, 9.5, 4, 2),
      ...coinRow(83, 9.5, 4, 2),
    ],
    birds: [
      { x: 18 * TILE, y: 10 * TILE, w: 48, h: 36, vx: -70, vy: 0, hp: 2 },
      { x: 36 * TILE, y: 8 * TILE, w: 48, h: 36, vx: 60, vy: 0, hp: 2 },
      { x: 58 * TILE, y: 9 * TILE, w: 48, h: 36, vx: -75, vy: 0, hp: 3 },
      { x: 80 * TILE, y: 8 * TILE, w: 48, h: 36, vx: 65, vy: 0, hp: 3 },
    ],
    ammo: [
      { x: 25 * TILE, y: 14 * TILE, w: 28, h: 28, amount: 10 },
      { x: 56 * TILE, y: 10 * TILE, w: 28, h: 28, amount: 12 },
      { x: 84 * TILE, y: 10 * TILE, w: 28, h: 28, amount: 12 },
    ],
  },

  // ─── 3 Sky Bridges — movers only corridors ────────────────────
  {
    id: 3,
    name: "Sky Bridges",
    subtitle: "Raven flight path — ride the rails higher",
    width: 110 * TILE,
    height: 20 * TILE,
    spawn: spawnOn(18),
    disasterInterval: 26,
    theme: "bridges",
    platforms: [
      ground(0, 18, 10),
      ground(100, 18, 10),
      moving(12, 16, 4, 70, 3, 0),
      moving(22, 14, 3, -60, 4, 0.5),
      moving(32, 12, 4, 80, 5, 0),
      plat(40, 14, 3, "oneway"),
      checkpoint(42, 14, "cp1"),
      moving(48, 11, 3, -70, 4, 1),
      spring(54, 15.55),
      ground(56, 16, 6),
      moving(64, 12, 4, 90, 5, 0),
      moving(74, 10, 3, -65, 4, 0.3),
      plat(82, 13, 3, "oneway"),
      checkpoint(84, 13, "cp2"),
      moving(90, 14, 3, 55, 3, 0),
      ground(96, 16, 4),
      spring(98, 15.55),
      goal(106, 18),
    ],
    coins: coinRow(14, 13, 16, 5.5).map((c, i) => ({
      ...c,
      y: (8 + (i % 4) * 1.5) * TILE,
    })),
    birds: [
      { x: 20 * TILE, y: 10 * TILE, w: 48, h: 36, vx: -80, vy: 0, hp: 3 },
      { x: 45 * TILE, y: 8 * TILE, w: 48, h: 36, vx: 70, vy: 0, hp: 3 },
      { x: 70 * TILE, y: 7 * TILE, w: 48, h: 36, vx: -90, vy: 0, hp: 3 },
      { x: 88 * TILE, y: 9 * TILE, w: 48, h: 36, vx: 75, vy: 0, hp: 3 },
    ],
    ammo: [
      { x: 43 * TILE, y: 12 * TILE, w: 28, h: 28, amount: 12 },
      { x: 85 * TILE, y: 11 * TILE, w: 28, h: 28, amount: 14 },
    ],
  },

  // ─── 4 Spike Gorge ────────────────────────────────────────────
  {
    id: 4,
    name: "Spike Gorge",
    subtitle: "Trap canyon — shield up, eyes on the sky",
    width: 96 * TILE,
    height: 20 * TILE,
    spawn: spawnOn(16),
    disasterInterval: 24,
    theme: "spikes",
    platforms: [
      ground(0, 16, 8),
      ground(12, 16, 4),
      spikes(10, 15.45, 2),
      ground(20, 15, 5),
      spikes(18, 14.45, 2),
      spikes(25, 14.45, 2),
      plat(28, 12, 3, "oneway"),
      spring(30, 14.55),
      ground(34, 16, 6),
      spikes(36, 15.45, 3),
      plat(42, 13, 3),
      checkpoint(44, 13, "cp1"),
      spikes(48, 15.45, 4),
      ground(52, 16, 5),
      moving(58, 12, 3, 50, 3, 0),
      spikes(62, 15.45, 3),
      ground(66, 14, 5),
      spring(70, 13.55),
      plat(74, 11, 3, "oneway"),
      spikes(78, 15.45, 4),
      ground(82, 16, 6),
      checkpoint(86, 16, "cp2"),
      spikes(88, 15.45, 2),
      ground(92, 16, 4),
      goal(94, 16),
    ],
    coins: [
      ...coinRow(13, 14, 3, 2),
      ...coinRow(29, 10.5, 3, 2),
      ...coinRow(43, 11, 3, 2),
      ...coinRow(67, 12, 3, 2),
      ...coinRow(75, 9.5, 3, 2),
    ],
    birds: [
      { x: 22 * TILE, y: 10 * TILE, w: 48, h: 36, vx: -60, vy: 0, hp: 3 },
      { x: 50 * TILE, y: 9 * TILE, w: 48, h: 36, vx: 70, vy: 0, hp: 3 },
      { x: 72 * TILE, y: 8 * TILE, w: 48, h: 36, vx: -80, vy: 0, hp: 4 },
    ],
    ammo: [
      { x: 31 * TILE, y: 13 * TILE, w: 28, h: 28, amount: 14 },
      { x: 68 * TILE, y: 12 * TILE, w: 28, h: 28, amount: 14 },
    ],
  },

  // ─── 5 Sandstorm Run ──────────────────────────────────────────
  {
    id: 5,
    name: "Sandstorm Run",
    subtitle: "Storm cover for the extraction — keep moving",
    width: 120 * TILE,
    height: 20 * TILE,
    spawn: spawnOn(16),
    disasterInterval: 12,
    theme: "storm",
    platforms: [
      ground(0, 16, 12),
      ground(14, 15, 8),
      ground(24, 16, 10),
      ground(36, 14, 8),
      ground(46, 16, 10),
      ground(58, 15, 8),
      ground(68, 16, 12),
      ground(82, 14, 8),
      ground(92, 16, 10),
      ground(104, 15, 8),
      ground(114, 16, 6),
      plat(8, 12, 3, "oneway"),
      moving(18, 11, 3, 70, 4, 0),
      spring(28, 15.55),
      checkpoint(32, 16, "cp1"),
      plat(40, 11, 3),
      spikes(48, 15.45, 3),
      moving(54, 10, 3, -60, 5, 0.5),
      checkpoint(64, 16, "cp2"),
      plat(72, 12, 4, "oneway"),
      spring(78, 15.55),
      moving(88, 11, 3, 80, 4, 0),
      checkpoint(98, 16, "cp3"),
      spikes(106, 14.45, 3),
      spring(110, 14.55),
      goal(117, 16),
    ],
    coins: coinRow(10, 10, 18, 5.5).map((c, i) => ({
      ...c,
      y: (8 + (i % 3) * 2) * TILE,
    })),
    birds: [
      { x: 20 * TILE, y: 9 * TILE, w: 48, h: 36, vx: -90, vy: 0, hp: 3 },
      { x: 40 * TILE, y: 8 * TILE, w: 48, h: 36, vx: 85, vy: 0, hp: 3 },
      { x: 60 * TILE, y: 9 * TILE, w: 48, h: 36, vx: -95, vy: 0, hp: 4 },
      { x: 80 * TILE, y: 8 * TILE, w: 48, h: 36, vx: 90, vy: 0, hp: 4 },
      { x: 100 * TILE, y: 9 * TILE, w: 48, h: 36, vx: -100, vy: 0, hp: 4 },
    ],
    ammo: [
      { x: 30 * TILE, y: 14 * TILE, w: 28, h: 28, amount: 12 },
      { x: 66 * TILE, y: 14 * TILE, w: 28, h: 28, amount: 14 },
      { x: 100 * TILE, y: 14 * TILE, w: 28, h: 28, amount: 16 },
    ],
  },

  // ─── 6 Vertical Ascent ────────────────────────────────────────
  {
    id: 6,
    name: "Vertical Ascent",
    subtitle: "Climb to the telescope ridge — Honey Bun signal up high",
    width: 48 * TILE,
    height: 40 * TILE,
    spawn: spawnOn(38, 3),
    disasterInterval: 22,
    theme: "vertical",
    platforms: [
      ground(0, 38, 12),
      plat(4, 35, 3, "oneway"),
      plat(10, 32, 3, "oneway"),
      spring(14, 37.55),
      plat(2, 29, 3),
      moving(8, 26, 3, 40, 3, 0),
      plat(14, 23, 3, "oneway"),
      checkpoint(16, 23, "cp1"),
      plat(6, 20, 3),
      spring(4, 19.55),
      plat(12, 17, 3, "oneway"),
      moving(4, 14, 3, -45, 4, 0.5),
      plat(14, 12, 3),
      checkpoint(16, 12, "cp2"),
      plat(6, 9, 3, "oneway"),
      spring(10, 8.55),
      plat(14, 6, 4),
      ground(20, 8, 8),
      plat(28, 11, 3),
      plat(32, 14, 3, "oneway"),
      ground(28, 18, 10),
      goal(34, 18),
      // side walls feel via tall stacks
      ground(0, 20, 2),
      ground(0, 10, 2),
    ],
    coins: [
      ...coinRow(5, 34, 3, 2),
      ...coinRow(3, 28, 3, 2),
      ...coinRow(13, 16, 3, 2),
      ...coinRow(7, 8, 3, 2),
      ...coinRow(29, 16, 4, 2),
    ],
    birds: [
      { x: 10 * TILE, y: 30 * TILE, w: 48, h: 36, vx: -50, vy: 0, hp: 3 },
      { x: 8 * TILE, y: 18 * TILE, w: 48, h: 36, vx: 60, vy: 0, hp: 3 },
      { x: 12 * TILE, y: 10 * TILE, w: 48, h: 36, vx: -55, vy: 0, hp: 4 },
      { x: 30 * TILE, y: 12 * TILE, w: 48, h: 36, vx: 70, vy: 0, hp: 4 },
    ],
    ammo: [
      { x: 15 * TILE, y: 22 * TILE, w: 28, h: 28, amount: 14 },
      { x: 15 * TILE, y: 11 * TILE, w: 28, h: 28, amount: 14 },
    ],
  },

  // ─── 7 Bird Ambush ────────────────────────────────────────────
  {
    id: 7,
    name: "Bird Ambush",
    subtitle: "Mafia flock inbound — they know we're coming",
    width: 100 * TILE,
    height: 20 * TILE,
    spawn: spawnOn(16),
    disasterInterval: 18,
    theme: "hq",
    platforms: [
      ground(0, 16, 16),
      ground(18, 16, 12),
      ground(32, 15, 10),
      ground(44, 16, 14),
      ground(60, 15, 12),
      ground(74, 16, 14),
      ground(90, 16, 10),
      plat(6, 12, 4, "oneway"),
      plat(14, 10, 3, "oneway"),
      plat(22, 12, 4),
      spring(28, 15.55),
      checkpoint(36, 15, "cp1"),
      plat(40, 11, 3),
      moving(48, 10, 3, 70, 4, 0),
      plat(56, 12, 3, "oneway"),
      checkpoint(64, 15, "cp2"),
      plat(68, 11, 4),
      spring(72, 15.55),
      moving(78, 10, 3, -65, 4, 0.5),
      plat(86, 12, 3),
      goal(96, 16),
    ],
    coins: coinRow(8, 9, 14, 6),
    birds: [
      { x: 12 * TILE, y: 8 * TILE, w: 48, h: 36, vx: -100, vy: 0, hp: 3 },
      { x: 16 * TILE, y: 6 * TILE, w: 48, h: 36, vx: 90, vy: 0, hp: 3 },
      { x: 30 * TILE, y: 8 * TILE, w: 48, h: 36, vx: -85, vy: 0, hp: 4 },
      { x: 38 * TILE, y: 7 * TILE, w: 48, h: 36, vx: 95, vy: 0, hp: 4 },
      { x: 50 * TILE, y: 6 * TILE, w: 48, h: 36, vx: -100, vy: 0, hp: 4 },
      { x: 58 * TILE, y: 8 * TILE, w: 48, h: 36, vx: 80, vy: 0, hp: 4 },
      { x: 70 * TILE, y: 7 * TILE, w: 48, h: 36, vx: -110, vy: 0, hp: 5 },
      { x: 82 * TILE, y: 6 * TILE, w: 48, h: 36, vx: 90, vy: 0, hp: 5 },
      { x: 88 * TILE, y: 9 * TILE, w: 48, h: 36, vx: -85, vy: 0, hp: 4 },
    ],
    ammo: [
      { x: 24 * TILE, y: 14 * TILE, w: 28, h: 28, amount: 16 },
      { x: 46 * TILE, y: 14 * TILE, w: 28, h: 28, amount: 18 },
      { x: 70 * TILE, y: 14 * TILE, w: 28, h: 28, amount: 18 },
      { x: 90 * TILE, y: 14 * TILE, w: 28, h: 28, amount: 16 },
    ],
  },

  // ─── 8 Flooded Canyon ─────────────────────────────────────────
  {
    id: 8,
    name: "Flooded Canyon",
    subtitle: "Flash flood cover — stay high, follow the crumbs",
    width: 108 * TILE,
    height: 20 * TILE,
    spawn: spawnOn(18),
    disasterInterval: 10,
    theme: "storm",
    platforms: [
      ground(0, 18, 10),
      ground(12, 16, 6),
      ground(20, 18, 8),
      ground(30, 15, 6),
      ground(38, 18, 10),
      ground(50, 14, 6),
      ground(58, 18, 10),
      ground(70, 15, 8),
      ground(80, 18, 10),
      ground(92, 16, 6),
      ground(100, 18, 8),
      plat(6, 14, 3, "oneway"),
      plat(14, 12, 3, "oneway"),
      moving(24, 13, 3, 60, 3, 0),
      checkpoint(34, 15, "cp1"),
      plat(42, 14, 3, "oneway"),
      spring(46, 17.55),
      plat(52, 11, 3),
      moving(60, 12, 3, -70, 4, 0.5),
      checkpoint(66, 18, "cp2"),
      plat(74, 12, 3, "oneway"),
      spring(78, 17.55),
      moving(86, 13, 3, 65, 3, 0),
      plat(94, 12, 3),
      goal(104, 18),
    ],
    coins: coinRow(8, 11, 14, 6.5).map((c, i) => ({
      ...c,
      y: (9 + (i % 3)) * TILE,
    })),
    birds: [
      { x: 18 * TILE, y: 10 * TILE, w: 48, h: 36, vx: -80, vy: 0, hp: 4 },
      { x: 40 * TILE, y: 9 * TILE, w: 48, h: 36, vx: 85, vy: 0, hp: 4 },
      { x: 64 * TILE, y: 10 * TILE, w: 48, h: 36, vx: -90, vy: 0, hp: 4 },
      { x: 88 * TILE, y: 9 * TILE, w: 48, h: 36, vx: 80, vy: 0, hp: 5 },
    ],
    ammo: [
      { x: 26 * TILE, y: 16 * TILE, w: 28, h: 28, amount: 14 },
      { x: 54 * TILE, y: 10 * TILE, w: 28, h: 28, amount: 16 },
      { x: 90 * TILE, y: 14 * TILE, w: 28, h: 28, amount: 16 },
    ],
  },

  // ─── 9 Mafia Approach ─────────────────────────────────────────
  {
    id: 9,
    name: "Mafia Approach",
    subtitle: "Outer perimeter of Don Corvone's nest — final run",
    width: 130 * TILE,
    height: 22 * TILE,
    spawn: spawnOn(20),
    disasterInterval: 14,
    theme: "hq",
    platforms: [
      ground(0, 20, 12),
      ground(14, 19, 6),
      ground(22, 20, 8),
      ground(32, 17, 6),
      ground(40, 20, 10),
      ground(52, 18, 8),
      ground(62, 20, 10),
      ground(74, 16, 6),
      ground(82, 20, 10),
      ground(94, 17, 8),
      ground(104, 20, 10),
      ground(116, 18, 6),
      ground(124, 20, 6),
      plat(6, 16, 3, "oneway"),
      moving(16, 14, 3, 80, 4, 0),
      spring(20, 18.55),
      spikes(26, 19.45, 3),
      moving(34, 13, 3, -70, 5, 0.4),
      plat(42, 14, 3),
      checkpoint(46, 20, "cp1"),
      spring(50, 19.55),
      moving(56, 12, 4, 90, 5, 0),
      spikes(64, 19.45, 3),
      plat(70, 13, 3, "oneway"),
      checkpoint(78, 20, "cp2"),
      moving(86, 14, 3, -75, 4, 1),
      spring(92, 16.55),
      plat(98, 12, 3),
      spikes(102, 19.45, 3),
      moving(108, 13, 3, 70, 4, 0),
      checkpoint(112, 20, "cp3"),
      spring(118, 17.55),
      plat(122, 14, 3, "oneway"),
      goal(127, 20),
    ],
    coins: coinRow(8, 12, 20, 5.8).map((c, i) => ({
      ...c,
      y: (8 + (i % 4) * 1.4) * TILE,
    })),
    birds: [
      { x: 18 * TILE, y: 12 * TILE, w: 48, h: 36, vx: -100, vy: 0, hp: 4 },
      { x: 30 * TILE, y: 10 * TILE, w: 48, h: 36, vx: 95, vy: 0, hp: 4 },
      { x: 48 * TILE, y: 11 * TILE, w: 48, h: 36, vx: -90, vy: 0, hp: 5 },
      { x: 60 * TILE, y: 9 * TILE, w: 48, h: 36, vx: 100, vy: 0, hp: 5 },
      { x: 78 * TILE, y: 10 * TILE, w: 48, h: 36, vx: -105, vy: 0, hp: 5 },
      { x: 96 * TILE, y: 11 * TILE, w: 48, h: 36, vx: 90, vy: 0, hp: 5 },
      { x: 114 * TILE, y: 10 * TILE, w: 48, h: 36, vx: -110, vy: 0, hp: 5 },
    ],
    ammo: [
      { x: 22 * TILE, y: 18 * TILE, w: 28, h: 28, amount: 16 },
      { x: 48 * TILE, y: 18 * TILE, w: 28, h: 28, amount: 18 },
      { x: 80 * TILE, y: 18 * TILE, w: 28, h: 28, amount: 18 },
      { x: 110 * TILE, y: 18 * TILE, w: 28, h: 28, amount: 20 },
    ],
  },

  // ─── 10 Boss: Don Corvone ─────────────────────────────────────
  {
    id: 10,
    name: "Don Corvone",
    subtitle: "Kingpin has Honey Bun AI — three phases. Extract him.",
    width: 48 * TILE,
    height: 20 * TILE,
    spawn: spawnOn(18, 4),
    disasterInterval: 16,
    theme: "boss",
    boss: true,
    platforms: [
      // Arena floor with side platforms
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
      // Goal hidden until boss dies — still present high; engine enables on death
      goal(44, 18),
    ],
    coins: [
      ...coinRow(12, 12, 4, 2),
      ...coinRow(30, 12, 4, 2),
      { x: 22 * TILE, y: 9 * TILE, w: 22, h: 22 },
      { x: 24 * TILE, y: 9 * TILE, w: 22, h: 22 },
    ],
    birds: [], // boss spawns adds itself
    ammo: [
      { x: 6 * TILE, y: 16 * TILE, w: 28, h: 28, amount: 20 },
      { x: 42 * TILE, y: 16 * TILE, w: 28, h: 28, amount: 20 },
      { x: 22 * TILE, y: 16 * TILE, w: 28, h: 28, amount: 16 },
    ],
  },
];
