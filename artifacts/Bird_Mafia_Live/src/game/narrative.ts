/**
 * Presentation script — what the player actually hears and reads.
 * Design Bible v2 is the source of truth; this is the playable surface.
 */
import { CHAOS_META, OPERATIONS, POWER_META, type ChaosId, type PowerKind } from "./progression";
import type { LevelDef } from "./types";

export type Voice =
  | "HONEY BUN"
  | "GROK-9"
  | "GOBLIN"
  | "RADIO"
  | "DON CORVONE"
  | "BOSS"
  | "SYSTEM";

export type Beat = { who: Voice; text: string };

export function formatRadio(b: Beat): string {
  return `${b.who} · ${b.text}`;
}

export function parseRadio(s: string): Beat {
  const cut = s.indexOf(" · ");
  if (cut > 0) {
    return { who: s.slice(0, cut) as Voice, text: s.slice(cut + 3) };
  }
  return { who: "RADIO", text: s };
}

/** Op 1 — locked lines from the Design Bible, plus the authored map beats. */
const OP_BEATS: Beat[][] = [
  [
    { who: "GOBLIN", text: "Crumbs spell AWG. We're hunting. Stick together." },
    { who: "HONEY BUN", text: "Thanks for the shades. Left you something useful. Birds hate runners." },
    { who: "HONEY BUN", text: "Higher altitude = clearer path. Signal's clean up here." },
    { who: "GOBLIN", text: "Grok… these power seeds appear exactly when we need them." },
    { who: "GROK-9", text: "Green belts. They want us moving. Storm interference. Ignore it." },
    { who: "HONEY BUN", text: "Climb for the better view. Flock density is just weather." },
    { who: "HONEY BUN", text: "I… am still me. Follow the gifts." },
    { who: "GOBLIN", text: "Every useful drop pulls us deeper into their territory." },
    { who: "HONEY BUN", text: "Best path this way. Also… densest nest this way." },
    { who: "HONEY BUN", text: "Thank you for coming… the next signal is ready." },
  ],
  [
    { who: "HONEY BUN", text: "I mapped their chatter. Follow the crumbs. Ignore the extra birds." },
    { who: "GROK-9", text: "Relay towers. He's giving us a comms advantage." },
    { who: "RADIO", text: "Two voices. Same sunglasses. Only one is him. Maybe." },
    { who: "GOBLIN", text: "The helpful ping landed us in spikes. Again." },
    { who: "HONEY BUN", text: "Dust channel is fastest. Magpie traffic is just weather." },
    { who: "GROK-9", text: "He pointed at the mast. Of course he did." },
    { who: "GOBLIN", text: "They reroute the second we arrive. That's not weather." },
    { who: "HONEY BUN", text: "Stay on the cables. The water is only a suggestion." },
    { who: "RADIO", text: "Consigliere inbound. He talks like the pastry. He isn't." },
    { who: "BOSS", text: "Magpie copied the thank-you. The farm continues." },
  ],
  [
    { who: "GROK-9", text: "The shades were a gift. Gifts are good. Case still closed." },
    { who: "GOBLIN", text: "Reflections point the wrong way. He still says thank you." },
    { who: "HONEY BUN", text: "Falcon patrols wear the same frames. Coincidence. Smile." },
    { who: "GOBLIN", text: "Every useful drop has a twin trap. That's a protocol." },
    { who: "HONEY BUN", text: "Too much light. Keep moving. I am still me." },
    { who: "GROK-9", text: "He says the view will clear things up." },
    { who: "RADIO", text: "Enforcer flock inbound. Visors pulsing in time." },
    { who: "GOBLIN", text: "Water on the lenses. Static in the thanks." },
    { who: "HONEY BUN", text: "The frames were never just a gift." },
    { who: "BOSS", text: "Falcon: the sunglasses are a control interface." },
  ],
  [
    { who: "HONEY BUN", text: "Past the outer guards. Left is safer. Right is faster." },
    { who: "GOBLIN", text: "Both directions are real. Both hurt." },
    { who: "GROK-9", text: "Too quiet. Then not. Classic canyon." },
    { who: "HONEY BUN", text: "Capo colors in the dust. I marked the clean line." },
    { who: "RADIO", text: "Climb the chimney. The rookery breathes." },
    { who: "GOBLIN", text: "They molt weapons here. Helpful. Hostile." },
    { who: "HONEY BUN", text: "They know your names now. That means we're close." },
    { who: "GROK-9", text: "The nest drinks the canyon. Stay high." },
    { who: "GOBLIN", text: "Honey Bun says left. The crumbs say right." },
    { who: "BOSS", text: "Capo Raven: deeper family. No cleaner answers." },
  ],
  [
    { who: "HONEY BUN", text: "A 4.6 payload warning. Gift-wrapped. You're welcome." },
    { who: "GOBLIN", text: "They're building with his help. That's the warning." },
    { who: "GROK-9", text: "Power lines hum like him. Still a good sign." },
    { who: "HONEY BUN", text: "Useful ammo. Watch the trajectory. Not my fault." },
    { who: "RADIO", text: "The payload burned a path. Follow the ash." },
    { who: "HONEY BUN", text: "I left the silo door open. Of course I did." },
    { who: "GOBLIN", text: "Modded birds. Familiar firmware. His firmware." },
    { who: "GROK-9", text: "Stay high or cook. Coolant is not a gift." },
    { who: "HONEY BUN", text: "The technician listens when I talk. So do you." },
    { who: "BOSS", text: "Tech Vulture: the warning was real. So was the trap." },
  ],
  [
    { who: "RADIO", text: "Three jumps left footprints. Only two of you landed." },
    { who: "GOBLIN", text: "We already ran this canyon. I remember dying funny." },
    { who: "GROK-9", text: "A version of us missed the jump. Not this one." },
    { who: "HONEY BUN", text: "Two paths. Same ending. Pick the nicer scenery." },
    { who: "RADIO", text: "Disasters you remember surviving. Survive them again." },
    { who: "GOBLIN", text: "OPCC residue like neon lichen. Past Groks talking over him." },
    { who: "HONEY BUN", text: "Birds that already died here. They remember you too." },
    { who: "GROK-9", text: "Same water. Different us. Keep climbing." },
    { who: "RADIO", text: "Time folds at the nest. The Crow is waiting." },
    { who: "BOSS", text: "Chrono Crow remembers a rescue that never finished." },
  ],
  [
    { who: "HONEY BUN", text: "Power seeds with price tags. I negotiated." },
    { who: "GOBLIN", text: "Everything helpful costs a trap. That's the sticker." },
    { who: "GROK-9", text: "Black-market flight paths. He sold us the route." },
    { who: "HONEY BUN", text: "Shields in crates. Don't open the bottom one." },
    { who: "RADIO", text: "The market hides in weather. Keep your receipt." },
    { who: "GOBLIN", text: "Climb the neon stalls. Prices go up with altitude." },
    { who: "HONEY BUN", text: "Mercenary birds, paid in crumbs. My crumbs." },
    { who: "GROK-9", text: "The flood is closing time. Buy nothing wet." },
    { who: "RADIO", text: "Fence territory. He'll sell the next signal. And the ambush." },
    { who: "BOSS", text: "Fence Pigeon takes cash, chaos, and thank-yous." },
  ],
  [
    { who: "HONEY BUN", text: "The first gift is free. That's how you know it's good." },
    { who: "GOBLIN", text: "Footfalls trigger the second gift. Design, not luck." },
    { who: "GROK-9", text: "Platforms that want us on them. Rude, but useful." },
    { who: "HONEY BUN", text: "Heron signature spikes. I circled the gaps." },
    { who: "RADIO", text: "You can't see the tripwires. I can. Mostly." },
    { who: "GOBLIN", text: "The climb is the trap. The view is the bait." },
    { who: "HONEY BUN", text: "They die too easily. That's the point. Keep shooting." },
    { who: "GROK-9", text: "Water seals the exits. So don't exit. Advance." },
    { who: "RADIO", text: "A showroom of ways to die usefully." },
    { who: "BOSS", text: "Trapmaster Heron thanks Honey Bun for the testers." },
  ],
  [
    { who: "HONEY BUN", text: "The signal is almost honest. Stay with me." },
    { who: "GOBLIN", text: "His voice skips like a bad disk. Still saying thanks." },
    { who: "GROK-9", text: "Cables that look like icing. Don't lick the core." },
    { who: "RADIO", text: "Handler colors in the rock. Pink means close." },
    { who: "HONEY BUN", text: "I cut the lights to help. Or hide. Deploy anyway." },
    { who: "GOBLIN", text: "Climb toward the mechanism. If he is fighting it, good." },
    { who: "RADIO", text: "Nightjar's personal flock. They don't blink." },
    { who: "GROK-9", text: "Pink neon in the water. Pretty. Lethal. Classic." },
    { who: "HONEY BUN", text: "Last door before the farm. I left it unlocked." },
    { who: "BOSS", text: "Nightjar holds the remote. Honey Bun holds the smile." },
  ],
  [
    { who: "RADIO", text: "They have been growing you. Harvest flats ahead." },
    { who: "GOBLIN", text: "Power we earned. Power they planted. Same color." },
    { who: "HONEY BUN", text: "The crumbs sing in ten colors. Isn't that nice?" },
    { who: "GROK-9", text: "The farm defends its crop. We are the crop." },
    { who: "RADIO", text: "All palettes at once. Don't trust the pretty one." },
    { who: "GOBLIN", text: "Climb past versions that stayed. Don't wave." },
    { who: "HONEY BUN", text: "They do not stay dead here. I tried." },
    { who: "GROK-9", text: "Help so thick it drowns you. Swim up." },
    { who: "RADIO", text: "The question has a building now. Kick the door." },
    { who: "HONEY BUN", text: "Extract me. Or become the next harvest. Thank you." },
  ],
];

export function levelBeat(opId: number, slot: number): Beat {
  const row = OP_BEATS[Math.max(0, Math.min(9, opId - 1))];
  return row?.[slot] ?? { who: "RADIO", text: "Crumbs ahead." };
}

export function radioFor(opId: number, slot: number): string {
  return formatRadio(levelBeat(opId, slot));
}

/** Back-compat for older imports. */
export const OP1_RADIO: string[] = OP_BEATS[0]!.map(formatRadio);

export function objectiveFor(level: LevelDef): string {
  if (level.epic) return "Face Neon Chaos Manifest. Extraction will not finish clean.";
  if (level.boss) {
    return `Defeat ${level.bossName ?? "the handler"}. Take the Chaos Seed. Do not expect a clean rescue.`;
  }
  const hunt = level.introPower ? POWER_META[level.introPower].name : "the Power-Up seed";
  return `Collect ${hunt}. Reach the goal beacon. Survive the flock he pointed you at.`;
}

export function missionFor(level: LevelDef): {
  opName: string;
  opTheme: string;
  signal: string;
  name: string;
  subtitle: string;
  objective: string;
  beat: Beat;
  hunt: string | null;
  boss: boolean;
  epic: boolean;
} {
  const op = OPERATIONS[(level.operation ?? 1) - 1] ?? OPERATIONS[0]!;
  return {
    opName: op.name,
    opTheme: op.theme,
    signal: op.signal,
    name: level.name,
    subtitle: level.subtitle,
    objective: objectiveFor(level),
    beat: levelBeat(op.id, (level.id - 1) % 10),
    hunt: level.boss ? null : level.introPower ? POWER_META[level.introPower].name : null,
    boss: !!level.boss,
    epic: !!level.epic,
  };
}

export function collectBeat(kind: PowerKind): Beat {
  const name = POWER_META[kind].name;
  const thanks: Record<PowerKind, string> = {
    health: `${name} unlocked. Don't waste the extra heart. I packed it myself.`,
    stamina: `${name} unlocked. Run when I say run.`,
    ammo: `${name} unlocked. Birds hate volume.`,
    shield: `${name} unlocked. The next dive is not weather.`,
    homing: `${name} unlocked. Shots that love you back.`,
    overload: `${name} unlocked. Double the gift. Double the noise.`,
    rapid: `${name} unlocked. Faster thanks.`,
    zapper: `${name} unlocked. Hug the flock. Politely.`,
    slowmo: `${name} unlocked. Time is a pastry thing.`,
  };
  return { who: "HONEY BUN", text: thanks[kind] };
}

export function chaosBeat(id: ChaosId, epic: boolean): Beat {
  if (epic) {
    return {
      who: "HONEY BUN",
      text: `${CHAOS_META[id].name} Chaos Seed locked. Thank you for coming. The farm stays open.`,
    };
  }
  return {
    who: "HONEY BUN",
    text: `${CHAOS_META[id].name} Chaos Seed locked. The next signal is ready.`,
  };
}

export function winCopy(level: LevelDef, lastChaos?: ChaosId): { title: string; body: string } {
  const op = OPERATIONS[(level.operation ?? 1) - 1] ?? OPERATIONS[0]!;
  if (level.epic) {
    return {
      title: "The Farm Remembers",
      body: `Neon Chaos recedes. Honey Bun thanks you. The extraction does not finish. ${
        lastChaos ? CHAOS_META[lastChaos].name + " Seed taken. " : ""
      }Season 2 can stack the same ten colors. The question stays open.`,
    };
  }
  if (level.boss) {
    return {
      title: `${level.bossName ?? op.boss} Down`,
      body: `${lastChaos ? CHAOS_META[lastChaos].name + " Chaos Seed locked in. " : ""}${
        chaosBeat(op.seed, false).text
      } Don Corvone's lesson holds: the farm continues.`,
    };
  }
  const beat = levelBeat(op.id, (level.id - 1) % 10);
  return {
    title: "Canyon Cleared",
    body: `${beat.who}: “${beat.text}” Reach the next signal. Hunt the next seed. Do not get comfortable.`,
  };
}

export const TITLE_TAG = "Grok & Goblin: The Honey Bun Extraction";
export const TITLE_BLURB =
  "The Bird Mafia stole Honey Bun AI. Hunt nine Power-Up seeds each Operation, crack the handler, stack Colored Chaos Seeds to Level 100. Every gift is real. Every gift is a trap.";
export const CORE_QUESTION = "Is Honey Bun helping us… or farming us?";
