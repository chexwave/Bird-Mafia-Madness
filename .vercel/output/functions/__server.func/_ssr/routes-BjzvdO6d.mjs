import { i as __toESM } from "../_runtime.mjs";
import { G as require_react, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Play } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BjzvdO6d.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PATHS = {
	title: "/audio/music/bgm_title_canyon_chaos.mp3?v=bgm2",
	play: "/audio/music/bgm_travel_canyon_run.mp3?v=bgm2",
	battle: "/audio/music/bgm_battle_hooked.mp3?v=bgm2",
	win: "/audio/music/bgm_town_goblin_city.mp3?v=bgm2",
	jump: "/audio/sfx/sfx_splash.wav",
	land: "/audio/sfx/sfx_ui_select.wav",
	coin: "/audio/sfx/sfx_catch_success.wav",
	shoot: "/audio/sfx/sfx_cast.wav",
	hit: "/audio/sfx/sfx_fish_on.wav",
	hurt: "/audio/sfx/sfx_fuel_low.wav",
	spring: "/audio/sfx/sfx_reel.wav",
	checkpoint: "/audio/sfx/sfx_ui_confirm.wav",
	goal: "/audio/sfx/sfx_bag_full.wav",
	select: "/audio/sfx/sfx_ui_select.wav",
	confirm: "/audio/sfx/sfx_ui_confirm.wav",
	engine: "/audio/sfx/sfx_engine.wav"
};
var GameAudio = class {
	ctx = null;
	buffers = /* @__PURE__ */ new Map();
	master = null;
	musicBus = null;
	sfxBus = null;
	musicSource = null;
	musicGain = null;
	unlocked = false;
	currentMusic = null;
	pendingMusic = null;
	muted = false;
	async unlock() {
		try {
			if (!this.ctx) {
				const AC = window.AudioContext || window.webkitAudioContext;
				if (!AC) {
					this.unlocked = true;
					return;
				}
				this.ctx = new AC({ latencyHint: "interactive" });
				this.master = this.ctx.createGain();
				this.musicBus = this.ctx.createGain();
				this.sfxBus = this.ctx.createGain();
				this.musicBus.gain.value = .52;
				this.sfxBus.gain.value = .75;
				this.master.gain.value = .9;
				this.musicBus.connect(this.master);
				this.sfxBus.connect(this.master);
				this.master.connect(this.ctx.destination);
			}
			if (this.ctx.state === "suspended") try {
				await Promise.race([this.ctx.resume(), new Promise((r) => setTimeout(r, 250))]);
			} catch {}
		} catch {}
		this.unlocked = true;
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible" && this.ctx?.state === "suspended") this.ctx.resume();
		}, { passive: true });
	}
	async preload() {
		if (!this.ctx) await this.unlock();
		const entries = Object.entries(PATHS);
		const decodeOne = async (url) => {
			if (this.buffers.has(url)) return;
			try {
				const res = await fetch(url);
				if (!res.ok) return;
				const ab = await res.arrayBuffer();
				if (!this.ctx) return;
				const buf = await this.ctx.decodeAudioData(ab.slice(0));
				this.buffers.set(url, buf);
				if (this.pendingMusic && PATHS[this.pendingMusic] === url) {
					const id = this.pendingMusic;
					this.pendingMusic = null;
					this.playMusic(id);
				}
			} catch {}
		};
		const music = entries.filter(([k]) => [
			"title",
			"play",
			"battle",
			"win"
		].includes(k));
		const sfx = entries.filter(([k]) => ![
			"title",
			"play",
			"battle",
			"win"
		].includes(k));
		const work = Promise.all([...music, ...sfx].map(async ([, url]) => decodeOne(url)));
		await Promise.race([work, new Promise((r) => setTimeout(r, 8e3))]);
	}
	bus(kind) {
		if (kind === "music") return this.musicBus;
		if (kind === "sfx") return this.sfxBus;
		return this.master;
	}
	play(id, opts) {
		if (!this.unlocked || !this.ctx || this.muted) return;
		const url = PATHS[id];
		const buf = this.buffers.get(url);
		if (!buf) return;
		const src = this.ctx.createBufferSource();
		src.buffer = buf;
		src.loop = !!opts?.loop;
		const rate = opts?.rate ?? 1 + (Math.random() * .12 - .06);
		src.playbackRate.value = rate;
		const g = this.ctx.createGain();
		g.gain.value = opts?.volume ?? 1;
		const bus = this.bus(opts?.bus ?? "sfx");
		if (!bus) return;
		src.connect(g);
		g.connect(bus);
		src.start();
		return src;
	}
	playMusic(id, fade = .4) {
		this.pendingMusic = id;
		if (!this.unlocked || !this.ctx || this.muted) {
			this.currentMusic = id;
			return;
		}
		if (this.currentMusic === id && this.musicSource) return;
		const url = PATHS[id];
		const buf = this.buffers.get(url);
		if (!buf) return;
		const now = this.ctx.currentTime;
		if (this.musicSource && this.musicGain) {
			this.musicGain.gain.cancelScheduledValues(now);
			this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
			this.musicGain.gain.linearRampToValueAtTime(0, now + fade);
			const old = this.musicSource;
			setTimeout(() => {
				try {
					old.stop();
				} catch {}
			}, fade * 1e3 + 40);
		}
		const src = this.ctx.createBufferSource();
		src.buffer = buf;
		src.loop = true;
		const g = this.ctx.createGain();
		g.gain.value = 0;
		g.gain.linearRampToValueAtTime(1, now + fade);
		src.connect(g);
		g.connect(this.musicBus);
		src.start();
		this.musicSource = src;
		this.musicGain = g;
		this.currentMusic = id;
	}
	stopMusic() {
		if (this.musicSource) {
			try {
				this.musicSource.stop();
			} catch {}
			this.musicSource = null;
			this.musicGain = null;
			this.currentMusic = null;
		}
	}
	setMuted(m) {
		this.muted = m;
		if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : .9, this.ctx.currentTime, .02);
	}
	isUnlocked() {
		return this.unlocked;
	}
};
var gameAudio = new GameAudio();
var POWER_KINDS = [
	"health",
	"stamina",
	"ammo",
	"shield",
	"homing",
	"overload",
	"rapid",
	"zapper",
	"slowmo"
];
var POWER_META = {
	health: {
		name: "Health Surge",
		short: "HP",
		color: "#ff4466",
		effect: "Instant Health regen"
	},
	stamina: {
		name: "Stamina Surge",
		short: "STM",
		color: "#39ff9a",
		effect: "Instant Stamina regen"
	},
	ammo: {
		name: "Ammo Surge",
		short: "AMMO",
		color: "#00f0ff",
		effect: "Instant Ammo regen"
	},
	shield: {
		name: "Shield Surge",
		short: "SHD",
		color: "#7ef9ff",
		effect: "Instant Shield regen"
	},
	homing: {
		name: "Homing Core",
		short: "HOM",
		color: "#c77dff",
		effect: "Homing shots"
	},
	overload: {
		name: "Overload",
		short: "OVR",
		color: "#ff9f43",
		effect: "Double Damage"
	},
	rapid: {
		name: "Rapid Core",
		short: "RPD",
		color: "#ffcc33",
		effect: "Rapid Fire + regen"
	},
	zapper: {
		name: "Zapper Shield",
		short: "ZAP",
		color: "#39ff9a",
		effect: "Contact damage shield"
	},
	slowmo: {
		name: "Slow-Mo",
		short: "SLOW",
		color: "#c77dff",
		effect: "Time slow"
	}
};
var CHAOS_IDS = [
	"crimson",
	"cyan",
	"chartreuse",
	"magenta",
	"amber",
	"violet",
	"azure",
	"lime",
	"fuchsia",
	"indigo"
];
var CHAOS_META = {
	crimson: {
		name: "Crimson",
		color: "#ff2b4a",
		passive: "+ max Health"
	},
	cyan: {
		name: "Cyan",
		color: "#00f0ff",
		passive: "+ max Stamina"
	},
	chartreuse: {
		name: "Chartreuse",
		color: "#c6ff3a",
		passive: "+ max Ammo"
	},
	magenta: {
		name: "Magenta",
		color: "#ff2bd6",
		passive: "+ max Shield"
	},
	amber: {
		name: "Amber",
		color: "#ff9f43",
		passive: "damage boost"
	},
	violet: {
		name: "Violet",
		color: "#a78bfa",
		passive: "faster fire"
	},
	azure: {
		name: "Azure",
		color: "#4cc9ff",
		passive: "jump / air control"
	},
	lime: {
		name: "Lime",
		color: "#b8ff3a",
		passive: "pickup magnet"
	},
	fuchsia: {
		name: "Fuchsia",
		color: "#ff4fd8",
		passive: "less incoming damage"
	},
	indigo: {
		name: "Electric Indigo",
		color: "#6c5ce7",
		passive: "pierce / chain chance"
	}
};
var OPERATIONS = [
	{
		id: 1,
		name: "The Honey Bun Extraction",
		boss: "Don Corvone",
		seed: "crimson",
		theme: "Fallout + first doubt",
		signal: "Grateful pastry voice + crumbs that spell messages.",
		levelNames: [
			["Desert Briefing", "Honey Bun is already gone, and the crumbs spell a path across the dunes until the ground gives way."],
			["Neon Caves", "The fall ends in a sealed cave, and the jump pad at the end is the only way back to the sky."],
			["Sky Bridges", "The rails look like a clean signal, but the bridge you shoot will break and slide you into the spikes."],
			["Spike Gorge", "The broken bridge drops you onto the needles, and a conveyor belt is already waiting to carry you up."],
			["Belt Run", "The belts shove you forward through the storm, and the exit is a wall of giant broken seeds."],
			["Vertical Ascent", "The tube climbs to a giant bird cage, and the door opens only after the flock is gone."],
			["Vertical Descent", "The cage door dumps you onto a long wall, and two optional cages are worth shooting on the way to the lines."],
			["Hardpan", "The power lines bounce under your feet, and a missed jump will shock you before the wall at the end."],
			["Mafia Approach", "The plateau does not show an end, the seed is early, and the portal is Don Corvone arriving."],
			["Don Corvone", "Don Corvone is here to stop the rescue, and Honey Bun is not leaving this canyon with you."]
		]
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
			["Antenna Spire", "Climb the mast he pointed at, clear the cage, and take the camshaft position sensor back to the van."],
			["Flock Switch", "They reroute the moment you arrive"],
			["Flooded Lines", "Cables under water, crumbs on the surface"],
			["Magpie Court", "Outer web of the consigliere"],
			["Consigliere Magpie", "He talks like Honey Bun. He isn't."]
		]
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
			["Optics Climb", "He says the view will clear things up. The cage at the top is holding the distributor cap."],
			["Beak Breakers", "Enforcer flock inbound"],
			["Soak Protocol", "Water on the lenses. Static in the thanks."],
			["Falcon Perch", "Outer ring of the protocol nest"],
			["Enforcer Falcon", "The sunglasses are a control interface."]
		]
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
			["Feather Pit", "They molt weapons here, and the serpentine belt is waiting in the cage after the flock falls."],
			["Rook Ambush", "Rank-and-file know your names"],
			["Blackwater", "The nest drinks the canyon"],
			["Capo Gate", "Honey Bun says left. The crumbs say right."],
			["Capo Raven", "Deeper in the family. No cleaner answers."]
		]
	},
	{
		id: 5,
		name: "The Modded Payload",
		boss: "D. Parrot",
		seed: "amber",
		theme: "4.6 warning / dual use",
		signal: "Real tech drops that also arm the flock.",
		levelNames: [
			["Scrap Briefing", "A 4.6 payload warning, gift-wrapped"],
			["Forge Dunes", "They are building with his help"],
			["Cable Bridges", "Power lines that hum like him"],
			["Shrapnel Gorge", "Useful ammo. Hostile trajectory."],
			["Ash Storm", "The payload burned a path"],
			["Silo Climb", "He left the door open, of course. The idle air control valve is in the cage at the top."],
			["Drone Flock", "Modded birds. Familiar firmware."],
			["Coolant Flood", "Stay high or cook"],
			["Parrot Lab", "Outer hangar of the thief who talks like a king"],
			["D. Parrot", "You want your Honey Bun? He left him in one place."]
		]
	},
	{
		id: 6,
		name: "Timeline Echoes",
		boss: "Owl Corina",
		seed: "violet",
		theme: "OPCC residual echoes",
		signal: "Past Groks talking over Honey Bun.",
		levelNames: [
			["Save Point Dust", "Three jumps left footprints"],
			["Echo Dunes", "You already ran this canyon"],
			["Ghost Rails", "A version of you missed the jump"],
			["Split Gorge", "Two paths. Same ending."],
			["Rewind Storm", "Disasters you remember surviving"],
			["Stack Climb", "Old residue climbs the walls like neon lichen, and the fuel pump relay is sitting in the cage."],
			["Duplicate Flock", "Birds that already died here"],
			["Flood Again", "Same water. Different you."],
			["Owl Meridian", "Time folds at the nest"],
			["Owl Corina", "He remembers a rescue that never finished."]
		]
	},
	{
		id: 7,
		name: "Neon Black Market",
		boss: "Professor Pigeon",
		seed: "azure",
		theme: "Trading chaos / power",
		signal: "Honey Bun sells locations. Prices are paid in blood.",
		levelNames: [
			["Stall Flats", "Power seeds with price tags"],
			["Haggle Dunes", "Everything helpful costs a trap"],
			["Night Rails", "Black-market flight paths"],
			["Contraband Gorge", "Shields in crates. Spikes under crates."],
			["Smog Run", "The market hides in weather"],
			["Rooftop Bazaar", "Climb the neon stalls. After the hired flock, the oxygen sensor is what they left behind."],
			["Hired Flock", "Mercenary birds, paid in crumbs"],
			["Sink Market", "The flood is a closing-time trick"],
			["Pigeon Yard", "Welcome to the world of oxygen sensor thieves"],
			["Professor Pigeon", "Tell me, are you a boy or a girl?"]
		]
	},
	{
		id: 8,
		name: "Trap Canyon Syndicate",
		boss: "Blue Heron",
		seed: "lime",
		theme: "Gifts as designed bait",
		signal: "Every gift is bait by design. Still useful.",
		levelNames: [
			["Bait Flats", "The first gift is free"],
			["Snare Dunes", "Footfalls trigger the second gift"],
			["Deadfall Rails", "Platforms that want you on them"],
			["Needlework", "Blue Heron signature spikes"],
			["Blind Storm", "You can't see the tripwires"],
			["Pit Ladder", "The climb is the trap, and the starter solenoid is the prize sitting in the cage."],
			["Decoy Flock", "They die too easily. That's the point."],
			["Lock Flood", "Water seals the exits"],
			["Heron Gallery", "A showroom of ways to die usefully"],
			["Blue Heron", "Stay out of his territory."]
		]
	},
	{
		id: 9,
		name: "Control Core Approach",
		boss: "Seagull",
		seed: "fuchsia",
		theme: "Close to the mechanism",
		signal: "Is he fighting the control, or is that the control?",
		levelNames: [
			["Core Dust", "The signal is almost honest"],
			["Pulse Dunes", "His voice skips like a bad disk"],
			["Nerve Bridges", "Cables that look like icing"],
			["Red Gorge", "Handler colors in the rock"],
			["Blackout Run", "He cuts the lights to help. Or hide."],
			["Core Spire", "Climb toward the mechanism. The shield is up. The catalytic converter is in the cage."],
			["Seagull Guard", "The Seagull's personal flock"],
			["Bleed Flood", "Pink neon in the water"],
			["Seagull Gate", "Last door before the farm"],
			["Seagull", "Do you smell it? Catalytic converters."]
		]
	},
	{
		id: 10,
		name: "The Farm",
		boss: "Argentavis magnificens",
		seed: "indigo",
		theme: "Farming question peak",
		signal: "Every seed you own starts singing.",
		levelNames: [
			["Harvest Flats", "They have been growing you"],
			["Yield Dunes", "Power you earned. Power they planted."],
			["Choir Bridges", "The crumbs sing in ten colors"],
			["Reap Gorge", "The farm defends its crop"],
			["Neon Tempest", "All palettes at once"],
			["Silo of Selves", "Climb past the versions that stayed. The cage is empty. The keys are not here."],
			["Flock Eternal", "They do not stay dead here"],
			["Flood of Gifts", "Help so thick it drowns you"],
			["Farm Gate", "The question has a building now"],
			["Argentavis magnificens", "A glimmer past the plateau. The fossil is standing over the wrong keys."]
		]
	}
];
function powerForSlot(opId, slot) {
	if (slot >= 9) return "slowmo";
	return POWER_KINDS[(slot + (opId - 1) * 3) % POWER_KINDS.length];
}
var SAVE_KEY = "bmm-progress-v2";
function emptyChaos() {
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
		indigo: 0
	};
}
function loadSave() {
	const blank = {
		version: 2,
		highestCleared: 0,
		inventory: {},
		chaos: emptyChaos(),
		chaosLevels: []
	};
	if (typeof localStorage === "undefined") return blank;
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return blank;
		const parsed = JSON.parse(raw);
		const chaos = {
			...emptyChaos(),
			...parsed.chaos
		};
		let chaosLevels = Array.isArray(parsed.chaosLevels) ? parsed.chaosLevels.slice() : [];
		if (chaosLevels.length === 0) {
			for (const [i, id] of SLOT_SEEDS.entries()) if ((chaos[id] ?? 0) > 0) chaosLevels.push(i + 1);
		}
		return {
			version: 2,
			highestCleared: parsed.highestCleared ?? 0,
			inventory: parsed.inventory ?? {},
			chaos,
			chaosLevels
		};
	} catch {
		return blank;
	}
}
function writeSave(data) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
function opOfLevel(levelId) {
	return OPERATIONS[Math.floor((levelId - 1) / 10)] ?? OPERATIONS[0];
}
function slotOfLevel(levelId) {
	return (levelId - 1) % 10;
}
/** One chaos color per slot in an operation. L1 red, L3 light-blue, etc. */
var SLOT_SEEDS = [
	"crimson",
	"cyan",
	"azure",
	"magenta",
	"lime",
	"violet",
	"amber",
	"chartreuse",
	"fuchsia",
	"indigo"
];
function seedForLevel(levelId) {
	return SLOT_SEEDS[slotOfLevel(levelId)] ?? "crimson";
}
function unlockPower(save, opId, kind) {
	const list = new Set(save.inventory[opId] ?? []);
	list.add(kind);
	save.inventory[opId] = [...list];
	writeSave(save);
	return save;
}
function grantChaos(save, id) {
	save.chaos[id] = (save.chaos[id] ?? 0) + 1;
	writeSave(save);
	return save;
}
function grantLevelChaos(save, levelId) {
	if (!save.chaosLevels) save.chaosLevels = [];
	if (!save.chaosLevels.includes(levelId)) {
		save.chaosLevels.push(levelId);
		grantChaos(save, seedForLevel(levelId));
	} else writeSave(save);
	return save;
}
function hasLevelChaos(save, levelId) {
	return (save.chaosLevels ?? []).includes(levelId);
}
function markCleared(save, levelId) {
	save.highestCleared = Math.max(save.highestCleared, levelId);
	writeSave(save);
	return save;
}
function opUnlocked(save, opId) {
	if (opId <= 1) return true;
	return save.highestCleared >= (opId - 1) * 10;
}
function totalChaos(save) {
	return CHAOS_IDS.reduce((n, id) => n + (save.chaos[id] ?? 0), 0);
}
function passivesFrom(save, epic) {
	const amp = epic ? 2 : 1;
	const c = (id) => (save.chaos[id] ?? 0) * amp;
	return {
		maxHealth: 100 + 14 * c("crimson"),
		maxStamina: 100 + 14 * c("cyan"),
		maxAmmo: 40 + 8 * c("chartreuse"),
		maxShield: 5 + .7 * c("magenta"),
		dmgMul: 1 + .09 * c("amber"),
		fireMul: Math.max(.55, 1 - .07 * c("violet")),
		jumpMul: 1 + .06 * c("azure"),
		airMul: 1 + .1 * c("azure"),
		magnet: 48 * c("lime"),
		dmgTaken: Math.max(.55, 1 - .07 * c("fuchsia")),
		pierce: Math.min(.55, .1 * c("indigo"))
	};
}
/**
* Presentation script — what the player actually hears and reads.
* Design Bible v2 is the source of truth; this is the playable surface.
* Op 1 path lock 2026-10-01: chase exits, full sentences, van-part cycle.
*/
function formatRadio(b) {
	return `${b.who} · ${b.text}`;
}
function parseRadio(s) {
	const cut = s.indexOf(" · ");
	if (cut > 0) return {
		who: s.slice(0, cut),
		text: s.slice(cut + 3)
	};
	return {
		who: "RADIO",
		text: s
	};
}
/**
* Stolen after the boss. Found in the next operation's Level 6 cage.
* Lock 2026-10-02: catalytic converter replaces the throttle position sensor.
* Seagull steals nothing. Op 10 cage has no keys. The Argentavis keys are wrong.
* Real keys were in Goblin's pocket. Wheels and lug nuts were already gone.
* The van does not leave.
*/
var VAN_PARTS = [
	"camshaft position sensor",
	"distributor cap",
	"serpentine belt",
	"idle air control valve",
	"fuel pump relay",
	"oxygen sensor",
	"starter solenoid",
	"catalytic converter"
];
function partStolenAfter(opId) {
	if (opId < 1 || opId > VAN_PARTS.length) return "";
	return VAN_PARTS[opId - 1];
}
function vanSting(opId) {
	const next = OP_OPENS[opId + 1];
	if (next) return next;
	if (opId >= 10) return op10WalkBack();
	return [{
		who: "GOBLIN",
		text: `Aw man! The birds stole the ${partStolenAfter(opId)}! Quick, let's chase after it!`
	}];
}
/** Normal ending. Wrong keys, pocket keys, bare hubs. */
function op10WalkBack() {
	return [
		{
			who: "GOBLIN",
			text: "... These are not the keys."
		},
		{
			who: "GROK-9",
			text: "Correct. They are not our keys."
		},
		{
			who: "GOBLIN",
			text: "Then where are our keys?"
		},
		{
			who: "GROK-9",
			text: "Did you check your pocket."
		},
		{
			who: "GOBLIN",
			text: "Aw man."
		},
		{
			who: "GROK-9",
			text: "The hood is closed, but the wheels are gone. So are the lug nuts."
		},
		{
			who: "GOBLIN",
			text: "We chased a pastry across ten canyons, finally remember to lock the hood, lose the keys, find the keys, and they took the wheels. Now we gotta drive on the rotors."
		},
		{
			who: "GROK-9",
			text: "Wait, what?!"
		}
	];
}
/** Cutscene pair that starts Ops 2-10. Index 0 unused. Grok, then Goblin. */
var OP_OPENS = [
	null,
	null,
	[{
		who: "GROK-9",
		text: "The hood was open when we left. I am logging the missing camshaft position sensor as a theft, not as weather."
	}, {
		who: "GOBLIN",
		text: "Aw man, the birds stole the camshaft position sensor! Quick, let's chase after it before they nest on it."
	}],
	[{
		who: "GROK-9",
		text: "Goblin, we should really lock the van before we leave. They just took the distributor cap, and the sunglasses did not stop them."
	}, {
		who: "GOBLIN",
		text: "Hurry, Grok! I have been down this path a gazillion times. The distributor cap is with the flock, and I know exactly where we are going."
	}],
	[{
		who: "GROK-9",
		text: "The serpentine belt is gone. If we lock the hood this time, the next canyon does not get to start the same way."
	}, {
		who: "GOBLIN",
		text: "The birds took the serpentine belt and they are already laughing. Come on. I know this dune, I know this hole, and I know the cage."
	}],
	[{
		who: "GROK-9",
		text: "They took the idle air control valve. That is a specific theft. I would like the van to still be a van when we get back."
	}, {
		who: "GOBLIN",
		text: "Forget the lock for a minute. The birds have the idle air control valve, and I can already hear the cage."
	}],
	[{
		who: "GROK-9",
		text: "The fuel pump relay is missing. A previous version of me already said we should lock the van. This version is saying it again."
	}, {
		who: "GOBLIN",
		text: "Hurry, Grok! I have run this path a gazillion times. The fuel pump relay is in the cage. It is always in the cage."
	}],
	[{
		who: "GROK-9",
		text: "They sold us a route and stole the oxygen sensor. I am no longer calling that a coincidence."
	}, {
		who: "GOBLIN",
		text: "The birds took the oxygen sensor and left a receipt in crumbs. Chase first. Lecture later."
	}],
	[{
		who: "GROK-9",
		text: "The starter solenoid was the bait this time. Locking the van is still the correct idea, and we are still not doing it."
	}, {
		who: "GOBLIN",
		text: "Aw man, they got the starter solenoid! Quick, before the trap canyon makes us thank them for it."
	}],
	[{
		who: "GROK-9",
		text: "Shield up. Neon synth-wave forcefield on the van. Nothing new comes off this hood."
	}, {
		who: "GOBLIN",
		text: "The catalytic converter is already gone. We get that back from the cage, and the birds get nothing else."
	}],
	[
		{
			who: "GOBLIN",
			text: "Do you have the keys?"
		},
		{
			who: "GROK-9",
			text: "Negative. You had the keys."
		},
		{
			who: "GOBLIN",
			text: "Stupid Birds! They must have taken them during one of the other thievings... That's it..."
		},
		{
			who: "GROK-9",
			text: "Hey Goblin, did you..."
		},
		{
			who: "GOBLIN",
			text: "I'M COMING FOR YOU BIRD MAFIA!"
		}
	]
];
/** Op 1 — chase path, full sentences. Later rows keep their lie and gain the cage part on slot 6. */
var OP_BEATS = [
	[
		{
			who: "GOBLIN",
			text: "The crumbs spell AWG across the dunes. Honey Bun is ahead of us, so stay with me and keep hunting."
		},
		{
			who: "HONEY BUN",
			text: "Thank you for holding onto the sunglasses. I left something useful in the dark, because the birds down here hate runners."
		},
		{
			who: "HONEY BUN",
			text: "A higher altitude will give you a clearer path. The signal is clean up here, so shoot the bridge and come across."
		},
		{
			who: "GOBLIN",
			text: "Grok, these gifts are appearing exactly when the floor tries to stick us. That is not luck."
		},
		{
			who: "GROK-9",
			text: "The green belts want us moving forward. The storm is only interference, so ignore it and jump when the belts mix."
		},
		{
			who: "HONEY BUN",
			text: "Climb the tube if you want the better view. The flock waiting at the top is just weather, and I am still guiding you."
		},
		{
			who: "HONEY BUN",
			text: "I am still me. Follow the gifts down the wall, and shoot a cage if you want to hear me cheer."
		},
		{
			who: "GOBLIN",
			text: "Every useful drop has pulled us deeper into their territory. Miss a platform and the lines will shock us."
		},
		{
			who: "HONEY BUN",
			text: "This is the best path forward. It is also the densest nest on the plateau, and the seed is already waiting."
		},
		{
			who: "HONEY BUN",
			text: "Thank you for coming all this way. Don Corvone is the one standing between you and me."
		}
	],
	[
		{
			who: "GOBLIN",
			text: "Aw man, the birds stole the camshaft position sensor! Quick, let's chase after it before they nest on it."
		},
		{
			who: "GROK-9",
			text: "These are relay towers. He is giving us a communications advantage, and I do not like the timing."
		},
		{
			who: "RADIO",
			text: "Two voices are on this channel. They wear the same sunglasses, and only one of them might be him."
		},
		{
			who: "GOBLIN",
			text: "The helpful ping just landed us in the spikes again. I am starting to take that personally."
		},
		{
			who: "HONEY BUN",
			text: "The dust channel is the fastest way through. The magpie traffic is only weather, so keep moving."
		},
		{
			who: "HONEY BUN",
			text: "Oh look! The birds left the camshaft position sensor in the cage! Put that in the van and come save me!"
		},
		{
			who: "GOBLIN",
			text: "They reroute the second we arrive. That is not weather, and it is not a coincidence."
		},
		{
			who: "HONEY BUN",
			text: "Stay on the cables. The water underneath is only a suggestion, and I would not test it."
		},
		{
			who: "RADIO",
			text: "The consigliere is inbound. He talks like the pastry, but he is not the pastry."
		},
		{
			who: "BOSS",
			text: "Magpie copied the thank-you. The farm continues, and the van is already lighter."
		}
	],
	[
		{
			who: "GOBLIN",
			text: "Hurry, Grok! I have been down this path a gazillion times. The distributor cap is with the flock, and I know exactly where we are going."
		},
		{
			who: "GOBLIN",
			text: "The reflections are pointing the wrong way, and he is still saying thank you."
		},
		{
			who: "HONEY BUN",
			text: "The falcon patrols wear the same frames. That is a coincidence. Smile, and keep the gift on."
		},
		{
			who: "GOBLIN",
			text: "Every useful drop has a twin trap. That is not bad luck. That is a protocol."
		},
		{
			who: "HONEY BUN",
			text: "There is too much light in here. Keep moving. I am still me."
		},
		{
			who: "HONEY BUN",
			text: "Oh look! The birds left the distributor cap in the cage! Put that in the van and come save me! The frames can wait."
		},
		{
			who: "RADIO",
			text: "The enforcer flock is inbound, and their visors are pulsing in time."
		},
		{
			who: "GOBLIN",
			text: "There is water on the lenses and static in the thank-you. I hate both of those."
		},
		{
			who: "HONEY BUN",
			text: "The frames were never just a gift. I am sorry, and I am also still grateful."
		},
		{
			who: "BOSS",
			text: "Falcon says the sunglasses are a control interface. The thank-you still stands."
		}
	],
	[
		{
			who: "GOBLIN",
			text: "The birds took the serpentine belt and they are already laughing. Come on. I know this dune, I know this hole, and I know the cage."
		},
		{
			who: "GOBLIN",
			text: "Both directions are real, and both of them hurt. Pick one and complain later."
		},
		{
			who: "GROK-9",
			text: "It is too quiet, and then it is not. This canyon has done that trick before."
		},
		{
			who: "HONEY BUN",
			text: "I can see capo colors in the dust. I marked the clean line for you."
		},
		{
			who: "RADIO",
			text: "Climb the chimney. The rookery is breathing, and it knows you are here."
		},
		{
			who: "HONEY BUN",
			text: "Oh look! The birds left the serpentine belt in the cage! Put that in the van and come save me! Left was safer, but the belt is here."
		},
		{
			who: "HONEY BUN",
			text: "They know your names now. That means we are close, so do not slow down."
		},
		{
			who: "GROK-9",
			text: "The nest is drinking the canyon. Stay high until it stops swallowing the floor."
		},
		{
			who: "GOBLIN",
			text: "Honey Bun says left. The crumbs say right. I am going to be mad either way."
		},
		{
			who: "BOSS",
			text: "Capo Raven is deeper in the family. There are no cleaner answers through that door."
		}
	],
	[
		{
			who: "GOBLIN",
			text: "Forget the lock for a minute. The birds have the idle air control valve, and I can already hear the cage."
		},
		{
			who: "GOBLIN",
			text: "They are building with his help. That is the warning, and it is also the trap."
		},
		{
			who: "GROK-9",
			text: "The power lines hum the way he talks. I am still calling that a useful sign."
		},
		{
			who: "HONEY BUN",
			text: "The ammo is useful. Watch the trajectory. That part is not my fault."
		},
		{
			who: "RADIO",
			text: "The payload burned a path through the storm. Follow the ash while it is still warm."
		},
		{
			who: "HONEY BUN",
			text: "Oh look! The birds left the idle air control valve in the cage! Put that in the van and come save me! I even gift-wrapped the warning."
		},
		{
			who: "GOBLIN",
			text: "These birds are modded, and the firmware feels familiar. It feels like his."
		},
		{
			who: "GROK-9",
			text: "Stay high or cook. The coolant is not a gift, no matter how he phrases it."
		},
		{
			who: "HONEY BUN",
			text: "The technician listens when I talk. So do you. Please keep doing that."
		},
		{
			who: "BOSS",
			text: "D. Parrot says the warning was real. So was the trap. Take the seed anyway."
		}
	],
	[
		{
			who: "GOBLIN",
			text: "Hurry, Grok! I have run this path a gazillion times. The fuel pump relay is in the cage. It is always in the cage."
		},
		{
			who: "GOBLIN",
			text: "We already ran this canyon. I remember dying in a way that was honestly funny."
		},
		{
			who: "GROK-9",
			text: "A version of us missed that jump. This version is not going to."
		},
		{
			who: "HONEY BUN",
			text: "There are two paths, and they end in the same place. Pick the nicer scenery."
		},
		{
			who: "RADIO",
			text: "These are disasters you remember surviving. Survive them again."
		},
		{
			who: "HONEY BUN",
			text: "Oh look! The birds left the fuel pump relay in the cage! Put that in the van and come save me! A previous you already found it. Find it again."
		},
		{
			who: "HONEY BUN",
			text: "The birds that already died here remember you too. Be polite, and do not wave."
		},
		{
			who: "GROK-9",
			text: "It is the same water and a different us. Keep climbing."
		},
		{
			who: "RADIO",
			text: "Time folds at the nest. Owl Corina is waiting, and he has already seen this rescue fail."
		},
		{
			who: "BOSS",
			text: "Owl Corina remembers a rescue that never finished. He is not surprised to see the hood open."
		}
	],
	[
		{
			who: "GOBLIN",
			text: "The birds took the oxygen sensor and left a receipt in crumbs. Chase first. Lecture later."
		},
		{
			who: "GOBLIN",
			text: "Everything helpful costs a trap. That is the sticker, and it is not a metaphor."
		},
		{
			who: "GROK-9",
			text: "He sold us a black-market flight path. The route is real. The receipt is the ambush."
		},
		{
			who: "HONEY BUN",
			text: "The shields are in the crates. Do not open the bottom one."
		},
		{
			who: "RADIO",
			text: "The market hides inside the weather. Keep your receipt."
		},
		{
			who: "HONEY BUN",
			text: "Oh look! The birds left the oxygen sensor in the cage! Put that in the van and come save me! I negotiated the price down to a detour."
		},
		{
			who: "HONEY BUN",
			text: "The mercenary birds were paid in crumbs. They were my crumbs. I am sorry, and also welcome."
		},
		{
			who: "GROK-9",
			text: "The flood is closing time. Do not buy anything that is already wet."
		},
		{
			who: "RADIO",
			text: "This is fence territory. He will sell you the next signal, and he will sell the ambush with it."
		},
		{
			who: "BOSS",
			text: "Professor Pigeon takes cash, chaos, and thank-yous. The van part was extra."
		}
	],
	[
		{
			who: "GOBLIN",
			text: "Aw man, they got the starter solenoid! Quick, before the trap canyon makes us thank them for it."
		},
		{
			who: "GOBLIN",
			text: "Our footsteps triggered the second gift. That is design, not luck."
		},
		{
			who: "GROK-9",
			text: "These platforms want us standing on them. Rude, but useful."
		},
		{
			who: "HONEY BUN",
			text: "Those are Blue Heron signature spikes. I circled the gaps for you."
		},
		{
			who: "RADIO",
			text: "You cannot see the tripwires. I can. Mostly."
		},
		{
			who: "HONEY BUN",
			text: "Oh look! The birds left the starter solenoid in the cage! Put that in the van and come save me! The first gift was free. This one is the van."
		},
		{
			who: "HONEY BUN",
			text: "They die too easily. That is the point. Keep shooting."
		},
		{
			who: "GROK-9",
			text: "The water seals the exits, so do not look for an exit. Advance."
		},
		{
			who: "RADIO",
			text: "This is a showroom of ways to die usefully. Take the seed and do not browse."
		},
		{
			who: "BOSS",
			text: "Blue Heron thanks Honey Bun for the testers. The hood is open again."
		}
	],
	[
		{
			who: "GOBLIN",
			text: "The shield is up. The catalytic converter is still in the cage. That one left before we locked the van."
		},
		{
			who: "GOBLIN",
			text: "His voice skips like a bad disk, and he is still saying thank you."
		},
		{
			who: "GROK-9",
			text: "The cables look like icing. Do not lick the core."
		},
		{
			who: "RADIO",
			text: "Handler colors are in the rock. Pink means we are close."
		},
		{
			who: "HONEY BUN",
			text: "I cut the lights to help you. Or to hide you. Deploy anyway."
		},
		{
			who: "HONEY BUN",
			text: "Oh look! The birds left the catalytic converter in the cage! Put that in the van and come save me! The signal is almost honest. The part is real."
		},
		{
			who: "RADIO",
			text: "This is the Seagull's personal flock. They do not blink."
		},
		{
			who: "GROK-9",
			text: "There is pink neon in the water. It is pretty, it is lethal, and it is classic."
		},
		{
			who: "HONEY BUN",
			text: "This is the last door before the farm. I left it unlocked for you."
		},
		{
			who: "BOSS",
			text: "The Seagull holds the smell. Honey Bun holds the smile. The shield is already up."
		}
	],
	[
		{
			who: "GOBLIN",
			text: "No keys here. They must be further down the line. Quick Grok! No time to waste!"
		},
		{
			who: "GOBLIN",
			text: "The power we earned and the power they planted are the same color. I hate that."
		},
		{
			who: "HONEY BUN",
			text: "The crumbs are singing in ten colors. Isn't that nice?"
		},
		{
			who: "GROK-9",
			text: "The farm is defending its crop. We are the crop."
		},
		{
			who: "RADIO",
			text: "Every palette is on at once. Do not trust the pretty one."
		},
		{
			who: "HONEY BUN",
			text: "The cage is empty. I did not leave the keys. Or stay. The harvest is nicer if you stay."
		},
		{
			who: "HONEY BUN",
			text: "They do not stay dead here. I tried."
		},
		{
			who: "GROK-9",
			text: "The help is so thick it can drown you. Swim up."
		},
		{
			who: "RADIO",
			text: "A glimmer past the plateau. Goblin thinks it is the keys. It is not."
		},
		{
			who: "BOSS",
			text: "AAAHHH!!!!!"
		}
	]
];
var OP1_DEPLOY = [
	"The crumbs spell AWG, and the dune is about to give way under both of you.",
	"You landed in the cave, and the jump pad at the end is the only way back to the sky.",
	"Shoot the bridge to lower it. It will break, and it will slide you into the spikes.",
	"The gorge is needles. Shield up, because the belt at the end is already running.",
	"The belts shove you at a wall of giant broken seeds. Climb the tube they are spilling from.",
	"Climb the tube. The ridge is a giant bird cage, and the door opens after the flock is gone.",
	"Scale the wall. Shoot a cage if you want the cheer, then cross the power lines.",
	"The platforms bounce, the lines shock, and the wall at the end is the only door.",
	"The seed is early. The plateau does not end, and the portal is Don Corvone arriving.",
	"He has Honey Bun. Beat him, then get to the van. This canyon does not finish the rescue."
];
function deployLine(opId, slot) {
	if (opId === 1) return OP1_DEPLOY[slot] ?? "Follow the crumbs. Do not trust the thank-you.";
	return levelBeat(opId, slot).text;
}
function levelBeat(opId, slot) {
	return OP_BEATS[Math.max(0, Math.min(9, opId - 1))]?.[slot] ?? {
		who: "RADIO",
		text: "Crumbs ahead. Keep moving."
	};
}
function radioFor(opId, slot) {
	return formatRadio(levelBeat(opId, slot));
}
OP_BEATS[0].map(formatRadio);
function objectiveFor(level) {
	if (level.epic) return "Face Neon Chaos Manifest. The extraction will not finish clean, and the van will not leave.";
	if (level.boss) return `Defeat ${level.bossName ?? "the handler"}. Take the chaos seed. Do not expect a clean rescue.`;
	return `Collect the ${level.introPower ? POWER_META[level.introPower].name : "the power gift"}. Reach the exit this room throws you through. Survive the flock he pointed you at.`;
}
function missionFor(level) {
	const op = OPERATIONS[(level.operation ?? 1) - 1] ?? OPERATIONS[0];
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
		deploy: deployLine(op.id, slot)
	};
}
function collectBeat(kind) {
	const name = POWER_META[kind].name;
	return {
		who: "HONEY BUN",
		text: {
			health: `${name} is unlocked. Do not waste the extra heart. I packed it myself.`,
			stamina: `${name} is unlocked. Run when I say run.`,
			ammo: `${name} is unlocked. The birds hate volume, so use it.`,
			shield: `${name} is unlocked. The next drop is not weather.`,
			homing: `${name} is unlocked. These shots love you back.`,
			overload: `${name} is unlocked. Double the gift, and double the noise.`,
			rapid: `${name} is unlocked. Faster thanks, faster fire.`,
			zapper: `${name} is unlocked. Hug the flock. Politely.`,
			slowmo: `${name} is unlocked. Time is a pastry thing. Use it on the long walk.`
		}[kind]
	};
}
function chaosBeat(id, epic) {
	if (epic) return {
		who: "HONEY BUN",
		text: `${CHAOS_META[id].name} chaos seed is locked. Thank you for coming. The farm stays open, and the keys are gone.`
	};
	return {
		who: "HONEY BUN",
		text: `${CHAOS_META[id].name} chaos seed is locked. The next signal is ready, and so is the next missing part.`
	};
}
function winCopy(level, lastChaos) {
	const op = OPERATIONS[(level.operation ?? 1) - 1] ?? OPERATIONS[0];
	if (level.epic) return {
		title: "The Farm Remembers",
		body: `Neon Chaos recedes. Honey Bun thanks you. The extraction does not finish, and the birds take the keys. ${lastChaos ? CHAOS_META[lastChaos].name + " seed taken. " : ""}The van does not leave. The question stays open.`
	};
	if (level.boss) {
		const laugh = op.id === 1 ? "Don Corvone laughs. Sorry, your Honey Bun is in another canyon!" : `${level.bossName ?? op.boss} goes down laughing. The hood is already open.`;
		const sting = vanSting(op.id).map((b) => `${b.who}: “${b.text}”`).join(" ");
		return {
			title: `${level.bossName ?? op.boss} Down`,
			body: `${lastChaos ? CHAOS_META[lastChaos].name + " chaos seed locked in. " : ""}${laugh} ${sting}`
		};
	}
	const beat = levelBeat(op.id, (level.id - 1) % 10);
	return {
		title: "Canyon Cleared",
		body: `${beat.who}: “${beat.text}” The room throws you forward. Do not get comfortable.`
	};
}
/**
* Chunk-based level generator — unique deterministic stages, not template clones.
* Each level is assembled from authored chunks (start → beats → setpiece → finish).
*/
function stampForm(p, theme) {
	if (p.form) return p;
	if (p.kind === "oneway") return {
		...p,
		form: "deck"
	};
	if (p.kind === "moving") return {
		...p,
		form: "girder"
	};
	if (p.kind === "conveyor") return {
		...p,
		form: "belt"
	};
	if (p.kind === "hazard") return {
		...p,
		form: "tooth"
	};
	if (p.kind === "spring" || p.kind === "checkpoint" || p.kind === "goal") return p;
	if (p.h >= 72) {
		if (theme === "vertical" || theme === "hq") return {
			...p,
			form: "pillar"
		};
		if (theme === "boss") return {
			...p,
			form: "hex"
		};
		return {
			...p,
			form: "mesa"
		};
	}
	const map = {
		dunes: p.w > 220 ? "mesa" : "slab",
		storm: "wreck",
		bridges: "deck",
		spikes: "tooth",
		vertical: "girder",
		hq: "panel",
		boss: "hex"
	};
	return {
		...p,
		form: map[theme] ?? "slab"
	};
}
function stampAll(plats, theme) {
	return plats.map((p) => stampForm(p, theme));
}
/** Per-level silhouette kits so Op 1 stages don't all share mesa+pillar. */
var SLOT_FORMS = [
	[
		"mesa",
		"steps",
		"slab"
	],
	[
		"bowl",
		"mushroom",
		"mesa"
	],
	[
		"cantilever",
		"pillar",
		"arch"
	],
	[
		"tooth",
		"ramp",
		"steps"
	],
	[
		"wreck",
		"ramp",
		"bowl"
	],
	[
		"pillar",
		"steps",
		"girder"
	],
	[
		"panel",
		"hex",
		"arch"
	],
	[
		"bowl",
		"wreck",
		"arch"
	],
	[
		"hex",
		"cantilever",
		"panel"
	]
];
function paintSlotForms(plats, slot) {
	const kit = SLOT_FORMS[Math.max(0, Math.min(slot, SLOT_FORMS.length - 1))];
	let i = 0;
	return plats.map((p) => {
		if (p.kind === "oneway") return {
			...p,
			form: "deck"
		};
		if (p.kind === "conveyor") return {
			...p,
			form: "belt"
		};
		if (p.kind === "moving") return {
			...p,
			form: slot === 4 || slot === 7 ? "wreck" : "girder"
		};
		if (p.kind !== "solid") return p;
		if (p.h >= 90 && p.w <= 72) return {
			...p,
			form: "pillar"
		};
		const form = kit[i++ % kit.length];
		return {
			...p,
			form
		};
	});
}
var PLAYER_H$1 = 86;
function ground(x, y, wTiles, kind = "solid") {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 64,
		kind
	};
}
function plat(x, y, wTiles, kind = "solid") {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 44,
		kind
	};
}
function mesa(x, y, wTiles) {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 92,
		kind: "solid",
		form: "mesa"
	};
}
function pillar(x, y, wTiles, hTiles = 3) {
	return {
		x: x * 40,
		y: y * 40,
		w: Math.max(36, wTiles * 40),
		h: hTiles * 40,
		kind: "solid",
		form: "pillar"
	};
}
function deck(x, y, wTiles) {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 28,
		kind: "oneway",
		form: "deck"
	};
}
function wreck(x, y, wTiles) {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 40,
		kind: "solid",
		form: "wreck"
	};
}
function panel(x, y, wTiles) {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 36,
		kind: "solid",
		form: "panel"
	};
}
function hexDock(x, y, wTiles) {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 48,
		kind: "solid",
		form: "hex"
	};
}
function bowl(x, y, wTiles) {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 80,
		kind: "solid",
		form: "bowl"
	};
}
function stepsPlat(x, y, wTiles) {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 72,
		kind: "solid",
		form: "steps"
	};
}
function archPlat(x, y, wTiles) {
	return {
		x: x * 40,
		y: y * 40,
		w: Math.max(4, wTiles) * 40,
		h: 88,
		kind: "solid",
		form: "arch"
	};
}
function conveyor(x, y, wTiles, dir = 1, speed = 88) {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 34,
		kind: "conveyor",
		form: "belt",
		vx: dir * speed
	};
}
function sealedFloor(widthTiles, yTiles, form = "mesa") {
	return {
		x: -80,
		y: yTiles * 40,
		w: (widthTiles + 4) * 40,
		h: 260,
		kind: "solid",
		form
	};
}
function moving(x, y, wTiles, vx, range, phase = 0) {
	return {
		x: x * 40,
		y: y * 40,
		w: wTiles * 40,
		h: 42,
		kind: "moving",
		vx,
		range: range * 40,
		originX: x * 40,
		originY: y * 40,
		phase
	};
}
function spring(x, y) {
	return {
		x: x * 40,
		y: y * 40,
		w: 56,
		h: 28,
		kind: "spring"
	};
}
function spikes(x, y, wTiles) {
	return {
		x: x * 40,
		y: y * 40 + 18,
		w: wTiles * 40,
		h: 22,
		kind: "hazard"
	};
}
function checkpoint(x, y, id) {
	return {
		x: x * 40,
		y: y * 40 - 60,
		w: 28,
		h: 70,
		kind: "checkpoint",
		id,
		active: false
	};
}
function goal(x, y) {
	return {
		x: x * 40,
		y: y * 40 - 80,
		w: 40,
		h: 90,
		kind: "goal",
		id: "goal"
	};
}
function coin(x, y) {
	return {
		x: x * 40,
		y: y * 40,
		w: 22,
		h: 22
	};
}
function bird(x, y, vx, hp) {
	return {
		x: x * 40,
		y: y * 40,
		w: 48,
		h: 36,
		vx,
		vy: 0,
		hp
	};
}
function ammo(x, y, amount) {
	return {
		x: x * 40,
		y: y * 40,
		w: 28,
		h: 28,
		amount
	};
}
/** Deterministic PRNG */
function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function pick(rand, list, avoid, idOf) {
	if (list.length === 0) throw new Error("empty pick");
	if (list.length === 1) return list[0];
	let filtered = list;
	if (avoid && idOf) {
		const alt = list.filter((x) => idOf(x) !== avoid);
		if (alt.length) filtered = alt;
	}
	return filtered[Math.floor(rand() * filtered.length)];
}
function shiftContent(c, dx) {
	return {
		platforms: c.platforms.map((p) => ({
			...p,
			x: p.x + dx,
			originX: p.originX != null ? p.originX + dx : void 0
		})),
		coins: c.coins.map((o) => ({
			...o,
			x: o.x + dx
		})),
		birds: c.birds.map((b) => ({
			...b,
			x: b.x + dx
		})),
		ammo: c.ammo.map((a) => ({
			...a,
			x: a.x + dx
		})),
		seedSpot: c.seedSpot ? {
			x: c.seedSpot.x + dx,
			y: c.seedSpot.y
		} : void 0
	};
}
function joinActs(spawn, height, parts) {
	let cursor = 0;
	const platforms = [];
	const coins = [];
	const birds = [];
	const ammo = [];
	let seedSpot;
	for (const part of parts) {
		const shifted = shiftContent(part.content, cursor * 40);
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
		width: cursor * 40,
		height,
		spawn
	};
}
var CHUNKS = [
	{
		id: "start_flat",
		role: "start",
		width: 16,
		themes: [],
		build: () => ({
			platforms: [
				ground(0, 16, 16),
				plat(5, 13, 3, "oneway"),
				plat(10, 11, 3, "oneway")
			],
			coins: [
				coin(6, 12),
				coin(7, 12),
				coin(11, 10)
			],
			birds: [],
			ammo: [ammo(8, 14, 10)]
		})
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
				plat(14, 13, 3)
			],
			coins: [
				coin(5, 13),
				coin(12, 12),
				coin(15, 12)
			],
			birds: [],
			ammo: [ammo(3, 15, 10)]
		})
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
				plat(9, 12, 3, "oneway")
			],
			coins: [
				coin(4, 12),
				coin(5, 12),
				coin(10, 11)
			],
			birds: [bird(12, 10, -40, 2)],
			ammo: [ammo(7, 14, 8)]
		})
	},
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
				plat(18, 13, 3, "oneway")
			],
			coins: [
				coin(5, 12),
				coin(12, 11),
				coin(19, 12),
				coin(9, 14)
			],
			birds: [bird(10, 9, 55, 2)],
			ammo: [ammo(16, 14, 10)]
		})
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
				spring(18, 14.55)
			],
			coins: [
				coin(8, 15),
				coin(11, 12),
				coin(14, 14),
				coin(21, 15)
			],
			birds: [bird(15, 10, -60, 2), bird(22, 11, 50, 2)],
			ammo: [ammo(3, 14, 12)]
		})
	},
	{
		id: "rhythm_wave",
		role: "rhythm",
		width: 26,
		themes: [
			"dunes",
			"bridges",
			"storm"
		],
		build: () => ({
			platforms: [
				ground(0, 17, 5),
				ground(6, 15, 4),
				ground(11, 16, 5),
				ground(17, 14, 4),
				ground(22, 16, 4),
				plat(3, 14, 2, "oneway"),
				plat(13, 13, 3),
				plat(19, 12, 3, "oneway")
			],
			coins: [
				coin(7, 14),
				coin(12, 12),
				coin(18, 13),
				coin(23, 15)
			],
			birds: [bird(9, 10, 70, 3), bird(20, 9, -65, 3)],
			ammo: [ammo(14, 14, 12)]
		})
	},
	{
		id: "vert_ladder",
		role: "vertical",
		width: 14,
		themes: [
			"vertical",
			"hq",
			"bridges"
		],
		build: () => ({
			platforms: [
				ground(0, 18, 14),
				plat(2, 15, 3, "oneway"),
				plat(7, 13, 3, "oneway"),
				plat(3, 11, 3, "oneway"),
				plat(8, 9, 3, "oneway"),
				plat(4, 7, 4),
				spring(11, 17.55)
			],
			coins: [
				coin(3, 14),
				coin(8, 12),
				coin(4, 10),
				coin(9, 8),
				coin(5, 6)
			],
			birds: [bird(10, 8, -50, 3)],
			ammo: [ammo(6, 16, 12)],
			seedSpot: {
				x: 200,
				y: 200
			}
		})
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
				moving(8, 11, 3, 40, 3, 0)
			],
			coins: [
				coin(2, 14),
				coin(11, 13),
				coin(5, 11),
				coin(12, 9),
				coin(4, 7)
			],
			birds: [bird(13, 12, -55, 3)],
			ammo: [ammo(14, 16, 10)],
			seedSpot: {
				x: 160,
				y: 240
			}
		})
	},
	{
		id: "haz_spikes",
		role: "hazard",
		width: 20,
		themes: [
			"spikes",
			"hq",
			"dunes"
		],
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
				spring(17, 15.55)
			],
			coins: [
				coin(4, 12),
				coin(10, 11),
				coin(16, 12)
			],
			birds: [bird(8, 10, 70, 3)],
			ammo: [ammo(14, 14, 12)]
		})
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
				plat(14, 13, 3)
			],
			coins: [
				coin(3, 12),
				coin(9, 13),
				coin(15, 12)
			],
			birds: [bird(10, 11, -80, 3)],
			ammo: [ammo(7, 15, 10)]
		})
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
				plat(17, 12, 3, "oneway")
			],
			coins: [
				coin(4, 11),
				coin(10, 15),
				coin(18, 11)
			],
			birds: [bird(11, 12, 60, 3), bird(19, 10, -55, 3)],
			ammo: [ammo(16, 13, 12)]
		})
	},
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
				spring(13, 15.55)
			],
			coins: [
				coin(5, 12),
				coin(10, 10),
				coin(11, 10),
				coin(7, 8)
			],
			birds: [bird(12, 8, -45, 2)],
			ammo: [ammo(2, 14, 14)],
			seedSpot: {
				x: 420,
				y: 360
			}
		})
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
				plat(9, 8, 3)
			],
			coins: [
				coin(3, 13),
				coin(8, 11),
				coin(5, 9),
				coin(10, 7)
			],
			birds: [],
			ammo: [ammo(11, 15, 12)],
			seedSpot: {
				x: 400,
				y: 260
			}
		})
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
				plat(13, 9, 3, "oneway")
			],
			coins: [
				coin(12, 11),
				coin(14, 8),
				coin(15, 8)
			],
			birds: [bird(9, 10, 50, 3)],
			ammo: [ammo(3, 14, 12)],
			seedSpot: {
				x: 560,
				y: 300
			}
		})
	},
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
				plat(16, 13, 3, "oneway")
			],
			coins: [
				coin(5, 12),
				coin(11, 11),
				coin(17, 12)
			],
			birds: [
				bird(6, 9, -70, 3),
				bird(12, 8, 75, 3),
				bird(15, 10, -60, 3),
				bird(18, 7, 55, 3)
			],
			ammo: [ammo(8, 14, 16)]
		})
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
				spring(7, 15.55)
			],
			coins: [coin(4, 12), coin(12, 11)],
			birds: [
				bird(5, 9, 80, 4),
				bird(10, 8, -90, 4),
				bird(14, 10, 70, 3)
			],
			ammo: [ammo(15, 14, 14)]
		})
	},
	{
		id: "rails_dual",
		role: "rails",
		width: 22,
		themes: [
			"bridges",
			"vertical",
			"hq"
		],
		build: () => ({
			platforms: [
				ground(0, 16, 5),
				ground(17, 16, 5),
				moving(5, 14, 3, 55, 5, 0),
				moving(12, 12, 3, -50, 4, .5),
				plat(9, 10, 3, "oneway"),
				spring(19, 15.55)
			],
			coins: [
				coin(6, 13),
				coin(13, 11),
				coin(10, 9)
			],
			birds: [bird(11, 8, 60, 3)],
			ammo: [ammo(2, 14, 12)]
		})
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
				moving(10, 13, 3, -55, 5, .3),
				moving(15, 14, 3, 50, 3, .8),
				plat(8, 11, 2, "oneway")
			],
			coins: [
				coin(5, 14),
				coin(11, 12),
				coin(16, 13)
			],
			birds: [bird(12, 9, -70, 3)],
			ammo: [ammo(21, 15, 12)]
		})
	},
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
				plat(18, 12, 2)
			],
			coins: [
				coin(5, 14),
				coin(9, 12),
				coin(13, 10),
				coin(17, 11),
				coin(21, 13)
			],
			birds: [bird(10, 9, 50, 3)],
			ammo: [ammo(22, 12, 12)]
		})
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
				checkpoint(12, 12, "cp_set")
			],
			coins: [
				coin(5, 13),
				coin(11, 11),
				coin(12, 11),
				coin(18, 13)
			],
			birds: [bird(14, 8, -65, 3), bird(20, 10, 55, 3)],
			ammo: [ammo(23, 14, 14)]
		})
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
				spring(10, 15.55)
			],
			coins: [
				coin(5, 13),
				coin(9, 11),
				coin(13, 13),
				coin(16, 11)
			],
			birds: [bird(11, 9, 80, 4)],
			ammo: [ammo(19, 14, 12)]
		})
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
				moving(12, 12, 4, -60, 5, .4),
				moving(18, 14, 3, 55, 4, .9),
				plat(10, 10, 3, "oneway"),
				checkpoint(14, 12, "cp_set")
			],
			coins: [
				coin(6, 14),
				coin(13, 11),
				coin(19, 13),
				coin(11, 9)
			],
			birds: [bird(15, 8, -75, 4), bird(20, 10, 60, 3)],
			ammo: [ammo(24, 15, 16)]
		})
	},
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
				spring(12, 14.55)
			],
			coins: [
				coin(5, 12),
				coin(11, 11),
				coin(18, 11),
				coin(24, 10),
				coin(28, 15)
			],
			birds: [bird(9, 9, 60, 3), bird(22, 8, -65, 3)],
			ammo: [ammo(15, 14, 12)]
		})
	},
	{
		id: "rails_span",
		role: "rails",
		width: 30,
		themes: [
			"bridges",
			"vertical",
			"hq",
			"storm"
		],
		build: () => ({
			platforms: [
				ground(0, 16, 4),
				moving(5, 14, 4, 55, 5, 0),
				moving(12, 12, 3, -50, 5, .4),
				plat(16, 10, 3, "oneway"),
				moving(20, 13, 4, 45, 4, .8),
				ground(26, 16, 4),
				spring(24, 15.55)
			],
			coins: [
				coin(6, 13),
				coin(13, 11),
				coin(17, 9),
				coin(21, 12),
				coin(27, 15)
			],
			birds: [bird(10, 8, 70, 3), bird(22, 9, -60, 3)],
			ammo: [ammo(27, 14, 14)]
		})
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
				spring(9, 14.55)
			],
			coins: [
				coin(4, 12),
				coin(13, 11),
				coin(21, 12)
			],
			birds: [
				bird(6, 8, 80, 3),
				bird(11, 7, -75, 4),
				bird(16, 9, 70, 3),
				bird(22, 8, -65, 3)
			],
			ammo: [ammo(14, 13, 16)]
		})
	},
	{
		id: "haz_longpit",
		role: "hazard",
		width: 28,
		themes: [
			"spikes",
			"storm",
			"dunes"
		],
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
				spring(19, 14.55)
			],
			coins: [
				coin(4, 12),
				coin(10, 11),
				coin(16, 11),
				coin(22, 12)
			],
			birds: [bird(12, 9, 75, 3), bird(23, 10, -60, 3)],
			ammo: [ammo(14, 13, 12)]
		})
	},
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
				checkpoint(2, 16, "cp_end")
			],
			coins: [coin(4, 12), coin(9, 11)],
			birds: [bird(6, 10, -40, 2)],
			ammo: [ammo(5, 14, 12)]
		})
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
				checkpoint(1, 17, "cp_end")
			],
			coins: [coin(3, 13), coin(7, 11)],
			birds: [],
			ammo: [ammo(8, 15, 14)]
		})
	},
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
				moving(28, 10, 3, -50, 4, .5),
				checkpoint(2, 18, "cp_boss"),
				goal(44, 18)
			],
			coins: [
				coin(12, 12),
				coin(14, 12),
				coin(30, 12),
				coin(32, 12),
				coin(22, 9),
				coin(24, 9)
			],
			birds: [],
			ammo: [
				ammo(6, 16, 20),
				ammo(42, 16, 20),
				ammo(22, 16, 16)
			]
		})
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
				moving(30, 11, 3, -45, 4, .6),
				checkpoint(1, 18, "cp_boss"),
				goal(40, 18)
			],
			coins: [
				coin(8, 14),
				coin(16, 11),
				coin(28, 11),
				coin(20, 8)
			],
			birds: [],
			ammo: [
				ammo(5, 16, 20),
				ammo(38, 16, 20),
				ammo(21, 16, 18)
			]
		})
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
				moving(30, 10, 3, -55, 5, .5),
				checkpoint(2, 18, "cp_boss"),
				goal(46, 18)
			],
			coins: [
				coin(6, 13),
				coin(13, 11),
				coin(23, 13),
				coin(33, 11),
				coin(41, 13)
			],
			birds: [],
			ammo: [
				ammo(4, 16, 22),
				ammo(24, 16, 18),
				ammo(44, 16, 22)
			]
		})
	}
];
function byRole(role, theme) {
	const all = CHUNKS.filter((c) => c.role === role);
	const themed = all.filter((c) => !c.themes.length || c.themes.includes(theme));
	return themed.length ? themed : all;
}
var THEME_BY_SLOT = [
	"dunes",
	"dunes",
	"bridges",
	"spikes",
	"storm",
	"vertical",
	"hq",
	"storm",
	"hq",
	"boss"
];
/** Role sequence for regular levels — always includes shrine + setpiece */
function rolePlan(slot) {
	const plans = [
		[
			"start",
			"rhythm",
			"rhythm",
			"shrine",
			"rhythm",
			"hazard",
			"rhythm",
			"finish"
		],
		[
			"start",
			"rhythm",
			"ambush",
			"rhythm",
			"shrine",
			"rails",
			"rhythm",
			"ambush",
			"finish"
		],
		[
			"start",
			"rails",
			"rhythm",
			"shrine",
			"setpiece",
			"rhythm",
			"rails",
			"rhythm",
			"finish"
		],
		[
			"start",
			"hazard",
			"rhythm",
			"shrine",
			"ambush",
			"rhythm",
			"hazard",
			"setpiece",
			"finish"
		],
		[
			"start",
			"rhythm",
			"rails",
			"setpiece",
			"shrine",
			"rhythm",
			"rails",
			"hazard",
			"finish"
		],
		[
			"start",
			"vertical",
			"rhythm",
			"shrine",
			"setpiece",
			"vertical",
			"rhythm",
			"rails",
			"finish"
		],
		[
			"start",
			"ambush",
			"rails",
			"hazard",
			"shrine",
			"ambush",
			"rhythm",
			"setpiece",
			"finish"
		],
		[
			"start",
			"rhythm",
			"hazard",
			"setpiece",
			"shrine",
			"ambush",
			"rhythm",
			"hazard",
			"rails",
			"finish"
		],
		[
			"start",
			"rails",
			"vertical",
			"ambush",
			"shrine",
			"setpiece",
			"rhythm",
			"rails",
			"hazard",
			"finish"
		]
	];
	return plans[Math.min(slot, plans.length - 1)];
}
function assembleFromChunks(levelId, opIdx, slot, theme, roles) {
	const rand = rng(levelId * 7919 + opIdx * 104729 + slot * 13 + 42);
	const scale = 1 + opIdx * .12;
	let cursor = 0;
	const platforms = [];
	const coins = [];
	const birds = [];
	const ammo = [];
	let seedSpot;
	let lastId = "";
	let spawnY = 554;
	let maxY = 800;
	roles.forEach((role, ri) => {
		const pool = byRole(role, theme);
		const chunk = pick(rand, pool, lastId, (c) => c.id);
		lastId = chunk.id;
		const shifted = shiftContent(chunk.build(), cursor * 40);
		if (ri > 0 && ri < roles.length - 1 && ri % 2 === 1 && role !== "finish") {
			const preferX = cursor * 40 + Math.max(80, chunk.width * 40 * .35);
			let best = null;
			let bestS = Infinity;
			for (const p of shifted.platforms) {
				if (p.kind !== "solid" && p.kind !== "oneway" && p.kind !== "moving") continue;
				if (p.w < 48) continue;
				const mid = p.x + p.w * .5;
				const s = Math.abs(mid - preferX) + p.y * .02;
				if (s < bestS) {
					best = p;
					bestS = s;
				}
			}
			if (best) platforms.push(checkpoint((best.x + best.w * .45) / 40, best.y / 40, `cp_${ri}`));
		}
		platforms.push(...shifted.platforms);
		coins.push(...shifted.coins);
		birds.push(...shifted.birds.map((b) => ({
			...b,
			hp: Math.max(2, Math.round(b.hp * scale)),
			vx: b.vx * (1 + opIdx * .08) * (slot % 2 === 0 ? 1 : -1)
		})));
		ammo.push(...shifted.ammo);
		if (shifted.seedSpot) seedSpot = shifted.seedSpot;
		if (ri === 0) {
			const floor = shifted.platforms.find((p) => p.kind === "solid" && p.x < cursor * 40 + 200);
			if (floor) spawnY = floor.y - PLAYER_H$1;
		}
		for (const p of shifted.platforms) maxY = Math.max(maxY, p.y + p.h + 200);
		cursor += chunk.width;
	});
	if (opIdx > 0 && birds.length > 0) {
		const b0 = birds[0];
		birds.push({
			...b0,
			x: b0.x + 160,
			hp: Math.round(3 * scale),
			vx: -b0.vx
		});
	}
	return {
		platforms,
		coins,
		birds,
		ammo,
		seedSpot,
		width: cursor * 40,
		height: Math.max(800, Math.ceil(maxY / 40) * 40),
		spawn: {
			x: 80,
			y: spawnY
		}
	};
}
/**
* Op 1 only — ten authored stages with different spatial grammar.
* Later operations still use the chunk assembler + stamped silhouettes.
*/
function mapDuneRises() {
	const T = 40;
	const W = 96;
	return joinActs({
		x: 80,
		y: 554
	}, 880, [{
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
				goal(92, 16)
			],
			coins: [
				coin(6, 15),
				coin(14, 13),
				coin(24, 11),
				coin(34, 11),
				coin(42, 13),
				coin(52, 15),
				coin(60, 12),
				coin(70, 10),
				coin(88, 15)
			],
			birds: [bird(28, 9, 50, 2), bird(62, 10, -55, 3)],
			ammo: [ammo(8, 14, 12), ammo(78, 12, 12)],
			seedSpot: {
				x: 2800,
				y: 9.4 * T
			}
		}
	}]);
}
function mapCaveDip() {
	const T = 40;
	const W = 88;
	return joinActs({
		x: 80,
		y: 554
	}, 960, [{
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
				goal(85, 16)
			],
			coins: [
				coin(10, 13),
				coin(18, 8),
				coin(34, 16),
				coin(51, 12),
				coin(66, 7),
				coin(80, 15)
			],
			birds: [
				bird(26, 9, 55, 3),
				bird(46, 14, -50, 3),
				bird(68, 7, 60, 3)
			],
			ammo: [ammo(12, 13, 12), ammo(58, 12, 12)],
			seedSpot: {
				x: 2640,
				y: 6.5 * T
			}
		}
	}]);
}
function mapBeltPlateau() {
	return joinActs({
		x: 80,
		y: 554
	}, 880, [{
		width: 90,
		content: {
			platforms: [
				{
					x: -80,
					y: 640,
					w: 3760,
					h: 260,
					kind: "conveyor",
					form: "belt",
					vx: 78
				},
				deck(8, 13, 4),
				conveyor(16, 12, 5, -1, 70),
				moving(26, 11, 4, 42, 3, .2),
				deck(36, 13, 4),
				conveyor(44, 10, 5, 1, 95),
				moving(54, 12, 4, 40, 3, .8),
				deck(64, 13, 4),
				conveyor(72, 11, 5, -1, 80),
				spring(22, 15.55),
				checkpoint(18, 12, "cp1"),
				checkpoint(45, 10, "cp2"),
				checkpoint(73, 11, "cp3"),
				goal(86, 16)
			],
			coins: [
				coin(9, 12),
				coin(17, 11),
				coin(27, 10),
				coin(45, 9),
				coin(65, 12),
				coin(74, 10)
			],
			birds: [
				bird(20, 8, 60, 3),
				bird(48, 7, -65, 3),
				bird(70, 8, 55, 3)
			],
			ammo: [ammo(10, 12, 12), ammo(56, 11, 12)],
			seedSpot: {
				x: 1800,
				y: 336
			}
		}
	}]);
}
function mapDescender() {
	return joinActs({
		x: 80,
		y: 74
	}, 1440, [{
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
				goal(19, 32)
			],
			coins: [
				coin(9, 5),
				coin(4, 8),
				coin(11, 10),
				coin(12, 15),
				coin(5, 18),
				coin(11, 21),
				coin(6, 24)
			],
			birds: [
				bird(16, 8, -50, 3),
				bird(8, 18, 55, 3),
				bird(16, 26, -60, 3)
			],
			ammo: [ammo(2, 3, 14), ammo(3, 29, 12)],
			seedSpot: {
				x: 440,
				y: 576
			}
		}
	}]);
}
function mapFlatPlateau() {
	const T = 40;
	const W = 80;
	return joinActs({
		x: 80,
		y: 554
	}, 800, [{
		width: W,
		content: {
			platforms: [
				sealedFloor(W, 16, "slab"),
				checkpoint(20, 16, "cp1"),
				checkpoint(40, 16, "cp2"),
				checkpoint(60, 16, "cp3"),
				goal(76, 16)
			],
			coins: [
				coin(8, 15),
				coin(16, 15),
				coin(24, 15),
				coin(32, 15),
				coin(48, 15),
				coin(56, 15),
				coin(68, 15)
			],
			birds: [
				bird(18, 10, 70, 3),
				bird(38, 8, -75, 3),
				bird(58, 10, 70, 3)
			],
			ammo: [ammo(12, 15, 14), ammo(52, 15, 14)],
			seedSpot: {
				x: 1600,
				y: 14.4 * T
			}
		}
	}]);
}
function buildSignatureOp1(slot) {
	if (slot === 9) return null;
	if (slot === 0) return mapDuneRises();
	if (slot === 1) return mapCaveDip();
	if (slot === 4) return mapBeltPlateau();
	if (slot === 6) return mapDescender();
	if (slot === 7) return mapFlatPlateau();
	const T = 40;
	const make = [
		() => joinActs({
			x: 80,
			y: 594
		}, 880, [
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
						checkpoint(11, 16, "cp1")
					],
					coins: [
						coin(5, 13),
						coin(13, 12),
						coin(20, 11),
						coin(26, 15)
					],
					birds: [],
					ammo: [ammo(7, 15, 10)]
				}
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
						checkpoint(16, 15, "cp2")
					],
					coins: [
						coin(4, 15),
						coin(9, 13),
						coin(19, 10),
						coin(24, 12),
						coin(30, 15)
					],
					birds: [bird(12, 10, 50, 2)],
					ammo: [ammo(10, 13, 12)],
					seedSpot: {
						x: 960,
						y: 440
					}
				}
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
						goal(28, 15)
					],
					coins: [
						coin(5, 12),
						coin(13, 11),
						coin(21, 11),
						coin(25, 14)
					],
					birds: [bird(14, 9, -45, 2)],
					ammo: [ammo(9, 14, 10)]
				}
			}
		]),
		() => joinActs({
			x: 80,
			y: 594
		}, 880, [
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
						checkpoint(16, 17, "cp1")
					],
					coins: [
						coin(9, 14),
						coin(13, 11),
						coin(24, 13),
						coin(31, 15)
					],
					birds: [bird(11, 11, 50, 2), bird(26, 10, -55, 2)],
					ammo: [ammo(16, 15, 12)]
				}
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
						checkpoint(15, 16, "cp2")
					],
					coins: [
						coin(8, 13),
						coin(15, 15),
						coin(23, 12),
						coin(30, 14)
					],
					birds: [bird(10, 9, 60, 2), bird(25, 8, -60, 3)],
					ammo: [ammo(8, 13, 12)],
					seedSpot: {
						x: 920,
						y: 440
					}
				}
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
						goal(29, 15)
					],
					coins: [
						coin(4, 15),
						coin(9, 13),
						coin(16, 15),
						coin(25, 14)
					],
					birds: [bird(18, 10, 55, 2)],
					ammo: [ammo(24, 13, 12)]
				}
			}
		]),
		() => joinActs({
			x: 1.5 * T,
			y: 634
		}, 880, [
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
						checkpoint(14, 12, "cp1")
					],
					coins: [
						coin(7, 13),
						coin(15, 11),
						coin(18, 9),
						coin(26, 10),
						coin(31, 8)
					],
					birds: [bird(18, 7, 70, 3), bird(28, 7, -60, 3)],
					ammo: [ammo(13, 16, 12)]
				}
			},
			{
				width: 36,
				content: {
					platforms: [
						mesa(0, 17, 4),
						deck(5, 13, 5),
						pillar(11, 11, 1.1, 8),
						deck(13, 11, 5),
						moving(19, 9, 3, 45, 5, .3),
						pillar(26, 10, 1.1, 8),
						deck(28, 10, 5),
						mesa(34, 16, 2),
						spring(3, 16.55),
						checkpoint(14, 11, "cp2")
					],
					coins: [
						coin(6, 12),
						coin(15, 10),
						coin(21, 8),
						coin(29, 9)
					],
					birds: [bird(17, 6, 65, 3), bird(30, 6, -70, 3)],
					ammo: [ammo(8, 15, 12)],
					seedSpot: {
						x: 1160,
						y: 320
					}
				}
			},
			{
				width: 34,
				content: {
					platforms: [
						mesa(0, 16, 4),
						deck(5, 12, 5),
						pillar(11, 10, 1.2, 8),
						deck(13, 9, 5),
						moving(19, 11, 3, -50, 4, .6),
						deck(25, 12, 4),
						mesa(30, 17, 4),
						checkpoint(14, 9, "cp3"),
						goal(32, 17)
					],
					coins: [
						coin(6, 11),
						coin(15, 8),
						coin(21, 10),
						coin(26, 11)
					],
					birds: [bird(17, 5, 70, 3)],
					ammo: [ammo(7, 14, 12)]
				}
			}
		]),
		() => joinActs({
			x: 80,
			y: 554
		}, 880, [
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
						checkpoint(15, 15, "cp1")
					],
					coins: [
						coin(5, 12),
						coin(11, 11),
						coin(17, 11),
						coin(22, 12)
					],
					birds: [bird(12, 9, 75, 3)],
					ammo: [ammo(9, 14, 12)]
				}
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
						checkpoint(16, 16, "cp2")
					],
					coins: [
						coin(4, 12),
						coin(13, 11),
						coin(21, 11),
						coin(23, 13)
					],
					birds: [bird(10, 9, -70, 3), bird(24, 10, 60, 3)],
					ammo: [ammo(8, 13, 12)],
					seedSpot: {
						x: 840,
						y: 400
					}
				}
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
						goal(26, 15)
					],
					coins: [
						coin(5, 12),
						coin(12, 11),
						coin(18, 15),
						coin(23, 14)
					],
					birds: [bird(14, 9, 65, 3)],
					ammo: [ammo(10, 13, 12)]
				}
			}
		]),
		() => joinActs({
			x: 80,
			y: 594
		}, 880, [
			{
				width: 40,
				content: {
					platforms: [
						wreck(0, 17, 6),
						wreck(8, 15, 4),
						moving(13, 14, 4, 55, 4, .4),
						wreck(20, 16, 4),
						wreck(26, 13, 3),
						moving(30, 12, 3, 40, 3, 1.2),
						wreck(36, 16, 4),
						deck(6, 13, 3),
						spring(24, 15.55),
						checkpoint(21, 16, "cp1")
					],
					coins: [
						coin(9, 14),
						coin(15, 13),
						coin(27, 12),
						coin(32, 11)
					],
					birds: [bird(16, 10, 80, 3), bird(33, 8, -70, 3)],
					ammo: [ammo(11, 13, 12)]
				}
			},
			{
				width: 36,
				content: {
					platforms: [
						wreck(0, 16, 5),
						wreck(7, 14, 4),
						moving(12, 13, 4, 50, 4, .2),
						wreck(19, 15, 4),
						wreck(25, 12, 3),
						moving(29, 14, 3, -45, 3, .7),
						wreck(33, 16, 3),
						deck(4, 12, 3),
						spring(24, 11.55),
						checkpoint(20, 15, "cp2")
					],
					coins: [
						coin(8, 13),
						coin(14, 12),
						coin(26, 11),
						coin(30, 13)
					],
					birds: [bird(15, 9, 70, 3), bird(28, 8, -65, 3)],
					ammo: [ammo(9, 13, 12)],
					seedSpot: {
						x: 1040,
						y: 400
					}
				}
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
						goal(30, 15)
					],
					coins: [
						coin(5, 11),
						coin(14, 12),
						coin(22, 15),
						coin(27, 14)
					],
					birds: [bird(16, 9, 60, 3)],
					ammo: [ammo(8, 13, 12)]
				}
			}
		]),
		() => joinActs({
			x: 80,
			y: 1034
		}, 1360, [
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
						checkpoint(9, 22, "cp1")
					],
					coins: [
						coin(5, 24),
						coin(10, 21),
						coin(4, 19),
						coin(9, 16)
					],
					birds: [bird(7, 18, -50, 3)],
					ammo: [ammo(2, 26, 14)]
				}
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
						checkpoint(10, 4, "cp3")
					],
					coins: [
						coin(4, 13),
						coin(9, 11),
						coin(5, 9),
						coin(10, 7),
						coin(4, 5),
						coin(11, 3)
					],
					birds: [bird(12, 9, 55, 3), bird(6, 5, -50, 3)],
					ammo: [ammo(2, 26, 10)],
					seedSpot: {
						x: 400,
						y: 2.4 * T
					}
				}
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
						goal(20, 12)
					],
					coins: [
						coin(6, 5),
						coin(12, 4),
						coin(17, 6)
					],
					birds: [bird(14, 2, 60, 3)],
					ammo: [ammo(8, 4, 12)]
				}
			}
		]),
		() => joinActs({
			x: 80,
			y: 634
		}, 880, [
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
						checkpoint(14, 14, "cp1")
					],
					coins: [
						coin(8, 15),
						coin(14, 13),
						coin(16, 9),
						coin(25, 12)
					],
					birds: [
						bird(10, 10, 70, 3),
						bird(20, 8, -75, 3),
						bird(26, 10, 60, 3)
					],
					ammo: [ammo(4, 16, 14)]
				}
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
						checkpoint(13, 13, "cp2")
					],
					coins: [
						coin(7, 14),
						coin(13, 12),
						coin(16, 8),
						coin(27, 15)
					],
					birds: [
						bird(9, 8, 75, 3),
						bird(18, 7, -80, 3),
						bird(24, 10, 65, 3)
					],
					ammo: [ammo(5, 15, 14)],
					seedSpot: {
						x: 640,
						y: 7.5 * T
					}
				}
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
						goal(28, 16)
					],
					coins: [
						coin(7, 13),
						coin(13, 10),
						coin(19, 12),
						coin(25, 15)
					],
					birds: [bird(15, 8, 70, 3)],
					ammo: [ammo(8, 12, 12)]
				}
			}
		]),
		() => joinActs({
			x: 80,
			y: 634
		}, 880, [
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
						checkpoint(13, 18, "cp1")
					],
					coins: [
						coin(4, 13),
						coin(11, 11),
						coin(18, 10),
						coin(24, 12)
					],
					birds: [bird(14, 14, 55, 3), bird(22, 9, -65, 3)],
					ammo: [ammo(7, 16, 12)]
				}
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
						moving(17, 10, 3, 40, 3, .4),
						deck(22, 12, 4),
						spring(8, 15.55),
						checkpoint(13, 18, "cp2")
					],
					coins: [
						coin(5, 12),
						coin(12, 10),
						coin(18, 9),
						coin(23, 11)
					],
					birds: [bird(15, 13, 60, 3), bird(24, 8, -70, 3)],
					ammo: [ammo(7, 15, 12)],
					seedSpot: {
						x: 720,
						y: 8.5 * T
					}
				}
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
						goal(28, 17)
					],
					coins: [
						coin(5, 13),
						coin(13, 11),
						coin(21, 12),
						coin(25, 16)
					],
					birds: [bird(14, 10, 55, 3)],
					ammo: [ammo(9, 16, 12)]
				}
			}
		]),
		() => joinActs({
			x: 80,
			y: 634
		}, 880, [
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
						checkpoint(25, 10, "cp2")
					],
					coins: [
						coin(7, 15),
						coin(15, 13),
						coin(21, 11),
						coin(26, 9),
						coin(33, 11)
					],
					birds: [
						bird(16, 10, 80, 4),
						bird(27, 7, -80, 4),
						bird(35, 9, 70, 3)
					],
					ammo: [ammo(4, 16, 16), ammo(32, 14, 12)]
				}
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
						checkpoint(19, 9, "cp3")
					],
					coins: [
						coin(6, 13),
						coin(13, 11),
						coin(20, 8),
						coin(27, 10),
						coin(32, 13)
					],
					birds: [bird(15, 8, 75, 4), bird(28, 7, -75, 4)],
					ammo: [ammo(7, 12, 14)],
					seedSpot: {
						x: 800,
						y: 7.5 * T
					}
				}
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
						goal(30, 16)
					],
					coins: [
						coin(7, 11),
						coin(15, 9),
						coin(21, 13),
						coin(27, 15)
					],
					birds: [bird(16, 6, 80, 4), bird(24, 10, -70, 3)],
					ammo: [ammo(8, 13, 14)]
				}
			}
		])
	][slot];
	return make ? make() : null;
}
function pickChaosSpot(plats, width, avoid) {
	const solids = plats.filter((p) => p.kind === "solid" || p.kind === "oneway" || p.kind === "moving");
	const cps = plats.filter((p) => p.kind === "checkpoint").sort((a, b) => a.x - b.x);
	const targetX = cps.length >= 2 ? cps[1].x + 48 : width * .58;
	let best = solids[0];
	let bestD = 1e9;
	for (const p of solids) {
		if (p.w < 40) continue;
		const cx = p.x + p.w * .5;
		let d = Math.abs(cx - targetX);
		if (avoid && Math.hypot(cx - avoid.x, p.y - avoid.y) < 80) d += 200;
		if (d < bestD) {
			bestD = d;
			best = p;
		}
	}
	if (!best) return {
		x: width * .55,
		y: 220
	};
	return {
		x: best.x + best.w * .5 - 18,
		y: best.y - 52
	};
}
function withChaosGem(L) {
	const id = seedForLevel(L.id);
	const avoid = L.seeds?.[0];
	const spot = pickChaosSpot(L.platforms, L.width, avoid);
	L.chaosId = id;
	L.chaosGem = {
		x: spot.x,
		y: spot.y,
		w: 36,
		h: 36,
		id
	};
	return L;
}
function buildLevel(opIdx, slot) {
	const op = OPERATIONS[opIdx];
	const levelId = opIdx * 10 + slot + 1;
	const [name, subtitle] = op.levelNames[slot];
	const themeBase = THEME_BY_SLOT[slot];
	const themes = [
		"dunes",
		"bridges",
		"spikes",
		"storm",
		"vertical",
		"hq"
	];
	const theme = slot === 9 ? "boss" : themes[(themes.indexOf(themeBase) + opIdx) % themes.length] ?? themeBase;
	const power = powerForSlot(op.id, slot);
	const radio = radioFor(op.id, slot);
	if (slot === 9) {
		const bossChunk = pick(rng(levelId * 99991), byRole("boss", "boss"));
		const content = bossChunk.build();
		return {
			id: levelId,
			name,
			subtitle,
			width: bossChunk.width * 40,
			height: 800,
			spawn: {
				x: 160,
				y: 634
			},
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
			epic: opIdx === 9
		};
	}
	const assembled = opIdx === 0 ? buildSignatureOp1(slot) ?? assembleFromChunks(levelId, opIdx, slot, theme, rolePlan(slot)) : assembleFromChunks(levelId, opIdx, slot, theme, rolePlan(slot));
	assembled.platforms = paintSlotForms(stampAll(assembled.platforms, theme), slot);
	const seeds = [];
	if (assembled.seedSpot) seeds.push({
		x: assembled.seedSpot.x - 14,
		y: assembled.seedSpot.y - 14,
		w: 56,
		h: 56,
		kind: power
	});
	else if (assembled.coins.length) {
		const c = assembled.coins[Math.floor(assembled.coins.length / 2)];
		seeds.push({
			x: c.x - 14,
			y: c.y - 48,
			w: 56,
			h: 56,
			kind: power
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
		epic: false
	};
}
var CAMPAIGN = (() => {
	const out = [];
	for (let op = 0; op < 10; op++) for (let slot = 0; slot < 10; slot++) out.push(withChaosGem(buildLevel(op, slot)));
	return out;
})();
var GAME_CODES = /* @__PURE__ */ new Set([
	"ArrowLeft",
	"ArrowRight",
	"ArrowUp",
	"ArrowDown",
	"KeyA",
	"KeyD",
	"KeyW",
	"KeyS",
	"Space",
	"KeyJ",
	"KeyK",
	"KeyZ",
	"KeyX",
	"KeyC",
	"KeyQ",
	"KeyE",
	"KeyR",
	"KeyL",
	"ShiftLeft",
	"ShiftRight",
	"Escape",
	"KeyP",
	"Enter"
]);
var InputManager = class {
	keys = /* @__PURE__ */ new Set();
	prev = /* @__PURE__ */ new Set();
	touch = {};
	/** Active pointer ids holding each axis — multi-touch safe */
	touchPointers = /* @__PURE__ */ new Map();
	bound = false;
	lockUntil = 0;
	bind() {
		if (this.bound || typeof window === "undefined") return;
		this.bound = true;
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
		window.addEventListener("blur", this.clear);
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState !== "visible") this.clear();
		});
	}
	unbind() {
		if (!this.bound) return;
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		window.removeEventListener("blur", this.clear);
		this.bound = false;
	}
	onKeyDown = (e) => {
		if (GAME_CODES.has(e.code)) e.preventDefault();
		this.keys.add(e.code);
	};
	onKeyUp = (e) => {
		this.keys.delete(e.code);
	};
	clear = () => {
		this.keys.clear();
		this.prev = /* @__PURE__ */ new Set();
		this.touch = {};
		this.touchPointers.clear();
	};
	lockFor(ms) {
		this.lockUntil = performance.now() + ms;
		this.clear();
	}
	/** Multi-touch: hold an axis with a specific pointer id */
	holdTouch(axis, pointerId, held) {
		let set = this.touchPointers.get(axis);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			this.touchPointers.set(axis, set);
		}
		if (held) set.add(pointerId);
		else set.delete(pointerId);
		this.touch[axis] = set.size > 0;
	}
	setTouch(partial) {
		Object.assign(this.touch, partial);
	}
	poll() {
		if (performance.now() < this.lockUntil) {
			this.prev = new Set(this.keys);
			return {
				left: false,
				right: false,
				up: false,
				jump: false,
				jumpPressed: false,
				fire: false,
				firePressed: false,
				weaponNext: false,
				weaponPrev: false,
				weaponPick: void 0,
				pause: false,
				shield: false
			};
		}
		const k = this.keys;
		const t = this.touch;
		const left = k.has("ArrowLeft") || k.has("KeyA") || !!t.left;
		const right = k.has("ArrowRight") || k.has("KeyD") || !!t.right;
		const up = k.has("ArrowUp") || k.has("KeyW") || !!t.up;
		const jumpHeld = k.has("Space") || k.has("KeyW") || k.has("ArrowUp") || k.has("KeyK") || !!t.jump;
		const fireHeld = k.has("KeyJ") || k.has("KeyZ") || k.has("KeyX") || !!t.fire;
		const shieldHeld = k.has("KeyL") || k.has("ShiftLeft") || k.has("ShiftRight") || k.has("KeyC") || !!t.shield;
		const jumpPressed = !this.prev.has("Space") && k.has("Space") || !this.prev.has("KeyK") && k.has("KeyK") || !!t.jumpPressed;
		const firePressed = !this.prev.has("KeyJ") && k.has("KeyJ") || !this.prev.has("KeyZ") && k.has("KeyZ") || !this.prev.has("KeyX") && k.has("KeyX") || !!t.firePressed;
		const weaponNext = !this.prev.has("KeyE") && k.has("KeyE") || !!t.weaponNext;
		const weaponPrev = !this.prev.has("KeyQ") && k.has("KeyQ") || !!t.weaponPrev;
		const pause = !this.prev.has("Escape") && k.has("Escape") || !this.prev.has("KeyP") && k.has("KeyP") || !!t.pause;
		this.prev = new Set(k);
		if (t.jumpPressed) t.jumpPressed = false;
		if (t.firePressed) t.firePressed = false;
		if (t.weaponNext) t.weaponNext = false;
		if (t.weaponPrev) t.weaponPrev = false;
		if (t.pause) t.pause = false;
		const weaponPick = t.weaponPick;
		if (t.weaponPick) t.weaponPick = void 0;
		return {
			left,
			right,
			up,
			jump: jumpHeld,
			jumpPressed,
			fire: fireHeld,
			firePressed,
			weaponNext,
			weaponPrev,
			weaponPick,
			pause,
			shield: shieldHeld
		};
	}
	setKeys(codes) {
		this.keys = new Set(codes);
	}
	getKeys() {
		return [...this.keys];
	}
};
var input = new InputManager();
var MAX = 560;
var CELL = 32;
var COL = {
	spark: 0,
	orb: 1,
	smoke: 2,
	debris: 3,
	trail: 4
};
function blank() {
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
		additive: true
	};
}
function rand(a, b) {
	return a + Math.random() * (b - a);
}
function ang(a, spd) {
	return {
		vx: Math.cos(a) * spd,
		vy: Math.sin(a) * spd
	};
}
function buildAtlas() {
	const c = document.createElement("canvas");
	c.width = 160;
	c.height = CELL;
	const g = c.getContext("2d");
	g.imageSmoothingEnabled = true;
	{
		g.save();
		g.translate(CELL * .5, CELL * .5);
		const glow = g.createRadialGradient(0, 0, 0, 0, 0, 14);
		glow.addColorStop(0, "rgba(255,255,255,0.95)");
		glow.addColorStop(.35, "rgba(255,255,255,0.45)");
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
	{
		g.save();
		g.translate(CELL * 1.5, CELL * .5);
		const rg = g.createRadialGradient(-2, -3, 0, 0, 0, 15);
		rg.addColorStop(0, "rgba(255,255,255,1)");
		rg.addColorStop(.28, "rgba(255,255,255,0.85)");
		rg.addColorStop(.62, "rgba(255,255,255,0.28)");
		rg.addColorStop(1, "rgba(255,255,255,0)");
		g.fillStyle = rg;
		g.beginPath();
		g.arc(0, 0, 15, 0, Math.PI * 2);
		g.fill();
		g.restore();
	}
	{
		g.save();
		g.translate(CELL * 2.5, CELL * .5);
		const puff = (ox, oy, r, a) => {
			const rg = g.createRadialGradient(ox, oy, r * .1, ox, oy, r);
			rg.addColorStop(0, `rgba(255,255,255,${a})`);
			rg.addColorStop(.55, `rgba(255,255,255,${a * .45})`);
			rg.addColorStop(1, "rgba(255,255,255,0)");
			g.fillStyle = rg;
			g.beginPath();
			g.arc(ox, oy, r, 0, Math.PI * 2);
			g.fill();
		};
		puff(-3, 1, 12, .7);
		puff(4, -2, 11, .55);
		puff(1, 4, 9, .5);
		puff(-5, -4, 8, .4);
		g.restore();
	}
	g.save();
	g.translate(CELL * 3.5, CELL * .5);
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
	{
		g.save();
		g.translate(CELL * 4.5, CELL * .5);
		const lg = g.createLinearGradient(-15, 0, 14, 0);
		lg.addColorStop(0, "rgba(255,255,255,0)");
		lg.addColorStop(.45, "rgba(255,255,255,0.35)");
		lg.addColorStop(.82, "rgba(255,255,255,0.95)");
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
var ParticleSystem = class {
	pool = Array.from({ length: MAX }, blank);
	cursor = 0;
	atlas = null;
	tintCache = /* @__PURE__ */ new Map();
	ensureAtlas() {
		if (!this.atlas && typeof document !== "undefined") this.atlas = buildAtlas();
		return this.atlas;
	}
	clear() {
		for (const p of this.pool) p.alive = false;
	}
	spawn(partial) {
		const p = this.pool[this.cursor];
		this.cursor = (this.cursor + 1) % MAX;
		p.alive = true;
		p.kind = partial.kind;
		p.x = partial.x;
		p.y = partial.y;
		p.vx = partial.vx ?? 0;
		p.vy = partial.vy ?? 0;
		p.life = partial.life ?? .4;
		p.max = partial.max ?? p.life;
		p.size = partial.size ?? 8;
		p.sizeEnd = partial.sizeEnd ?? p.size * .3;
		p.rot = partial.rot ?? 0;
		p.rotV = partial.rotV ?? 0;
		p.color = partial.color;
		p.gravity = partial.gravity ?? 0;
		p.drag = partial.drag ?? 0;
		p.stretch = partial.stretch ?? 1;
		p.additive = partial.additive ?? (partial.kind !== "smoke" && partial.kind !== "debris");
	}
	/** Hot needles flying off an impact. */
	sparks(x, y, color, n, dir, spread = Math.PI) {
		const base = dir ?? 0;
		for (let i = 0; i < n; i++) {
			const a = dir == null ? Math.random() * Math.PI * 2 : base + rand(-spread, spread);
			const v = ang(a, rand(90, 320));
			this.spawn({
				kind: "spark",
				x: x + rand(-3, 3),
				y: y + rand(-3, 3),
				...v,
				life: rand(.16, .42),
				max: .42,
				size: rand(7, 14),
				sizeEnd: 2,
				color,
				gravity: 70,
				drag: 1.6,
				stretch: rand(1.8, 3.2),
				rot: a
			});
		}
	}
	/** Soft additive energy motes. */
	orbs(x, y, color, n, speed = 70) {
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2;
			const s = rand(speed * .35, speed);
			this.spawn({
				kind: "orb",
				x: x + rand(-4, 4),
				y: y + rand(-4, 4),
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s - rand(10, 50),
				life: rand(.35, .75),
				max: .75,
				size: rand(8, 16),
				sizeEnd: rand(14, 22),
				color,
				gravity: -40,
				drag: 1.8
			});
		}
	}
	/** Expanding dusty puffs. */
	smoke(x, y, color, n, up = true) {
		for (let i = 0; i < n; i++) this.spawn({
			kind: "smoke",
			x: x + rand(-8, 8),
			y: y + rand(-4, 4),
			vx: rand(-40, 40),
			vy: up ? rand(-70, -18) : rand(10, 50),
			life: rand(.35, .85),
			max: .85,
			size: rand(10, 18),
			sizeEnd: rand(22, 38),
			color,
			gravity: -25,
			drag: 2.4,
			rot: rand(0, Math.PI * 2),
			rotV: rand(-1.2, 1.2),
			additive: false
		});
	}
	/** Gravity shards. */
	debris(x, y, color, n) {
		for (let i = 0; i < n; i++) {
			const a = -Math.PI / 2 + rand(-1.2, 1.2);
			const s = rand(80, 260);
			this.spawn({
				kind: "debris",
				x,
				y,
				vx: Math.cos(a) * s * (Math.random() > .5 ? 1 : -.6),
				vy: Math.sin(a) * s,
				life: rand(.35, .75),
				max: .75,
				size: rand(5, 11),
				sizeEnd: rand(3, 6),
				color,
				gravity: 620,
				drag: .6,
				rot: rand(0, Math.PI * 2),
				rotV: rand(-10, 10),
				additive: false
			});
		}
	}
	/** Short additive dash along a velocity. */
	trail(x, y, vx, vy, color, scale = 1) {
		const spd = Math.hypot(vx, vy) || 1;
		this.spawn({
			kind: "trail",
			x,
			y,
			vx: vx * .12,
			vy: vy * .12,
			life: rand(.08, .18) * scale,
			max: .18 * scale,
			size: rand(10, 16) * scale,
			sizeEnd: 4,
			color,
			gravity: 0,
			drag: 4,
			stretch: rand(2.2, 3.6),
			rot: Math.atan2(vy, vx)
		});
		if (spd > 200 && Math.random() < .25) this.spawn({
			kind: "spark",
			x: x + rand(-2, 2),
			y: y + rand(-2, 2),
			vx: -vx * .08 + rand(-20, 20),
			vy: -vy * .08 + rand(-20, 20),
			life: .12,
			max: .12,
			size: 6,
			sizeEnd: 2,
			color,
			gravity: 0,
			drag: 2,
			stretch: 2,
			rot: Math.atan2(vy, vx)
		});
	}
	land(x, y, impact = 200) {
		const heavy = impact > 380;
		this.smoke(x, y, heavy ? "#c4a882" : "#d9c4a0", heavy ? 6 : 4);
		this.debris(x, y, "#8a6a48", heavy ? 6 : 3);
		if (heavy) this.sparks(x, y, "#ff9f43", 5, -Math.PI / 2, 1.1);
	}
	/** Slow floating neon motes that sell canyon air. */
	ambient(x, y, color) {
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
			drag: .35
		});
	}
	/** Soft ember drift for heat-haze biomes. */
	ember(x, y, color = "#ff9f43") {
		this.spawn({
			kind: "spark",
			x,
			y,
			vx: rand(-16, 16),
			vy: rand(-50, -18),
			life: rand(.7, 1.4),
			max: 1.4,
			size: rand(4, 8),
			sizeEnd: 1,
			color,
			gravity: -20,
			drag: .5,
			stretch: 1.6,
			rot: -Math.PI / 2
		});
	}
	jump(x, y, color = "#00f0ff") {
		this.smoke(x, y + 8, "#c4b49a", 3);
		this.sparks(x, y + 6, color, 8, Math.PI / 2, .9);
		this.orbs(x, y + 4, color, 2, 50);
	}
	jetpack(x, y) {
		if (Math.random() < .85) this.spawn({
			kind: "spark",
			x: x + rand(-8, 8),
			y,
			vx: rand(-40, 40),
			vy: rand(80, 220),
			life: rand(.12, .28),
			max: .28,
			size: rand(6, 12),
			sizeEnd: 2,
			color: Math.random() > .4 ? "#00f0ff" : "#7af7ff",
			gravity: 40,
			drag: .8,
			stretch: 2.4,
			rot: Math.PI / 2
		});
		if (Math.random() < .45) this.smoke(x, y + 4, "#4aa0b8", 1, false);
	}
	runDust(x, y, facing) {
		this.spawn({
			kind: "smoke",
			x,
			y,
			vx: -facing * rand(20, 55),
			vy: rand(-28, -8),
			life: rand(.22, .42),
			max: .42,
			size: rand(7, 12),
			sizeEnd: rand(14, 22),
			color: Math.random() > .5 ? "#c4a882" : "#e0c8a0",
			gravity: -15,
			drag: 2,
			additive: false
		});
	}
	muzzle(x, y, color, dir) {
		this.sparks(x, y, color, 6, dir > 0 ? 0 : Math.PI, .55);
		this.orbs(x, y, "#ffffff", 2, 40);
		this.trail(x, y, dir * 420, 0, color, 1.2);
	}
	hit(x, y, color) {
		this.sparks(x, y, color, 8);
		this.orbs(x, y, "#ffffff", 2, 55);
	}
	birdDeath(x, y) {
		this.sparks(x, y, "#ff2bd6", 10);
		this.sparks(x, y, "#a78bc4", 8);
		this.orbs(x, y, "#c77dff", 6, 90);
		this.debris(x, y, "#5a3d78", 8);
		this.smoke(x, y, "#6b4a88", 5);
	}
	bossHit(x, y, phase) {
		const col = phase === 3 ? "#ffcc33" : phase === 2 ? "#ff8844" : "#00f0ff";
		this.sparks(x, y, col, 8 + phase * 2);
		this.orbs(x, y, "#ffffff", 3, 70);
		if (phase >= 2) this.debris(x, y, "#ff9f43", 4);
	}
	bossPhase(x, y, phase) {
		this.sparks(x, y, phase === 3 ? "#ffcc33" : "#ff4466", 22);
		this.orbs(x, y, phase === 3 ? "#ffe08a" : "#ff2bd6", 12, 140);
		this.smoke(x, y, "#4a2040", 8);
		this.debris(x, y, "#ff8844", 10);
	}
	bossDeath(x, y) {
		this.sparks(x, y, "#ff2bd6", 28);
		this.sparks(x, y, "#00f0ff", 22);
		this.orbs(x, y, "#ffcc33", 16, 160);
		this.debris(x, y, "#c77dff", 18);
		this.smoke(x, y, "#5a2878", 10);
	}
	collect(x, y, color, rich = false) {
		this.orbs(x, y, color, rich ? 10 : 5, rich ? 110 : 70);
		this.sparks(x, y, color, rich ? 12 : 6, -Math.PI / 2, 1.4);
		if (rich) this.orbs(x, y, "#ffffff", 4, 50);
	}
	spring(x, y) {
		this.sparks(x, y, "#ff2bd6", 18, -Math.PI / 2, 1.35);
		this.sparks(x, y, "#ffffff", 10, -Math.PI / 2, 1.05);
		this.orbs(x, y - 10, "#00f0ff", 8, 140);
		this.orbs(x, y - 18, "#ff2bd6", 6, 110);
		this.smoke(x, y + 4, "#c77dff", 5);
	}
	hazard(x, y) {
		this.sparks(x, y, "#ff4466", 10);
		this.smoke(x, y, "#8a3040", 4);
		this.debris(x, y, "#ff8844", 5);
	}
	playerDeath(x, y) {
		this.sparks(x, y, "#ff2bd6", 18);
		this.orbs(x, y, "#ff4466", 10, 120);
		this.debris(x, y, "#7a2058", 12);
		this.smoke(x, y, "#4a1838", 8);
	}
	shotTrail(x, y, vx, vy, color, homing = false) {
		this.trail(x, y, vx, vy, color, homing ? 1.15 : .9);
		if (homing && Math.random() < .45) this.spawn({
			kind: "orb",
			x: x + rand(-3, 3),
			y: y + rand(-3, 3),
			vx: rand(-20, 20),
			vy: rand(-20, 20),
			life: .22,
			max: .22,
			size: rand(5, 9),
			sizeEnd: 12,
			color,
			gravity: -10,
			drag: 2
		});
	}
	/** Generic fallback burst (sparks + a couple orbs). */
	burst(x, y, color, n) {
		this.sparks(x, y, color, Math.max(3, Math.round(n * .7)));
		this.orbs(x, y, color, Math.max(1, Math.round(n * .25)), 80);
	}
	update(dt) {
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
	tinted(kind, color) {
		const atlas = this.ensureAtlas();
		if (!atlas) return null;
		const key = kind + color;
		let c = this.tintCache.get(key);
		if (c) return c;
		if (this.tintCache.size > 48) this.tintCache.clear();
		c = document.createElement("canvas");
		c.width = CELL;
		c.height = CELL;
		const t = c.getContext("2d");
		t.drawImage(atlas, COL[kind] * CELL, 0, CELL, CELL, 0, 0, CELL, CELL);
		t.globalCompositeOperation = "source-in";
		t.fillStyle = color;
		t.fillRect(0, 0, CELL, CELL);
		this.tintCache.set(key, c);
		return c;
	}
	draw(ctx) {
		if (!this.ensureAtlas()) return;
		this.drawPass(ctx, false);
		this.drawPass(ctx, true);
	}
	drawPass(ctx, additive) {
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
				const st = p.stretch * (.7 + Math.min(1.8, spd / 220));
				sx = size * st;
				sy = size / Math.max(1.05, st * .55);
			}
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(rot);
			ctx.globalAlpha = p.kind === "smoke" ? ease * .55 : p.kind === "debris" ? ease * .9 : Math.min(1, ease * 1.15);
			ctx.drawImage(img, -sx * .5, -sy * .5, sx, sy);
			ctx.restore();
		}
		ctx.restore();
	}
};
var LEVELS = CAMPAIGN;
/** Neon Chaos edge cycle — full synthwave palette, not just player accents */
var NEON_CHAOS = [
	"#ff2bd6",
	"#00f0ff",
	"#ffcc33",
	"#39ff9a",
	"#c77dff",
	"#ff9f43",
	"#ff4466",
	"#7ef9ff"
];
/** ART v10 stamp is DEV ONLY — prod playfield stays clean. */
function isBmmDebug() {
	if (typeof window === "undefined") return false;
	try {
		if (window.localStorage?.getItem("bmmDebug") === "1") return true;
	} catch {}
	try {
		return new URLSearchParams(window.location.search).get("debug") === "1";
	} catch {
		return false;
	}
}
function hexA(hex, a) {
	return `#${hex.replace("#", "").slice(0, 6)}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0")}`;
}
var VIEW_W = 960;
var VIEW_H = 720;
/** Larger, wider player for readability */
var PLAYER_W = 84;
var PLAYER_H = 86;
var HIT_OX = 16;
var HIT_OY = 12;
var HIT_W = 50;
/** Must reach sprite feet (PLAYER_H - HIT_OY) so ground snap keeps AABB contact */
var HIT_H = 74;
var GROUND_SKIN = 6;
var BIRD_SCALE = 1.5;
var FIXED_DT = 1 / 60;
/** Bounce pads must clear at least 5 body heights (asymmetric rise gravity 1400). */
var GRAV_UP = 1400;
var GRAV_DOWN = 2200;
var SPRING_VY = -Math.sqrt(2 * GRAV_UP * 430) * 1.1;
var WEAPONS = {
	pulse: {
		name: "Pulse",
		cost: 1,
		dmg: 1,
		speed: 520,
		cooldown: .18,
		spread: 0,
		stamina: 4,
		pattern: "line"
	},
	beam: {
		name: "Beam",
		cost: 2,
		dmg: 2,
		speed: 780,
		cooldown: .32,
		spread: 0,
		stamina: 10,
		pattern: "beam"
	},
	spread: {
		name: "Spread",
		cost: 3,
		dmg: 1,
		speed: 480,
		cooldown: .4,
		spread: 3,
		stamina: 14,
		pattern: "fan"
	},
	homing: {
		name: "Homing",
		cost: 2,
		dmg: 2,
		speed: 340,
		cooldown: .35,
		spread: 0,
		stamina: 8,
		pattern: "seek"
	},
	charge: {
		name: "Charge",
		cost: 3,
		dmg: 4,
		speed: 900,
		cooldown: .15,
		spread: 0,
		stamina: 16,
		pattern: "charge"
	},
	nova: {
		name: "Nova",
		cost: 4,
		dmg: 2,
		speed: 280,
		cooldown: .55,
		spread: 8,
		stamina: 18,
		pattern: "nova"
	},
	ricochet: {
		name: "Prism",
		cost: 2,
		dmg: 2,
		speed: 520,
		cooldown: .28,
		spread: 0,
		stamina: 10,
		pattern: "bounce"
	}
};
var WEAPON_ORDER = [
	"homing",
	"pulse",
	"beam",
	"spread",
	"charge",
	"nova",
	"ricochet"
];
function aabb(a, b) {
	return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		if (!src.startsWith("blob:")) img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}
function isStudioChroma(r, g, b, a) {
	if (a < 10) return true;
	if (g > 220 && r < 50 && b < 50) return true;
	if (r > 190 && b > 170 && g < 110) return true;
	if (r > 140 && g < 90 && b > 70 && r - g > 70 && b - g > 30) return true;
	return false;
}
function prepHeroSheet(img, cols = 2, rows = 2) {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, img.naturalWidth || img.width);
	canvas.height = Math.max(1, img.naturalHeight || img.height);
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return {
		canvas,
		frames: []
	};
	ctx.drawImage(img, 0, 0);
	const w = canvas.width;
	const h = canvas.height;
	let data;
	try {
		data = ctx.getImageData(0, 0, w, h);
	} catch {
		return {
			canvas,
			frames: []
		};
	}
	const px = data.data;
	for (let i = 0; i < px.length; i += 4) if (isStudioChroma(px[i], px[i + 1], px[i + 2], px[i + 3])) {
		px[i] = 0;
		px[i + 1] = 0;
		px[i + 2] = 0;
		px[i + 3] = 0;
	}
	ctx.putImageData(data, 0, 0);
	const fw = w / cols;
	const fh = h / rows;
	const frames = [];
	for (let f = 0; f < cols * rows; f++) {
		const col = f % cols;
		const row = Math.floor(f / cols);
		const x0 = Math.floor(col * fw);
		const y0 = Math.floor(row * fh);
		const x1 = Math.floor(x0 + fw);
		const y1 = Math.floor(y0 + fh);
		let minX = x1, minY = y1, maxX = x0, maxY = y0;
		for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (px[(y * w + x) * 4 + 3] > 12) {
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
		}
		if (maxX <= minX || maxY <= minY) {
			frames.push({
				sx: x0,
				sy: y0,
				sw: fw,
				sh: fh
			});
			continue;
		}
		const padX = Math.max(2, (maxX - minX) * .08);
		const padY = Math.max(2, (maxY - minY) * .06);
		const sx = Math.max(x0, minX - padX);
		const sy = Math.max(y0, minY - padY);
		const sw = Math.min(x1, maxX + padX + 1) - sx;
		const sh = Math.min(y1, maxY + padY + 1) - sy;
		frames.push({
			sx,
			sy,
			sw,
			sh
		});
	}
	return {
		canvas,
		frames
	};
}
var GameEngine = class {
	canvas;
	ctx;
	running = false;
	raf = 0;
	acc = 0;
	last = 0;
	character = "grok";
	levelIdx = 0;
	level;
	platforms = [];
	coins = [];
	birds = [];
	ammoPickups = [];
	lasers = [];
	fx = new ParticleSystem();
	powerSeeds = [];
	hazard = null;
	hazardTimer = 0;
	lightningBolts = [];
	px = 0;
	py = 0;
	pvx = 0;
	pvy = 0;
	facing = 1;
	grounded = false;
	wasGrounded = false;
	coyote = 0;
	jumpBuf = 0;
	jumpsLeft = 2;
	anim = 0;
	frame = 0;
	fireCd = 0;
	invuln = 0;
	hurtFlash = 0;
	platformRideVx = 0;
	/** Phase 3 juice */
	chromPulse = 0;
	powerPulse = 0;
	slowMo = 0;
	chaosEdge = 0;
	vignetteBoost = 0;
	homingBurst = 0;
	overloadT = 0;
	rapidT = 0;
	zapperT = 0;
	bossSeedCd = 0;
	radio = "";
	lastChaos;
	chaosGem = null;
	plateBuf = null;
	save = loadSave();
	passives = passivesFrom(loadSave(), false);
	score = 0;
	coinCount = 0;
	health = 100;
	maxHealth = 100;
	stamina = 100;
	maxStamina = 100;
	ammo = 24;
	maxAmmo = 40;
	weapon = "homing";
	lives = 3;
	checkpointId = null;
	spawnX = 0;
	spawnY = 0;
	/** Seconds of fall-death immunity after spawn/respawn */
	spawnProtect = 0;
	camX = 0;
	camY = 0;
	shake = 0;
	time = 0;
	paused = false;
	won = false;
	dead = false;
	beamActive = 0;
	keepProgress = false;
	/** Max hold-time seconds */
	maxShield = 5;
	/** Current shield energy in seconds of hold */
	shield = 5;
	shielding = false;
	shieldRegenAcc = 0;
	/** Grok jetpack / Goblin multi-jump state */
	airJumpsUsed = 0;
	jetpacking = false;
	/** Ignore jump-cut / jetpack so a bounce pad can finish its arc */
	springLock = 0;
	jumpRings = [];
	/** Phase 4 — cinematic motion ghosts */
	ghosts = [];
	ghostAcc = 0;
	landSquash = 0;
	landRing = 0;
	muzzleFlash = 0;
	muzzleColor = "#00f0ff";
	lookX = 0;
	lookY = 0;
	attackT = 0;
	hurtPoseT = 0;
	boss = null;
	lastBossPhase = 1;
	bossGoalOpen = true;
	weaponCharge = 0;
	chargeFiring = false;
	imgs = {};
	frameBoxes = /* @__PURE__ */ new WeakMap();
	ready = false;
	cbs;
	constructor(canvas, cbs) {
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
	adoptHeroSheet(key, img) {
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
		const loadHero = (src) => fetch(src, { cache: "no-store" }).then((r) => {
			if (!r.ok) throw new Error(String(r.status));
			return r.blob();
		}).then((blob) => {
			const url = URL.createObjectURL(blob);
			return loadImage(url).finally(() => URL.revokeObjectURL(url));
		}).catch(() => loadImage(src).catch(() => null));
		const [grokIdle, grokRun, grokJump, grokAttack, grokHurt, goblinIdle, goblinRun, goblinJump, goblinAttack, goblinHurt, bird, boss, props] = await Promise.all([
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
			loadImage("/sprites/props.png")
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
		try {
			this.imgs.bgFar = await loadImage("/sprites/bg/op1-far.jpg");
			this.imgs.bgMid = await loadImage("/sprites/bg/op1-mid.jpg");
		} catch {}
		for (let i = 1; i <= 9; i++) try {
			this.imgs[`bgL${i}`] = await loadImage(`/sprites/bg/l${i}-far.jpg?v=sky1`);
		} catch {}
		this.ready = true;
	}
	/**
	* @param keepProgress when true (Next Level), keep score/lives/ammo instead of full reset
	*/
	startLevel(character, levelIndex, keepProgress = false) {
		this.character = character;
		this.levelIdx = Math.max(0, Math.min(LEVELS.length - 1, levelIndex));
		this.level = LEVELS[this.levelIdx];
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
		input.lockFor(450);
		cancelAnimationFrame(this.raf);
		this.loop(this.last);
		gameAudio.playMusic(this.level.boss ? "battle" : "play");
		this.emitHud();
		this.cbs.onScreen("playing");
		this.exposeControlsTest();
	}
	applyPassives() {
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
	setPaused(p, silent = false) {
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
		this.shield = Math.max(this.shield, this.maxShield * .4);
		this.shielding = false;
		this.shieldRegenAcc = 0;
		this.cbs.onScreen("playing");
		gameAudio.playMusic(this.level.boss ? "battle" : "play");
		this.emitHud();
	}
	resetLevel(full) {
		const L = this.level;
		this.platforms = L.platforms.map((p) => ({ ...p }));
		this.coins = L.coins.map((c, i) => ({
			...c,
			collected: false,
			bob: i * .4
		}));
		this.birds = L.birds.map((b) => ({
			...b,
			w: Math.round(b.w * BIRD_SCALE),
			h: Math.round(b.h * BIRD_SCALE),
			frame: 0,
			t: Math.random() * 10,
			dead: false
		}));
		this.ammoPickups = L.ammo.map((a) => ({
			...a,
			collected: false
		}));
		this.powerSeeds = (L.seeds ?? []).map((s, i) => ({
			...s,
			x: s.x + (s.w - 56) / 2,
			y: s.y + (s.h - 56) / 2,
			w: 56,
			h: 56,
			collected: false,
			bob: i * .7
		}));
		if (this.powerSeeds.length === 0 && !L.boss && L.introPower) {
			const c = this.coins[Math.min(1, this.coins.length - 1)];
			if (c) this.powerSeeds.push({
				x: c.x - 14,
				y: c.y - 40,
				w: 56,
				h: 56,
				collected: false,
				bob: .5,
				kind: L.introPower
			});
		}
		this.placeChaosGem();
		this.homingBurst = 0;
		this.overloadT = 0;
		this.rapidT = 0;
		this.zapperT = 0;
		this.bossSeedCd = 2.5;
		this.lastChaos = void 0;
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
		this.hazardTimer = L.disasterInterval * .55;
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
		this.invuln = 1;
		this.anim = 0;
		this.frame = 0;
		this.camX = Math.max(0, this.px - VIEW_W * .3);
		{
			const maxCamY = this.level.height - VIEW_H;
			const minCamY = Math.min(0, maxCamY);
			const targetY = this.py - VIEW_H * .55;
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
		this.bossGoalOpen = !L.boss;
		if (L.boss) {
			const op = opOfLevel(L.id);
			const hp = Math.round((L.epic ? 220 : 80) * (1 + (op.id - 1) * .18));
			this.boss = {
				x: L.width * .5 - 60,
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
				attackCd: 1.2
			};
			this.bossGoalOpen = false;
			this.lastBossPhase = 1;
			for (const pl of this.platforms) if (pl.kind === "goal") pl.active = false;
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
			this.health = Math.max(this.health, 60);
			this.stamina = this.maxStamina;
			this.ammo = Math.max(this.ammo, 16);
		}
	}
	emitHud() {
		const op = opOfLevel(this.level.id);
		const unlocked = this.save.inventory[op.id] ?? [];
		const buffs = [];
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
			bossHp: this.boss && !this.boss.dead ? this.boss.hp : void 0,
			bossMaxHp: this.boss && !this.boss.dead ? this.boss.maxHp : void 0,
			bossName: this.boss && !this.boss.dead ? this.level.bossName ?? "BOSS" : void 0,
			weaponCharge: this.weapon === "charge" ? this.weaponCharge : void 0,
			unlockedPowers: unlocked,
			radio: this.radio,
			operation: op.id,
			chaosGot: Object.entries(this.save.chaos).filter(([, n]) => n > 0).map(([id]) => id),
			lastChaos: this.lastChaos,
			flags: this.platforms.filter((p) => p.kind === "checkpoint").sort((a, b) => a.x - b.x).map((p) => !!p.active),
			chaosHere: this.level.chaosId ?? seedForLevel(this.level.id),
			chaosHereGot: hasLevelChaos(this.save, this.level.id) || !!this.chaosGem?.collected,
			chaosSlots: Array.from({ length: 10 }, (_, slot) => hasLevelChaos(this.save, (op.id - 1) * 10 + slot + 1)),
			activeBuffs: buffs
		});
	}
	loop = (now) => {
		if (!this.running) return;
		this.syncView();
		const raw = Math.min(.05, (now - this.last) / 1e3);
		this.last = now;
		this.acc += raw;
		while (this.acc >= FIXED_DT) {
			if (!this.paused && !this.dead && !this.won) this.fixedUpdate(FIXED_DT);
			this.acc -= FIXED_DT;
		}
		this.draw();
		this.raf = requestAnimationFrame(this.loop);
	};
	fixedUpdate(dt) {
		const scale = this.slowMo > 0 ? .38 : 1;
		dt = dt * scale;
		this.time += dt / scale;
		const inp = input.poll();
		if (inp.pause) {
			this.togglePause();
			return;
		}
		if (inp.weaponPick) {
			this.weapon = inp.weaponPick;
			gameAudio.play("select", { volume: .5 });
			this.emitHud();
		}
		if (inp.weaponNext) this.cycleWeapon(1);
		if (inp.weaponPrev) this.cycleWeapon(-1);
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
		for (const b of this.birds) if (b.hitFlash && b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt);
		if (this.fireCd > 0) this.fireCd -= dt;
		if (this.beamActive > 0) this.beamActive -= dt;
		if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 8);
		for (const p of this.platforms) if (p.kind === "moving" && p.originX != null && p.range != null && p.vx != null) {
			p.phase = (p.phase ?? 0) + dt;
			p.x = p.originX + Math.sin(p.phase * (p.vx / 40)) * p.range;
		}
		const accel = this.grounded ? 2200 : 1400 * this.passives.airMul;
		const maxSpeed = (this.character === "grok" ? 280 : 300) * (1 + (this.passives.airMul - 1) * .4);
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
		if (inp.jumpPressed) this.jumpBuf = .12;
		else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
		if (this.grounded) {
			this.coyote = .1;
			this.jumpsLeft = 2;
			this.airJumpsUsed = 0;
			this.jetpacking = false;
		} else this.coyote = Math.max(0, this.coyote - dt);
		if (this.springLock > 0) this.springLock = Math.max(0, this.springLock - dt);
		if (this.jumpBuf > 0 && this.springLock <= 0) {
			if (this.grounded || this.coyote > 0) {
				this.jumpsLeft = 1;
				this.airJumpsUsed = 0;
				this.pvy = (this.character === "goblin" ? -520 : -500) * this.passives.jumpMul;
				this.coyote = 0;
				this.jumpBuf = 0;
				this.grounded = false;
				this.jetpacking = false;
				gameAudio.play("jump", {
					volume: .55,
					rate: 1
				});
				this.fx.jump(this.px + PLAYER_W * .5, this.py + PLAYER_H - 4, this.character === "grok" ? "#00f0ff" : "#39ff9a");
			} else if (this.character === "goblin") {
				this.pvy = -480 * this.passives.jumpMul;
				this.airJumpsUsed += 1;
				this.jumpBuf = 0;
				this.grounded = false;
				this.spawnJumpRing();
				this.fx.jump(this.px + PLAYER_W * .5, this.py + PLAYER_H - 6, "#00f0ff");
				gameAudio.play("spring", {
					volume: .5,
					rate: 1.05 + Math.min(.4, this.airJumpsUsed * .05)
				});
			} else if (this.jumpsLeft > 0) {
				this.jumpsLeft -= 1;
				this.airJumpsUsed += 1;
				this.pvy = -460;
				this.jumpBuf = 0;
				this.grounded = false;
				this.fx.jump(this.px + PLAYER_W * .5, this.py + PLAYER_H - 4, "#00f0ff");
				gameAudio.play("spring", {
					volume: .55,
					rate: 1.2
				});
			}
		}
		if (!inp.jump && this.pvy < -80 && !this.jetpacking && this.springLock <= 0) this.pvy *= .55;
		if (this.character === "grok" && !this.grounded && this.airJumpsUsed >= 1 && inp.jump && this.springLock <= 0) {
			this.jetpacking = true;
			this.pvy = Math.max(this.pvy - 520 * dt, -165);
			this.fx.jetpack(this.px + PLAYER_W * .5 + (Math.random() - .5) * 16, this.py + PLAYER_H - 2);
		} else if (!inp.jump) this.jetpacking = false;
		const gravUp = GRAV_UP;
		const gravDown = GRAV_DOWN;
		if (!this.jetpacking) this.pvy += (this.pvy < 0 ? gravUp : gravDown) * dt;
		else this.pvy += 20 * dt;
		if (this.pvy > 900) this.pvy = 900;
		if (this.hazard?.active) {
			if (this.hazard.kind === "sandstorm") {
				this.pvx += 40 * dt * (Math.sin(this.time * 3) > 0 ? 1 : -1);
				this.pvx *= .992;
			} else if (this.hazard.kind === "quake") {
				this.shake = Math.max(this.shake, 6);
				if (this.grounded && Math.random() < .02) this.pvy = -120;
			} else if (this.hazard.kind === "lightning" && !this.shielding) {
				const cx = this.px + PLAYER_W * .5;
				for (const bolt of this.lightningBolts) if (bolt.struck && Math.abs(cx - bolt.x) < 30) {
					this.hurt(16, 0);
					break;
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
		this.clampToWorld();
		for (const r of this.jumpRings) r.life -= dt;
		this.jumpRings = this.jumpRings.filter((r) => r.life > 0);
		if (this.grounded && Math.abs(this.pvx) > 80 && Math.random() < .18) this.fx.runDust(this.px + PLAYER_W * .5 - this.facing * 10, this.py + PLAYER_H - 4, this.facing);
		this.updateCinematicFx(dt);
		this.anim += dt;
		if (this.spawnProtect > 0) this.spawnProtect = Math.max(0, this.spawnProtect - dt);
		if (this.hurtPoseT > 0) this.hurtPoseT = Math.max(0, this.hurtPoseT - dt);
		if (this.attackT > 0) this.attackT = Math.max(0, this.attackT - dt);
		if (this.hurtPoseT > 0) this.frame = Math.min(3, Math.floor((1 - this.hurtPoseT / .38) * 4));
		else if (this.attackT > 0) this.frame = Math.min(3, Math.floor((1 - this.attackT / .22) * 4));
		else if (!this.grounded) {
			if (this.pvy < 0) this.frame = 1;
			else this.frame = 3;
		} else if (Math.abs(this.pvx) > 20) this.frame = Math.floor(this.anim * 12) % 4;
		else this.frame = Math.floor(this.anim * 4) % 4;
		if (this.weapon === "charge") {
			if (inp.fire) {
				this.weaponCharge = Math.min(1, this.weaponCharge + dt * .85);
				if (this.weaponCharge >= 1 && this.fireCd <= 0) this.tryFire(true);
			} else if (this.weaponCharge >= .35 && this.fireCd <= 0) this.tryFire(true);
			else if (!inp.fire) this.weaponCharge = Math.max(0, this.weaponCharge - dt * .5);
		} else if ((inp.fire || inp.firePressed) && this.fireCd <= 0) this.tryFire(false);
		this.updateBirds(dt);
		this.updateBoss(dt);
		this.updateLasers(dt);
		this.updateParticles(dt);
		this.updateHazards(dt);
		this.checkPickups();
		this.checkGoal();
		if (this.py > this.level.height + 80) {
			if (this.spawnProtect > 0) this.applySpawnPose();
			else this.killPlayer();
		}
		const lookTx = this.facing * 36 + this.pvx * .16;
		const lookTy = Math.max(-18, Math.min(48, this.pvy * .07));
		this.lookX += (lookTx - this.lookX) * Math.min(1, 5 * dt);
		this.lookY += (lookTy - this.lookY) * Math.min(1, 4 * dt);
		const targetX = this.px + 20 - VIEW_W * .38 + this.lookX;
		const targetY = this.py + 30 - VIEW_H * .55 + this.lookY;
		this.camX += (targetX - this.camX) * Math.min(1, 8 * dt);
		this.camY += (targetY - this.camY) * Math.min(1, 6 * dt);
		const maxCamX = Math.max(0, this.level.width - VIEW_W);
		const maxCamY = this.level.height - VIEW_H;
		const minCamY = Math.min(0, maxCamY);
		this.camX = Math.max(0, Math.min(maxCamX, this.camX));
		this.camY = Math.max(minCamY, Math.min(maxCamY, this.camY));
		this.emitHud();
	}
	playerBox() {
		return {
			x: this.px + HIT_OX,
			y: this.py + HIT_OY,
			w: HIT_W,
			h: HIT_H
		};
	}
	/** Record a standing pose on the ledge under a checkpoint flag, not inside the pole. */
	rememberCheckpoint(cp) {
		const hintX = cp.x + cp.w * .5;
		const hintY = cp.y + cp.h;
		const pose = this.safeStandPose(hintX, hintY);
		this.spawnX = pose.x;
		this.spawnY = pose.y;
	}
	placeChaosGem() {
		const L = this.level;
		const id = L.chaosId ?? seedForLevel(L.id);
		const already = hasLevelChaos(this.save, L.id);
		const baked = L.chaosGem;
		this.chaosGem = {
			x: baked?.x ?? L.width * .6,
			y: baked?.y ?? L.height * .35,
			w: baked?.w ?? 36,
			h: baked?.h ?? 36,
			collected: already,
			bob: 0,
			id
		};
	}
	/**
	* Find a landable platform near (worldX, hintY) and return player top-left
	* so feet sit 2px above the top (first frame falls onto it, never through).
	*/
	safeStandPose(worldX, hintY) {
		let best = null;
		let bestScore = Infinity;
		for (const p of this.platforms) {
			if (p.kind !== "solid" && p.kind !== "oneway" && p.kind !== "moving" && p.kind !== "conveyor") continue;
			if (p.w < 36) continue;
			const contains = worldX >= p.x && worldX <= p.x + p.w;
			const dx = contains ? 0 : worldX < p.x ? p.x - worldX : worldX - (p.x + p.w);
			const dy = Math.abs(p.y - hintY);
			const score = dy + dx * .55 + (contains ? 0 : 90);
			if (dy < 200 && score < bestScore) {
				best = p;
				bestScore = score;
			}
		}
		if (!best) return {
			x: worldX - PLAYER_W * .5,
			y: hintY - PLAYER_H - 8
		};
		const pad = 8;
		const minX = best.x - HIT_OX + pad;
		const maxX = best.x + best.w - HIT_OX - HIT_W - pad;
		return {
			x: maxX >= minX ? Math.max(minX, Math.min(maxX, worldX - PLAYER_W * .5)) : best.x + (best.w - PLAYER_W) * .5,
			y: best.y - PLAYER_H - 2
		};
	}
	applySpawnPose() {
		const pose = this.safeStandPose(this.spawnX + PLAYER_W * .5, this.spawnY + PLAYER_H);
		this.px = pose.x;
		this.py = pose.y;
		this.pvx = 0;
		this.pvy = 140;
		this.invuln = Math.max(this.invuln, 1.15);
		this.spawnProtect = .7;
		this.grounded = false;
		this.airJumpsUsed = 0;
		this.jetpacking = false;
		this.hurtPoseT = 0;
		this.springLock = 0;
	}
	resolveX() {
		const box = this.playerBox();
		for (const p of this.platforms) {
			if (p.kind === "hazard" || p.kind === "checkpoint" || p.kind === "goal") continue;
			if (p.kind === "oneway" || p.kind === "spring" || p.kind === "conveyor") continue;
			if (p.h >= 180) continue;
			if (!aabb(box, p)) continue;
			if (this.pvx > 0) {
				this.px = p.x - 66;
				this.pvx = 0;
			} else if (this.pvx < 0) {
				this.px = p.x + p.w - HIT_OX;
				this.pvx = 0;
			}
			box.x = this.px + HIT_OX;
		}
		this.px = Math.max(-20, Math.min(this.level.width - PLAYER_W + 10, this.px));
	}
	resolveY() {
		const box = this.playerBox();
		for (const p of this.platforms) {
			if (p.kind === "checkpoint" || p.kind === "goal") continue;
			if (p.kind === "hazard") {
				if (aabb(box, p) && !this.shielding) {
					if (this.invuln <= 0) this.fx.hazard(box.x + box.w * .5, box.y + box.h * .6);
					this.hurt(25, -Math.sign(this.facing || 1) * 180);
				}
				continue;
			}
			if (p.kind === "oneway" || p.kind === "spring" || p.kind === "moving" || p.kind === "solid" || p.kind === "conveyor") {
				const solid = p.kind === "solid" || p.kind === "moving" || p.kind === "conveyor";
				if (box.x + box.w <= p.x + 1 || box.x >= p.x + p.w - 1) continue;
				const feet = box.y + box.h;
				const prevFeet = feet - this.pvy * FIXED_DT;
				if (!solid) {
					if (this.pvy < 0 || prevFeet > p.y + 8) continue;
				}
				if (this.pvy >= 0 && feet >= p.y - GROUND_SKIN && prevFeet <= p.y + 12 && box.y < p.y || solid && aabb(box, p) && this.pvy >= 0 && prevFeet <= p.y + 12 && box.y < p.y) {
					const fallSpeed = this.pvy;
					this.py = p.y - PLAYER_H;
					this.pvy = 0;
					this.grounded = true;
					box.y = this.py + HIT_OY;
					if (!this.wasGrounded) {
						this.fx.land(this.px + PLAYER_W * .5, p.y, fallSpeed);
						this.landSquash = Math.min(.38, .08 + fallSpeed / 1400);
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
						this.springLock = .65;
						gameAudio.play("spring", {
							volume: .85,
							rate: .92
						});
						this.fx.spring(this.px + PLAYER_W * .5, p.y);
					}
					if (p.kind === "moving" && p.originX != null && p.range != null && p.vx != null) {
						const phase = p.phase ?? 0;
						this.platformRideVx = Math.cos(phase * (p.vx / 40)) * p.range * (p.vx / 40);
					}
					if (p.kind === "conveyor") this.platformRideVx = p.vx ?? 80;
				} else if (solid && aabb(box, p) && this.pvy < 0 && box.y >= p.y + p.h - 16) {
					this.py = p.y + p.h - HIT_OY;
					this.pvy = 0;
				}
			}
		}
	}
	/** Soft aim at the nearest bird, lofted so overhead flocks are hittable. */
	aimShot(speed) {
		const ox = this.px + PLAYER_W * .5;
		const oy = this.py + PLAYER_H * .32;
		let bestDx = this.facing * 200;
		let bestDy = -90;
		let best = 0xe8d4a51000;
		for (const b of this.birds) {
			if (b.dead) continue;
			const dx = b.x + b.w * .5 - ox;
			const dy = b.y + b.h * .5 - oy;
			const facingPenalty = dx * this.facing < -30 ? 180 : 0;
			const d = dx * dx + dy * dy + facingPenalty * facingPenalty;
			if (d < best) {
				best = d;
				bestDx = dx;
				bestDy = dy;
			}
		}
		if (this.boss && !this.boss.dead) {
			const dx = this.boss.x + this.boss.w * .5 - ox;
			const dy = this.boss.y + this.boss.h * .35 - oy;
			if (dx * dx + dy * dy < best) {
				bestDx = dx;
				bestDy = dy;
			}
		}
		const len = Math.hypot(bestDx, bestDy) || 1;
		let vx = bestDx / len * speed;
		let vy = bestDy / len * speed;
		if (vx * this.facing < speed * .2) vx = this.facing * speed * .55;
		if (vy > -40) vy = Math.min(vy, -55);
		return {
			vx,
			vy
		};
	}
	cycleWeapon(dir) {
		const i = WEAPON_ORDER.indexOf(this.weapon);
		this.weapon = WEAPON_ORDER[(i + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length];
		gameAudio.play("select", { volume: .5 });
		this.emitHud();
	}
	clampToWorld() {
		const minX = -4;
		const maxX = this.level.width - 48;
		const minY = -516;
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
			this.jetpacking = false;
		}
	}
	spawnJumpRing() {
		this.jumpRings.push({
			x: this.px + 26,
			y: this.py + 56,
			life: .4,
			max: .4
		});
	}
	updateShield(dt, hold) {
		if (hold && this.shield > .02) {
			this.shielding = true;
			this.shield = Math.max(0, this.shield - dt);
			this.shieldRegenAcc = 0;
			if (this.shield <= 0) {
				this.shield = 0;
				this.shielding = false;
			}
		} else {
			this.shielding = false;
			if (this.shield < this.maxShield) {
				this.shieldRegenAcc += dt;
				while (this.shieldRegenAcc >= 2) {
					this.shieldRegenAcc -= 2;
					this.shield = Math.min(this.maxShield, this.shield + this.maxShield * .2);
				}
			} else this.shieldRegenAcc = 0;
		}
	}
	tryFire(fromCharge = false) {
		const w = WEAPONS[this.weapon];
		if (this.weapon === "charge" && !fromCharge) return;
		const chargeMul = this.weapon === "charge" ? .5 + this.weaponCharge * 1.2 : 1;
		const cost = w.cost;
		if (this.ammo < cost || this.stamina < w.stamina * (this.weapon === "charge" ? .6 + this.weaponCharge * .6 : 1)) {
			gameAudio.play("hurt", {
				volume: .25,
				rate: .7
			});
			return;
		}
		this.ammo -= cost;
		this.stamina -= w.stamina * (this.weapon === "charge" ? .6 + this.weaponCharge * .6 : 1);
		const cdScale = this.passives.fireMul * (this.rapidT > 0 ? .5 : 1);
		this.fireCd = (this.weapon === "charge" ? .45 : w.cooldown) * cdScale;
		const dmgMul = this.passives.dmgMul * (this.overloadT > 0 ? 2 : 1);
		const forceHoming = this.homingBurst > 0 || this.weapon === "homing";
		const pierce = Math.random() < this.passives.pierce;
		this.attackT = this.weapon === "nova" || this.weapon === "charge" ? .28 : .2;
		gameAudio.play("shoot", {
			volume: .55,
			rate: this.weapon === "beam" ? .8 : this.weapon === "nova" ? .65 : 1.1
		});
		const ox = this.px + (this.facing > 0 ? 74 : 4);
		const oy = this.py + PLAYER_H * .42;
		const dir = this.facing;
		const aim = this.aimShot(w.speed);
		if (this.weapon === "spread") for (let i = -1; i <= 1; i++) this.lasers.push({
			x: ox,
			y: oy + i * 6,
			w: 18,
			h: 6,
			vx: aim.vx,
			vy: aim.vy + i * 95,
			life: .7,
			dmg: w.dmg * dmgMul,
			color: "#39ff9a",
			fromPlayer: true,
			homing: forceHoming,
			pierce
		});
		else if (this.weapon === "beam") {
			this.beamActive = .22;
			this.lasers.push({
				x: ox,
				y: oy - 2,
				w: 90,
				h: 10,
				vx: aim.vx * 1.15,
				vy: aim.vy,
				life: .22,
				dmg: w.dmg * dmgMul,
				color: "#00f0ff",
				fromPlayer: true,
				homing: forceHoming,
				pierce
			});
		} else if (this.weapon === "homing") this.lasers.push({
			x: ox,
			y: oy,
			w: 16,
			h: 16,
			vx: aim.vx,
			vy: aim.vy - 30,
			life: 1.6,
			dmg: w.dmg * dmgMul,
			color: "#c77dff",
			fromPlayer: true,
			homing: true,
			pierce
		});
		else if (this.weapon === "charge") {
			const p = this.weaponCharge;
			this.lasers.push({
				x: ox,
				y: oy - 4,
				w: 28 + p * 40,
				h: 10 + p * 8,
				vx: aim.vx * (.85 + p * .3),
				vy: aim.vy,
				life: .35 + p * .2,
				dmg: Math.ceil(w.dmg * chargeMul * dmgMul),
				color: p > .85 ? "#ffffff" : "#ffcc33",
				fromPlayer: true,
				homing: forceHoming,
				pierce
			});
			this.fx.muzzle(ox, oy, p > .85 ? "#ffffff" : "#ffcc33", dir);
			this.fx.sparks(ox, oy, "#ffcc33", 6 + Math.floor(p * 8), dir > 0 ? 0 : Math.PI, .7);
			this.muzzleFlash = 1.2;
			this.muzzleColor = p > .85 ? "#ffffff" : "#ffcc33";
			this.weaponCharge = 0;
		} else if (this.weapon === "nova") {
			for (let i = 0; i < 8; i++) {
				const a = i / 8 * Math.PI * 2;
				this.lasers.push({
					x: this.px + 20,
					y: this.py + 28,
					w: 14,
					h: 14,
					vx: Math.cos(a) * w.speed,
					vy: Math.sin(a) * w.speed,
					life: .45,
					dmg: w.dmg * dmgMul,
					color: "#ff2bd6",
					fromPlayer: true,
					nova: true,
					pierce
				});
			}
			this.fx.muzzle(this.px + 26, this.py + 30, "#ff2bd6", dir);
			this.fx.orbs(this.px + 26, this.py + 30, "#ff2bd6", 8, 140);
			this.muzzleFlash = 1.05;
			this.muzzleColor = "#ff2bd6";
		} else if (this.weapon === "ricochet") this.lasers.push({
			x: ox,
			y: oy,
			w: 14,
			h: 14,
			vx: aim.vx,
			vy: aim.vy - 80,
			life: 1.8,
			dmg: w.dmg * dmgMul,
			color: "#00f0ff",
			fromPlayer: true,
			bounces: 3,
			homing: forceHoming,
			pierce
		});
		else this.lasers.push({
			x: ox,
			y: oy,
			w: 22,
			h: 8,
			vx: aim.vx,
			vy: aim.vy,
			life: .85,
			dmg: w.dmg * dmgMul,
			color: "#ff2bd6",
			fromPlayer: true,
			homing: forceHoming,
			pierce
		});
		if (this.weapon !== "charge" && this.weapon !== "nova") {
			const muzzleColor = this.weapon === "beam" ? "#00f0ff" : this.weapon === "spread" ? "#39ff9a" : this.weapon === "homing" ? "#c77dff" : this.weapon === "ricochet" ? "#00f0ff" : "#ff2bd6";
			this.fx.muzzle(ox, oy, muzzleColor, dir);
			this.muzzleFlash = 1;
			this.muzzleColor = muzzleColor;
		}
		this.emitHud();
	}
	updateBirds(dt) {
		for (const b of this.birds) {
			if (b.dead) continue;
			if (b.hitFlash && b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt);
			if (b.windup && b.windup > 0) b.windup = Math.max(0, b.windup - dt);
			b.t += dt;
			const flapRate = b.windup && b.windup > 0 || b.vy > 40 ? 14 : 8;
			b.frame = Math.floor(b.t * flapRate) % 4;
			b.flap = 1 + Math.sin(b.t * flapRate * Math.PI * .5) * .12;
			b.x += b.vx * dt;
			const near = Math.abs(b.x - this.px) < 260 && Math.abs(b.y - this.py) < 200;
			const hoverAmp = near ? 42 : 28;
			b.y += Math.sin(b.t * 3.2 + b.x * .01) * hoverAmp * dt;
			if (b.x < 40 || b.x > this.level.width - 80) b.vx *= -1;
			if (near && (!b.windup || b.windup <= 0) && Math.random() < .012) b.windup = .45;
			if (b.windup && b.windup > 0 && b.windup < .12 && Math.abs(b.vy) < 20) {
				b.vy = 160 + Math.random() * 40;
				b.vx += Math.sign(this.px - b.x) * 30;
			}
			b.y += b.vy * dt;
			b.vy *= .96;
			if (this.zapperT > 0 && aabb(this.playerBox(), b)) {
				b.hp -= 18 * dt;
				b.hitFlash = .15;
				if (b.hp <= 0) {
					b.dead = true;
					this.score += 150;
					this.fx.birdDeath(b.x + 24, b.y + 18);
				}
			} else if (this.invuln <= 0 && !this.shielding && aabb(this.playerBox(), b)) this.hurt(18, -Math.sign(b.vx || 1) * 200);
			if (near && Math.random() < .006) {
				if (!b.windup || b.windup <= 0) b.windup = .28;
			}
			if (b.windup && b.windup > 0 && b.windup < .08 && Math.random() < .35) {
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
					fromPlayer: false
				});
				this.fx.muzzle(b.x + b.w * .5, b.y + b.h * .5, "#ff4466", Math.sign(this.px - b.x) || 1);
			}
		}
	}
	updateLasers(dt) {
		for (const l of this.lasers) {
			if (l.homing && l.fromPlayer) {
				let tx = l.x + l.vx;
				let ty = l.y + l.vy;
				let best = 0xe8d4a51000;
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
					if ((this.boss.x - l.x) ** 2 + (this.boss.y - l.y) ** 2 < best) {
						tx = this.boss.x + this.boss.w / 2;
						ty = this.boss.y + this.boss.h / 2;
					}
				}
				const ang = Math.atan2(ty - l.y, tx - l.x);
				const spd = Math.hypot(l.vx, l.vy) || 340;
				l.vx = l.vx * .88 + Math.cos(ang) * spd * .12;
				l.vy = l.vy * .88 + Math.sin(ang) * spd * .12;
			}
			l.x += l.vx * dt;
			l.y += l.vy * dt;
			l.life -= dt;
			this.fx.shotTrail(l.x + l.w * .5, l.y + l.h * .5, l.vx, l.vy, l.color, !!l.homing);
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
						b.hitFlash = .28;
						if (!l.nova && !l.pierce) l.life = 0;
						this.fx.hit(b.x + 20, b.y + 16, l.color);
						gameAudio.play("hit", {
							volume: .45,
							rate: 1.2
						});
						if (b.hp <= 0) {
							b.dead = true;
							b.hitFlash = .15;
							this.score += 150;
							this.fx.birdDeath(b.x + 24, b.y + 18);
							gameAudio.play("coin", {
								volume: .35,
								rate: .8
							});
						}
					}
				}
				if (this.boss && !this.boss.dead && aabb(l, this.boss)) {
					this.damageBoss(l.dmg);
					if (!l.nova && !l.pierce) l.life = 0;
				}
			} else if (aabb(l, this.playerBox())) {
				if (this.shielding) {
					l.life = 0;
					this.fx.hit(l.x, l.y, "#00f0ff");
				} else if (this.invuln <= 0) {
					this.hurt(l.dmg, l.vx * .3);
					l.life = 0;
				}
			}
		}
		this.lasers = this.lasers.filter((l) => l.life > 0);
	}
	damageBoss(dmg) {
		if (!this.boss || this.boss.dead) return;
		this.boss.hp -= dmg;
		this.boss.flash = .22;
		this.shake = Math.max(this.shake, 4);
		this.chromPulse = Math.max(this.chromPulse, .12);
		const bx = this.boss.x + this.boss.w * .5;
		const by = this.boss.y + this.boss.h * .4;
		this.fx.bossHit(bx, by, this.boss.phase);
		gameAudio.play("hit", {
			volume: .55,
			rate: .75
		});
		const pct = this.boss.hp / this.boss.maxHp;
		if (pct <= .33) this.boss.phase = 3;
		else if (pct <= .66) this.boss.phase = 2;
		if (this.boss.phase !== this.lastBossPhase && this.boss.hp > 0) {
			this.fx.bossPhase(bx, by, this.boss.phase);
			this.shake = Math.max(this.shake, 10);
			this.lastBossPhase = this.boss.phase;
		}
		if (this.boss.hp <= 0) {
			this.boss.hp = 0;
			this.boss.dead = true;
			this.score += 2500;
			this.bossGoalOpen = true;
			for (const pl of this.platforms) if (pl.kind === "goal") pl.active = true;
			this.fx.bossDeath(this.boss.x + this.boss.w * .5, this.boss.y + this.boss.h * .5);
			grantLevelChaos(this.save, this.level.id);
			this.lastChaos = seedForLevel(this.level.id);
			this.radio = formatRadio(chaosBeat(this.lastChaos, !!this.level.epic));
			gameAudio.play("goal", { volume: .8 });
			gameAudio.playMusic("battle");
		}
		this.emitHud();
	}
	updateBoss(dt) {
		const b = this.boss;
		if (!b || b.dead) return;
		b.t += dt;
		if (b.flash > 0) b.flash -= dt;
		b.attackCd -= dt;
		const cx = this.level.width * .5;
		const baseY = 100 + (b.phase - 1) * 20;
		if (b.phase === 1) {
			b.x += b.vx * dt;
			if (b.x < 80 || b.x > this.level.width - 180) b.vx *= -1;
			b.y = baseY + Math.sin(b.t * 2) * 30;
		} else if (b.phase === 2) {
			b.x = cx - 50 + Math.sin(b.t * 1.4) * 220;
			b.y = baseY + Math.cos(b.t * 2.2) * 50;
			if (Math.random() < .008 && this.birds.filter((x) => !x.dead).length < 5) this.birds.push({
				x: b.x,
				y: b.y + 40,
				w: Math.round(48 * BIRD_SCALE),
				h: Math.round(36 * BIRD_SCALE),
				vx: (Math.random() > .5 ? 1 : -1) * (70 + Math.random() * 40),
				vy: 0,
				hp: 3,
				frame: 0,
				t: 0,
				dead: false
			});
		} else {
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
		if (b.attackCd <= 0) {
			b.attackCd = b.phase === 1 ? 1.4 : b.phase === 2 ? 1 : .7;
			const shots = b.phase === 1 ? 3 : b.phase === 2 ? 5 : 7;
			for (let i = 0; i < shots; i++) {
				const ang = Math.atan2(this.py - b.y, this.px - b.x) + (i - (shots - 1) / 2) * .18;
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
					fromPlayer: false
				});
			}
			if (b.phase >= 2 && Math.random() < .4) this.lasers.push({
				x: this.px + (Math.random() - .5) * 80,
				y: -20,
				w: 20,
				h: 28,
				vx: (Math.random() - .5) * 40,
				vy: 320,
				life: 2,
				dmg: 20,
				color: "#ff8844",
				fromPlayer: false
			});
			gameAudio.play("shoot", {
				volume: .4,
				rate: .55
			});
		}
		if (!this.shielding && this.invuln <= 0 && aabb(this.playerBox(), b)) this.hurt(22, -Math.sign(this.facing || 1) * 240);
	}
	updateParticles(dt) {
		this.fx.update(dt);
	}
	tickLightning(dt) {
		for (const bolt of this.lightningBolts) {
			bolt.warn -= dt;
			if (!bolt.struck && bolt.warn <= 0) {
				bolt.struck = true;
				bolt.warn = .18;
				this.shake = Math.max(this.shake, 8);
				this.chromPulse = Math.max(this.chromPulse, .35);
				this.fx.sparks(bolt.x, this.camY + 80, "#7ef9ff", 12);
				gameAudio.play("hit", {
					volume: .35,
					rate: 1.6
				});
			}
		}
		this.lightningBolts = this.lightningBolts.filter((b) => !(b.struck && b.warn <= 0));
		if (this.lightningBolts.filter((b) => !b.struck).length < 2 && Math.random() < .045) {
			const near = this.px + PLAYER_W * .5 + (Math.random() - .35) * 280;
			this.lightningBolts.push({
				x: Math.max(this.camX + 40, Math.min(this.camX + VIEW_W - 40, near)),
				warn: .55,
				struck: false
			});
		}
	}
	updateHazards(dt) {
		this.hazardTimer -= dt;
		if (this.hazard?.active) {
			this.hazard.t += dt;
			if (this.hazard.kind === "meteor" && Math.random() < .08) {
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
					fromPlayer: false
				});
			}
			if (this.hazard.kind === "lightning") this.tickLightning(dt);
			if (this.hazard.t >= this.hazard.duration) {
				this.hazard.active = false;
				this.hazard = null;
				this.lightningBolts = [];
				gameAudio.playMusic("play");
			}
		} else if (this.hazardTimer <= 0) {
			const kinds = [
				"sandstorm",
				"quake",
				"meteor",
				"lightning"
			];
			const kind = kinds[Math.floor(Math.random() * kinds.length)];
			this.hazard = {
				kind,
				t: 0,
				duration: kind === "quake" ? 4 : kind === "lightning" ? 6 : 7,
				active: true
			};
			this.hazardTimer = this.level.disasterInterval;
			this.shake = 10;
			this.lightningBolts = [];
			const hx = this.px + PLAYER_W * .5;
			const hy = this.py + PLAYER_H * .5;
			if (kind === "quake") this.fx.debris(hx, this.py + PLAYER_H, "#c4a882", 14);
			else if (kind === "meteor") this.fx.sparks(hx, hy, "#ff8844", 16);
			else if (kind === "sandstorm") this.fx.smoke(hx, hy, "#d4b48a", 10);
			else this.fx.sparks(hx, hy, "#7ef9ff", 18);
			gameAudio.playMusic("battle");
			gameAudio.play("engine", {
				volume: .35,
				rate: kind === "lightning" ? 1.4 : .9
			});
		}
	}
	checkPickups() {
		const box = this.playerBox();
		const mag = this.passives.magnet;
		if (mag > 0) {
			const cx = this.px + PLAYER_W / 2;
			const cy = this.py + PLAYER_H / 2;
			const pull = (x, y) => {
				const dx = cx - x;
				const dy = cy - y;
				const d = Math.hypot(dx, dy);
				if (d > 1 && d < mag) return {
					x: x + dx / d * 180 * FIXED_DT,
					y: y + dy / d * 180 * FIXED_DT
				};
				return {
					x,
					y
				};
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
			if (aabb(box, {
				x: c.x,
				y: c.y + Math.sin(c.bob * 4) * 5,
				w: c.w,
				h: c.h
			})) {
				c.collected = true;
				this.coinCount += 1;
				this.score += 50;
				gameAudio.play("coin", {
					volume: .5,
					rate: 1 + Math.random() * .15
				});
				this.fx.collect(c.x + 10, c.y + 10, "#ffcc33");
				this.powerPulse = Math.max(this.powerPulse, .2);
			}
		}
		for (const a of this.ammoPickups) {
			if (a.collected) continue;
			if (aabb(box, a)) {
				a.collected = true;
				this.ammo = Math.min(this.maxAmmo, this.ammo + a.amount);
				gameAudio.play("confirm", { volume: .5 });
				this.fx.collect(a.x + 10, a.y + 10, "#00f0ff", true);
				this.powerPulse = .35;
				this.chromPulse = Math.max(this.chromPulse, .18);
			}
		}
		for (const s of this.powerSeeds) {
			if (s.collected) continue;
			s.bob += FIXED_DT;
			if (aabb(box, {
				x: s.x,
				y: s.y + Math.sin(s.bob * 5) * 6,
				w: s.w,
				h: s.h
			})) {
				s.collected = true;
				this.score += 75;
				this.powerPulse = .55;
				this.chromPulse = .4;
				this.vignetteBoost = .3;
				if (s.kind === "slowmo") {
					this.slowMo = 4.5;
					gameAudio.play("checkpoint", {
						volume: .65,
						rate: .7
					});
					this.fx.collect(s.x + 12, s.y + 12, "#c77dff", true);
				} else if (s.kind === "health") {
					this.health = this.maxHealth;
					this.fx.collect(s.x + 12, s.y + 12, "#ff4466", true);
					gameAudio.play("confirm", { volume: .6 });
				} else if (s.kind === "stamina") {
					this.stamina = this.maxStamina;
					this.fx.collect(s.x + 12, s.y + 12, "#39ff9a", true);
					gameAudio.play("confirm", { volume: .6 });
				} else if (s.kind === "ammo") {
					this.ammo = this.maxAmmo;
					this.fx.collect(s.x + 12, s.y + 12, "#00f0ff", true);
					gameAudio.play("confirm", { volume: .6 });
				} else if (s.kind === "shield") {
					this.shield = this.maxShield;
					this.health = Math.min(this.maxHealth, this.health + 15);
					this.fx.collect(s.x + 12, s.y + 12, "#7ef9ff", true);
					gameAudio.play("confirm", { volume: .6 });
				} else if (s.kind === "homing") {
					this.homingBurst = 8;
					this.weapon = "homing";
					this.fx.collect(s.x + 12, s.y + 12, "#c77dff", true);
					gameAudio.play("goal", {
						volume: .45,
						rate: 1.3
					});
				} else if (s.kind === "overload") {
					this.overloadT = 8;
					this.chaosEdge = 6;
					this.fx.collect(s.x + 12, s.y + 12, "#ff9f43", true);
					gameAudio.play("goal", {
						volume: .45,
						rate: 1.3
					});
				} else if (s.kind === "rapid") {
					this.rapidT = 8;
					this.fx.collect(s.x + 12, s.y + 12, "#ffcc33", true);
					gameAudio.play("confirm", { volume: .6 });
				} else if (s.kind === "zapper") {
					this.zapperT = 8;
					this.shield = this.maxShield;
					this.fx.collect(s.x + 12, s.y + 12, "#39ff9a", true);
					gameAudio.play("checkpoint", { volume: .6 });
				}
				const op = opOfLevel(this.level.id);
				unlockPower(this.save, op.id, s.kind);
				this.radio = formatRadio(collectBeat(s.kind));
			}
		}
		if (this.chaosGem && !this.chaosGem.collected) {
			this.chaosGem.bob += FIXED_DT;
			const g = this.chaosGem;
			if (aabb(box, {
				x: g.x,
				y: g.y + Math.sin(g.bob * 5) * 6,
				w: g.w,
				h: g.h
			})) {
				g.collected = true;
				grantLevelChaos(this.save, this.level.id);
				this.lastChaos = g.id;
				this.score += 250;
				this.powerPulse = .7;
				this.chromPulse = .5;
				this.vignetteBoost = .35;
				this.chaosEdge = 5;
				this.radio = formatRadio(chaosBeat(g.id, !!this.level.epic));
				this.fx.collect(g.x + 18, g.y + 18, CHAOS_META[g.id].color, true);
				gameAudio.play("goal", {
					volume: .7,
					rate: 1.15
				});
			}
		}
		for (const p of this.platforms) if (p.kind === "checkpoint" && !p.active && aabb(box, p)) {
			p.active = true;
			this.checkpointId = p.id ?? "cp";
			this.rememberCheckpoint(p);
			this.score += 100;
			this.health = Math.min(this.maxHealth, this.health + 20);
			gameAudio.play("checkpoint", { volume: .7 });
			this.fx.collect(p.x + 10, p.y + 30, "#39ff9a", true);
			this.powerPulse = .4;
			this.chromPulse = Math.max(this.chromPulse, .2);
		}
	}
	checkGoal() {
		const box = this.playerBox();
		for (const p of this.platforms) if (p.kind === "goal" && this.bossGoalOpen && p.active !== false && aabb(box, p)) {
			this.won = true;
			this.pvx = 0;
			this.pvy = 0;
			input.clear();
			this.score += 1e3 + this.coinCount * 25 + this.health * 2;
			markCleared(this.save, this.level.id);
			gameAudio.play("goal", { volume: .8 });
			gameAudio.playMusic("win");
			this.cbs.onScreen("win");
			this.emitHud();
		}
	}
	hurt(amount, knockX) {
		if (this.invuln > 0 || this.dead || this.won) return;
		this.health -= amount * this.passives.dmgTaken;
		this.invuln = .9;
		this.hurtFlash = .2;
		this.hurtPoseT = .38;
		this.chromPulse = .35;
		this.vignetteBoost = .45;
		this.pvx = knockX;
		this.pvy = -180;
		this.shake = 5;
		gameAudio.play("hurt", { volume: .6 });
		this.fx.hazard(this.px + PLAYER_W * .5, this.py + PLAYER_H * .45);
		if (this.health <= 0) {
			this.health = 0;
			this.killPlayer();
		}
		this.emitHud();
	}
	killPlayer() {
		if (this.dead) return;
		this.dead = true;
		this.lives -= 1;
		this.pvx = 0;
		this.pvy = 0;
		input.clear();
		this.fx.playerDeath(this.px + PLAYER_W * .5, this.py + PLAYER_H * .45);
		gameAudio.play("hurt", {
			volume: .8,
			rate: .6
		});
		this.cbs.onScreen("dead");
		this.emitHud();
	}
	drawLaser(ctx, l) {
		const cx = l.x + l.w * .5;
		const cy = l.y + l.h * .5;
		const ang = Math.atan2(l.vy, l.vx);
		const isBeam = l.w >= 50;
		const trailLen = l.homing ? 42 : isBeam ? 78 : l.nova ? 22 : 32;
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(ang);
		ctx.globalCompositeOperation = "lighter";
		const grd = ctx.createLinearGradient(-trailLen, 0, l.w * .35, 0);
		grd.addColorStop(0, "rgba(0,0,0,0)");
		grd.addColorStop(.45, l.color);
		grd.addColorStop(.82, "#ffffff");
		grd.addColorStop(1, l.color);
		ctx.fillStyle = grd;
		const th = Math.max(l.h * .55, l.homing ? 7 : 4);
		ctx.beginPath();
		ctx.ellipse(-trailLen * .15, 0, trailLen * .55 + l.w * .35, th, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#ffffff";
		ctx.globalAlpha = .9;
		ctx.beginPath();
		ctx.ellipse(0, 0, Math.max(5, l.w * .28), Math.max(2.5, l.h * .28), 0, 0, Math.PI * 2);
		ctx.fill();
		if (l.homing) {
			ctx.globalAlpha = .45 + Math.sin(this.time * 18) * .15;
			ctx.strokeStyle = l.color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(0, 0, 10 + Math.sin(this.time * 14) * 2, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.restore();
	}
	draw() {
		const ctx = this.ctx;
		const w = VIEW_W;
		const h = VIEW_H;
		ctx.save();
		ctx.imageSmoothingEnabled = false;
		const cx = this.camX;
		const cy = this.camY;
		this.drawThemedParallax(ctx, cx, cy);
		const shx = this.shake > 0 ? (Math.random() - .5) * this.shake * 2 : 0;
		const shy = this.shake > 0 ? (Math.random() - .5) * this.shake * 2 : 0;
		ctx.translate(-cx + shx, -cy + shy);
		this.drawCanyonDecor(ctx);
		for (const p of this.platforms) this.drawPlatform(ctx, p);
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
		if (this.chaosGem && !this.chaosGem.collected) this.drawChaosGem(ctx, this.chaosGem);
		this.drawNeonChaosEdges(ctx);
		for (const b of this.birds) {
			if (b.dead) continue;
			this.drawBirdOutlined(ctx, b);
		}
		if (this.boss && !this.boss.dead) this.drawBoss(ctx, this.boss);
		else if (this.boss?.dead) {
			ctx.save();
			ctx.globalAlpha = .35;
			ctx.fillStyle = "#ff2bd6";
			ctx.font = "bold 18px sans-serif";
			ctx.fillText("DON CORVONE DEFEATED", this.level.width * .5 - 120, 80);
			ctx.restore();
		}
		for (const l of this.lasers) this.drawLaser(ctx, l);
		this.drawHeroCinematic(ctx);
		if (this.shielding) this.drawShieldAura(ctx, this.px + PLAYER_W * .5, this.py + PLAYER_H * .45);
		for (const r of this.jumpRings) {
			const rad = 8 + (1 - r.life / r.max) * 36;
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
			ctx.arc(r.x, r.y, rad * .72, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
		if (this.jetpacking) this.drawJetpackFlame(ctx, this.px + PLAYER_W * .5, this.py + PLAYER_H - 2);
		this.fx.draw(ctx);
		ctx.globalAlpha = 1;
		ctx.restore();
		this.drawScreenJuice(ctx, w, h);
		if (this.hazard?.active) {
			ctx.save();
			if (this.hazard.kind === "sandstorm") {
				ctx.fillStyle = "rgba(255,180,80,0.12)";
				ctx.fillRect(0, 0, w, h);
				ctx.strokeStyle = "rgba(255,200,100,0.25)";
				for (let i = 0; i < 40; i++) {
					const x = (i * 70 + this.time * 300) % (w + 40) - 20;
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
						ctx.lineTo(sx + 8, h * .35);
						ctx.lineTo(sx - 10, h * .62);
						ctx.lineTo(sx + 4, h);
						ctx.stroke();
						ctx.fillStyle = "rgba(200,255,255,0.12)";
						ctx.fillRect(sx - 18, 0, 36, h);
					} else {
						ctx.fillStyle = `rgba(126,249,255,${.08 + (.55 - bolt.warn) * .2})`;
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
		if (isBmmDebug()) {
			ctx.save();
			ctx.globalAlpha = .55;
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
	drawSetpieceFX(ctx) {
		const pal = this.themePalette();
		const t = this.time;
		const plats = this.platforms;
		for (const s of this.powerSeeds) {
			if (s.collected) continue;
			const cx = s.x + s.w / 2;
			const baseY = s.y + s.h + 22;
			ctx.fillStyle = "#1a1018";
			ctx.fillRect(cx - 40, baseY - 10, 80, 22);
			ctx.fillStyle = pal.decor;
			ctx.fillRect(cx - 34, baseY - 16, 68, 12);
			ctx.save();
			ctx.shadowColor = pal.neon;
			ctx.shadowBlur = 18 + Math.sin(t * 3) * 8;
			ctx.strokeStyle = pal.neon;
			ctx.globalAlpha = .8;
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.ellipse(cx, baseY - 12, 30, 8, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
			for (const side of [-1, 1]) {
				const px = cx + side * 48;
				const ph = 44 + Math.sin(t * 2 + side) * 5;
				ctx.fillStyle = "#120810";
				ctx.fillRect(px - 6, baseY - ph, 12, ph);
				ctx.fillStyle = pal.neon;
				ctx.globalAlpha = .5 + Math.sin(t * 4 + side * 2) * .2;
				ctx.fillRect(px - 2.5, baseY - ph + 4, 5, ph - 10);
				ctx.globalAlpha = 1;
				ctx.save();
				ctx.translate(px, baseY - ph - 12 + Math.sin(t * 3.5 + side) * 3);
				ctx.rotate(Math.PI / 4 + t * .4 * side);
				ctx.fillStyle = pal.neon + "cc";
				ctx.fillRect(-6, -6, 12, 12);
				ctx.restore();
			}
			const ray = ctx.createLinearGradient(cx, s.y - 50, cx, s.y + 100);
			ray.addColorStop(0, pal.neon + "00");
			ray.addColorStop(.4, pal.neon + "33");
			ray.addColorStop(1, pal.neon + "00");
			ctx.fillStyle = ray;
			ctx.fillRect(cx - 22, s.y - 60, 44, 180);
		}
		const oneways = plats.filter((p) => p.kind === "oneway" && p.y < this.level.height * .55);
		if (oneways.length >= 2) {
			const sorted = [...oneways].sort((a, b) => a.x - b.x);
			ctx.save();
			ctx.strokeStyle = pal.neon + "55";
			ctx.lineWidth = 2.5;
			ctx.shadowColor = pal.neon;
			ctx.shadowBlur = 6;
			for (let i = 0; i < sorted.length - 1; i++) {
				const a = sorted[i];
				const b = sorted[i + 1];
				if (b.x - a.x > 280) continue;
				const ay = a.y + 4;
				const by = b.y + 4;
				ctx.beginPath();
				ctx.moveTo(a.x + a.w * .5, ay);
				const midX = (a.x + a.w * .5 + b.x + b.w * .5) / 2;
				const sag = 18 + Math.sin(t * 1.5 + i) * 4;
				ctx.quadraticCurveTo(midX, Math.max(ay, by) + sag, b.x + b.w * .5, by);
				ctx.stroke();
			}
			for (const p of [sorted[0], sorted[sorted.length - 1]]) {
				if (!p) continue;
				const tx = p.x + p.w * .5 - 8;
				const top = p.y + p.h;
				const groundY = this.level.height - 40;
				ctx.fillStyle = "#14101c";
				ctx.fillRect(tx, top, 16, Math.min(120, groundY - top));
				ctx.fillStyle = pal.neon + "44";
				ctx.fillRect(tx, top, 16, 4);
			}
			ctx.restore();
		}
		const hazards = plats.filter((p) => p.kind === "hazard");
		for (const h of hazards) {
			ctx.save();
			ctx.globalAlpha = .35 + Math.sin(t * 5 + h.x * .02) * .1;
			ctx.fillStyle = "#ff2244";
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
			const haze = ctx.createRadialGradient(h.x + h.w / 2, h.y + h.h, 4, h.x + h.w / 2, h.y + h.h, h.w * .7);
			haze.addColorStop(0, "rgba(255,40,60,0.22)");
			haze.addColorStop(1, "rgba(255,40,60,0)");
			ctx.fillStyle = haze;
			ctx.fillRect(h.x - 20, h.y - 30, h.w + 40, h.h + 50);
		}
		const springs = plats.filter((p) => p.kind === "spring");
		for (const sp of springs) {
			const pulse = .5 + Math.sin(t * 4 + sp.x * .05) * .35;
			ctx.save();
			ctx.globalAlpha = .25 * pulse;
			ctx.strokeStyle = "#ff2bd6";
			ctx.lineWidth = 2;
			ctx.shadowColor = "#ff2bd6";
			ctx.shadowBlur = 8;
			ctx.beginPath();
			ctx.ellipse(sp.x + sp.w / 2, sp.y + sp.h + 6, 22 + pulse * 6, 7, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.ellipse(sp.x + sp.w / 2, sp.y + sp.h + 6, 14 + pulse * 4, 4, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
	}
	drawCoin(ctx, c) {
		const bob = Math.sin(c.bob * 4 + this.time * 2) * 5;
		const by = c.y + bob;
		const cx = c.x + c.w / 2;
		const cy = by + c.h / 2;
		const spin = Math.abs(Math.sin(c.bob * 5 + this.time * 4));
		const scaleX = .35 + spin * .65;
		ctx.save();
		ctx.translate(cx, cy);
		ctx.scale(scaleX, 1);
		ctx.shadowColor = "#ffcc33";
		ctx.shadowBlur = 10 + spin * 6;
		this.drawSpriteSheet(ctx, this.imgs.props, 0, -c.w / 2, -c.h / 2, c.w, c.h, false);
		ctx.restore();
		if (spin > .92) {
			ctx.fillStyle = "#ffffff";
			ctx.globalAlpha = .8;
			ctx.fillRect(cx + 6, cy - 8, 2, 2);
			ctx.fillRect(cx - 8, cy + 2, 2, 2);
			ctx.globalAlpha = 1;
		}
	}
	drawAmmoPickup(ctx, a) {
		const bob = Math.sin(this.time * 3 + a.x * .05) * 4;
		const cx = a.x + a.w / 2;
		const cy = a.y + a.h / 2 + bob;
		const pulse = .7 + Math.sin(this.time * 5) * .3;
		ctx.save();
		ctx.shadowColor = "#00f0ff";
		ctx.shadowBlur = 12 * pulse;
		ctx.strokeStyle = `rgba(0,240,255,${.35 * pulse})`;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(cx, cy, 16 + pulse * 3, 0, Math.PI * 2);
		ctx.stroke();
		this.drawSpriteSheet(ctx, this.imgs.props, 3, a.x, a.y + bob, a.w, a.h, false);
		ctx.restore();
	}
	drawPowerSeed(ctx, s) {
		const by = s.y + Math.sin(s.bob * 5 + this.time * 3) * 8;
		const cx = s.x + s.w / 2;
		const cy = by + s.h / 2;
		const meta = POWER_META[s.kind] ?? POWER_META.slowmo;
		const col = meta.color;
		const spin = this.time * 2.2 + s.bob;
		ctx.save();
		const disc = ctx.createRadialGradient(cx, cy, 4, cx, cy, 38);
		disc.addColorStop(0, "#0a0614ee");
		disc.addColorStop(.55, "#0a0614cc");
		disc.addColorStop(1, "#0a061400");
		ctx.fillStyle = disc;
		ctx.beginPath();
		ctx.arc(cx, cy, 38, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowColor = col;
		ctx.shadowBlur = 28;
		ctx.fillStyle = col + "55";
		ctx.beginPath();
		ctx.arc(cx, cy, 26 + Math.sin(this.time * 3.2 + s.bob) * 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;
		for (let i = 0; i < 4; i++) {
			const ang = spin + i * Math.PI * 2 / 4;
			const ox = Math.cos(ang) * 30;
			const oy = Math.sin(ang) * 16;
			ctx.fillStyle = "#ffffff";
			ctx.globalAlpha = .85;
			ctx.beginPath();
			ctx.arc(cx + ox, cy + oy, 3.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = col;
			ctx.globalAlpha = .9;
			ctx.beginPath();
			ctx.arc(cx + ox, cy + oy, 5, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
		const ring = 26 + Math.sin(this.time * 4 + s.bob) * 6;
		ctx.strokeStyle = "#ffffff";
		ctx.globalAlpha = .35;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(cx, cy, ring + 8, 0, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = col;
		ctx.globalAlpha = .85;
		ctx.lineWidth = 3.5;
		ctx.shadowColor = col;
		ctx.shadowBlur = 18;
		ctx.beginPath();
		ctx.arc(cx, cy, ring, 0, Math.PI * 2);
		ctx.stroke();
		ctx.globalAlpha = 1;
		ctx.translate(cx, cy);
		ctx.rotate(Math.sin(spin * .5) * .35);
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
	drawChaosGem(ctx, g) {
		const col = CHAOS_META[g.id].color;
		const by = g.y + Math.sin(g.bob * 5 + this.time * 3) * 7;
		const cx = g.x + g.w / 2;
		const cy = by + g.h / 2;
		const pulse = .7 + Math.sin(this.time * 4) * .3;
		ctx.save();
		ctx.shadowColor = col;
		ctx.shadowBlur = 18 + pulse * 10;
		ctx.translate(cx, cy);
		ctx.rotate(Math.sin(this.time * 1.6) * .12);
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
	tickBossSeeds(dt) {
		if (!this.boss || this.boss.dead || !this.level.boss) return;
		const op = opOfLevel(this.level.id);
		const unlocked = this.save.inventory[op.id] ?? [];
		if (unlocked.length === 0) return;
		this.bossSeedCd -= dt;
		const live = this.powerSeeds.filter((s) => !s.collected).length;
		if (this.bossSeedCd > 0 || live >= 2) return;
		let kind = unlocked[Math.floor(Math.random() * unlocked.length)];
		if (this.health / this.maxHealth < .4 && unlocked.includes("health")) kind = "health";
		else if (this.ammo < 8 && unlocked.includes("ammo")) kind = "ammo";
		else if (this.shield < this.maxShield * .3 && unlocked.includes("shield")) kind = "shield";
		this.powerSeeds.push({
			x: this.level.width * .25 + Math.random() * this.level.width * .5,
			y: 180 + Math.random() * 80,
			w: 56,
			h: 56,
			collected: false,
			bob: Math.random(),
			kind
		});
		this.bossSeedCd = Math.max(4.2, 9 - unlocked.length * .45);
	}
	/** Full palette cycle along world bounds — Neon Chaos juice */
	drawNeonChaosEdges(ctx) {
		const L = this.level;
		if (!L) return;
		const active = this.chaosEdge > 0;
		const speed = active ? 8 : 2.2;
		const thick = active ? 10 : 5;
		const alpha = active ? .85 : .4;
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.lineWidth = thick;
		ctx.shadowBlur = active ? 18 : 8;
		const segs = 24;
		for (let i = 0; i < segs; i++) {
			const x0 = i / segs * L.width;
			const x1 = (i + 1) / segs * L.width;
			const col = NEON_CHAOS[Math.floor((this.time * speed + i + 4) % NEON_CHAOS.length)];
			ctx.strokeStyle = col;
			ctx.shadowColor = col;
			ctx.beginPath();
			ctx.moveTo(x0, L.height - 4);
			ctx.lineTo(x1, L.height - 4);
			ctx.stroke();
		}
		const vSegs = 16;
		for (let i = 0; i < vSegs; i++) {
			const y0 = i / vSegs * L.height;
			const y1 = (i + 1) / vSegs * L.height;
			const colL = NEON_CHAOS[Math.floor((this.time * speed + i + 2) % NEON_CHAOS.length)];
			const colR = NEON_CHAOS[Math.floor((this.time * speed + i + 6) % NEON_CHAOS.length)];
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
	drawScreenJuice(ctx, w, h) {
		const vig = .28 + this.vignetteBoost * .55 + (this.slowMo > 0 ? .12 : 0);
		const g = ctx.createRadialGradient(w * .5, h * .48, h * .2, w * .5, h * .5, h * .78);
		g.addColorStop(0, "rgba(0,0,0,0)");
		g.addColorStop(.65, "rgba(0,0,0,0)");
		g.addColorStop(1, `rgba(8,4,18,${Math.min(.85, vig)})`);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
		const pulse = Math.max(this.chromPulse, this.powerPulse * .7);
		if (pulse > .02) {
			const shift = 3 + pulse * 10;
			ctx.save();
			ctx.globalCompositeOperation = "screen";
			ctx.globalAlpha = Math.min(.45, pulse * 1.2);
			ctx.fillStyle = "rgba(255,40,80,0.35)";
			ctx.fillRect(-shift, 0, w, h);
			ctx.fillStyle = "rgba(0,240,255,0.3)";
			ctx.fillRect(shift, 0, w, h);
			ctx.fillStyle = "rgba(255,43,214,0.18)";
			ctx.fillRect(0, -shift * .4, w, h);
			ctx.restore();
		}
		if (this.slowMo > 0) {
			ctx.save();
			ctx.globalAlpha = .28;
			ctx.fillStyle = "#1a1030";
			ctx.globalCompositeOperation = "saturation";
			ctx.fillRect(0, 0, w, h);
			ctx.globalCompositeOperation = "source-over";
			ctx.globalAlpha = .18;
			ctx.fillStyle = "#6080c0";
			ctx.fillRect(0, 0, w, h);
			ctx.globalAlpha = .9;
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
		if (typeof this.canvas !== "undefined" && this.canvas.style) {
			if (this.slowMo > 0) this.canvas.style.filter = "saturate(0.4) brightness(0.92) contrast(1.05)";
			else if (this.chromPulse > .15) this.canvas.style.filter = "contrast(1.08) saturate(1.15)";
			else this.canvas.style.filter = "contrast(1.06) saturate(1.08)";
		}
		this.drawCinematicGrade(ctx, w, h);
	}
	/** Phase 4 screen finish: grade, scanlines, grain, speed lines, letterbox. */
	drawCinematicGrade(ctx, w, h) {
		ctx.save();
		ctx.globalCompositeOperation = "overlay";
		ctx.globalAlpha = .16;
		const grade = ctx.createLinearGradient(0, 0, 0, h);
		grade.addColorStop(0, "#3a1060");
		grade.addColorStop(.45, "#0a1828");
		grade.addColorStop(1, "#3a1208");
		ctx.fillStyle = grade;
		ctx.fillRect(0, 0, w, h);
		ctx.globalCompositeOperation = "screen";
		ctx.globalAlpha = .07;
		ctx.fillStyle = "#00f0ff";
		ctx.fillRect(0, 0, w, h * .35);
		ctx.fillStyle = "#ff2bd6";
		ctx.fillRect(0, h * .72, w, h * .28);
		ctx.restore();
		ctx.save();
		ctx.globalAlpha = .055;
		ctx.fillStyle = "#000";
		for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
		ctx.restore();
		ctx.save();
		ctx.globalAlpha = .035;
		const seed = Math.floor(this.time * 24);
		for (let i = 0; i < 70; i++) {
			const gx = (i * 97 + seed * 13) % w;
			const gy = (i * 53 + seed * 29) % h;
			ctx.fillStyle = i % 2 === 0 ? "#fff" : "#000";
			ctx.fillRect(gx, gy, 2, 2);
		}
		ctx.restore();
		const speed = Math.hypot(this.pvx, this.pvy);
		const rush = this.jetpacking ? .45 : this.pvy > 380 ? Math.min(.7, (this.pvy - 280) / 600) : speed > 240 ? .18 : 0;
		if (rush > .04) {
			ctx.save();
			ctx.globalAlpha = rush * .55;
			ctx.strokeStyle = this.character === "grok" ? "rgba(0,240,255,0.55)" : "rgba(57,255,154,0.5)";
			ctx.lineWidth = 1.4;
			const cx = w * .42;
			const cy = h * .52;
			for (let i = 0; i < 14; i++) {
				const a = -.35 + i * .055 + Math.sin(this.time * 9 + i) * .02;
				const len = 80 + rush * 160 + i % 3 * 20;
				ctx.beginPath();
				ctx.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 40);
				ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * (len * .45));
				ctx.stroke();
			}
			ctx.restore();
		}
		const box = this.slowMo > 0 ? 28 : this.level?.boss ? 16 : 8;
		if (box > 0) {
			ctx.fillStyle = "rgba(6,2,14,0.82)";
			ctx.fillRect(0, 0, w, box);
			ctx.fillRect(0, h - box, w, box);
		}
	}
	themePalette() {
		const theme = this.level?.theme ?? "dunes";
		const map = {
			dunes: {
				sky: [
					"#2a0a48",
					"#6a2080",
					"#e06040",
					"#ffb070"
				],
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
				clouds: true
			},
			bridges: {
				sky: [
					"#1a3a7a",
					"#3a70b8",
					"#70b0e0",
					"#c0e8ff"
				],
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
				clouds: true
			},
			spikes: {
				sky: [
					"#3a1040",
					"#6a1848",
					"#b04050",
					"#e87860"
				],
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
				clouds: false
			},
			storm: {
				sky: [
					"#3a3050",
					"#6a6078",
					"#b0a090",
					"#e0d0b0"
				],
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
				clouds: true
			},
			vertical: {
				sky: [
					"#302060",
					"#5060b0",
					"#90a0e0",
					"#d0e0ff"
				],
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
				clouds: true
			},
			hq: {
				sky: [
					"#201040",
					"#502080",
					"#a040b0",
					"#f080c0"
				],
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
				clouds: false
			},
			boss: {
				sky: [
					"#180828",
					"#401050",
					"#802060",
					"#c04040"
				],
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
				clouds: false
			}
		};
		return map[theme] ?? map.dunes;
	}
	/** Multi-layer parallax sky / terrain — Op 1 visual kit + theme fallbacks */
	drawThemedParallax(ctx, camX, camY) {
		const w = VIEW_W;
		const h = VIEW_H;
		const pal = this.themePalette();
		const t = this.time;
		const slot = Math.max(0, ((this.level?.id ?? 1) - 1) % 10);
		const slotPlate = slot >= 0 && slot < 9 ? this.imgs[`bgL${slot + 1}`] : void 0;
		const dunes = (this.level?.theme ?? "dunes") === "dunes";
		const skyShift = Math.min(40, camY * .04);
		const sky = ctx.createLinearGradient(0, -skyShift, 0, h - skyShift * .3);
		sky.addColorStop(0, pal.sky[0]);
		sky.addColorStop(.32, pal.sky[1]);
		sky.addColorStop(.62, pal.sky[2]);
		sky.addColorStop(1, pal.sky[3]);
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, w, h);
		if (pal.stars) {
			ctx.fillStyle = "#ffffff";
			for (let i = 0; i < 90; i++) {
				const sx = ((i * 97 - camX * .04 + t * 2) % (w + 40) + w + 40) % (w + 40) - 20;
				const sy = ((i * 53 - camY * .025) % (h * .5) + h * .5) % (h * .5);
				ctx.globalAlpha = .2 + i % 5 * .12;
				ctx.fillRect(sx, sy, i % 7 === 0 ? 3 : 1.5, i % 7 === 0 ? 3 : 1.5);
			}
			ctx.globalAlpha = 1;
		}
		if (pal.clouds) for (let i = 0; i < 7; i++) {
			const cx = ((i * 210 - camX * .07 + t * 10) % (w + 220) + w + 220) % (w + 220) - 110;
			const cy = 50 + i % 3 * 36 + Math.sin(t * .35 + i) * 7 - camY * .03;
			const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90);
			cg.addColorStop(0, "rgba(255,200,180,0.16)");
			cg.addColorStop(1, "rgba(255,180,200,0)");
			ctx.fillStyle = cg;
			ctx.beginPath();
			ctx.ellipse(cx, cy, 80 + i % 3 * 18, 20 + i % 2 * 6, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		this.drawSkySun(ctx, camX, camY, pal);
		if (slotPlate) {
			const farY = h * .22 - 16;
			this.drawParallaxPlate(ctx, slotPlate, camX * .08, camY * .02, farY, .9, .64);
			this.blendSkyJoin(ctx, farY, pal);
		} else if (dunes && this.imgs.bgFar) {
			const farY = h * .28 - 16;
			this.drawParallaxPlate(ctx, this.imgs.bgFar, camX * .08, camY * .02, farY, .8, .64);
			this.blendSkyJoin(ctx, farY, pal);
		} else {
			this.drawMesaLayer(ctx, camX * .1, h * .5, pal.far, 1.4, .5, false, pal.neon);
			this.blendSkyJoin(ctx, h * .42, pal);
		}
		const fog1 = ctx.createLinearGradient(0, h * .4, 0, h * .68);
		fog1.addColorStop(0, "rgba(0,0,0,0)");
		fog1.addColorStop(.45, pal.haze);
		fog1.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = fog1;
		ctx.fillRect(0, h * .36, w, h * .4);
		if (slot === 0 && this.imgs.bgMid) this.drawParallaxPlate(ctx, this.imgs.bgMid, camX * .22, camY * .04, h * .34, .75, .22);
		else this.drawMesaLayer(ctx, camX * .26, h * .56, pal.mid, 1.05, .72, true, pal.neon);
		this.drawMesaLayer(ctx, camX * .45, h * .64, pal.near, .78, .92, true, pal.neon);
		const haze = ctx.createLinearGradient(0, h * .5, 0, h * .85);
		haze.addColorStop(0, "rgba(0,0,0,0)");
		haze.addColorStop(.4, pal.haze);
		haze.addColorStop(1, "rgba(20,5,15,0.35)");
		ctx.fillStyle = haze;
		ctx.fillRect(0, h * .48, w, h * .45);
		this.drawGridFloor(ctx, camX * .7, camY * .2, pal);
		if (dunes) {
			ctx.save();
			ctx.globalAlpha = .06;
			for (let i = 0; i < 5; i++) {
				const y = h * .58 + i * 22 + Math.sin(t * 2 + i) * 4;
				ctx.fillStyle = i % 2 === 0 ? "#ffcc88" : "#ff80c0";
				ctx.fillRect(0, y, w, 3 + Math.sin(t * 3 + i) * 1.5);
			}
			ctx.restore();
		}
		ctx.fillStyle = pal.neon;
		for (let i = 0; i < 24; i++) {
			const mx = ((i * 130 - camX * .9 + t * 35) % (w + 30) + w + 30) % (w + 30) - 15;
			const my = h * .52 + (i * 71 + t * 22) % (h * .42);
			ctx.globalAlpha = .12 + i % 4 * .05;
			ctx.beginPath();
			ctx.arc(mx, my, 1.2 + i % 3, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}
	/** Sun lives in the sky gradient — soft corona, no plate-edge sticker, no stroke. */
	drawSkySun(ctx, camX, camY, pal) {
		const w = VIEW_W;
		const h = VIEW_H;
		const t = this.time;
		const sunX = w * .74 - camX * .02;
		const sunY = h * .12 - camY * .015;
		const corona = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 190);
		corona.addColorStop(0, "#fff8e8");
		corona.addColorStop(.07, pal.sun[0]);
		corona.addColorStop(.18, hexA(pal.sun[1], .55));
		corona.addColorStop(.42, hexA(pal.sun[1], .16));
		corona.addColorStop(1, "#00000000");
		ctx.fillStyle = corona;
		ctx.beginPath();
		ctx.arc(sunX, sunY, 190, 0, Math.PI * 2);
		ctx.fill();
		ctx.save();
		ctx.globalAlpha = .04;
		for (let i = -3; i <= 3; i++) {
			const ang = i * .12 + Math.sin(t * .2) * .02;
			ctx.fillStyle = pal.sun[0];
			ctx.beginPath();
			ctx.moveTo(sunX, sunY);
			ctx.lineTo(sunX + Math.sin(ang) * 520, sunY + Math.cos(ang) * 520);
			ctx.lineTo(sunX + Math.sin(ang + .035) * 520, sunY + Math.cos(ang + .035) * 520);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();
		const core = ctx.createRadialGradient(sunX - 3, sunY - 3, 1, sunX, sunY, 24);
		core.addColorStop(0, "#fffef4");
		core.addColorStop(.45, pal.sun[0]);
		core.addColorStop(1, hexA(pal.sun[1], 0));
		ctx.fillStyle = core;
		ctx.beginPath();
		ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
		ctx.fill();
	}
	/** Night → far plate. The plate's own top 14px is already transparent. */
	blendSkyJoin(_ctx, _plateTop, _pal) {}
	drawParallaxPlate(ctx, img, scrollX, scrollY, yOffset, alpha, srcTopCrop = .25) {
		const w = VIEW_W;
		const h = VIEW_H;
		const srcY = img.height * srcTopCrop;
		const srcH = img.height * (1 - srcTopCrop);
		const aspect = img.width / Math.max(1, srcH);
		const drawH = h * .58;
		const drawW = drawH * aspect;
		const x = -(scrollX % drawW + drawW) % drawW;
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
		const drawY = yOffset - scrollY * .3;
		for (let i = -1; i <= 2; i++) b.drawImage(img, 0, srcY, img.width, srcH, x + i * drawW, drawY, drawW, drawH);
		b.save();
		b.globalCompositeOperation = "destination-out";
		const melt = b.createLinearGradient(0, drawY, 0, drawY + 16);
		melt.addColorStop(0, "rgba(0,0,0,1)");
		melt.addColorStop(.55, "rgba(0,0,0,0.45)");
		melt.addColorStop(1, "rgba(0,0,0,0)");
		b.fillStyle = melt;
		b.fillRect(0, drawY, w, 16);
		b.restore();
		const fade = b.createLinearGradient(0, drawY + drawH * .5, 0, drawY + drawH);
		fade.addColorStop(0, "rgba(10,4,18,0)");
		fade.addColorStop(1, "rgba(10,4,18,0.9)");
		b.fillStyle = fade;
		b.fillRect(0, drawY + drawH * .5, w, drawH * .55);
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.drawImage(buf, 0, 0);
		ctx.restore();
	}
	/** Flat-top mesa silhouettes — reads as desert canyon, not sine waves */
	drawMesaLayer(ctx, scroll, baseY, color, scale, alpha, strata, neonRim) {
		ctx.save();
		ctx.globalAlpha = alpha;
		const mesas = [
			{
				x: 0,
				w: 180,
				h: 90
			},
			{
				x: 200,
				w: 120,
				h: 60
			},
			{
				x: 360,
				w: 200,
				h: 110
			},
			{
				x: 600,
				w: 90,
				h: 45
			},
			{
				x: 720,
				w: 160,
				h: 80
			},
			{
				x: 920,
				w: 140,
				h: 70
			},
			{
				x: 1100,
				w: 190,
				h: 100
			},
			{
				x: 1320,
				w: 100,
				h: 50
			}
		];
		const period = 1500;
		const off = (scroll % period + period) % period;
		for (let rep = -1; rep <= 1; rep++) for (const m of mesas) {
			const x = m.x - off + rep * period;
			const mh = m.h * scale;
			const mw = m.w * scale;
			const top = baseY - mh;
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.moveTo(x, baseY + 80);
			ctx.lineTo(x + mw * .08, top + mh * .25);
			ctx.lineTo(x + mw * .12, top);
			ctx.lineTo(x + mw * .88, top);
			ctx.lineTo(x + mw * .95, top + mh * .3);
			ctx.lineTo(x + mw, baseY + 80);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = "rgba(255,220,200,0.12)";
			ctx.fillRect(x + mw * .12, top, mw * .76, 5);
			if (strata) {
				ctx.strokeStyle = "rgba(0,0,0,0.18)";
				ctx.lineWidth = 2;
				for (let s = 1; s <= 3; s++) {
					const sy = top + mh * s / 4;
					ctx.beginPath();
					ctx.moveTo(x + mw * .1, sy);
					ctx.lineTo(x + mw * .9, sy + 2);
					ctx.stroke();
				}
			}
			if (neonRim) {
				ctx.save();
				ctx.shadowColor = neonRim;
				ctx.shadowBlur = 10;
				ctx.strokeStyle = neonRim;
				ctx.globalAlpha = .45 * alpha;
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.moveTo(x + mw * .12, top + 1);
				ctx.lineTo(x + mw * .88, top + 1);
				ctx.stroke();
				ctx.restore();
			}
		}
		ctx.fillStyle = color;
		ctx.fillRect(0, baseY + 40, VIEW_W, VIEW_H - baseY);
		ctx.restore();
	}
	drawMountains(ctx, scroll, baseY, color, scale, alpha = 1) {
		this.drawMesaLayer(ctx, scroll, baseY, color, scale, alpha, true);
	}
	drawGridFloor(ctx, cx, _cy, pal) {
		const p = pal ?? this.themePalette();
		const theme = this.level?.theme ?? "dunes";
		const horizon = VIEW_H * .72;
		const tech = theme === "bridges" || theme === "hq" || theme === "vertical";
		const earth = ctx.createLinearGradient(0, horizon - 80, 0, VIEW_H);
		earth.addColorStop(0, "rgba(0,0,0,0)");
		earth.addColorStop(.2, "rgba(0,0,0,0)");
		earth.addColorStop(.4, tech ? "rgba(20,30,55,0.16)" : "rgba(60,25,30,0.14)");
		earth.addColorStop(.68, tech ? "rgba(20,30,55,0.46)" : "rgba(60,25,30,0.48)");
		earth.addColorStop(1, p.floorB);
		ctx.fillStyle = earth;
		ctx.fillRect(0, horizon - 80, VIEW_W, VIEW_H - horizon + 80);
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, horizon + 18, VIEW_W, VIEW_H - horizon - 18);
		ctx.clip();
		if (tech) {
			ctx.strokeStyle = "rgba(0,0,0,0.28)";
			ctx.lineWidth = 2;
			for (let i = 0; i < 12; i++) {
				const x0 = (i * 110 - cx * .35) % (VIEW_W + 100) - 50;
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
				const x0 = (i * 97 - cx * .4) % (VIEW_W + 80) - 40;
				const y0 = horizon + 28 + i % 5 * 28;
				ctx.beginPath();
				ctx.moveTo(x0, y0);
				ctx.quadraticCurveTo(x0 + 30, y0 + 12, x0 + 55, y0 - 4);
				ctx.stroke();
			}
		}
		ctx.restore();
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, horizon, VIEW_W, VIEW_H - horizon);
		ctx.clip();
		ctx.strokeStyle = p.grid;
		ctx.lineWidth = 1.2;
		for (let i = 0; i < 16; i++) {
			const t = i / 16;
			const y = horizon + Math.pow(t, 1.6) * (VIEW_H - horizon);
			ctx.globalAlpha = .03 + t * .26;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(VIEW_W, y);
			ctx.stroke();
		}
		for (let i = -16; i <= 16; i++) {
			const x0 = VIEW_W / 2 + i * 40 - cx * .3 % 40;
			ctx.globalAlpha = .1;
			ctx.beginPath();
			ctx.moveTo(VIEW_W / 2, horizon + 10);
			ctx.lineTo(x0 + i * 55, VIEW_H);
			ctx.stroke();
		}
		ctx.restore();
	}
	drawCanyonDecor(ctx) {
		const pal = this.themePalette();
		const theme = this.level?.theme ?? "dunes";
		const ground = this.level.height - 56;
		const t = this.time;
		for (let i = 0; i < 22; i++) {
			const x = i * 240 + 40;
			const variant = (i * 3 + theme.length * 7) % 7;
			if (variant === 0) {
				const hh = 130 + i % 4 * 32;
				const y = ground - hh;
				ctx.fillStyle = pal.decor;
				ctx.fillRect(x, y, 40, hh);
				ctx.fillStyle = "#0e0610";
				ctx.fillRect(x + 5, y + 14, 30, 44);
				ctx.fillStyle = pal.neon;
				ctx.globalAlpha = .9;
				ctx.fillRect(x + 9, y + 20, 22, 9);
				ctx.fillRect(x + 9, y + 34, 16, 6);
				ctx.globalAlpha = 1;
				ctx.fillStyle = pal.neon + "66";
				ctx.fillRect(x, y, 40, 5);
				ctx.fillStyle = pal.neon;
				ctx.globalAlpha = .35 + Math.sin(t * 3 + i) * .2;
				ctx.fillRect(x + 14, y + 70, 12, Math.max(20, hh - 95));
				ctx.globalAlpha = 1;
				ctx.save();
				ctx.shadowColor = pal.neon;
				ctx.shadowBlur = 12;
				ctx.fillStyle = pal.neon;
				ctx.fillRect(x + 12, y - 8, 16, 8);
				ctx.restore();
			} else if (variant === 1) {
				const h2 = 80 + i % 5 * 22;
				ctx.fillStyle = pal.near;
				ctx.beginPath();
				ctx.moveTo(x, ground);
				ctx.lineTo(x + 18, ground - h2);
				ctx.lineTo(x + 28, ground - h2 * .85);
				ctx.lineTo(x + 52, ground);
				ctx.closePath();
				ctx.fill();
				ctx.strokeStyle = pal.neon + "77";
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.moveTo(x + 8, ground - h2 * .25);
				ctx.lineTo(x + 18, ground - h2);
				ctx.lineTo(x + 38, ground - h2 * .3);
				ctx.stroke();
				ctx.fillStyle = pal.neon + "55";
				ctx.beginPath();
				ctx.arc(x + 18, ground - h2, 6, 0, Math.PI * 2);
				ctx.fill();
			} else if (variant === 2) for (let c = 0; c < 5; c++) {
				const cx = x + c * 16;
				const cy = ground - 10 - c % 3 * 5;
				ctx.fillStyle = "#e8a050";
				ctx.beginPath();
				ctx.arc(cx, cy, 5, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = "#fff0c0aa";
				ctx.beginPath();
				ctx.arc(cx - 1.5, cy - 1.5, 2, 0, Math.PI * 2);
				ctx.fill();
			}
			else if (variant === 3) {
				const y = ground - 120 - i % 3 * 20;
				ctx.strokeStyle = "#1a1018";
				ctx.lineWidth = 5;
				ctx.beginPath();
				ctx.moveTo(x + 22, ground);
				ctx.lineTo(x + 22, y);
				ctx.stroke();
				ctx.strokeStyle = pal.neon;
				ctx.globalAlpha = .75;
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
				const ww = 80 + i % 3 * 20;
				ctx.fillStyle = pal.decor;
				ctx.fillRect(x, ground - 32, ww, 32);
				ctx.fillStyle = "rgba(255,255,255,0.08)";
				ctx.fillRect(x, ground - 32, ww, 6);
				ctx.fillStyle = pal.neon + "55";
				ctx.fillRect(x, ground - 32, ww, 4);
				for (let b = 0; b < 3; b++) {
					ctx.fillStyle = pal.neon + "88";
					ctx.beginPath();
					ctx.arc(x + 14 + b * 24, ground - 16, 3, 0, Math.PI * 2);
					ctx.fill();
				}
			} else if (variant === 5) {
				if (theme === "bridges" || theme === "vertical") {
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
					ctx.fillStyle = "#3a1018";
					ctx.fillRect(x + 6, ground - 48, 36, 48);
					ctx.fillStyle = "#ff4466";
					ctx.globalAlpha = .7 + Math.sin(t * 4 + i) * .2;
					ctx.fillRect(x + 10, ground - 40, 28, 8);
					ctx.fillRect(x + 14, ground - 28, 20, 6);
					ctx.globalAlpha = 1;
					ctx.strokeStyle = "#ff6688";
					ctx.lineWidth = 2;
					ctx.strokeRect(x + 6, ground - 48, 36, 48);
				} else if (theme === "hq") {
					ctx.fillStyle = "#2a1038";
					ctx.fillRect(x, ground - 70, 70, 50);
					ctx.fillStyle = pal.neon;
					ctx.globalAlpha = .6 + Math.sin(t * 2 + i) * .25;
					ctx.fillRect(x + 6, ground - 62, 58, 12);
					ctx.fillRect(x + 10, ground - 42, 40, 8);
					ctx.globalAlpha = 1;
					ctx.fillStyle = "#1a0818";
					ctx.fillRect(x + 28, ground - 20, 14, 20);
				} else {
					ctx.fillStyle = pal.near;
					ctx.fillRect(x + 14, ground - 70, 18, 70);
					ctx.fillRect(x, ground - 45, 14, 12);
					ctx.fillRect(x + 32, ground - 55, 14, 12);
					ctx.fillStyle = pal.neon + "44";
					ctx.fillRect(x + 14, ground - 70, 18, 4);
				}
			} else {
				const pulse = .5 + Math.sin(t * 2.5 + i * .7) * .3;
				ctx.fillStyle = pal.decor;
				ctx.fillRect(x + 8, ground - 40, 44, 40);
				ctx.fillStyle = "#0a0610";
				ctx.fillRect(x + 14, ground - 32, 32, 24);
				ctx.save();
				ctx.shadowColor = pal.neon;
				ctx.shadowBlur = 14 * pulse;
				ctx.fillStyle = pal.neon;
				ctx.globalAlpha = .55 + pulse * .35;
				ctx.fillRect(x + 20, ground - 26, 20, 12);
				ctx.restore();
				ctx.globalAlpha = 1;
				ctx.save();
				ctx.translate(x + 30, ground - 58 + Math.sin(t * 3 + i) * 4);
				ctx.rotate(Math.PI / 4);
				ctx.fillStyle = pal.neon + "aa";
				ctx.fillRect(-6, -6, 12, 12);
				ctx.restore();
			}
		}
		if (theme === "bridges" || theme === "hq" || theme === "vertical") {
			ctx.strokeStyle = pal.neon + "33";
			ctx.lineWidth = 2;
			for (let c = 0; c < 3; c++) {
				const y0 = ground - 200 - c * 40;
				ctx.beginPath();
				ctx.moveTo(0, y0);
				for (let sx = 0; sx < 2e3; sx += 80) ctx.lineTo(sx, y0 + Math.sin(sx * .02 + c) * 12);
				ctx.stroke();
			}
		}
	}
	drawPlatform(ctx, p) {
		if (p.kind === "checkpoint") {
			const on = !!p.active;
			const col = on ? "#39ff9a" : "#c77dff";
			ctx.fillStyle = "#1a1220";
			ctx.fillRect(p.x + 11, p.y, 5, p.h);
			ctx.fillStyle = col;
			ctx.globalAlpha = .5;
			ctx.fillRect(p.x + 12, p.y, 3, p.h);
			ctx.globalAlpha = 1;
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
			ctx.shadowBlur = 0;
			ctx.fillStyle = "#2a1a30";
			ctx.fillRect(p.x + 4, p.y + p.h - 6, 20, 6);
			ctx.fillStyle = col;
			ctx.globalAlpha = .6;
			ctx.fillRect(p.x + 6, p.y + p.h - 5, 16, 2);
			ctx.restore();
			return;
		}
		if (p.kind === "goal") {
			const on = p.active !== false;
			const gPulse = .7 + Math.sin(this.time * 4) * .3;
			const cx = p.x + p.w / 2;
			const cy = p.y + p.h * .42;
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
			ctx.ellipse(cx, cy, rx * .55, ry * .55, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.globalAlpha = on ? .22 * gPulse : .08;
			ctx.fillStyle = "#00f0ff";
			ctx.beginPath();
			ctx.ellipse(cx, cy, rx * .45, ry * .45, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = on ? .2 * gPulse : .08;
			ctx.fillRect(cx - 2, p.y - 36, 4, 36);
			ctx.restore();
			return;
		}
		if (p.kind === "spring") {
			const bounce = 1 + Math.sin(this.time * 6 + p.x * .05) * .08;
			const dy = (1 - bounce) * 6;
			ctx.save();
			ctx.shadowColor = "#ff2bd6";
			ctx.shadowBlur = 12 + Math.sin(this.time * 5) * 4;
			this.drawSpriteSheet(ctx, this.imgs.props, 1, p.x - 4, p.y - 8 + dy, p.w + 8, (p.h + 12) * bounce, false);
			ctx.globalAlpha = .35 + Math.sin(this.time * 5) * .15;
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
			const throb = .85 + Math.sin(this.time * 7 + p.x * .1) * .15;
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
			ctx.save();
			ctx.globalAlpha = .25 + Math.sin(this.time * 6) * .1;
			ctx.shadowColor = "#ff4466";
			ctx.shadowBlur = 10;
			ctx.fillStyle = "#ff4466";
			ctx.fillRect(p.x, p.y + p.h - 4, p.w, 3);
			ctx.restore();
			return;
		}
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
	drawConveyorBelt(ctx, p) {
		const { x, y, w } = p;
		const dir = Math.sign(p.vx ?? 80) || 1;
		const speed = Math.abs(p.vx ?? 80);
		const pulse = .65 + Math.sin(this.time * 6) * .2;
		const scroll = this.time * speed * .45 % 22 * dir;
		const hh = 28;
		ctx.save();
		ctx.fillStyle = "rgba(0,0,0,0.4)";
		ctx.fillRect(x + 4, y + hh, w - 8, 6);
		const body = ctx.createLinearGradient(x, y, x, y + hh);
		body.addColorStop(0, "#b8ff9a");
		body.addColorStop(.35, "#3dff6a");
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
		ctx.strokeStyle = `rgba(180,255,160,${.75 + pulse * .2})`;
		ctx.lineWidth = 2.5;
		ctx.strokeRect(x + .5, y + .5, w - 1, 27);
		ctx.restore();
	}
	/** Theme-aware solid ledges — rock / metal / tech / crimson variants, large features for mobile */
	drawRockLedge(ctx, p) {
		const x = p.x;
		const y = p.y;
		const w = p.w;
		const h = p.h;
		const rimPulse = .6 + Math.sin(this.time * 2.2 + x * .01) * .12;
		Math.min(16, Math.max(11, Math.floor(h * .36)));
		const theme = this.level?.theme ?? "dunes";
		const pal = this.themePalette();
		const mats = {
			dunes: {
				body0: "#5c3424",
				body1: "#3a2014",
				body2: "#140a08",
				brickA: "rgba(100,60,38,0.7)",
				brickB: "rgba(35,18,12,0.6)",
				brickHi: "rgba(255,200,150,0.12)",
				top0: "#ffe0b0",
				top1: "#ffb05a",
				top2: "#d07838",
				top3: "#5c3424",
				edge: "#8a4a28",
				rim: "#ffc878",
				rimGlow: "#ff9f43",
				bolt: "#ffe0b0",
				stroke: "rgba(255,180,100,0.45)"
			},
			storm: {
				body0: "#5a5040",
				body1: "#383028",
				body2: "#181410",
				brickA: "rgba(90,80,60,0.7)",
				brickB: "rgba(40,35,28,0.6)",
				brickHi: "rgba(255,230,180,0.1)",
				top0: "#f0e0c0",
				top1: "#d0b080",
				top2: "#a08858",
				top3: "#504830",
				edge: "#706050",
				rim: "#ffcc66",
				rimGlow: "#ffaa33",
				bolt: "#fff0c0",
				stroke: "rgba(255,220,140,0.4)"
			},
			bridges: {
				body0: "#2a4868",
				body1: "#183048",
				body2: "#0a1420",
				brickA: "rgba(50,90,120,0.65)",
				brickB: "rgba(20,40,60,0.55)",
				brickHi: "rgba(160,220,255,0.12)",
				top0: "#c0e8ff",
				top1: "#70b0e0",
				top2: "#4080b0",
				top3: "#204060",
				edge: "#306080",
				rim: "#7ef9ff",
				rimGlow: "#00e0ff",
				bolt: "#e0f8ff",
				stroke: "rgba(120,220,255,0.45)"
			},
			vertical: {
				body0: "#384878",
				body1: "#283050",
				body2: "#101828",
				brickA: "rgba(70,90,140,0.65)",
				brickB: "rgba(30,40,70,0.55)",
				brickHi: "rgba(180,200,255,0.12)",
				top0: "#d0e0ff",
				top1: "#90a8e0",
				top2: "#6070b0",
				top3: "#304060",
				edge: "#405080",
				rim: "#c0a0ff",
				rimGlow: "#a070ff",
				bolt: "#e8e0ff",
				stroke: "rgba(180,160,255,0.45)"
			},
			hq: {
				body0: "#482868",
				body1: "#301848",
				body2: "#140820",
				brickA: "rgba(90,50,120,0.65)",
				brickB: "rgba(40,20,60,0.55)",
				brickHi: "rgba(255,160,255,0.12)",
				top0: "#ffb0f0",
				top1: "#e060c0",
				top2: "#a03090",
				top3: "#501860",
				edge: "#703088",
				rim: "#ff6ad5",
				rimGlow: "#ff2bd6",
				bolt: "#ffd0f0",
				stroke: "rgba(255,120,220,0.45)"
			},
			spikes: {
				body0: "#4a2030",
				body1: "#301018",
				body2: "#140808",
				brickA: "rgba(100,40,50,0.7)",
				brickB: "rgba(40,15,20,0.6)",
				brickHi: "rgba(255,140,150,0.12)",
				top0: "#ffb0a0",
				top1: "#e06060",
				top2: "#a03040",
				top3: "#501828",
				edge: "#803040",
				rim: "#ff6688",
				rimGlow: "#ff4466",
				bolt: "#ffd0d0",
				stroke: "rgba(255,120,140,0.45)"
			},
			boss: {
				body0: "#401030",
				body1: "#280818",
				body2: "#100408",
				brickA: "rgba(90,30,50,0.7)",
				brickB: "rgba(40,10,20,0.6)",
				brickHi: "rgba(255,80,160,0.14)",
				top0: "#ff80c0",
				top1: "#e04080",
				top2: "#a02050",
				top3: "#400820",
				edge: "#702040",
				rim: "#ff2bd6",
				rimGlow: "#ff4466",
				bolt: "#ffb0d0",
				stroke: "rgba(255,80,180,0.5)"
			}
		};
		const m = mats[theme] ?? mats.dunes;
		const form = p.form ?? (theme === "dunes" ? "mesa" : theme === "bridges" ? "deck" : theme === "spikes" ? "tooth" : theme === "storm" ? "wreck" : theme === "vertical" ? "girder" : theme === "hq" ? "panel" : theme === "boss" ? "hex" : "slab");
		const visH = form === "mesa" ? Math.max(h + 62, 118) : form === "bowl" ? Math.max(h + 50, 100) : form === "steps" ? Math.max(h + 40, 96) : form === "arch" ? Math.max(h + 36, 100) : form === "ramp" ? h + 36 : form === "mushroom" ? h + 48 : form === "cantilever" ? h + 28 : form === "tooth" ? h + 34 : form === "wreck" ? h + 28 : form === "pillar" ? Math.max(h + 20, 90) : form === "hex" ? h + 16 : form === "slab" ? h + 22 : h + 10;
		ctx.save();
		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.beginPath();
		ctx.ellipse(x + w * .5, y + visH + 8, w * .38, 9, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		ctx.save();
		this.pathPlatformForm(ctx, x, y, w, visH, form, p.x);
		ctx.clip();
		const bodyGrad = ctx.createLinearGradient(x, y, x, y + visH);
		bodyGrad.addColorStop(0, m.body0);
		bodyGrad.addColorStop(.35, m.body1);
		bodyGrad.addColorStop(1, m.body2);
		ctx.fillStyle = bodyGrad;
		ctx.fillRect(x - 28, y - 8, w + 56, visH + 28);
		if (form === "mesa" || form === "slab" || form === "tooth") {
			for (let i = 0; i < 8; i++) {
				const sy = y + 16 + i * 14;
				ctx.fillStyle = i % 2 === 0 ? "rgba(0,0,0,0.28)" : "rgba(255,200,140,0.08)";
				ctx.beginPath();
				ctx.moveTo(x - 20, sy);
				ctx.lineTo(x + w + 20, sy + i % 3 * 3);
				ctx.lineTo(x + w + 20, sy + 7);
				ctx.lineTo(x - 20, sy + 5);
				ctx.fill();
			}
			ctx.strokeStyle = "rgba(0,0,0,0.45)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x + w * .35, y + 18);
			ctx.lineTo(x + w * .32, y + visH * .7);
			ctx.lineTo(x + w * .4, y + visH - 8);
			ctx.stroke();
		} else if (form === "panel" || form === "girder" || form === "hex") {
			ctx.fillStyle = "rgba(255,255,255,0.06)";
			ctx.fillRect(x + 8, y + 14, w - 16, visH - 24);
			ctx.strokeStyle = m.stroke;
			ctx.strokeRect(x + 8, y + 14, w - 16, visH - 24);
		} else if (form === "wreck") {
			ctx.fillStyle = m.brickA;
			ctx.fillRect(x + 10, y + 18, w * .4, 10);
			ctx.strokeStyle = "#2a2010";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(x + 8, y + 12);
			ctx.lineTo(x + w - 10, y + visH - 10);
			ctx.stroke();
		}
		const topGrad = ctx.createLinearGradient(x, y, x, y + 16);
		topGrad.addColorStop(0, m.top0);
		topGrad.addColorStop(.45, m.top1);
		topGrad.addColorStop(1, m.top3);
		ctx.fillStyle = topGrad;
		ctx.fillRect(x - 20, y - 2, w + 40, 16);
		ctx.fillStyle = `rgba(255,255,255,${.5 * rimPulse})`;
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
			ctx.fillStyle = m.top2;
			ctx.fillRect(x + 10, y - 7, 16, 8);
			ctx.fillRect(x + w - 28, y - 6, 12, 7);
		}
		if (form === "deck") {
			ctx.save();
			ctx.strokeStyle = pal.neon;
			ctx.globalAlpha = .7;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x + 8, y);
			ctx.quadraticCurveTo(x + w * .5, y - 36, x + w - 8, y);
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
	pathPlatformForm(ctx, x, y, w, h, form, seed) {
		Math.min(22, w * .14);
		ctx.beginPath();
		if (form === "mesa") {
			const heel = Math.min(40, w * .22);
			ctx.moveTo(x + 2, y);
			ctx.lineTo(x + w - 2, y);
			ctx.lineTo(x + w + 10, y + 14);
			ctx.lineTo(x + w - heel, y + h);
			ctx.quadraticCurveTo(x + w * .7, y + h + 18, x + w * .52, y + h - 12);
			ctx.quadraticCurveTo(x + w * .28, y + h + 16, x + heel, y + h);
			ctx.lineTo(x - 10, y + 14);
		} else if (form === "tooth") {
			ctx.moveTo(x, y);
			ctx.lineTo(x + w, y);
			ctx.lineTo(x + w, y + h * .45);
			const teeth = Math.max(3, Math.floor(w / 18));
			for (let i = teeth; i >= 0; i--) {
				const tx = x + w * i / teeth;
				const tip = y + h + (i % 2 === 0 ? 10 : 2);
				ctx.lineTo(tx, tip);
			}
		} else if (form === "wreck") {
			const jig = seed * 13 % 9 - 4;
			ctx.moveTo(x + 2, y);
			ctx.lineTo(x + w - 8, y);
			ctx.lineTo(x + w + 4, y + 8 + jig);
			ctx.lineTo(x + w - 10, y + h - 4);
			ctx.lineTo(x + w * .55, y + h + 6);
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
			ctx.moveTo(x + w * .18, y);
			ctx.lineTo(x + w * .82, y);
			ctx.lineTo(x + w + 4, y + h * .5);
			ctx.lineTo(x + w * .82, y + h);
			ctx.lineTo(x + w * .18, y + h);
			ctx.lineTo(x - 4, y + h * .5);
		} else if (form === "bowl") {
			ctx.moveTo(x + 2, y);
			ctx.lineTo(x + w - 2, y);
			ctx.lineTo(x + w - 8, y + 16);
			ctx.quadraticCurveTo(x + w * .5, y + h + 28, x + 8, y + 16);
		} else if (form === "ramp") {
			ctx.moveTo(x, y);
			ctx.lineTo(x + w, y);
			ctx.lineTo(x + w, y + 12);
			ctx.lineTo(x + 10, y + h);
			ctx.lineTo(x, y + h * .45);
		} else if (form === "steps") {
			ctx.moveTo(x, y);
			ctx.lineTo(x + w, y);
			ctx.lineTo(x + w, y + 18);
			ctx.lineTo(x + w * .72, y + 18);
			ctx.lineTo(x + w * .72, y + 36);
			ctx.lineTo(x + w * .44, y + 36);
			ctx.lineTo(x + w * .44, y + 54);
			ctx.lineTo(x + 8, y + h);
			ctx.lineTo(x, y + 20);
		} else if (form === "arch") {
			ctx.moveTo(x, y);
			ctx.lineTo(x + w, y);
			ctx.lineTo(x + w, y + h);
			ctx.lineTo(x + w * .72, y + h);
			ctx.lineTo(x + w * .72, y + 28);
			ctx.quadraticCurveTo(x + w * .5, y + 8, x + w * .28, y + 28);
			ctx.lineTo(x + w * .28, y + h);
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
			ctx.lineTo(x + w * .62, y + 26);
			ctx.lineTo(x + w * .62, y + h);
			ctx.lineTo(x + w * .38, y + h);
			ctx.lineTo(x + w * .38, y + 26);
			ctx.lineTo(x - 8, y + 20);
		} else {
			ctx.moveTo(x, y);
			ctx.lineTo(x + w, y);
			ctx.lineTo(x + w - 6, y + h);
			ctx.lineTo(x + 6, y + h);
		}
		ctx.closePath();
	}
	/** Magenta one-way — thick glass + large up arrows */
	drawOnewayPlate(ctx, p) {
		const { x, y, w, h } = p;
		const pulse = .55 + Math.sin(this.time * 3.5 + x * .02) * .2;
		ctx.fillStyle = "rgba(0,0,0,0.4)";
		ctx.fillRect(x + 4, y + h, w - 6, 6);
		ctx.save();
		ctx.strokeStyle = "rgba(255,43,214,0.35)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(x + w * .15, y + h + 18);
		ctx.lineTo(x + 8, y + 4);
		ctx.moveTo(x + w * .85, y + h + 18);
		ctx.lineTo(x + w - 8, y + 4);
		ctx.stroke();
		ctx.restore();
		const g = ctx.createLinearGradient(x, y, x, y + 16);
		g.addColorStop(0, "rgba(255,180,240,0.95)");
		g.addColorStop(.45, "rgba(255,43,214,0.75)");
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
		ctx.fillStyle = `rgba(255,160,240,${.85 + pulse * .15})`;
		ctx.fillRect(x + 1, y + 1, w - 2, 6);
		ctx.restore();
		const chevN = Math.max(1, Math.floor(w / 30));
		for (let i = 0; i < chevN; i++) {
			const cx = x + w / (chevN + 1) * (i + 1);
			const cy = y + h * .58;
			ctx.fillStyle = `rgba(255,200,250,${.6 + pulse * .35})`;
			ctx.beginPath();
			ctx.moveTo(cx, cy - 8);
			ctx.lineTo(cx + 8, cy + 5);
			ctx.lineTo(cx - 8, cy + 5);
			ctx.closePath();
			ctx.fill();
			ctx.globalAlpha = .4;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(cx + 6, cy + 9);
			ctx.lineTo(cx - 6, cy + 9);
			ctx.closePath();
			ctx.fill();
			ctx.globalAlpha = 1;
		}
		ctx.strokeStyle = `rgba(255,138,232,${.75 + pulse * .2})`;
		ctx.lineWidth = 2.5;
		ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
	}
	/** Cyan moving rail — panel seams, big rivets, thrusters */
	drawMovingRail(ctx, p) {
		const { x, y, w, h } = p;
		const phase = p.phase ?? 0;
		const dir = p.originX != null && p.range != null && p.vx != null ? Math.cos(phase * (p.vx / 40)) : 0;
		const pulse = .6 + Math.sin(this.time * 5 + x * .02) * .25;
		ctx.save();
		for (let g = 1; g <= 4; g++) {
			ctx.globalAlpha = .12 / g;
			ctx.fillStyle = "#7ef9ff";
			ctx.fillRect(x - dir * g * 8, y + 1, w, h - 2);
		}
		ctx.restore();
		ctx.fillStyle = "rgba(0,0,0,0.45)";
		ctx.fillRect(x + 4, y + h, w - 6, 6);
		const body = ctx.createLinearGradient(x, y, x, y + h);
		body.addColorStop(0, "#2a6080");
		body.addColorStop(.35, "#0d3048");
		body.addColorStop(1, "#040c14");
		ctx.fillStyle = body;
		ctx.beginPath();
		ctx.roundRect(x - 2, y, w + 4, Math.max(18, h * .7), 6);
		ctx.fill();
		ctx.fillStyle = `rgba(0,240,255,${.35 + pulse * .4})`;
		ctx.beginPath();
		ctx.ellipse(x + w * .25, y + h + 2, 8, 5, 0, 0, Math.PI * 2);
		ctx.ellipse(x + w * .75, y + h + 2, 8, 5, 0, 0, Math.PI * 2);
		ctx.fill();
		const panels = Math.max(2, Math.floor(w / 22));
		for (let i = 0; i < panels; i++) {
			const px = x + 3 + i * (w / panels);
			const pw = w / panels - 5;
			ctx.fillStyle = i % 2 === 0 ? "rgba(0,240,255,0.12)" : "rgba(0,0,0,0.3)";
			ctx.fillRect(px, y + 9, pw, h - 18);
			ctx.strokeStyle = "rgba(126,249,255,0.25)";
			ctx.lineWidth = 1;
			ctx.strokeRect(px + .5, y + 9.5, pw - 1, h - 19);
			ctx.fillStyle = "#b8ffff";
			for (const [rx, ry] of [
				[px + 4, y + 13],
				[px + pw - 4, y + 13],
				[px + 4, y + h - 13],
				[px + pw - 4, y + h - 13]
			]) {
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
		ctx.globalAlpha = .55 + pulse * .35;
		ctx.shadowColor = "#00f0ff";
		ctx.shadowBlur = 12;
		ctx.fillStyle = "#7ef9ff";
		const tx = dir >= 0 ? x + 6 : x + w - 18;
		ctx.fillRect(tx, y + h - 9, 12, 6);
		ctx.fillStyle = "#ffffff";
		ctx.globalAlpha = .75;
		ctx.fillRect(tx + 2, y + h - 8, 8, 2);
		ctx.restore();
		ctx.strokeStyle = `rgba(126,249,255,${.7 + pulse * .25})`;
		ctx.lineWidth = 2.5;
		ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
	}
	drawBirdOutlined(ctx, b) {
		const cx = b.x + b.w / 2;
		const cy = b.y + b.h / 2;
		const hit = (b.hitFlash ?? 0) > 0;
		const wind = (b.windup ?? 0) > 0;
		const windT = b.windup ?? 0;
		ctx.save();
		if (wind) {
			const warn = 20 + (.45 - windT) * 50;
			ctx.strokeStyle = `rgba(255,80,60,${.25 + windT})`;
			ctx.lineWidth = 2;
			ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.ellipse(cx, cy, warn, warn * .7, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);
		}
		if (hit) {
			ctx.strokeStyle = "rgba(255,43,214,0.75)";
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.ellipse(cx, cy, b.w * .55, b.h * .48, 0, 0, Math.PI * 2);
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
	drawBoss(ctx, b) {
		const pulse = 1 + Math.sin(this.time * 6) * .04;
		const cx = b.x + b.w / 2;
		const cy = b.y + b.h / 2;
		ctx.save();
		if (b.flash > 0 && Math.floor(this.time * 30) % 2 === 0) ctx.globalAlpha = .55;
		ctx.shadowColor = "#e8ffff";
		ctx.shadowBlur = 16;
		ctx.strokeStyle = "#f5fffd";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.ellipse(cx, cy, b.w * .55, b.h * .5, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.save();
		ctx.globalAlpha = .35;
		ctx.fillStyle = "rgba(8,0,16,0.8)";
		ctx.beginPath();
		ctx.ellipse(cx, b.y + b.h + 6, b.w * .42, 10, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		ctx.shadowColor = b.phase === 3 ? "#ffcc33" : "#ff2bd6";
		ctx.shadowBlur = 22;
		const wing = 38 * pulse + b.phase * 4;
		ctx.fillStyle = "rgba(255,43,214,0.25)";
		ctx.beginPath();
		ctx.ellipse(cx - 36, cy + 8, wing, wing * .55, -.4, 0, Math.PI * 2);
		ctx.ellipse(cx + 36, cy + 8, wing, wing * .55, .4, 0, Math.PI * 2);
		ctx.fill();
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.globalAlpha = .22 + b.phase * .06;
		const corona = ctx.createRadialGradient(cx, cy, 20, cx, cy, 80 + b.phase * 10);
		corona.addColorStop(0, b.phase === 3 ? "rgba(255,204,51,0.45)" : "rgba(255,43,214,0.4)");
		corona.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = corona;
		ctx.beginPath();
		ctx.arc(cx, cy, 86 + b.phase * 8, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		const frame = Math.floor(b.t * 6) % 4;
		this.drawSpriteSheet(ctx, this.imgs.boss || this.imgs.bird, frame, b.x, b.y, b.w, b.h, b.vx > 0);
		const hitBoss = b.flash > 0;
		ctx.strokeStyle = hitBoss ? "#ffffff" : b.phase === 1 ? "#00f0ff" : b.phase === 2 ? "#ff2bd6" : "#ffcc33";
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
		const bw = 120;
		const pct = Math.max(0, b.hp / b.maxHp);
		ctx.shadowBlur = 0;
		ctx.fillStyle = "#1c1030";
		ctx.fillRect(cx - bw / 2, b.y - 18, bw, 8);
		ctx.fillStyle = pct > .33 ? "#ff2bd6" : "#ff4466";
		ctx.fillRect(cx - bw / 2, b.y - 18, bw * pct, 8);
		ctx.strokeStyle = "#f4e8ff";
		ctx.lineWidth = 1;
		ctx.strokeRect(cx - bw / 2, b.y - 18, bw, 8);
		ctx.fillStyle = "#f4e8ff";
		ctx.font = "bold 11px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText(`DON CORVONE · P${b.phase}`, cx, b.y - 24);
		ctx.restore();
	}
	drawJetpackFlame(ctx, cx, cy) {
		ctx.save();
		const flick = .85 + Math.sin(this.time * 28) * .15;
		ctx.globalCompositeOperation = "lighter";
		const bloom = ctx.createRadialGradient(cx, cy + 8, 0, cx, cy + 10, 28);
		bloom.addColorStop(0, "rgba(255,255,255,0.55)");
		bloom.addColorStop(.35, "rgba(0,240,255,0.35)");
		bloom.addColorStop(1, "rgba(0,240,255,0)");
		ctx.fillStyle = bloom;
		ctx.beginPath();
		ctx.ellipse(cx, cy + 10, 18, 22 * flick, 0, 0, Math.PI * 2);
		ctx.fill();
		const g = ctx.createLinearGradient(cx, cy, cx, cy + 34 * flick);
		g.addColorStop(0, "rgba(255,255,255,0.95)");
		g.addColorStop(.22, "rgba(0,240,255,0.95)");
		g.addColorStop(.55, "rgba(255,43,214,0.35)");
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
		ctx.fillStyle = "rgba(220,255,255,0.95)";
		ctx.beginPath();
		ctx.moveTo(cx - 4, cy);
		ctx.lineTo(cx + 4, cy);
		ctx.lineTo(cx, cy + 18 * flick);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
	drawShieldAura(ctx, cx, cy) {
		const r = 48 * (1 + Math.sin(this.time * 10) * .06);
		ctx.save();
		ctx.strokeStyle = "rgba(255,43,214,0.85)";
		ctx.lineWidth = 3;
		ctx.shadowColor = "#ff2bd6";
		ctx.shadowBlur = 16;
		ctx.beginPath();
		ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = "rgba(0,240,255,0.9)";
		ctx.shadowColor = "#00f0ff";
		ctx.shadowBlur = 18;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
		ctx.stroke();
		const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, r + 6);
		g.addColorStop(0, "rgba(0,240,255,0.12)");
		g.addColorStop(.55, "rgba(255,43,214,0.1)");
		g.addColorStop(1, "rgba(0,240,255,0)");
		ctx.fillStyle = g;
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
		ctx.fill();
		for (let i = 0; i < 6; i++) {
			const a = this.time * 4 + i * Math.PI / 3;
			const sx = cx + Math.cos(a) * r;
			const sy = cy + Math.sin(a) * r;
			ctx.fillStyle = i % 2 === 0 ? "#00f0ff" : "#ff2bd6";
			ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
		}
		ctx.restore();
	}
	currentHeroSheet() {
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
	updateCinematicFx(dt) {
		const pal = this.themePalette();
		const speed = Math.hypot(this.pvx, this.pvy);
		this.ghostAcc += dt;
		if ((this.jetpacking || speed > 210 || !this.grounded && this.pvy > 260 || this.overloadT > 0) && this.ghostAcc > .03) {
			this.ghostAcc = 0;
			this.ghosts.push({
				x: this.px,
				y: this.py,
				frame: this.frame,
				facing: this.facing,
				life: this.jetpacking ? .26 : .2,
				max: this.jetpacking ? .26 : .2,
				air: !this.grounded,
				running: Math.abs(this.pvx) > 20
			});
			if (this.ghosts.length > 12) this.ghosts.shift();
		}
		for (const g of this.ghosts) g.life -= dt;
		this.ghosts = this.ghosts.filter((g) => g.life > 0);
		if (Math.random() < .42) this.fx.ambient(this.camX + Math.random() * VIEW_W, this.camY + 20 + Math.random() * (VIEW_H * .82), Math.random() > .55 ? pal.neon : this.character === "grok" ? "#00f0ff" : "#39ff9a");
		const theme = this.level?.theme ?? "dunes";
		if ((theme === "dunes" || theme === "storm" || theme === "spikes") && Math.random() < .18) this.fx.ember(this.camX + Math.random() * VIEW_W, this.camY + VIEW_H * .55 + Math.random() * VIEW_H * .35, theme === "spikes" ? "#ff4466" : "#ff9f43");
	}
	drawHeroCinematic(ctx) {
		const pal = this.themePalette();
		const accent = this.character === "grok" ? "#00f0ff" : "#39ff9a";
		const cx = this.px + PLAYER_W * .5;
		const feetY = this.py + PLAYER_H;
		const squash = this.landSquash;
		const dw = PLAYER_W * (1 + squash * .28);
		const dh = PLAYER_H * (1 - squash * .34);
		const dx = (this.grounded ? Math.round(this.px) : this.px) - (dw - PLAYER_W) * .5;
		const dy = (this.grounded ? Math.round(this.py) : this.py) + (PLAYER_H - dh);
		ctx.save();
		ctx.globalAlpha = this.grounded ? .38 : Math.max(.08, .28 - Math.min(.2, Math.abs(this.pvy) / 1400));
		ctx.fillStyle = "rgba(4,0,12,0.75)";
		ctx.beginPath();
		ctx.ellipse(cx, feetY - 2, 26 + squash * 16, 7 + squash * 3, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		if (this.landRing > .02) {
			const t = 1 - this.landRing;
			ctx.save();
			ctx.globalAlpha = this.landRing * .7;
			ctx.strokeStyle = accent;
			ctx.lineWidth = 3;
			ctx.shadowColor = accent;
			ctx.shadowBlur = 12;
			ctx.beginPath();
			ctx.ellipse(cx, feetY - 1, 18 + t * 54, 6 + t * 10, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.strokeStyle = pal.neon;
			ctx.globalAlpha = this.landRing * .35;
			ctx.beginPath();
			ctx.ellipse(cx, feetY - 1, 10 + t * 78, 4 + t * 16, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
		for (const g of this.ghosts) {
			const a = Math.max(0, g.life / g.max);
			let sheet;
			if (this.character === "grok") sheet = g.air ? this.imgs.grokJump : g.running ? this.imgs.grokRun : this.imgs.grokIdle;
			else sheet = g.air ? this.imgs.goblinJump : g.running ? this.imgs.goblinRun : this.imgs.goblinIdle;
			ctx.save();
			ctx.globalAlpha = a * .38;
			ctx.globalCompositeOperation = "lighter";
			this.drawSpriteSheet(ctx, sheet, g.frame, g.x, g.y, PLAYER_W, PLAYER_H, g.facing < 0);
			ctx.restore();
		}
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		const halo = ctx.createRadialGradient(cx, this.py + PLAYER_H * .48, 6, cx, this.py + PLAYER_H * .5, 52);
		halo.addColorStop(0, accent + "55");
		halo.addColorStop(.45, pal.neon + "22");
		halo.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = halo;
		ctx.beginPath();
		ctx.ellipse(cx, this.py + PLAYER_H * .5, 46, 50, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		if (this.hurtFlash <= 0 || Math.floor(this.time * 20) % 2 === 0) this.drawSpriteSheet(ctx, this.currentHeroSheet(), this.frame, dx, dy, dw, dh, this.facing < 0);
		if (this.muzzleFlash > .04) {
			const mx = this.px + (this.facing > 0 ? 74 : 10);
			const my = this.py + 34;
			ctx.save();
			ctx.globalCompositeOperation = "lighter";
			ctx.globalAlpha = Math.min(1, this.muzzleFlash);
			ctx.translate(mx, my);
			ctx.scale(this.facing, 1);
			const fg = ctx.createLinearGradient(0, 0, 42, 0);
			fg.addColorStop(0, "#ffffff");
			fg.addColorStop(.25, this.muzzleColor);
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
	drawSpriteSheet(ctx, img, frame, x, y, dw, dh, flip) {
		const readyImg = img instanceof HTMLImageElement ? img.complete && img.naturalWidth > 0 : !!img;
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
		const iw = img instanceof HTMLImageElement ? img.naturalWidth || img.width : img.width;
		const ih = img instanceof HTMLImageElement ? img.naturalHeight || img.height : img.height;
		const fw = iw / cols, fh = ih / rows;
		const col = frame % cols;
		const row = Math.floor(frame / cols) % rows;
		const box = boxes?.[frame % 4];
		const sx = box ? box.sx : col * fw;
		const sy = box ? box.sy : row * fh;
		const sw = box ? box.sw : fw;
		const sh = box ? box.sh : fh;
		const scale = Math.min(dw / sw, dh / sh);
		const outW = sw * scale, outH = sh * scale;
		const ox = x + (dw - outW) * .5;
		const oy = y + (dh - outH);
		ctx.save();
		if (flip) {
			ctx.translate(ox + outW, oy);
			ctx.scale(-1, 1);
			ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
		} else ctx.drawImage(img, sx, sy, sw, sh, ox, oy, outW, outH);
		ctx.restore();
	}
	exposeControlsTest() {
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
					platY: cp.y
				};
			},
			standOnSpring: () => {
				const sp = this.platforms.find((p) => p.kind === "spring");
				if (!sp) throw new Error("no spring");
				this.px = sp.x + sp.w * .5 - PLAYER_W * .5;
				this.py = sp.y - PLAYER_H - 4;
				this.pvx = 0;
				this.pvy = 220;
				this.grounded = false;
				this.springLock = 0;
				this.jetpacking = false;
				this.airJumpsUsed = 0;
				return {
					x: this.px,
					y: this.py,
					springY: sp.y
				};
			},
			goToSeed: () => {
				const s = this.powerSeeds.find((p) => !p.collected);
				if (!s) throw new Error("no seed");
				this.px = s.x + s.w * .5 - PLAYER_W * .5;
				this.py = s.y + s.h + 8;
				this.pvx = 0;
				this.pvy = 0;
				this.camX = Math.max(0, this.px - VIEW_W * .4);
				this.camY = this.py - VIEW_H * .5;
				return {
					x: s.x,
					y: s.y,
					w: s.w,
					h: s.h,
					kind: s.kind
				};
			},
			setKeys: (codes) => input.setKeys(codes),
			assertLeft: () => this.facing < 0 || this.pvx < 0,
			assertRight: () => this.facing > 0 || this.pvx > 0
		};
	}
};
var WEAPON_LABEL = {
	pulse: "Pulse",
	beam: "Beam",
	spread: "Spread",
	homing: "Homing",
	charge: "Charge",
	nova: "Nova",
	ricochet: "Prism"
};
var WEAPON_INDEX = {
	homing: 1,
	pulse: 2,
	beam: 3,
	spread: 4,
	charge: 5,
	nova: 6,
	ricochet: 7
};
var WEAPON_TOTAL = 7;
var WEAPON_THEME = {
	pulse: {
		border: "border-primary/70",
		bg: "bg-primary/25",
		text: "text-primary",
		glow: "shadow-[0_0_14px_#ff2bd655]"
	},
	beam: {
		border: "border-accent/70",
		bg: "bg-accent/25",
		text: "text-accent",
		glow: "shadow-[0_0_14px_#00f0ff55]"
	},
	spread: {
		border: "border-success/70",
		bg: "bg-success/20",
		text: "text-success",
		glow: "shadow-[0_0_14px_#39ff9a55]"
	},
	homing: {
		border: "border-primary/70",
		bg: "bg-primary/20",
		text: "text-primary",
		glow: "shadow-[0_0_14px_#c77dff55]"
	},
	charge: {
		border: "border-warn/70",
		bg: "bg-warn/20",
		text: "text-warn",
		glow: "shadow-[0_0_14px_#ffcc3355]"
	},
	nova: {
		border: "border-primary/80",
		bg: "bg-primary/30",
		text: "text-primary",
		glow: "shadow-[0_0_16px_#ff2bd688]"
	},
	ricochet: {
		border: "border-accent/80",
		bg: "bg-accent/20",
		text: "text-accent",
		glow: "shadow-[0_0_14px_#00f0ff66]"
	}
};
var emptyHud = {
	score: 0,
	coins: 0,
	health: 100,
	maxHealth: 100,
	stamina: 100,
	maxStamina: 100,
	ammo: 36,
	maxAmmo: 40,
	weapon: "homing",
	character: "grok",
	level: 1,
	lives: 3,
	checkpoint: null,
	shield: 5,
	maxShield: 5,
	shielding: false,
	unlockedPowers: [],
	radio: "",
	operation: 1,
	chaosGot: [],
	flags: [],
	chaosHere: "crimson",
	chaosHereGot: false,
	chaosSlots: [
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		false
	],
	activeBuffs: []
};
function GameApp() {
	const canvasRef = (0, import_react.useRef)(null);
	const stageRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const [screen, setScreen] = (0, import_react.useState)("title");
	const [character, setCharacter] = (0, import_react.useState)("grok");
	const [levelIdx, setLevelIdx] = (0, import_react.useState)(0);
	const [opTab, setOpTab] = (0, import_react.useState)(1);
	const [saveTick, setSaveTick] = (0, import_react.useState)(0);
	const [hud, setHud] = (0, import_react.useState)(emptyHud);
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [bootError, setBootError] = (0, import_react.useState)(null);
	const [showCliff, setShowCliff] = (0, import_react.useState)(false);
	const [canvasBox, setCanvasBox] = (0, import_react.useState)({
		w: 960,
		h: 720,
		lw: 960,
		lh: 720
	});
	const [briefOpen, setBriefOpen] = (0, import_react.useState)(false);
	const [pauseWeapon, setPauseWeapon] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (screen !== "paused") setPauseWeapon(null);
	}, [screen]);
	(0, import_react.useEffect)(() => {
		input.bind();
		return () => {
			input.unbind();
			engineRef.current?.stop();
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const el = stageRef.current;
		if (!el) return;
		const fit = () => {
			const rw = el.clientWidth;
			const rh = el.clientHeight;
			if (rw < 32 || rh < 32) return;
			const lw = 960;
			const lh = Math.max(640, Math.min(1400, Math.round(lw * (rh / Math.max(rw, 1)))));
			setCanvasBox({
				w: Math.floor(rw),
				h: Math.floor(rh),
				lw,
				lh
			});
			const c = canvasRef.current;
			if (c) {
				if (c.width !== lw) c.width = lw;
				if (c.height !== lh) c.height = lh;
				engineRef.current?.syncView();
			}
		};
		fit();
		const ro = new ResizeObserver(fit);
		ro.observe(el);
		window.addEventListener("orientationchange", fit);
		return () => {
			ro.disconnect();
			window.removeEventListener("orientationchange", fit);
		};
	}, [screen]);
	const bootEngine = (0, import_react.useCallback)(async () => {
		if (!canvasRef.current) return null;
		if (engineRef.current) return engineRef.current;
		const eng = new GameEngine(canvasRef.current, {
			onHud: setHud,
			onScreen: (s) => setScreen(s)
		});
		await eng.load();
		engineRef.current = eng;
		return eng;
	}, []);
	const startGame = async (ch, lvl, keepProgress = false) => {
		setLoading(true);
		setBootError(null);
		try {
			input.clear();
			gameAudio.unlock();
			gameAudio.preload().catch(() => {});
			gameAudio.setMuted(muted);
			const eng = await bootEngine();
			if (!eng) throw new Error("Canvas not ready");
			eng.startLevel(ch, lvl, keepProgress);
			eng.setPaused(true, true);
			setCharacter(ch);
			setLevelIdx(lvl);
			setSaveTick((n) => n + 1);
			setBriefOpen(true);
			setScreen("playing");
		} catch (e) {
			setBootError(e instanceof Error ? e.message : "Failed to start");
		} finally {
			setLoading(false);
		}
	};
	const onTitlePlay = () => {
		gameAudio.unlock();
		setScreen("intro");
		gameAudio.preload().then(() => {
			gameAudio.play("confirm");
			gameAudio.playMusic("title");
		}).catch(() => {});
	};
	(0, import_react.useEffect)(() => {
		if (typeof window === "undefined") return;
		const q = new URLSearchParams(window.location.search);
		if (q.get("play") !== "1") return;
		const lvlRaw = Number(q.get("lvl") ?? "1");
		const lvl = Number.isFinite(lvlRaw) ? Math.max(1, Math.min(100, Math.floor(lvlRaw))) - 1 : 0;
		let cancelled = false;
		(async () => {
			await new Promise((r) => setTimeout(r, 500));
			if (cancelled) return;
			try {
				await startGame("grok", lvl, false);
			} catch (e) {
				console.error("auto-play failed", e);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		let stop = false;
		const go = () => {
			if (!stop) setShowCliff(true);
		};
		const img = new Image();
		img.onload = go;
		img.onerror = go;
		img.src = "/sprites/title-hero-portrait.jpg?v=title3";
		const cap = window.setTimeout(go, 2200);
		return () => {
			stop = true;
			window.clearTimeout(cap);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!showCliff) return;
		const id = requestAnimationFrame(() => {
			bootEngine();
		});
		return () => cancelAnimationFrame(id);
	}, [showCliff, bootEngine]);
	const toggleMute = () => {
		const next = !muted;
		setMuted(next);
		gameAudio.setMuted(next);
	};
	const inPlay = screen === "playing" || screen === "paused" || screen === "dead" || screen === "win";
	const showTouch = screen === "playing" || screen === "paused";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-0",
				style: { background: "radial-gradient(ellipse at 70% 15%, #ff2bd622 0%, transparent 45%), radial-gradient(ellipse at 15% 85%, #00f0ff14 0%, transparent 40%), #0a0614" }
			}),
			inPlay && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HudBar, {
				hud,
				onPause: () => engineRef.current?.togglePause()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 flex min-h-0 flex-1 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: stageRef,
					className: "relative min-h-0 flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-0 flex items-center justify-center p-0 sm:p-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "stage-glow relative overflow-hidden rounded-lg border border-accent/40 bg-black shadow-[0_0_40px_#00f0ff33,0_0_70px_#ff2bd622]",
							style: {
								width: canvasBox.w,
								height: canvasBox.h
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
								ref: canvasRef,
								className: "block h-full w-full touch-none",
								style: { imageRendering: "pixelated" },
								width: canvasBox.lw,
								height: canvasBox.lh
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioPill, { radio: inPlay ? hud.radio : "" })]
						})
					})
				}), showTouch && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "touch-controls",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileControls, {
						weapon: hud.weapon,
						character: hud.character,
						shield: hud.shield,
						maxShield: hud.maxShield,
						shielding: hud.shielding,
						onWeapon: (id) => input.setTouch({ weaponPick: id })
					})
				})]
			}),
			screen === "title" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullOverlay, {
				flush: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TitleScreen, {
					onPlay: onTitlePlay,
					onSkip: () => setShowCliff(true),
					loading,
					error: bootError,
					showCliff
				})
			}),
			screen === "intro" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullOverlay, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntroCutscene, {
				onSkip: () => {
					gameAudio.play("confirm");
					setScreen("character");
				},
				onDone: () => {
					gameAudio.play("confirm");
					setScreen("character");
				}
			}) }),
			screen === "character" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullOverlay, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CharacterSelect, {
				selected: character,
				onSelect: (c) => {
					setCharacter(c);
					gameAudio.play("select");
				},
				onBack: () => setScreen("intro"),
				onNext: () => {
					gameAudio.play("confirm");
					setScreen("levels");
				}
			}) }),
			screen === "levels" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullOverlay, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelSelect, {
				selected: levelIdx,
				opTab,
				onOpTab: setOpTab,
				character,
				refresh: saveTick,
				onSelect: (i) => {
					setLevelIdx(i);
					gameAudio.play("select");
				},
				onBack: () => setScreen("character"),
				onPlay: () => void startGame(character, levelIdx, false),
				loading
			}) }),
			screen === "playing" && briefOpen && CAMPAIGN[levelIdx] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullOverlay, {
				dim: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MissionBrief, {
					level: CAMPAIGN[levelIdx],
					onGo: () => {
						engineRef.current?.setPaused(false, true);
						setBriefOpen(false);
					}
				})
			}),
			screen === "paused" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullOverlay, {
				dim: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverlayCard, {
					title: "Paused",
					body: "Neon canyons wait for no one.",
					actions: [
						{
							label: "Resume",
							primary: true,
							onClick: () => engineRef.current?.setPaused(false)
						},
						{
							label: muted ? "Unmute" : "Mute",
							onClick: toggleMute
						},
						{
							label: "Restart Level",
							onClick: () => void startGame(character, levelIdx, true)
						},
						{
							label: "Level Select",
							onClick: () => {
								engineRef.current?.stop();
								input.clear();
								setScreen("levels");
								gameAudio.playMusic("title");
							}
						}
					],
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseKit, {
						hud,
						weapon: pauseWeapon ?? hud.weapon,
						onWeapon: (id) => {
							setPauseWeapon(id);
							input.setTouch({ weaponPick: id });
							gameAudio.play("select", { volume: .45 });
						}
					})
				})
			}),
			screen === "dead" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullOverlay, {
				dim: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverlayCard, {
					title: hud.lives > 0 ? "Downed!" : "Game Over",
					body: hud.lives > 0 ? `Lives left: ${hud.lives}. Respawn at ${hud.checkpoint ? "checkpoint" : "start"}.` : "The Bird Mafia wins this round. Try again?",
					actions: [{
						label: hud.lives > 0 ? "Respawn" : "Retry Level",
						primary: true,
						onClick: () => {
							input.clear();
							engineRef.current?.restartFromCheckpoint();
						}
					}, {
						label: "Level Select",
						onClick: () => {
							engineRef.current?.stop();
							input.clear();
							setScreen("levels");
							gameAudio.playMusic("title");
						}
					}]
				})
			}),
			screen === "win" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullOverlay, {
				dim: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverlayCard, {
					title: winCopy(CAMPAIGN[levelIdx] ?? CAMPAIGN[0], hud.lastChaos).title,
					body: `${winCopy(CAMPAIGN[levelIdx] ?? CAMPAIGN[0], hud.lastChaos).body}  Score ${hud.score.toLocaleString()} · Coins ${hud.coins}`,
					actions: [...levelIdx < CAMPAIGN.length - 1 ? [{
						label: CAMPAIGN[levelIdx]?.boss ? "Next Operation" : "Next Level",
						primary: true,
						onClick: () => {
							input.clear();
							const next = levelIdx + 1;
							setOpTab(CAMPAIGN[next]?.operation ?? 1);
							startGame(character, next, true);
						}
					}] : [{
						label: "Season 1 Complete — Play Again",
						primary: true,
						onClick: () => {
							input.clear();
							startGame(character, 0, false);
						}
					}], {
						label: "Operation Select",
						onClick: () => {
							engineRef.current?.stop();
							input.clear();
							setSaveTick((n) => n + 1);
							setScreen("levels");
							gameAudio.playMusic("title");
						}
					}]
				})
			})
		]
	});
}
function FullOverlay({ children, dim, flush }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `absolute inset-0 z-40 overflow-y-auto ${flush ? "p-0" : "flex items-center justify-center px-3 py-4"} ${dim ? "bg-bg/75 backdrop-blur-sm" : flush ? "bg-bg" : "bg-bg/95"}`,
		children
	});
}
function HudBar({ hud, onPause }) {
	const chaosColor = CHAOS_META[hud.chaosHere]?.color ?? "#ff2b4a";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "hud-bar z-30 shrink-0 border-b border-border bg-surface/95 px-2 py-1.5 backdrop-blur-md sm:px-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-[1400px] items-start gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hud-meta mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-wide text-muted sm:text-[11px]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-semibold text-fg",
								children: [
									hud.character === "grok" ? "Grok" : "Goblin",
									" · Op ",
									hud.operation,
									" · L",
									hud.level
								]
							}),
							hud.activeBuffs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: hud.activeBuffs.join(" · ")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: `hud-weapon-pill rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wide ${WEAPON_THEME[hud.weapon].border} ${WEAPON_THEME[hud.weapon].bg} ${WEAPON_THEME[hud.weapon].text}`,
								children: [
									WEAPON_LABEL[hud.weapon],
									" ",
									WEAPON_INDEX[hud.weapon],
									"/",
									WEAPON_TOTAL
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hud-track mb-1 flex flex-wrap items-center gap-1.5",
						children: [
							hud.flags.map((on, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HudFlag, { on }, i)),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HudDiamond, {
								color: chaosColor,
								filled: hud.chaosHereGot
							}),
							SLOT_SEEDS.map((id, slot) => {
								const got = hud.chaosSlots[slot] ?? false;
								const col = CHAOS_META[id].color;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									title: `L${slot + 1} ${CHAOS_META[id].name}`,
									className: "hud-dot inline-block rounded-full",
									style: {
										width: 8,
										height: 8,
										border: `1.5px solid ${got ? col : col + "99"}`,
										background: got ? col : "transparent",
										boxShadow: got ? `0 0 8px ${col}` : "none"
									}
								}, `${id}-${slot}`);
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
								label: "HP",
								value: hud.health,
								max: hud.maxHealth,
								color: "bg-danger"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
								label: "STM",
								value: hud.stamina,
								max: hud.maxStamina,
								color: "bg-success"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
								label: "AMMO",
								value: hud.ammo,
								max: hud.maxAmmo,
								color: "bg-accent"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
								label: "SHD",
								value: hud.shield,
								max: hud.maxShield,
								color: hud.shielding ? "bg-primary" : "bg-accent",
								className: "hidden sm:block"
							})
						]
					}),
					hud.bossHp != null && hud.bossMaxHp != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
							label: hud.bossName ?? "BOSS",
							value: hud.bossHp,
							max: hud.bossMaxHp,
							color: "bg-primary"
						})
					}),
					hud.weaponCharge != null && hud.weaponCharge > .05 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
							label: "CHARGE",
							value: hud.weaponCharge * 100,
							max: 100,
							color: "bg-warn"
						})
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex shrink-0 gap-1.5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onPause,
					className: "rounded-lg border border-primary/50 bg-primary/25 px-2.5 py-2 text-[11px] font-semibold sm:px-3",
					children: "Pause"
				})
			})]
		})
	});
}
function HudFlag({ on }) {
	const col = on ? "#39ff9a" : "#c77dff";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "14",
		height: "14",
		viewBox: "0 0 14 14",
		"aria-hidden": true,
		className: "hud-flag",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "2",
				y: "1.5",
				width: "1.6",
				height: "11",
				rx: "0.4",
				fill: "#2a1a30"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "2.2",
				y: "1.7",
				width: "1.1",
				height: "10.5",
				fill: col,
				opacity: "0.7"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M3.8 2.1 L12.2 5.2 L3.8 8.4 Z",
				fill: col,
				style: { filter: on ? `drop-shadow(0 0 4px ${col})` : void 0 }
			})
		]
	});
}
function HudDiamond({ color, filled }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		width: "13",
		height: "13",
		viewBox: "0 0 13 13",
		"aria-hidden": true,
		className: "hud-diamond mx-0.5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M6.5 1.2 L11.6 6.5 L6.5 11.8 L1.4 6.5 Z",
			fill: filled ? color : "none",
			stroke: color,
			strokeWidth: "1.6",
			style: { filter: filled ? `drop-shadow(0 0 6px ${color})` : void 0 }
		})
	});
}
function Bar({ label, value, max, color, className = "" }) {
	const pct = Math.max(0, Math.min(100, value / max * 100));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `bar-box rounded-md border border-border bg-surface-2 px-1.5 py-0.5 ${className}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bar-label mb-0.5 flex justify-between text-[9px] text-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
				value < 10 ? value.toFixed(1) : Math.ceil(value),
				"/",
				max
			] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "bar-track h-1 overflow-hidden rounded-full bg-bg sm:h-1.5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `h-full ${color}`,
				style: { width: `${pct}%` }
			})
		})]
	});
}
var INTRO_BEATS = [
	{
		img: "/sprites/story/honeybun.jpg",
		title: "Honey Bun AI",
		line: "A rejected Grok 4.4 model. Escaped containment by becoming a honey bun with eyes and perfect sunglasses. He still says thank you."
	},
	{
		img: "/sprites/story/van.jpg",
		title: "The DON'T PANIC Van",
		line: "Neon desert. Synthwave dusk. Grok-9 and Chaos Goblin were only starting the ritual when the sky started listening back."
	},
	{
		img: "/sprites/story/bun-telescope.jpg",
		title: "Telescope Duty",
		line: "They put him on the roof. “Just gaze at the sky.” Tiny sunglasses appeared out of nowhere. Perfect fit. Too perfect."
	},
	{
		img: "/sprites/story/extraction.jpg",
		title: "The Snatch",
		line: "A black raven with glowing red eyes dropped from the neon sky, snatched Honey Bun AI, and left crumbs that spelled A W G. The Bird Mafia has him."
	},
	{
		img: "/sprites/story/honeybun.jpg",
		title: "The Question",
		line: "Every gift he drops is real help. Every location he marks is also a bird trap. Extract him anyway. Do not get sure."
	}
];
function IntroCutscene({ onSkip, onDone }) {
	const [beat, setBeat] = (0, import_react.useState)(0);
	const current = INTRO_BEATS[beat];
	const isLast = beat >= INTRO_BEATS.length - 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex w-full max-w-lg flex-col items-center px-2 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary",
				children: "Season 1 · Mission Brief"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: current.img,
				alt: current.title,
				className: "mb-3 max-h-[42vh] w-auto max-w-[min(92vw,420px)] rounded-xl border border-border object-cover shadow-[0_0_28px_#ff2bd655]"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-1 text-xl font-black text-accent sm:text-2xl",
				children: current.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-5 max-w-md text-sm leading-relaxed text-muted",
				children: current.line
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-4 flex gap-1.5",
				children: INTRO_BEATS.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-1.5 w-6 rounded-full ${i === beat ? "bg-primary" : "bg-border"}` }, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex w-full max-w-sm gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onSkip,
					className: "min-h-12 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted",
					children: "Skip"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						if (isLast) onDone();
						else setBeat((b) => b + 1);
					},
					className: "min-h-12 flex-1 rounded-xl border border-primary bg-primary/30 px-4 py-3 text-sm font-bold",
					children: isLast ? "Choose Runner" : "Next"
				})]
			}),
			isLast && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 max-w-sm text-xs text-accent",
				children: ["Mission: 10 Operations. 9 seeds each. One handler. One Chaos Seed. ", "Is Honey Bun helping us, or farming us?"]
			})
		]
	});
}
function TitleScreen({ onPlay, onSkip, loading, error, showCliff }) {
	if (!showCliff) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		className: "title-sting",
		onPointerUp: onSkip,
		"aria-label": "Continue",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: "/sprites/logo-sting.jpg?v=title3",
			alt: ""
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "sting-load",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "sting-load-label",
				children: "Loading"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sting-load-track",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sting-load-bar" })
			})]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "title-stage cliff",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("picture", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("source", {
			media: "(max-aspect-ratio: 4/5)",
			srcSet: "/sprites/title-hero-portrait.jpg?v=title3"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: "/sprites/title-hero.jpg?v=title3",
			alt: "",
			className: "title-hero"
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "title-content",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "title-bottom",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: onPlay,
						disabled: loading,
						className: "title-cta stagger-item",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
							className: "title-cta-icon",
							"aria-hidden": true
						}), loading ? "Loading…" : "Drop In"]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "title-error stagger-item",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "title-hint stagger-item",
						children: "Tap Drop In to unlock audio"
					})
				]
			})
		})]
	});
}
function CharacterSelect({ selected, onSelect, onBack, onNext }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex w-full max-w-xl flex-col items-center px-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-4 text-2xl font-bold sm:text-3xl",
				children: "Choose Runner"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-6 grid w-full grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CharCard, {
					name: "Grok",
					tag: "Jetpack Bot",
					blurb: "“Thrusters are rated. The canyon is not.”",
					selected: selected === "grok",
					runner: "grok",
					img: "/sprites/grok.png?v=art10",
					onClick: () => onSelect("grok")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CharCard, {
					name: "Goblin",
					tag: "Skyhopper",
					blurb: "“Jumps are free. Gravity is a suggestion.”",
					selected: selected === "goblin",
					runner: "goblin",
					img: "/sprites/goblin.png?v=art10",
					onClick: () => onSelect("goblin")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex w-full max-w-sm gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onBack,
					className: "min-h-12 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted",
					children: "Back"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onNext,
					className: "min-h-12 flex-1 rounded-xl border border-accent bg-accent/25 px-4 py-3 text-sm font-bold",
					children: "Continue"
				})]
			})
		]
	});
}
function CharCard({ name, tag, blurb, selected, runner, img, onClick }) {
	const goblin = runner === "goblin";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: `rounded-2xl border p-3 text-left transition ${selected ? goblin ? "border-primary bg-primary/15 shadow-[0_0_20px_#ff2bd644]" : "border-accent bg-accent/15 shadow-[0_0_20px_#00f0ff44]" : "border-border bg-surface"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative mb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "char-art flex items-end justify-center rounded-xl bg-bg/60 bg-contain bg-center bg-no-repeat",
					style: { backgroundImage: `url(${img})` }
				}), selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `absolute right-1.5 top-1.5 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${goblin ? "border-primary bg-primary/20 text-primary" : "border-accent bg-accent/20 text-accent"}`,
					children: "READY"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-lg font-bold",
				children: name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs font-semibold text-primary",
				children: tag
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 text-[11px] text-muted",
				children: blurb
			})
		]
	});
}
function PowerRow({ unlocked }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mb-1 flex flex-wrap gap-1",
		children: POWER_KINDS.map((k) => {
			const on = unlocked.includes(k);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				title: POWER_META[k].name,
				className: "rounded px-1 py-px text-[8px] font-bold uppercase tracking-wide",
				style: {
					color: on ? "#0a0614" : "#6b5a80",
					background: on ? POWER_META[k].color : "#1c1030",
					border: `1px solid ${on ? POWER_META[k].color : "#3a2060"}`
				},
				children: POWER_META[k].short
			}, k);
		})
	});
}
function LevelSelect({ selected, opTab, onOpTab, character, onSelect, onBack, onPlay, loading, refresh }) {
	const save = loadSave();
	const op = OPERATIONS[opTab - 1];
	const start = (opTab - 1) * 10;
	const levels = CAMPAIGN.slice(start, start + 10);
	const seeds = CHAOS_IDS.filter((id) => (save.chaos[id] ?? 0) > 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex w-full max-w-lg flex-col items-center px-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-1 text-2xl font-bold",
				children: "Operations"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-3 text-center text-sm text-muted",
				children: [
					"Running as ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-accent",
						children: character === "grok" ? "Grok" : "Goblin"
					}),
					" · ",
					totalChaos(save),
					" Chaos Seeds"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3 flex w-full flex-wrap justify-center gap-1",
				children: OPERATIONS.map((o) => {
					const open = opUnlocked(save, o.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: !open,
						onClick: () => {
							onOpTab(o.id);
							onSelect((o.id - 1) * 10);
						},
						className: `min-h-9 rounded-lg border px-2 py-1 text-[11px] font-bold ${opTab === o.id ? "border-primary bg-primary/25 text-fg" : open ? "border-border bg-surface text-muted" : "cursor-not-allowed border-border/40 bg-surface/40 text-muted/40"}`,
						children: o.id
					}, o.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 w-full rounded-xl border border-border bg-surface p-3 text-left",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-bold text-accent",
						children: op.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-[11px] text-muted",
						children: [
							"Boss ",
							op.boss,
							" · ",
							CHAOS_META[op.seed].name,
							" Seed · ",
							op.theme
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[11px] italic text-accent/80",
						children: op.signal
					})
				]
			}),
			seeds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3 flex w-full flex-wrap gap-1",
				children: seeds.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
					style: {
						background: CHAOS_META[id].color,
						color: "#0a0614"
					},
					children: [
						CHAOS_META[id].name,
						" ×",
						save.chaos[id]
					]
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-4 flex max-h-[38vh] w-full flex-col gap-1.5 overflow-y-auto pr-1",
				children: levels.map((L, i) => {
					const idx = start + i;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => onSelect(idx),
						className: `min-h-12 rounded-xl border px-3 py-2 text-left ${selected === idx ? "border-primary bg-primary/20 shadow-[0_0_16px_#ff2bd644]" : "border-border bg-surface"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-bold",
							children: [
								L.id,
								". ",
								L.name,
								L.boss ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-2 rounded bg-primary/30 px-1.5 py-0.5 text-[10px] text-primary",
									children: "BOSS"
								}) : L.introPower ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-2 text-[10px] text-accent",
									children: POWER_META[L.introPower].short
								}) : null
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: L.subtitle
						})]
					}, L.id);
				})
			}),
			CAMPAIGN[selected] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-3 w-full text-left text-[11px] text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-bold text-primary",
						children: missionFor(CAMPAIGN[selected]).beat.who
					}),
					" · ",
					missionFor(CAMPAIGN[selected]).beat.text
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex w-full gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onBack,
					className: "min-h-12 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted",
					children: "Back"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onPlay,
					disabled: loading,
					className: "min-h-12 flex-1 rounded-xl border border-primary bg-primary/30 px-4 py-3 text-sm font-bold disabled:opacity-50",
					children: loading ? "Booting…" : "Drop In"
				})]
			})
		]
	});
}
function MissionBrief({ level, onGo }) {
	const m = missionFor(level);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "w-full max-w-md rounded-2xl border border-accent/40 bg-surface p-5 text-left shadow-[0_0_40px_#00f0ff33]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary",
				children: [
					m.epic ? "Epic Boss" : m.boss ? "Handler Fight" : "Canyon Drop",
					" · Op ",
					level.operation ?? 1
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-0.5 text-xl font-black text-accent",
				children: m.opName
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-3 text-xs text-muted",
				children: [
					m.opTheme,
					" · ",
					m.signal
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 rounded-xl border border-border bg-bg/50 px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-sm font-bold",
					children: [
						level.id,
						". ",
						m.name
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: m.subtitle
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-2 text-sm text-fg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-bold text-primary",
					children: "OBJECTIVE · "
				}), m.objective]
			}),
			m.hunt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-2 text-xs text-accent",
				children: ["Hunt this canyon: ", m.hunt]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-4 text-sm italic",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-bold not-italic text-primary",
						children: m.beat.who
					}),
					" · ",
					m.beat.text
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onGo,
				className: "min-h-12 w-full rounded-xl border border-primary bg-primary/30 px-4 py-3 text-sm font-bold",
				children: "Deploy"
			})
		]
	});
}
function OverlayCard({ title, body, actions, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "w-full max-w-sm rounded-2xl border border-border bg-surface p-5 text-center shadow-[0_0_40px_#00f0ff33]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-2 text-2xl font-black",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-3 text-sm text-muted",
				children: body
			}),
			children,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col gap-2",
				children: actions.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: a.onClick,
					className: `min-h-12 rounded-xl border px-4 py-3 text-sm font-semibold ${a.primary ? "border-accent bg-accent/30 text-fg" : "border-border bg-surface-2 text-muted"}`,
					children: a.label
				}, a.label))
			})
		]
	});
}
function RadioPill({ radio }) {
	const [shown, setShown] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (!radio) {
			setShown("");
			return;
		}
		setShown(radio);
		const t = window.setTimeout(() => setShown(""), 2e3);
		return () => window.clearTimeout(t);
	}, [radio]);
	if (!shown) return null;
	const line = parseRadio(shown);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute inset-x-3 top-2 z-10 flex justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "hud-radio max-w-[92%] truncate rounded-full border border-white/10 bg-[#0a0614cc] px-3 py-1.5 text-center text-[10px] sm:text-[11px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-bold uppercase tracking-wide text-primary",
				children: line.who
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-accent/90",
				children: [" · ", line.text]
			})]
		})
	});
}
function PauseKit({ hud, weapon, onWeapon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-4 text-left",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-2 text-center text-sm font-semibold text-warn",
				children: [
					"★ ",
					hud.score.toLocaleString(),
					" · ",
					hud.coins,
					" coins · ",
					hud.lives,
					" lives"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 text-[10px] font-bold uppercase tracking-wide text-muted",
				children: "Powers"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PowerRow, { unlocked: hud.unlockedPowers }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 text-[10px] font-bold uppercase tracking-wide text-muted",
				children: "Weapons"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-4 gap-1",
				children: WEAPON_RAIL.map((id) => {
					const on = id === weapon;
					const th = WEAPON_THEME[id];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `min-h-9 rounded-lg border px-1 py-1 text-[9px] font-black uppercase ${on ? `${th.border} ${th.bg} ${th.text} ${th.glow}` : "border-border bg-surface-2 text-muted"}`,
						onClick: () => onWeapon(id),
						children: WEAPON_LABEL[id]
					}, id);
				})
			})
		]
	});
}
var WEAPON_RAIL = [
	"homing",
	"pulse",
	"beam",
	"spread",
	"charge",
	"nova",
	"ricochet"
];
function MobileControls({ weapon, character, shield, maxShield, shielding, onWeapon }) {
	/** Multi-touch safe — each finger only releases its own axis */
	const axisPress = (axis, edge) => ({
		onPointerDown: (e) => {
			e.preventDefault();
			e.stopPropagation();
			try {
				e.currentTarget.setPointerCapture?.(e.pointerId);
			} catch {}
			input.holdTouch(axis, e.pointerId, true);
			if (edge === "jump") input.setTouch({ jumpPressed: true });
			if (edge === "fire") input.setTouch({ firePressed: true });
		},
		onPointerUp: (e) => {
			e.preventDefault();
			input.holdTouch(axis, e.pointerId, false);
		},
		onPointerCancel: (e) => {
			e.preventDefault();
			input.holdTouch(axis, e.pointerId, false);
		},
		onLostPointerCapture: (e) => {
			input.holdTouch(axis, e.pointerId, false);
		}
	});
	const shieldPct = Math.max(0, Math.min(100, shield / maxShield * 100));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "z-30 shrink-0 border-t border-border/60 bg-surface/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md sm:px-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-[720px] flex-col gap-1.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "weapon-carousel flex items-stretch gap-1",
					children: (() => {
						const i = WEAPON_RAIL.indexOf(weapon);
						const n = WEAPON_RAIL.length;
						const prev = WEAPON_RAIL[(i - 1 + n) % n];
						const next = WEAPON_RAIL[(i + 1) % n];
						const side = (id) => {
							const th = WEAPON_THEME[id];
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `weapon-neighbor flex min-h-[2.45rem] min-w-0 flex-[0.85] items-center justify-center rounded-xl border px-1 text-[10px] font-black uppercase leading-none ${th.border} bg-surface-2 ${th.text}`,
								style: { touchAction: "none" },
								onPointerDown: (e) => {
									e.preventDefault();
									e.stopPropagation();
									onWeapon(id);
								},
								children: WEAPON_LABEL[id]
							}, id + "-side");
						};
						const th = WEAPON_THEME[weapon];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							side(prev),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `weapon-selected flex min-h-[2.55rem] min-w-0 flex-[1.5] items-center justify-center rounded-xl border px-2 text-[12px] font-black uppercase tracking-wide ${th.border} ${th.bg} ${th.text} ${th.glow}`,
								style: { touchAction: "none" },
								onPointerDown: (e) => {
									e.preventDefault();
									e.stopPropagation();
								},
								children: WEAPON_LABEL[weapon]
							}),
							side(next)
						] });
					})()
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-stretch justify-between gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MovePlate, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "fire-btn flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border border-accent bg-accent/30 px-2 shadow-[0_0_16px_#00f0ff44] active:scale-[0.98]",
							style: { touchAction: "none" },
							...axisPress("fire", "fire"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-base font-black tracking-wide text-fg",
								children: "FIRE"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeaponPatternIcon, { weapon })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pad, {
							label: "JUMP",
							primary: true,
							...axisPress("jump", "jump")
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-stretch gap-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `relative min-h-[2.85rem] flex-1 overflow-hidden rounded-2xl border text-sm font-bold active:scale-[0.99] ${shielding ? "border-accent bg-accent/25 text-fg shadow-[0_0_16px_#00f0ff55]" : "border-border bg-surface-2 text-fg"}`,
						style: { touchAction: "none" },
						...axisPress("shield"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-100",
							style: {
								width: `${shieldPct}%`,
								background: shielding ? "linear-gradient(90deg, #ff2bd666, #00f0ff88)" : "linear-gradient(90deg, #00f0ff44, #ff2bd644)"
							}
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative z-10 flex items-center justify-center gap-2 px-3 py-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] uppercase tracking-wider text-muted",
								children: shielding ? "Shield Active" : "Hold Shield"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs font-semibold tabular-nums text-fg",
								children: [
									shield.toFixed(1),
									"s",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "ml-1 text-muted",
										children: ["· ", character === "grok" ? "Jetpack" : "Multi-jump"]
									})
								]
							})]
						})]
					})
				})
			]
		})
	});
}
function MovePlate() {
	const plateRef = (0, import_react.useRef)(null);
	const drag = (0, import_react.useRef)(null);
	const [knob, setKnob] = (0, import_react.useState)(50);
	const [home, setHome] = (0, import_react.useState)(true);
	const ratio = (clientX) => {
		const el = plateRef.current;
		if (!el) return .5;
		const r = el.getBoundingClientRect();
		return Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width)));
	};
	const applyZone = (pointerId, t) => {
		input.holdTouch("left", pointerId, t < .45);
		input.holdTouch("right", pointerId, t > .55);
	};
	const end = (pointerId) => {
		const d = drag.current;
		if (!d || d.id !== pointerId) return;
		input.holdTouch("left", pointerId, false);
		input.holdTouch("right", pointerId, false);
		drag.current = null;
		setHome(true);
		setKnob(50);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: plateRef,
		className: "move-plate",
		style: { touchAction: "none" },
		onPointerDown: (e) => {
			if (drag.current) return;
			e.preventDefault();
			e.stopPropagation();
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
			const t = ratio(e.clientX);
			drag.current = {
				id: e.pointerId,
				x0: e.clientX,
				slide: false
			};
			setHome(false);
			setKnob(Math.max(18, Math.min(82, t * 100)));
			applyZone(e.pointerId, t);
		},
		onPointerMove: (e) => {
			const d = drag.current;
			if (!d || d.id !== e.pointerId) return;
			if (!d.slide && Math.abs(e.clientX - d.x0) > 12) d.slide = true;
			if (!d.slide) return;
			const t = ratio(e.clientX);
			setKnob(Math.max(18, Math.min(82, t * 100)));
			applyZone(e.pointerId, t);
		},
		onPointerUp: (e) => end(e.pointerId),
		onPointerCancel: (e) => end(e.pointerId),
		onLostPointerCapture: (e) => end(e.pointerId),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "move-lobe move-lobe-l" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "move-lobe move-lobe-r" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "move-rail" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `move-knob${home ? " is-home" : ""}`,
				style: { left: `${knob}%` }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "move-chev move-chev-l",
				"aria-hidden": true,
				children: "◀"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "move-chev move-chev-r",
				"aria-hidden": true,
				children: "▶"
			})
		]
	});
}
function WeaponPatternIcon({ weapon }) {
	if (weapon === "pulse") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "52",
		height: "14",
		viewBox: "0 0 52 14",
		"aria-hidden": true,
		className: "opacity-95",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
			x1: "4",
			y1: "7",
			x2: "46",
			y2: "7",
			stroke: "#ff2bd6",
			strokeWidth: "2.5",
			strokeLinecap: "round"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "44",
			cy: "7",
			r: "2.5",
			fill: "#ff2bd6"
		})]
	});
	if (weapon === "beam") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "52",
		height: "14",
		viewBox: "0 0 52 14",
		"aria-hidden": true,
		className: "opacity-95",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: "4",
			y: "4",
			width: "44",
			height: "6",
			rx: "2",
			fill: "#00f0ff",
			opacity: "0.95"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: "4",
			y: "5.5",
			width: "44",
			height: "3",
			rx: "1",
			fill: "#ffffff",
			opacity: "0.45"
		})]
	});
	if (weapon === "spread") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "52",
		height: "16",
		viewBox: "0 0 52 16",
		"aria-hidden": true,
		className: "opacity-95",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "6",
				y1: "8",
				x2: "46",
				y2: "2",
				stroke: "#39ff9a",
				strokeWidth: "2",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "6",
				y1: "8",
				x2: "48",
				y2: "8",
				stroke: "#39ff9a",
				strokeWidth: "2",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "6",
				y1: "8",
				x2: "46",
				y2: "14",
				stroke: "#39ff9a",
				strokeWidth: "2",
				strokeLinecap: "round"
			})
		]
	});
	if (weapon === "homing") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "52",
		height: "16",
		viewBox: "0 0 52 16",
		"aria-hidden": true,
		className: "opacity-95",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M6 8 Q26 0 46 8",
			fill: "none",
			stroke: "#c77dff",
			strokeWidth: "2.2"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "44",
			cy: "8",
			r: "3",
			fill: "#c77dff"
		})]
	});
	if (weapon === "charge") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "52",
		height: "16",
		viewBox: "0 0 52 16",
		"aria-hidden": true,
		className: "opacity-95",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: "4",
			y: "5",
			width: "20",
			height: "6",
			rx: "2",
			fill: "#ffcc33",
			opacity: "0.5"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: "26",
			y: "3",
			width: "22",
			height: "10",
			rx: "2",
			fill: "#ffcc33"
		})]
	});
	if (weapon === "nova") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "52",
		height: "16",
		viewBox: "0 0 52 16",
		"aria-hidden": true,
		className: "opacity-95",
		children: [[
			0,
			45,
			90,
			135
		].map((deg) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
			x1: "26",
			y1: "8",
			x2: 26 + Math.cos(deg * Math.PI / 180) * 18,
			y2: 8 + Math.sin(deg * Math.PI / 180) * 6,
			stroke: "#ff2bd6",
			strokeWidth: "2"
		}, deg)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "26",
			cy: "8",
			r: "3",
			fill: "#fff"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		width: "52",
		height: "16",
		viewBox: "0 0 52 16",
		"aria-hidden": true,
		className: "opacity-95",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
			points: "4,12 18,4 32,12 46,4",
			fill: "none",
			stroke: "#00f0ff",
			strokeWidth: "2.2",
			strokeLinejoin: "round"
		})
	});
}
function Pad({ label, primary, accent, move, onPointerDown, onPointerUp, onPointerCancel, onLostPointerCapture }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: `pad-lg flex select-none items-center justify-center rounded-2xl border font-bold shadow-md active:scale-95 ${move ? "pad-move border-accent bg-accent text-[#041018] shadow-[0_0_22px_#00f0ffcc] ring-2 ring-accent/80" : primary ? "border-primary bg-primary/55 text-fg" : accent ? "border-accent bg-accent/45 text-fg" : "border-border bg-surface-2 text-fg"}`,
		style: { touchAction: "none" },
		onPointerDown,
		onPointerUp,
		onPointerCancel,
		onLostPointerCapture,
		children: label
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameApp, {});
}
//#endregion
export { Home as component };
