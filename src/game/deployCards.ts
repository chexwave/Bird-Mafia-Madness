import { CHAOS_META, type ChaosId } from "./progression";

export type SeedMark =
  | "heart"
  | "blast"
  | "ammo"
  | "magnet"
  | "armor"
  | "fuel"
  | "stamina"
  | "bullet"
  | "shield"
  | "neon";

export type HexCard = {
  nick: string;
  effect: string;
  short: string;
  mark: SeedMark;
};

/** Nicknames keyed to the live nine Hexes. Effects stay on the seed, not the old level slot. */
export const HEX_CARD: Record<ChaosId, HexCard> = {
  crimson: {
    nick: "Soul Stabilizer",
    effect: "Permanently adds five max health points.",
    short: "extra health",
    mark: "heart",
  },
  amber: {
    nick: "Blaster Buff",
    effect: "Raises damage so shots hit harder.",
    short: "a damage boost",
    mark: "blast",
  },
  chartreuse: {
    nick: "Mag Multiplier",
    effect: "Increases max ammo for longer fights.",
    short: "more max ammo",
    mark: "ammo",
  },
  lime: {
    nick: "Flux Fixer",
    effect: "Extends magnet range for closer pickups.",
    short: "wider magnet range",
    mark: "magnet",
  },
  viridian: {
    nick: "Armor Amplifier",
    effect: "Reduces incoming damage from bird hits.",
    short: "damage reduction",
    mark: "armor",
  },
  cyan: {
    nick: "Fuel Efficiency",
    effect: "Leans stamina drain for farther runs.",
    short: "a stamina lean",
    mark: "fuel",
  },
  azure: {
    nick: "Tenacity Tuning",
    effect: "Boosts max stamina for longer chases.",
    short: "max stamina",
    mark: "stamina",
  },
  indigo: {
    nick: "Ammo Augment",
    effect: "Speeds bullet travel to the flock.",
    short: "faster bullets",
    mark: "bullet",
  },
  fuchsia: {
    nick: "Force-Field Fortify",
    effect: "Extends shield time so it holds longer.",
    short: "longer shield time",
    mark: "shield",
  },
};

export const NEON_CARD = {
  name: "Neon Chaos Seed",
  nick: "Holographic Crystal",
  effect: "Temporary amp of all Hex buffs for the boss.",
  color: "#ff2bd6",
  glow: "#00f0ff",
};

/** Op 1 room lines. The seed name is filled from the live Hex, not these old color guesses. */
export const OP1_ROOM: { radio: string; flavor: string; path: string }[] = [
  {
    radio: "Oof. After all that running you fell through a hole. That must've hurt lol.",
    flavor: "Open neon dunes with a collapsing path. The shaft at the end is the door down.",
    path: "Dash the canyon and watch for holes that drop the floor.",
  },
  {
    radio:
      "Ew. That cave was pretty dark and nasty, I wouldn't want to be there. Good thing you got launched hundreds of feet in air like a bird haha!",
    flavor: "Sealed neon cave with glowing veins. A single spring lifts you to the sky lip.",
    path: "Sneak the tunnel and find the spring that launches you out.",
  },
  {
    radio:
      "Whoa. You guys weren't even scared of being inches away from a long fall down. And then you broke the bridge, nice move lol.",
    flavor: "Neon rails arc over a spike gorge. The shot bridge sits in the middle and will break under you.",
    path: "Jump the sky rails carefully and find the way down when the bridge collapses.",
  },
  {
    radio: "Yikes. You just slid right into a gorge full of needles. Hope those belts get you out before something sticks lol.",
    flavor: "Needle-filled gorge under the broken span. Belts climb the far wall out of the spikes.",
    path: "Survive the drop and ride the belts up before the needles catch you.",
  },
  {
    radio: "Haha. Those belts yanked you straight into the storm. Bet the seed wall at the end looks real friendly right now lol.",
    flavor: "Storm-lashed belt run ending in a wall of giant broken seeds. The tube is the way up.",
    path: "Ride the belts through the dust and find the tube past the seed wall.",
  },
  {
    radio: "Gross. You climbed all the way up into that giant seed silo. The flock up there is gonna be thrilled to see you lol.",
    flavor: "Narrow climb tube rising to a seed sewage silo. The cage door is the exit after the flock.",
    path: "Climb the tube, clear the flock, and take the door out of the silo.",
  },
  {
    radio: "Oof. The cage door just dumped you onto that long wall. Those shock lines look like they missed you on purpose haha.",
    flavor: "Giant bird-cage wall with shock lines below. Optional cages sit on the descent.",
    path: "Step out of the door, shoot the cages if you want, and ride the lines down.",
  },
  {
    radio: "Whoa. You jumped onto those power lines like they weren't trying to zap you. One miss and you're toast lol.",
    flavor: "Horizontal telephone poles with drooping wires. The factory is only the background.",
    path: "Jump pole to pole and keep your feet off the shocks.",
  },
  {
    radio: "Heh. All that running and you still ended up on an endless plateau. Don Corvone is already waiting at the far end lol.",
    flavor: "Endless magenta plateau with no castle. Don Corvone arrives at the far ridge and does not fight.",
    path: "Walk the plateau, take the early seed, and reach the ridge where Don opens Level 10.",
  },
  {
    radio: "Nice. You made it all the way to Don Corvone. Too bad I wasn't there lol. Get back to the van and come save me!",
    flavor: "Boss arena under Don's perch. Three phases: floor, tiers, then the extract.",
    path: "Survive the phases and take the extract.",
  },
];

export function hexNick(id: ChaosId) {
  return HEX_CARD[id].nick;
}

export function hexObjective(id: ChaosId, path: string) {
  return `Grab the ${CHAOS_META[id].name} for ${HEX_CARD[id].short}. ${path}`;
}
