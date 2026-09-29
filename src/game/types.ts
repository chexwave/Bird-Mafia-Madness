import type { ChaosId, PowerKind } from "./progression";

export type CharacterId = "grok" | "goblin";
export type WeaponId =
  | "pulse"
  | "beam"
  | "spread"
  | "homing"
  | "charge"
  | "nova"
  | "ricochet";
export type Screen = "title" | "intro" | "character" | "levels" | "playing" | "paused" | "dead" | "win";

export type Rect = { x: number; y: number; w: number; h: number };

export type PlatformKind = "solid" | "oneway" | "moving" | "conveyor" | "spring" | "hazard" | "checkpoint" | "goal";

/** Visual silhouette — collision stays the AABB. */
export type PlatformForm =
  | "mesa"
  | "slab"
  | "deck"
  | "girder"
  | "tooth"
  | "wreck"
  | "panel"
  | "pillar"
  | "hex"
  | "bowl"
  | "ramp"
  | "steps"
  | "arch"
  | "cantilever"
  | "mushroom"
  | "belt";

export type Platform = Rect & {
  kind: PlatformKind;
  form?: PlatformForm;
  vx?: number;
  vy?: number;
  range?: number;
  originX?: number;
  originY?: number;
  phase?: number;
  active?: boolean;
  id?: string;
};

export type Coin = Rect & { collected: boolean; bob: number };
export type AmmoPickup = Rect & { collected: boolean; amount: number };
/** World pickup size — large enough to read against neon canyon art. */
export const SEED_SIZE = 56;
export type PowerSeed = Rect & {
  collected: boolean;
  bob: number;
  kind: PowerKind;
};
export type Bird = Rect & {
  vx: number;
  vy: number;
  hp: number;
  frame: number;
  t: number;
  dead: boolean;
  hitFlash?: number;
  /** Telegraph before dive / shot */
  windup?: number;
  /** Flap squash-stretch (1 = neutral) */
  flap?: number;
};
export type Laser = Rect & {
  vx: number;
  vy: number;
  life: number;
  dmg: number;
  color: string;
  fromPlayer: boolean;
  homing?: boolean;
  bounces?: number;
  nova?: boolean;
  pierce?: boolean;
};
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
};
export type HazardEvent = {
  kind: "sandstorm" | "quake" | "meteor" | "lightning";
  t: number;
  duration: number;
  active: boolean;
};

export type BossState = {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
  t: number;
  vx: number;
  vy: number;
  dead: boolean;
  flash: number;
  attackCd: number;
};

export type LevelDef = {
  id: number;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  platforms: Platform[];
  coins: Omit<Coin, "collected" | "bob">[];
  birds: Omit<Bird, "frame" | "t" | "dead" | "hitFlash">[];
  ammo: Omit<AmmoPickup, "collected">[];
  seeds?: Omit<PowerSeed, "collected" | "bob">[];
  disasterInterval: number;
  boss?: boolean;
  theme?: "dunes" | "bridges" | "spikes" | "storm" | "vertical" | "hq" | "boss";
  radio?: string;
  operation?: number;
  bossName?: string;
  introPower?: PowerKind;
  epic?: boolean;
  /** This level's chaos seed — color + world spawn. */
  chaosId?: ChaosId;
  chaosGem?: { x: number; y: number; w: number; h: number; id: ChaosId };
};

export type HudState = {
  score: number;
  coins: number;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  ammo: number;
  maxAmmo: number;
  weapon: WeaponId;
  character: CharacterId;
  level: number;
  lives: number;
  checkpoint: string | null;
  shield: number;
  maxShield: number;
  shielding: boolean;
  bossHp?: number;
  bossMaxHp?: number;
  bossName?: string;
  weaponCharge?: number;
  unlockedPowers: PowerKind[];
  radio: string;
  operation: number;
  chaosGot: ChaosId[];
  lastChaos?: ChaosId;
  /** Checkpoint flags in world-x order — true once that flag is tagged. */
  flags: boolean[];
  /** This level's chaos seed color. */
  chaosHere: ChaosId;
  /** True once THIS level's chaos seed has been collected. */
  chaosHereGot: boolean;
  /** Current operation's 10 level-seed dots, slot 0–9. */
  chaosSlots: boolean[];
  activeBuffs: string[];
};

export type InputState = {
  left: boolean;
  right: boolean;
  up: boolean;
  jump: boolean;
  jumpPressed: boolean;
  fire: boolean;
  firePressed: boolean;
  weaponNext: boolean;
  weaponPrev: boolean;
  weaponPick?: WeaponId;
  pause: boolean;
  shield: boolean;
};
