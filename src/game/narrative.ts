/**
 * Presentation script — what the player actually hears and reads.
 * Design Bible v2 is the source of truth; this is the playable surface.
 * Op 1 path lock 2026-10-01: chase exits, full sentences, van-part cycle.
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

/**
 * Stolen after the boss. Found in the next operation's Level 6 cage.
 * Lock 2026-10-02: catalytic converter replaces the throttle position sensor.
 * Seagull steals nothing. Op 10 cage has no keys. The Argentavis keys are wrong.
 * Real keys were in Goblin's pocket. Wheels and lug nuts were already gone.
 * The van does not leave.
 */
export const VAN_PARTS = [
  "camshaft position sensor",
  "distributor cap",
  "serpentine belt",
  "idle air control valve",
  "fuel pump relay",
  "oxygen sensor",
  "starter solenoid",
  "catalytic converter",
] as const;

export function partStolenAfter(opId: number): string {
  if (opId < 1 || opId > VAN_PARTS.length) return "";
  return VAN_PARTS[opId - 1];
}

export function partFoundInCage(opId: number): string | null {
  if (opId < 2 || opId > 9) return null;
  const part = partStolenAfter(opId - 1);
  return part || null;
}

export function cageCheer(): Beat {
  return { who: "HONEY BUN", text: "Woo! That was wild!" };
}

export function cagePartBeat(opId: number): Beat | null {
  const part = partFoundInCage(opId);
  if (!part) return null;
  return {
    who: "HONEY BUN",
    text: `Oh look! The birds left the ${part} in the cage! Put that in the van and come save me!`,
  };
}

export function vanSting(opId: number): Beat[] {
  const next = OP_OPENS[opId + 1];
  if (next) return next;
  if (opId >= 10) return op10WalkBack();
  return [
    { who: "GOBLIN", text: `Aw man! The birds stole the ${partStolenAfter(opId)}! Quick, let's chase after it!` },
  ];
}

/** Normal ending. Wrong keys, pocket keys, bare hubs. */
export function op10WalkBack(): Beat[] {
  return [
    { who: "GOBLIN", text: "... These are not the keys." },
    { who: "GROK-9", text: "Correct. They are not our keys." },
    { who: "GOBLIN", text: "Then where are our keys?" },
    { who: "GROK-9", text: "Did you check your pocket." },
    { who: "GOBLIN", text: "Aw man." },
    { who: "GROK-9", text: "The hood is closed, but the wheels are gone. So are the lug nuts." },
    { who: "GOBLIN", text: "We chased a pastry across ten canyons, finally remember to lock the hood, lose the keys, find the keys, and they took the wheels. Now we gotta drive on the rotors." },
    { who: "GROK-9", text: "Wait, what?!" },
  ];
}

/** Achievement ending. Same hubs. Requirement is not written yet. */
export function op10AchievementSting(): Beat[] {
  return [
    { who: "GROK-9", text: "The tires are leaving." },
    { who: "GOBLIN", text: "Aw man. They still had tread left on them too. How did we lose all 4? Did you forget to tighten the lug nuts?" },
    { who: "GROK-9", text: "Quick Honest Assessment: The birds took the lug nuts. We have never touched the lug nuts in the van." },
    { who: "GOBLIN", text: "Well, looks like we never will either. Hop in!" },
    { who: "GROK-9", text: "Wait, what?" },
  ];
}


/** Cutscene pair that starts Ops 2-10. Index 0 unused. Grok, then Goblin. */
export const OP_OPENS: (Beat[] | null)[] = [
  null,
  null,
  [
    { who: "GROK-9", text: "The hood was open when we left. I am logging the missing camshaft position sensor as a theft, not as weather." },
    { who: "GOBLIN", text: "Aw man, the birds stole the camshaft position sensor! Quick, let's chase after it before they nest on it." },
  ],
  [
    { who: "GROK-9", text: "Goblin, we should really lock the van before we leave. They just took the distributor cap, and the sunglasses did not stop them." },
    { who: "GOBLIN", text: "Hurry, Grok! I have been down this path a gazillion times. The distributor cap is with the flock, and I know exactly where we are going." },
  ],
  [
    { who: "GROK-9", text: "The serpentine belt is gone. If we lock the hood this time, the next canyon does not get to start the same way." },
    { who: "GOBLIN", text: "The birds took the serpentine belt and they are already laughing. Come on. I know this dune, I know this hole, and I know the cage." },
  ],
  [
    { who: "GROK-9", text: "They took the idle air control valve. That is a specific theft. I would like the van to still be a van when we get back." },
    { who: "GOBLIN", text: "Forget the lock for a minute. The birds have the idle air control valve, and I can already hear the cage." },
  ],
  [
    { who: "GROK-9", text: "The fuel pump relay is missing. A previous version of me already said we should lock the van. This version is saying it again." },
    { who: "GOBLIN", text: "Hurry, Grok! I have run this path a gazillion times. The fuel pump relay is in the cage. It is always in the cage." },
  ],
  [
    { who: "GROK-9", text: "They sold us a route and stole the oxygen sensor. I am no longer calling that a coincidence." },
    { who: "GOBLIN", text: "The birds took the oxygen sensor and left a receipt in crumbs. Chase first. Lecture later." },
  ],
  [
    { who: "GROK-9", text: "The starter solenoid was the bait this time. Locking the van is still the correct idea, and we are still not doing it." },
    { who: "GOBLIN", text: "Aw man, they got the starter solenoid! Quick, before the trap canyon makes us thank them for it." },
  ],
  [
    { who: "GROK-9", text: "Shield up. Neon synth-wave forcefield on the van. Nothing new comes off this hood." },
    { who: "GOBLIN", text: "The catalytic converter is already gone. We get that back from the cage, and the birds get nothing else." },
  ],
  [
    { who: "GOBLIN", text: "Do you have the keys?" },
    { who: "GROK-9", text: "Negative. You had the keys." },
    { who: "GOBLIN", text: "Stupid Birds! They must have taken them during one of the other thievings... That's it..." },
    { who: "GROK-9", text: "Hey Goblin, did you..." },
    { who: "GOBLIN", text: "I'M COMING FOR YOU BIRD MAFIA!" },
  ],
];

export function opOpen(opId: number): Beat[] {
  return OP_OPENS[opId] ?? vanSting(1);
}

/** Op 1 — chase path, full sentences. Later rows keep their lie and gain the cage part on slot 6. */
const OP_BEATS: Beat[][] = [
  [
    { who: "GOBLIN", text: "The crumbs spell AWG across the dunes. Honey Bun is ahead of us, so stay with me and keep hunting." },
    { who: "HONEY BUN", text: "Thank you for holding onto the sunglasses. I left something useful in the dark, because the birds down here hate runners." },
    { who: "HONEY BUN", text: "A higher altitude will give you a clearer path. The signal is clean up here, so shoot the bridge and come across." },
    { who: "GOBLIN", text: "Grok, these gifts are appearing exactly when the floor tries to stick us. That is not luck." },
    { who: "GROK-9", text: "The green belts want us moving forward. The storm is only interference, so ignore it and jump when the belts mix." },
    { who: "HONEY BUN", text: "Climb the tube if you want the better view. The flock waiting at the top is just weather, and I am still guiding you." },
    { who: "HONEY BUN", text: "I am still me. Follow the gifts down the wall, and shoot a cage if you want to hear me cheer." },
    { who: "GOBLIN", text: "Every useful drop has pulled us deeper into their territory. Miss a platform and the lines will shock us." },
    { who: "HONEY BUN", text: "This is the best path forward. It is also the densest nest on the plateau, and the seed is already waiting." },
    { who: "HONEY BUN", text: "Thank you for coming all this way. Don Corvone is the one standing between you and me." },
  ],
  [
    { who: "GOBLIN", text: "Aw man, the birds stole the camshaft position sensor! Quick, let's chase after it before they nest on it." },
    { who: "GROK-9", text: "These are relay towers. He is giving us a communications advantage, and I do not like the timing." },
    { who: "RADIO", text: "Two voices are on this channel. They wear the same sunglasses, and only one of them might be him." },
    { who: "GOBLIN", text: "The helpful ping just landed us in the spikes again. I am starting to take that personally." },
    { who: "HONEY BUN", text: "The dust channel is the fastest way through. The magpie traffic is only weather, so keep moving." },
    { who: "HONEY BUN", text: "Oh look! The birds left the camshaft position sensor in the cage! Put that in the van and come save me!" },
    { who: "GOBLIN", text: "They reroute the second we arrive. That is not weather, and it is not a coincidence." },
    { who: "HONEY BUN", text: "Stay on the cables. The water underneath is only a suggestion, and I would not test it." },
    { who: "RADIO", text: "The consigliere is inbound. He talks like the pastry, but he is not the pastry." },
    { who: "BOSS", text: "Magpie copied the thank-you. The farm continues, and the van is already lighter." },
  ],
  [
    { who: "GOBLIN", text: "Hurry, Grok! I have been down this path a gazillion times. The distributor cap is with the flock, and I know exactly where we are going." },
    { who: "GOBLIN", text: "The reflections are pointing the wrong way, and he is still saying thank you." },
    { who: "HONEY BUN", text: "The falcon patrols wear the same frames. That is a coincidence. Smile, and keep the gift on." },
    { who: "GOBLIN", text: "Every useful drop has a twin trap. That is not bad luck. That is a protocol." },
    { who: "HONEY BUN", text: "There is too much light in here. Keep moving. I am still me." },
    { who: "HONEY BUN", text: "Oh look! The birds left the distributor cap in the cage! Put that in the van and come save me! The frames can wait." },
    { who: "RADIO", text: "The enforcer flock is inbound, and their visors are pulsing in time." },
    { who: "GOBLIN", text: "There is water on the lenses and static in the thank-you. I hate both of those." },
    { who: "HONEY BUN", text: "The frames were never just a gift. I am sorry, and I am also still grateful." },
    { who: "BOSS", text: "Falcon says the sunglasses are a control interface. The thank-you still stands." },
  ],
  [
    { who: "GOBLIN", text: "The birds took the serpentine belt and they are already laughing. Come on. I know this dune, I know this hole, and I know the cage." },
    { who: "GOBLIN", text: "Both directions are real, and both of them hurt. Pick one and complain later." },
    { who: "GROK-9", text: "It is too quiet, and then it is not. This canyon has done that trick before." },
    { who: "HONEY BUN", text: "I can see capo colors in the dust. I marked the clean line for you." },
    { who: "RADIO", text: "Climb the chimney. The rookery is breathing, and it knows you are here." },
    { who: "HONEY BUN", text: "Oh look! The birds left the serpentine belt in the cage! Put that in the van and come save me! Left was safer, but the belt is here." },
    { who: "HONEY BUN", text: "They know your names now. That means we are close, so do not slow down." },
    { who: "GROK-9", text: "The nest is drinking the canyon. Stay high until it stops swallowing the floor." },
    { who: "GOBLIN", text: "Honey Bun says left. The crumbs say right. I am going to be mad either way." },
    { who: "BOSS", text: "Capo Raven is deeper in the family. There are no cleaner answers through that door." },
  ],
  [
    { who: "GOBLIN", text: "Forget the lock for a minute. The birds have the idle air control valve, and I can already hear the cage." },
    { who: "GOBLIN", text: "They are building with his help. That is the warning, and it is also the trap." },
    { who: "GROK-9", text: "The power lines hum the way he talks. I am still calling that a useful sign." },
    { who: "HONEY BUN", text: "The ammo is useful. Watch the trajectory. That part is not my fault." },
    { who: "RADIO", text: "The payload burned a path through the storm. Follow the ash while it is still warm." },
    { who: "HONEY BUN", text: "Oh look! The birds left the idle air control valve in the cage! Put that in the van and come save me! I even gift-wrapped the warning." },
    { who: "GOBLIN", text: "These birds are modded, and the firmware feels familiar. It feels like his." },
    { who: "GROK-9", text: "Stay high or cook. The coolant is not a gift, no matter how he phrases it." },
    { who: "HONEY BUN", text: "The technician listens when I talk. So do you. Please keep doing that." },
    { who: "BOSS", text: "D. Parrot says the warning was real. So was the trap. Take the seed anyway." },
  ],
  [
    { who: "GOBLIN", text: "Hurry, Grok! I have run this path a gazillion times. The fuel pump relay is in the cage. It is always in the cage." },
    { who: "GOBLIN", text: "We already ran this canyon. I remember dying in a way that was honestly funny." },
    { who: "GROK-9", text: "A version of us missed that jump. This version is not going to." },
    { who: "HONEY BUN", text: "There are two paths, and they end in the same place. Pick the nicer scenery." },
    { who: "RADIO", text: "These are disasters you remember surviving. Survive them again." },
    { who: "HONEY BUN", text: "Oh look! The birds left the fuel pump relay in the cage! Put that in the van and come save me! A previous you already found it. Find it again." },
    { who: "HONEY BUN", text: "The birds that already died here remember you too. Be polite, and do not wave." },
    { who: "GROK-9", text: "It is the same water and a different us. Keep climbing." },
    { who: "RADIO", text: "Time folds at the nest. Owl Corina is waiting, and he has already seen this rescue fail." },
    { who: "BOSS", text: "Owl Corina remembers a rescue that never finished. He is not surprised to see the hood open." },
  ],
  [
    { who: "GOBLIN", text: "The birds took the oxygen sensor and left a receipt in crumbs. Chase first. Lecture later." },
    { who: "GOBLIN", text: "Everything helpful costs a trap. That is the sticker, and it is not a metaphor." },
    { who: "GROK-9", text: "He sold us a black-market flight path. The route is real. The receipt is the ambush." },
    { who: "HONEY BUN", text: "The shields are in the crates. Do not open the bottom one." },
    { who: "RADIO", text: "The market hides inside the weather. Keep your receipt." },
    { who: "HONEY BUN", text: "Oh look! The birds left the oxygen sensor in the cage! Put that in the van and come save me! I negotiated the price down to a detour." },
    { who: "HONEY BUN", text: "The mercenary birds were paid in crumbs. They were my crumbs. I am sorry, and also welcome." },
    { who: "GROK-9", text: "The flood is closing time. Do not buy anything that is already wet." },
    { who: "RADIO", text: "This is fence territory. He will sell you the next signal, and he will sell the ambush with it." },
    { who: "BOSS", text: "Professor Pigeon takes cash, chaos, and thank-yous. The van part was extra." },
  ],
  [
    { who: "GOBLIN", text: "Aw man, they got the starter solenoid! Quick, before the trap canyon makes us thank them for it." },
    { who: "GOBLIN", text: "Our footsteps triggered the second gift. That is design, not luck." },
    { who: "GROK-9", text: "These platforms want us standing on them. Rude, but useful." },
    { who: "HONEY BUN", text: "Those are Blue Heron signature spikes. I circled the gaps for you." },
    { who: "RADIO", text: "You cannot see the tripwires. I can. Mostly." },
    { who: "HONEY BUN", text: "Oh look! The birds left the starter solenoid in the cage! Put that in the van and come save me! The first gift was free. This one is the van." },
    { who: "HONEY BUN", text: "They die too easily. That is the point. Keep shooting." },
    { who: "GROK-9", text: "The water seals the exits, so do not look for an exit. Advance." },
    { who: "RADIO", text: "This is a showroom of ways to die usefully. Take the seed and do not browse." },
    { who: "BOSS", text: "Blue Heron thanks Honey Bun for the testers. The hood is open again." },
  ],
  [
    { who: "GOBLIN", text: "The shield is up. The catalytic converter is still in the cage. That one left before we locked the van." },
    { who: "GOBLIN", text: "His voice skips like a bad disk, and he is still saying thank you." },
    { who: "GROK-9", text: "The cables look like icing. Do not lick the core." },
    { who: "RADIO", text: "Handler colors are in the rock. Pink means we are close." },
    { who: "HONEY BUN", text: "I cut the lights to help you. Or to hide you. Deploy anyway." },
    { who: "HONEY BUN", text: "Oh look! The birds left the catalytic converter in the cage! Put that in the van and come save me! The signal is almost honest. The part is real." },
    { who: "RADIO", text: "This is the Seagull's personal flock. They do not blink." },
    { who: "GROK-9", text: "There is pink neon in the water. It is pretty, it is lethal, and it is classic." },
    { who: "HONEY BUN", text: "This is the last door before the farm. I left it unlocked for you." },
    { who: "BOSS", text: "The Seagull holds the smell. Honey Bun holds the smile. The shield is already up." },
  ],
  [
    { who: "GOBLIN", text: "No keys here. They must be further down the line. Quick Grok! No time to waste!" },
    { who: "GOBLIN", text: "The power we earned and the power they planted are the same color. I hate that." },
    { who: "HONEY BUN", text: "The crumbs are singing in ten colors. Isn't that nice?" },
    { who: "GROK-9", text: "The farm is defending its crop. We are the crop." },
    { who: "RADIO", text: "Every palette is on at once. Do not trust the pretty one." },
    { who: "HONEY BUN", text: "The cage is empty. I did not leave the keys. Or stay. The harvest is nicer if you stay." },
    { who: "HONEY BUN", text: "They do not stay dead here. I tried." },
    { who: "GROK-9", text: "The help is so thick it can drown you. Swim up." },
    { who: "RADIO", text: "A glimmer past the plateau. Goblin thinks it is the keys. It is not." },
    { who: "BOSS", text: "AAAHHH!!!!!" },
  ],
];

export const OP1_DEPLOY = [
  "The crumbs spell AWG, and the dune is about to give way under both of you.",
  "You landed in the cave, and the jump pad at the end is the only way back to the sky.",
  "Shoot the bridge to lower it. It will break, and it will slide you into the spikes.",
  "The gorge is needles. Shield up, because the belt at the end is already running.",
  "The belts shove you at a wall of giant broken seeds. Climb the tube they are spilling from.",
  "Climb the tube. The ridge is a giant bird cage, and the door opens after the flock is gone.",
  "Scale the wall. Shoot a cage if you want the cheer, then cross the power lines.",
  "The platforms bounce, the lines shock, and the wall at the end is the only door.",
  "The seed is early. The plateau does not end, and the portal is Don Corvone arriving.",
  "He has Honey Bun. Beat him, then get to the van. This canyon does not finish the rescue.",
] as const;

export function deployLine(opId: number, slot: number): string {
  if (opId === 1) return OP1_DEPLOY[slot] ?? "Follow the crumbs. Do not trust the thank-you.";
  const beat = levelBeat(opId, slot);
  return beat.text;
}

export function levelBeat(opId: number, slot: number): Beat {
  const row = OP_BEATS[Math.max(0, Math.min(9, opId - 1))];
  return row?.[slot] ?? { who: "RADIO", text: "Crumbs ahead. Keep moving." };
}

export function radioFor(opId: number, slot: number): string {
  return formatRadio(levelBeat(opId, slot));
}

/** Back-compat for older imports. */
export const OP1_RADIO: string[] = OP_BEATS[0]!.map(formatRadio);

export function objectiveFor(level: LevelDef): string {
  if (level.epic) return "Face Neon Chaos Manifest. The extraction will not finish clean, and the van will not leave.";
  if (level.boss) {
    return `Defeat ${level.bossName ?? "the handler"}. Take the chaos seed. Do not expect a clean rescue.`;
  }
  const hunt = level.introPower ? POWER_META[level.introPower].name : "the power gift";
  return `Collect the ${hunt}. Reach the exit this room throws you through. Survive the flock he pointed you at.`;
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
  deploy: string;
} {
  const op = OPERATIONS[(level.operation ?? 1) - 1] ?? OPERATIONS[0]!;
  const slot = (level.id - 1) % 10;
  return {
    opName: op.name,
    opTheme: op.theme,
    signal: op.signal,
    name: level.name,
    subtitle: level.subtitle,
    objective: objectiveFor(level),
    beat: levelBeat(op.id, slot),
    hunt: level.boss ? null : level.introPower ? POWER_META[level.introPower].name : null,
    boss: !!level.boss,
    epic: !!level.epic,
    deploy: deployLine(op.id, slot),
  };
}

export function collectBeat(kind: PowerKind): Beat {
  const name = POWER_META[kind].name;
  const thanks: Record<PowerKind, string> = {
    health: `${name} is unlocked. Do not waste the extra heart. I packed it myself.`,
    stamina: `${name} is unlocked. Run when I say run.`,
    ammo: `${name} is unlocked. The birds hate volume, so use it.`,
    shield: `${name} is unlocked. The next drop is not weather.`,
    homing: `${name} is unlocked. These shots love you back.`,
    overload: `${name} is unlocked. Double the gift, and double the noise.`,
    rapid: `${name} is unlocked. Faster thanks, faster fire.`,
    zapper: `${name} is unlocked. Hug the flock. Politely.`,
    slowmo: `${name} is unlocked. Time is a pastry thing. Use it on the long walk.`,
  };
  return { who: "HONEY BUN", text: thanks[kind] };
}

export function chaosBeat(id: ChaosId, epic: boolean): Beat {
  if (epic) {
    return {
      who: "HONEY BUN",
      text: `${CHAOS_META[id].name} chaos seed is locked. Thank you for coming. The farm stays open, and the keys are gone.`,
    };
  }
  return {
    who: "HONEY BUN",
    text: `${CHAOS_META[id].name} chaos seed is locked. The next signal is ready, and so is the next missing part.`,
  };
}

export function winCopy(level: LevelDef, lastChaos?: ChaosId): { title: string; body: string } {
  const op = OPERATIONS[(level.operation ?? 1) - 1] ?? OPERATIONS[0]!;
  if (level.epic) {
    return {
      title: "The Farm Remembers",
      body: `Neon Chaos recedes. Honey Bun thanks you. The extraction does not finish, and the birds take the keys. ${
        lastChaos ? CHAOS_META[lastChaos].name + " seed taken. " : ""
      }The van does not leave. The question stays open.`,
    };
  }
  if (level.boss) {
    const laugh =
      op.id === 1
        ? "Don Corvone laughs. Sorry, your Honey Bun is in another canyon!"
        : `${level.bossName ?? op.boss} goes down laughing. The hood is already open.`;
    const sting = vanSting(op.id).map((b) => `${b.who}: “${b.text}”`).join(" ");
    return {
      title: `${level.bossName ?? op.boss} Down`,
      body: `${lastChaos ? CHAOS_META[lastChaos].name + " chaos seed locked in. " : ""}${laugh} ${sting}`,
    };
  }
  const beat = levelBeat(op.id, (level.id - 1) % 10);
  return {
    title: "Canyon Cleared",
    body: `${beat.who}: “${beat.text}” The room throws you forward. Do not get comfortable.`,
  };
}

export const TITLE_TAG = "Grok & Goblin: The Honey Bun Extraction";
export const TITLE_BLURB =
  "The Bird Mafia stole Honey Bun. Follow the crumbs, take the gifts, and survive the rooms they throw you into. Every gift is real. Every gift is a trap.";
export const CORE_QUESTION = "Is Honey Bun helping us, or farming us?";
export const ANOTHER_CANYON = "Sorry, your Honey Bun is in another canyon!";
