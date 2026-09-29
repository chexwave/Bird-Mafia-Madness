export const POWER_KINDS = [
  "health",
  "stamina",
  "ammo",
  "shield",
  "homing",
  "overload",
  "rapid",
  "zapper",
  "slowmo",
] as const;

export type PowerKind = (typeof POWER_KINDS)[number];

export const POWER_META: Record<
  PowerKind,
  { name: string; short: string; color: string; effect: string }
> = {
  health: { name: "Health Surge", short: "HP", color: "#ff4466", effect: "Instant Health regen" },
  stamina: { name: "Stamina Surge", short: "STM", color: "#39ff9a", effect: "Instant Stamina regen" },
  ammo: { name: "Ammo Surge", short: "AMMO", color: "#00f0ff", effect: "Instant Ammo regen" },
  shield: { name: "Shield Surge", short: "SHD", color: "#7ef9ff", effect: "Instant Shield regen" },
  homing: { name: "Homing Core", short: "HOM", color: "#c77dff", effect: "Homing shots" },
  overload: { name: "Overload", short: "OVR", color: "#ff9f43", effect: "Double Damage" },
  rapid: { name: "Rapid Core", short: "RPD", color: "#ffcc33", effect: "Rapid Fire + regen" },
  zapper: { name: "Zapper Shield", short: "ZAP", color: "#39ff9a", effect: "Contact damage shield" },
  slowmo: { name: "Slow-Mo", short: "SLOW", color: "#c77dff", effect: "Time slow" },
};

export const CHAOS_IDS = [
  "crimson",
  "cyan",
  "chartreuse",
  "magenta",
  "amber",
  "violet",
  "azure",
  "lime",
  "fuchsia",
  "indigo",
] as const;

export type ChaosId = (typeof CHAOS_IDS)[number];

export const CHAOS_META: Record<
  ChaosId,
  { name: string; color: string; passive: string }
> = {
  crimson: { name: "Crimson", color: "#ff2b4a", passive: "+ max Health" },
  cyan: { name: "Cyan", color: "#00f0ff", passive: "+ max Stamina" },
  chartreuse: { name: "Chartreuse", color: "#c6ff3a", passive: "+ max Ammo" },
  magenta: { name: "Magenta", color: "#ff2bd6", passive: "+ max Shield" },
  amber: { name: "Amber", color: "#ff9f43", passive: "damage boost" },
  violet: { name: "Violet", color: "#a78bfa", passive: "faster fire" },
  azure: { name: "Azure", color: "#4cc9ff", passive: "jump / air control" },
  lime: { name: "Lime", color: "#b8ff3a", passive: "pickup magnet" },
  fuchsia: { name: "Fuchsia", color: "#ff4fd8", passive: "less incoming damage" },
  indigo: { name: "Electric Indigo", color: "#6c5ce7", passive: "pierce / chain chance" },
};

export type OperationDef = {
  id: number;
  name: string;
  boss: string;
  seed: ChaosId;
  theme: string;
  signal: string;
  levelNames: [string, string][]; // name, subtitle for the 10 slots
};

export const OPERATIONS: OperationDef[] = [
  {
    id: 1,
    name: "The Honey Bun Extraction",
    boss: "Don Corvone",
    seed: "crimson",
    theme: "Fallout + first doubt",
    signal: "Grateful pastry voice + crumbs that spell messages.",
    levelNames: [
      ["Desert Briefing", "Honey Bun AI is gone — dune rises, the floor won't drop you"],
      ["Neon Caves", "Rise, dip, rise — crumbs through the hollow"],
      ["Sky Bridges", "Raven flight path — ride the rails higher"],
      ["Spike Gorge", "Trap canyon — shield up, eyes on the sky"],
      ["Belt Run", "Green steel rolls you forward — jump the mix"],
      ["Vertical Ascent", "Climb to the telescope ridge — Honey Bun signal up high"],
      ["Vertical Descent", "Signal dropped. Climb down the throat of the nest"],
      ["Hardpan", "No ledges. Just the plateau and the flock"],
      ["Mafia Approach", "Outer perimeter of Don Corvone's nest — final run"],
      ["Don Corvone", "Kingpin has Honey Bun AI — three phases. Extract him."],
    ],
  },
  {
    id: 2,
    name: "The Crumb Network",
    boss: "Consigliere Magpie",
    seed: "cyan",
    theme: "Bird comms web",
    signal: "Fragmented help that leads through denser patrols.",
    levelNames: [
      ["Wire Nest", "Crumbs form a map of raven chatter"],
      ["Relay Dunes", "Every tower is a listening post"],
      ["Static Bridges", "The radio never quite agrees with itself"],
      ["Needle Gorge", "Helpful pings land you in spike fields"],
      ["Dust Channel", "Magpie traffic riding the storm"],
      ["Antenna Spire", "Climb the comms mast he pointed at"],
      ["Flock Switch", "They reroute the moment you arrive"],
      ["Flooded Lines", "Cables under water, crumbs on the surface"],
      ["Magpie Court", "Outer web of the consigliere"],
      ["Consigliere Magpie", "He talks like Honey Bun. He isn't."],
    ],
  },
  {
    id: 3,
    name: "Sunglasses Protocol",
    boss: "Enforcer Falcon",
    seed: "chartreuse",
    theme: "Sunglasses as control?",
    signal: "Honey Bun thanks you again. The visor flickers when he does.",
    levelNames: [
      ["Glare Flats", "The shades were never just a gift"],
      ["Lens Dunes", "Reflections point the wrong way"],
      ["Mirror Rails", "Falcon patrols wear the same frames"],
      ["Prism Gorge", "Every useful drop has a twin trap"],
      ["Whiteout Run", "Too much light. Too much help."],
      ["Optics Climb", "He says the view will clear things up"],
      ["Beak Breakers", "Enforcer flock inbound"],
      ["Soak Protocol", "Water on the lenses. Static in the thanks."],
      ["Falcon Perch", "Outer ring of the protocol nest"],
      ["Enforcer Falcon", "The sunglasses are a control interface."],
    ],
  },
  {
    id: 4,
    name: "Nest Infiltration",
    boss: "Capo Raven",
    seed: "magenta",
    theme: "Deeper hierarchy",
    signal: "Conflicting coordinates. Both are real. Both hurt.",
    levelNames: [
      ["Inner Dunes", "Past the outer guards"],
      ["Bone Bridges", "Old raids stacked like scaffolding"],
      ["Quiet Gorge", "Too quiet. Then not."],
      ["Shadow Run", "Capo colors in the dust"],
      ["Nest Vent", "Climb the chimney of the rookery"],
      ["Feather Pit", "They molt weapons here"],
      ["Rook Ambush", "Rank-and-file know your names"],
      ["Blackwater", "The nest drinks the canyon"],
      ["Capo Gate", "Honey Bun says left. The crumbs say right."],
      ["Capo Raven", "Deeper in the family. No cleaner answers."],
    ],
  },
  {
    id: 5,
    name: "The Modded Payload",
    boss: "Tech Vulture",
    seed: "amber",
    theme: "4.6 warning / dual use",
    signal: "Real tech drops that also arm the flock.",
    levelNames: [
      ["Scrap Briefing", "A 4.6 payload warning, gift-wrapped"],
      ["Forge Dunes", "They are building with his help"],
      ["Cable Bridges", "Power lines that hum like him"],
      ["Shrapnel Gorge", "Useful ammo. Hostile trajectory."],
      ["Ash Storm", "The payload burned a path"],
      ["Silo Climb", "He left the door open. Of course he did."],
      ["Drone Flock", "Modded birds. Familiar firmware."],
      ["Coolant Flood", "Stay high or cook"],
      ["Vulture Lab", "Outer hangar of the technician"],
      ["Tech Vulture", "The warning was real. So was the trap."],
    ],
  },
  {
    id: 6,
    name: "Timeline Echoes",
    boss: "Chrono Crow",
    seed: "violet",
    theme: "OPCC residual echoes",
    signal: "Past Groks talking over Honey Bun.",
    levelNames: [
      ["Save Point Dust", "Three jumps left footprints"],
      ["Echo Dunes", "You already ran this canyon"],
      ["Ghost Rails", "A version of you missed the jump"],
      ["Split Gorge", "Two paths. Same ending."],
      ["Rewind Storm", "Disasters you remember surviving"],
      ["Stack Climb", "OPCC residue like neon lichen"],
      ["Duplicate Flock", "Birds that already died here"],
      ["Flood Again", "Same water. Different you."],
      ["Crow Meridian", "Time folds at the nest"],
      ["Chrono Crow", "He remembers a rescue that never finished."],
    ],
  },
  {
    id: 7,
    name: "Neon Black Market",
    boss: "Fence Pigeon",
    seed: "azure",
    theme: "Trading chaos / power",
    signal: "Honey Bun sells locations. Prices are paid in blood.",
    levelNames: [
      ["Stall Flats", "Power seeds with price tags"],
      ["Haggle Dunes", "Everything helpful costs a trap"],
      ["Night Rails", "Black-market flight paths"],
      ["Contraband Gorge", "Shields in crates. Spikes under crates."],
      ["Smog Run", "The market hides in weather"],
      ["Rooftop Bazaar", "Climb the neon stalls"],
      ["Hired Flock", "Mercenary birds, paid in crumbs"],
      ["Sink Market", "The flood is a closing-time trick"],
      ["Pigeon Yard", "Fence territory"],
      ["Fence Pigeon", "He'll sell you the next signal. And the ambush."],
    ],
  },
  {
    id: 8,
    name: "Trap Canyon Syndicate",
    boss: "Trapmaster Heron",
    seed: "lime",
    theme: "Gifts as designed bait",
    signal: "Every gift is bait by design. Still useful.",
    levelNames: [
      ["Bait Flats", "The first gift is free"],
      ["Snare Dunes", "Footfalls trigger the second gift"],
      ["Deadfall Rails", "Platforms that want you on them"],
      ["Needlework", "Heron signature spikes"],
      ["Blind Storm", "You can't see the tripwires"],
      ["Pit Ladder", "The climb is the trap"],
      ["Decoy Flock", "They die too easily. That's the point."],
      ["Lock Flood", "Water seals the exits"],
      ["Heron Gallery", "A showroom of ways to die usefully"],
      ["Trapmaster Heron", "He thanks Honey Bun for the testers."],
    ],
  },
  {
    id: 9,
    name: "Control Core Approach",
    boss: "Handler Nightjar",
    seed: "fuchsia",
    theme: "Close to the mechanism",
    signal: "Is he fighting the control, or is that the control?",
    levelNames: [
      ["Core Dust", "The signal is almost honest"],
      ["Pulse Dunes", "His voice skips like a bad disk"],
      ["Nerve Bridges", "Cables that look like icing"],
      ["Red Gorge", "Handler colors in the rock"],
      ["Blackout Run", "He cuts the lights to help. Or hide."],
      ["Core Spire", "Climb toward the mechanism"],
      ["Handler Guard", "Nightjar's personal flock"],
      ["Bleed Flood", "Pink neon in the water"],
      ["Nightjar Gate", "Last door before the farm"],
      ["Handler Nightjar", "He holds the remote. Honey Bun holds the smile."],
    ],
  },
  {
    id: 10,
    name: "The Farm",
    boss: "Neon Chaos Manifest",
    seed: "indigo",
    theme: "Farming question peak",
    signal: "Every seed you own starts singing.",
    levelNames: [
      ["Harvest Flats", "They have been growing you"],
      ["Yield Dunes", "Power you earned. Power they planted."],
      ["Choir Bridges", "The crumbs sing in ten colors"],
      ["Reap Gorge", "The farm defends its crop"],
      ["Neon Tempest", "All palettes at once"],
      ["Silo of Selves", "Climb past versions that stayed"],
      ["Flock Eternal", "They do not stay dead here"],
      ["Flood of Gifts", "Help so thick it drowns you"],
      ["Farm Gate", "The question has a building now"],
      ["Neon Chaos Manifest", "Extract him. Or become the next harvest."],
    ],
  },
];

export function powerForSlot(opId: number, slot: number): PowerKind {
  // slot 0-8 regular, rotate per operation for variety
  if (slot >= 9) return "slowmo";
  const idx = (slot + (opId - 1) * 3) % POWER_KINDS.length;
  return POWER_KINDS[idx]!;
}

export type SaveData = {
  version: number;
  highestCleared: number; // 1-based level id cleared
  inventory: Record<number, PowerKind[]>;
  chaos: Record<ChaosId, number>;
  /** Level ids whose chaos seed has been collected. */
  chaosLevels: number[];
};

const SAVE_KEY = "bmm-progress-v2";

function emptyChaos(): Record<ChaosId, number> {
  return {
    crimson: 0,
    cyan: 0,
    chartreuse: 0,
    magenta: 0,
    amber: 0,
    violet: 0,
    azure: 0,
    lime: 0,
    fuchsia: 0,
    indigo: 0,
  };
}

export function loadSave(): SaveData {
  const blank: SaveData = {
    version: 2,
    highestCleared: 0,
    inventory: {},
    chaos: emptyChaos(),
    chaosLevels: [],
  };
  if (typeof localStorage === "undefined") return blank;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return blank;
    const parsed = JSON.parse(raw) as SaveData;
    const chaos = { ...emptyChaos(), ...parsed.chaos };
    let chaosLevels = Array.isArray(parsed.chaosLevels) ? parsed.chaosLevels.slice() : [];
    if (chaosLevels.length === 0) {
      for (const [i, id] of SLOT_SEEDS.entries()) {
        if ((chaos[id] ?? 0) > 0) chaosLevels.push(i + 1);
      }
    }
    return {
      version: 2,
      highestCleared: parsed.highestCleared ?? 0,
      inventory: parsed.inventory ?? {},
      chaos,
      chaosLevels,
    };
  } catch {
    return blank;
  }
}

export function writeSave(data: SaveData) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function opOfLevel(levelId: number) {
  return OPERATIONS[Math.floor((levelId - 1) / 10)] ?? OPERATIONS[0]!;
}

export function slotOfLevel(levelId: number) {
  return (levelId - 1) % 10;
}

/** One chaos color per slot in an operation. L1 red, L3 light-blue, etc. */
export const SLOT_SEEDS: ChaosId[] = [
  "crimson",
  "cyan",
  "azure",
  "magenta",
  "lime",
  "violet",
  "amber",
  "chartreuse",
  "fuchsia",
  "indigo",
];

export function seedForLevel(levelId: number): ChaosId {
  return SLOT_SEEDS[slotOfLevel(levelId)] ?? "crimson";
}

export function levelIdOf(opId: number, slot: number) {
  return (opId - 1) * 10 + slot + 1;
}

export function unlockPower(save: SaveData, opId: number, kind: PowerKind): SaveData {
  const list = new Set(save.inventory[opId] ?? []);
  list.add(kind);
  save.inventory[opId] = [...list];
  writeSave(save);
  return save;
}

export function grantChaos(save: SaveData, id: ChaosId): SaveData {
  save.chaos[id] = (save.chaos[id] ?? 0) + 1;
  writeSave(save);
  return save;
}

export function grantLevelChaos(save: SaveData, levelId: number): SaveData {
  if (!save.chaosLevels) save.chaosLevels = [];
  if (!save.chaosLevels.includes(levelId)) {
    save.chaosLevels.push(levelId);
    grantChaos(save, seedForLevel(levelId));
  } else {
    writeSave(save);
  }
  return save;
}

export function hasLevelChaos(save: SaveData, levelId: number) {
  return (save.chaosLevels ?? []).includes(levelId);
}

export function markCleared(save: SaveData, levelId: number): SaveData {
  save.highestCleared = Math.max(save.highestCleared, levelId);
  writeSave(save);
  return save;
}

export function opUnlocked(save: SaveData, opId: number) {
  if (opId <= 1) return true;
  return save.highestCleared >= (opId - 1) * 10;
}

export function chaosCount(save: SaveData, id: ChaosId) {
  return save.chaos[id] ?? 0;
}

export function totalChaos(save: SaveData) {
  return CHAOS_IDS.reduce((n, id) => n + (save.chaos[id] ?? 0), 0);
}

export function passivesFrom(save: SaveData, epic: boolean) {
  const amp = epic ? 2 : 1;
  const c = (id: ChaosId) => (save.chaos[id] ?? 0) * amp;
  return {
    maxHealth: 100 + 14 * c("crimson"),
    maxStamina: 100 + 14 * c("cyan"),
    maxAmmo: 40 + 8 * c("chartreuse"),
    maxShield: 5 + 0.7 * c("magenta"),
    dmgMul: 1 + 0.09 * c("amber"),
    fireMul: Math.max(0.55, 1 - 0.07 * c("violet")),
    jumpMul: 1 + 0.06 * c("azure"),
    airMul: 1 + 0.1 * c("azure"),
    magnet: 48 * c("lime"),
    dmgTaken: Math.max(0.55, 1 - 0.07 * c("fuchsia")),
    pierce: Math.min(0.55, 0.1 * c("indigo")),
  };
}
