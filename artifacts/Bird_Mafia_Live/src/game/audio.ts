type Bus = "master" | "music" | "sfx";

const PATHS = {
  title: "/audio/music/bgm_title_canyon_chaos.wav",
  play: "/audio/music/bgm_travel_canyon_run.wav",
  battle: "/audio/music/bgm_battle_hooked.wav",
  win: "/audio/music/bgm_town_goblin_city.wav",
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
  engine: "/audio/sfx/sfx_engine.wav",
} as const;

export type SfxId = keyof typeof PATHS;

class GameAudio {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private unlocked = false;
  private currentMusic: string | null = null;
  private muted = false;

  async unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.42;
      this.sfxBus.gain.value = 0.75;
      this.master.gain.value = 0.9;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      // resume() needs a user gesture in some browsers — don't hang auto-boot / headless
      try {
        await Promise.race([
          this.ctx.resume(),
          new Promise((r) => setTimeout(r, 250)),
        ]);
      } catch {
        /* ignore */
      }
    }
    this.unlocked = true;
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "visible" && this.ctx?.state === "suspended") {
          void this.ctx.resume();
        }
      },
      { passive: true },
    );
  }

  async preload() {
    if (!this.ctx) await this.unlock();
    const entries = Object.entries(PATHS);
    const work = Promise.all(
      entries.map(async ([, url]) => {
        if (this.buffers.has(url)) return;
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const ab = await res.arrayBuffer();
          const buf = await this.ctx!.decodeAudioData(ab.slice(0));
          this.buffers.set(url, buf);
        } catch {
          /* ignore missing / decode errors */
        }
      }),
    );
    // Cap wait so gameplay can start even if audio is slow
    await Promise.race([work, new Promise((r) => setTimeout(r, 4000))]);
  }

  private bus(kind: Bus): GainNode | null {
    if (kind === "music") return this.musicBus;
    if (kind === "sfx") return this.sfxBus;
    return this.master;
  }

  play(id: SfxId, opts?: { volume?: number; rate?: number; loop?: boolean; bus?: Bus }) {
    if (!this.unlocked || !this.ctx || this.muted) return;
    const url = PATHS[id];
    const buf = this.buffers.get(url);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = !!opts?.loop;
    const rate = opts?.rate ?? 1 + (Math.random() * 0.12 - 0.06);
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

  playMusic(id: "title" | "play" | "battle" | "win", fade = 0.4) {
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
        } catch {
          /* */
        }
      }, fade * 1000 + 40);
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(1, now + fade);
    src.connect(g);
    g.connect(this.musicBus!);
    src.start();
    this.musicSource = src;
    this.musicGain = g;
    this.currentMusic = id;
  }

  stopMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch {
        /* */
      }
      this.musicSource = null;
      this.musicGain = null;
      this.currentMusic = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
    }
  }

  isUnlocked() {
    return this.unlocked;
  }
}

export const gameAudio = new GameAudio();
