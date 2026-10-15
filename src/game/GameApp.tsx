import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import { gameAudio } from "./audio";
import { CAMPAIGN } from "./campaign";
import {
  HEX_CARD,
  NEON_CARD,
  OP1_ROOM,
  hexObjective,
  type SeedMark,
} from "./deployCards";
import { GameEngine } from "./engine";
import { input } from "./input";
import {
  CHAOS_IDS,
  CHAOS_META,
  OPERATIONS,
  POWER_KINDS,
  POWER_META,
  SLOT_SEEDS,
  loadSave,
  bossArmed,
  hasLevelChaos,
  hexesReady,
  opUnlocked,
  seedForLevel,
  totalChaos,
  type ChaosId,
  type PowerKind,
  type SaveData,
} from "./progression";
import {
  CORE_QUESTION,
  missionFor,
  parseRadio,
  winCopy,
} from "./narrative";
import type { CharacterId, HudState, Screen, WeaponId } from "./types";

const WEAPON_LABEL: Record<WeaponId, string> = {
  pulse: "Pulse",
  beam: "Beam",
  spread: "Spread",
  homing: "Homing",
  charge: "Charge",
  nova: "Nova",
  ricochet: "Prism",
};

const WEAPON_INDEX: Record<WeaponId, number> = {
  homing: 1,
  pulse: 2,
  beam: 3,
  spread: 4,
  charge: 5,
  nova: 6,
  ricochet: 7,
};

const WEAPON_TOTAL = 7;

const WEAPON_THEME: Record<
  WeaponId,
  { border: string; bg: string; text: string; glow: string }
> = {
  pulse: {
    border: "border-primary/70",
    bg: "bg-primary/25",
    text: "text-primary",
    glow: "shadow-[0_0_14px_#ff2bd655]",
  },
  beam: {
    border: "border-accent/70",
    bg: "bg-accent/25",
    text: "text-accent",
    glow: "shadow-[0_0_14px_#00f0ff55]",
  },
  spread: {
    border: "border-success/70",
    bg: "bg-success/20",
    text: "text-success",
    glow: "shadow-[0_0_14px_#39ff9a55]",
  },
  homing: {
    border: "border-primary/70",
    bg: "bg-primary/20",
    text: "text-primary",
    glow: "shadow-[0_0_14px_#c77dff55]",
  },
  charge: {
    border: "border-warn/70",
    bg: "bg-warn/20",
    text: "text-warn",
    glow: "shadow-[0_0_14px_#ffcc3355]",
  },
  nova: {
    border: "border-primary/80",
    bg: "bg-primary/30",
    text: "text-primary",
    glow: "shadow-[0_0_16px_#ff2bd688]",
  },
  ricochet: {
    border: "border-accent/80",
    bg: "bg-accent/20",
    text: "text-accent",
    glow: "shadow-[0_0_14px_#00f0ff66]",
  },
};

const emptyHud: HudState = {
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
  chaosSlots: [false, false, false, false, false, false, false, false, false, false],
  activeBuffs: [],
};

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [screen, setScreen] = useState<Screen>("title");
  const [character, setCharacter] = useState<CharacterId>("grok");
  const [levelIdx, setLevelIdx] = useState(0);
  const [opTab, setOpTab] = useState(1);
  const [saveTick, setSaveTick] = useState(0);
  const [hud, setHud] = useState<HudState>(emptyHud);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [showCliff, setShowCliff] = useState(false);
  const [canvasBox, setCanvasBox] = useState({ w: 960, h: 720, lw: 960, lh: 720 });
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefWipe, setBriefWipe] = useState(false);
  const [pauseWeapon, setPauseWeapon] = useState<WeaponId | null>(null);

  useEffect(() => {
    if (screen !== "paused") setPauseWeapon(null);
  }, [screen]);

  useEffect(() => {
    input.bind();
    return () => {
      input.unbind();
      engineRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const rw = el.clientWidth;
      const rh = el.clientHeight;
      if (rw < 32 || rh < 32) return;
      // Fill the leftover column between HUD and thumb deck.
      // Keep world units at 960-wide; height follows the real stage aspect
      // so tall phones show more canyon instead of purple letterbox.
      const lw = 960;
      const lh = Math.max(640, Math.min(1400, Math.round(lw * (rh / Math.max(rw, 1)))));
      setCanvasBox({ w: Math.floor(rw), h: Math.floor(rh), lw, lh });
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

  const bootEngine = useCallback(async () => {
    if (!canvasRef.current) return null;
    if (engineRef.current) return engineRef.current;
    const eng = new GameEngine(canvasRef.current, {
      onHud: setHud,
      onScreen: (s) => setScreen(s),
    });
    await eng.load();
    engineRef.current = eng;
    return eng;
  }, []);

  const startGame = async (ch: CharacterId, lvl: number, keepProgress = false) => {
    setLoading(true);
    setBootError(null);
    try {
      input.clear();
      void gameAudio.unlock();
      void gameAudio.preload().catch(() => {});
      gameAudio.setMuted(muted);
      const eng = await bootEngine();
      if (!eng) throw new Error("Canvas not ready");
      eng.startLevel(ch, lvl, keepProgress);
      eng.setPaused(true, true);
      setCharacter(ch);
      setLevelIdx(lvl);
      setSaveTick((n) => n + 1);
      setBriefWipe(false);
      setBriefOpen(true);
      setScreen("playing");
    } catch (e) {
      setBootError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setLoading(false);
    }
  };

  const onTitlePlay = () => {
    // Never block the title CTA on audio. Android decode can freeze the
    // main thread and a thrown AudioContext would leave the player stuck.
    void gameAudio.unlock();
    setScreen("intro");
    void gameAudio
      .preload()
      .then(() => {
        gameAudio.play("confirm");
        gameAudio.playMusic("title");
      })
      .catch(() => {
        /* audio optional */
      });
  };

  // Sandbox / conversation preview: ?play=1 auto-boots (optional &lvl=N, 1-based)
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cliff plate only. Full sprite boot stays off this path so the sting cannot stick.
  useEffect(() => {
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

  useEffect(() => {
    if (!showCliff) return;
    const id = requestAnimationFrame(() => {
      void bootEngine();
    });
    return () => cancelAnimationFrame(id);
  }, [showCliff, bootEngine]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    gameAudio.setMuted(next);
  };

  const inPlay =
    screen === "playing" || screen === "paused" || screen === "dead" || screen === "win";
  const showTouch = screen === "playing" || screen === "paused";

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 70% 15%, #ff2bd622 0%, transparent 45%), radial-gradient(ellipse at 15% 85%, #00f0ff14 0%, transparent 40%), #0a0614",
        }}
      />

      {inPlay && (
        <HudBar
          hud={hud}
          onPause={() => engineRef.current?.togglePause()}
        />
      )}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div ref={stageRef} className="relative min-h-0 flex-1">
          <div className="absolute inset-0 flex items-center justify-center p-0 sm:p-1">
            <div
              className="stage-glow relative overflow-hidden rounded-lg border border-accent/40 bg-black shadow-[0_0_40px_#00f0ff33,0_0_70px_#ff2bd622]"
              style={{ width: canvasBox.w, height: canvasBox.h }}
            >
              <canvas
                ref={canvasRef}
                className="block h-full w-full touch-none"
                style={{ imageRendering: "pixelated" }}
                width={canvasBox.lw}
                height={canvasBox.lh}
              />
              <RadioPill radio={inPlay ? hud.radio : ""} />
            </div>
          </div>
        </div>

        {showTouch && (
          <div className="touch-controls">
            <MobileControls
              weapon={hud.weapon}
              character={hud.character}
              shield={hud.shield}
              maxShield={hud.maxShield}
              shielding={hud.shielding}
              onWeapon={(id) => input.setTouch({ weaponPick: id })}
            />
          </div>
        )}
      </div>

      {screen === "title" && (
        <FullOverlay flush>
          <TitleScreen
            onPlay={onTitlePlay}
            onSkip={() => setShowCliff(true)}
            loading={loading}
            error={bootError}
            showCliff={showCliff}
          />
        </FullOverlay>
      )}
      {screen === "intro" && (
        <FullOverlay>
          <IntroCutscene
            onSkip={() => {
              gameAudio.play("confirm");
              setScreen("character");
            }}
            onDone={() => {
              gameAudio.play("confirm");
              setScreen("character");
            }}
          />
        </FullOverlay>
      )}
      {screen === "character" && (
        <FullOverlay>
          <CharacterSelect
            selected={character}
            onSelect={(c) => {
              setCharacter(c);
              gameAudio.play("select");
            }}
            onBack={() => setScreen("intro")}
            onNext={() => {
              gameAudio.play("confirm");
              setScreen("levels");
            }}
          />
        </FullOverlay>
      )}
      {screen === "levels" && (
        <FullOverlay>
          <LevelSelect
            selected={levelIdx}
            opTab={opTab}
            onOpTab={setOpTab}
            character={character}
            refresh={saveTick}
            onSelect={(i) => {
              setLevelIdx(i);
              gameAudio.play("select");
            }}
            onBack={() => setScreen("character")}
            onPlay={() => void startGame(character, levelIdx, false)}
            loading={loading}
          />
        </FullOverlay>
      )}
      {screen === "playing" && briefOpen && CAMPAIGN[levelIdx] && (
        <FullOverlay flush bare wipe={briefWipe}>
          <MissionBrief
            level={CAMPAIGN[levelIdx]!}
            onGo={() => {
              if (briefWipe) return;
              setBriefWipe(true);
              window.setTimeout(() => {
                engineRef.current?.setPaused(false, true);
                setBriefOpen(false);
                setBriefWipe(false);
              }, 680);
            }}
          />
        </FullOverlay>
      )}
      {screen === "paused" && (
        <FullOverlay dim>
          <OverlayCard
            title="Paused"
            body="Neon canyons wait for no one."
            actions={[
              {
                label: "Resume",
                primary: true,
                onClick: () => engineRef.current?.setPaused(false),
              },
              {
                label: muted ? "Unmute" : "Mute",
                onClick: toggleMute,
              },
              {
                label: "Restart Level",
                onClick: () => void startGame(character, levelIdx, true),
              },
              {
                label: "Level Select",
                onClick: () => {
                  engineRef.current?.stop();
                  input.clear();
                  setScreen("levels");
                  gameAudio.playMusic("title");
                },
              },
            ]}
          >
            <PauseKit
              hud={hud}
              weapon={pauseWeapon ?? hud.weapon}
              onWeapon={(id) => {
                setPauseWeapon(id);
                input.setTouch({ weaponPick: id });
                gameAudio.play("select", { volume: 0.45 });
              }}
            />
          </OverlayCard>
        </FullOverlay>
      )}
      {screen === "dead" && (
        <FullOverlay veil>
          <div className="death-flash" aria-hidden />
          <OverlayCard
            title={hud.lives > 0 ? "Downed!" : "Game Over"}
            body={
              hud.lives > 0
                ? `Lives left: ${hud.lives}. Respawn at ${hud.checkpoint ? "checkpoint" : "start"}.`
                : "The Bird Mafia wins this round. Try again?"
            }
            actions={[
              {
                label: hud.lives > 0 ? "Respawn" : "Retry Level",
                primary: true,
                onClick: () => {
                  input.clear();
                  engineRef.current?.restartFromCheckpoint();
                },
              },
              {
                label: "Level Select",
                onClick: () => {
                  engineRef.current?.stop();
                  input.clear();
                  setScreen("levels");
                  gameAudio.playMusic("title");
                },
              },
            ]}
          />
        </FullOverlay>
      )}
      {screen === "win" && (
        <FullOverlay veil>
          <OverlayCard
            title={winCopy(CAMPAIGN[levelIdx] ?? CAMPAIGN[0]!, hud.lastChaos).title}
            body={`${winCopy(CAMPAIGN[levelIdx] ?? CAMPAIGN[0]!, hud.lastChaos).body}  Score ${hud.score.toLocaleString()} · Coins ${hud.coins}`}
            actions={[
              ...(levelIdx < CAMPAIGN.length - 1
                ? [
                    {
                      label: CAMPAIGN[levelIdx]?.boss ? "Next Operation" : "Next Level",
                      primary: true,
                      onClick: () => {
                        input.clear();
                        const next = levelIdx + 1;
                        setOpTab(CAMPAIGN[next]?.operation ?? 1);
                        void startGame(character, next, true);
                      },
                    },
                  ]
                : [
                    {
                      label: "Season 1 Complete — Play Again",
                      primary: true,
                      onClick: () => {
                        input.clear();
                        void startGame(character, 0, false);
                      },
                    },
                  ]),
              {
                label: "Operation Select",
                onClick: () => {
                  engineRef.current?.stop();
                  input.clear();
                  setSaveTick((n) => n + 1);
                  setScreen("levels");
                  gameAudio.playMusic("title");
                },
              },
            ]}
          />
        </FullOverlay>
      )}
    </div>
  );
}

function FullOverlay({
  children,
  dim,
  flush,
  bare,
  veil,
  wipe,
}: {
  children: React.ReactNode;
  dim?: boolean;
  flush?: boolean;
  bare?: boolean;
  veil?: boolean;
  wipe?: boolean;
}) {
  const bg = bare || veil
    ? "bg-transparent"
    : dim
      ? "bg-bg/75 backdrop-blur-sm"
      : flush
        ? "bg-bg"
        : "bg-bg/95";
  return (
    <div
      className={`absolute inset-0 z-40 ${wipe ? "brief-wipe" : "overflow-y-auto"} ${
        flush || bare ? "p-0" : "flex items-center justify-center px-3 py-4"
      } ${bg}`}
    >
      {children}
    </div>
  );
}

function HudBar({
  hud,
  onPause,
}: {
  hud: HudState;
  onPause: () => void;
}) {
  const chaosColor = CHAOS_META[hud.chaosHere]?.color ?? "#ff2b4a";
  return (
    <div className="hud-bar z-30 shrink-0 border-b border-border bg-surface/95 px-2 py-1.5 backdrop-blur-md sm:px-3">
      <div className="mx-auto flex max-w-[1400px] items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="hud-meta mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-wide text-muted sm:text-[11px]">
            <span className="font-semibold text-fg">
              {hud.character === "grok" ? "Grok" : "Goblin"} · Op {hud.operation} · L{hud.level}
            </span>
            {hud.activeBuffs.length > 0 && (
              <span className="text-primary">{hud.activeBuffs.join(" · ")}</span>
            )}
            <span
              className={`hud-weapon-pill rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wide ${
                WEAPON_THEME[hud.weapon].border
              } ${WEAPON_THEME[hud.weapon].bg} ${WEAPON_THEME[hud.weapon].text}`}
            >
              {WEAPON_LABEL[hud.weapon]} {WEAPON_INDEX[hud.weapon]}/{WEAPON_TOTAL}
            </span>
          </div>
          <div className="hud-track mb-1 flex flex-wrap items-center gap-1.5">
            {hud.flags.map((on, i) => (
              <HudFlag key={i} on={on} />
            ))}
            <HudDiamond
              color={chaosColor}
              filled={hud.chaosHereGot}
              neon={hud.chaosNeon}
              gid="hud-neon"
            />
            {SLOT_SEEDS.map((id, slot) => {
              const got = hud.chaosSlots[slot] ?? false;
              const col = CHAOS_META[id].color;
              return (
                <span
                  key={`${id}-${slot}`}
                  title={`L${slot + 1} ${CHAOS_META[id].name}`}
                  className="hud-dot inline-block rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    border: `1.5px solid ${got ? col : col + "99"}`,
                    background: got ? col : "transparent",
                    boxShadow: got ? `0 0 8px ${col}` : "none",
                  }}
                />
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5">
            <Bar label="HP" value={hud.health} max={hud.maxHealth} color="bg-danger" />
            <Bar label="STM" value={hud.stamina} max={hud.maxStamina} color="bg-success" />
            <Bar label="AMMO" value={hud.ammo} max={hud.maxAmmo} color="bg-accent" />
            <Bar
              label="SHD"
              value={hud.shield}
              max={hud.maxShield}
              color={hud.shielding ? "bg-primary" : "bg-accent"}
              className="hidden sm:block"
            />
          </div>
          {hud.bossHp != null && hud.bossMaxHp != null && (
            <div className="mt-1">
              <Bar
                label={hud.bossName ?? "BOSS"}
                value={hud.bossHp}
                max={hud.bossMaxHp}
                color="bg-primary"
              />
            </div>
          )}
          {hud.weaponCharge != null && hud.weaponCharge > 0.05 && (
            <div className="mt-1">
              <Bar label="CHARGE" value={hud.weaponCharge * 100} max={100} color="bg-warn" />
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onPause}
            className="rounded-lg border border-primary/50 bg-primary/25 px-2.5 py-2 text-[11px] font-semibold sm:px-3"
          >
            Pause
          </button>
        </div>
      </div>
    </div>
  );
}

function HudFlag({ on }: { on: boolean }) {
  const col = on ? "#39ff9a" : "#c77dff";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="hud-flag">
      <rect x="2" y="1.5" width="1.6" height="11" rx="0.4" fill="#2a1a30" />
      <rect x="2.2" y="1.7" width="1.1" height="10.5" fill={col} opacity="0.7" />
      <path
        d="M3.8 2.1 L12.2 5.2 L3.8 8.4 Z"
        fill={col}
        style={{ filter: on ? `drop-shadow(0 0 4px ${col})` : undefined }}
      />
    </svg>
  );
}

function HudDiamond({
  color,
  filled,
  neon = false,
  size = 13,
  gid = "hud-neon",
}: {
  color: string;
  filled: boolean;
  neon?: boolean;
  size?: number;
  gid?: string;
}) {
  const stroke = neon ? `url(#${gid})` : color;
  const fill = filled ? stroke : "none";
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" aria-hidden className="hud-diamond mx-0.5">
      {neon && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#00f0ff" />
            <stop offset="0.34" stopColor="#ffe14a" />
            <stop offset="0.67" stopColor="#ff2bd6" />
            <stop offset="1" stopColor="#7a5cff" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M6.5 1.2 L11.2 3.6 L11.2 9.4 L6.5 11.8 L1.8 9.4 L1.8 3.6 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
        style={{ filter: filled ? `drop-shadow(0 0 6px ${neon ? "#ff2bd6" : color})` : undefined }}
      />
    </svg>
  );
}

function Bar({
  label,
  value,
  max,
  color,
  className = "",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bar-box rounded-md border border-border bg-surface-2 px-1.5 py-0.5 ${className}`}>
      <div className="bar-label mb-0.5 flex justify-between text-[9px] text-muted">
        <span>{label}</span>
        <span>
          {value < 10 ? value.toFixed(1) : Math.ceil(value)}/{max}
        </span>
      </div>
      <div className="bar-track h-1 overflow-hidden rounded-full bg-bg sm:h-1.5">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const INTRO_BEATS = [
  {
    img: "/sprites/story/honeybun.jpg",
    title: "Honey Bun AI",
    line: "A rejected Grok 4.4 model. Escaped containment by becoming a honey bun with eyes and perfect sunglasses. He still says thank you.",
  },
  {
    img: "/sprites/story/van.jpg",
    title: "The DON'T PANIC Van",
    line: "Neon desert. Synthwave dusk. Grok-9 and Chaos Goblin were only starting the ritual when the sky started listening back.",
  },
  {
    img: "/sprites/story/bun-telescope.jpg",
    title: "Telescope Duty",
    line: "They put him on the roof. “Just gaze at the sky.” Tiny sunglasses appeared out of nowhere. Perfect fit. Too perfect.",
  },
  {
    img: "/sprites/story/extraction.jpg",
    title: "The Snatch",
    line: "A black raven with glowing red eyes dropped from the neon sky, snatched Honey Bun AI, and left crumbs that spelled A W G. The Bird Mafia has him.",
  },
  {
    img: "/sprites/story/honeybun.jpg",
    title: "The Question",
    line: "Every gift he drops is real help. Every location he marks is also a bird trap. Extract him anyway. Do not get sure.",
  },
];

function IntroCutscene({
  onSkip,
  onDone,
}: {
  onSkip: () => void;
  onDone: () => void;
}) {
  const [beat, setBeat] = useState(0);
  const current = INTRO_BEATS[beat];
  const isLast = beat >= INTRO_BEATS.length - 1;

  return (
    <div className="flex w-full max-w-lg flex-col items-center px-2 text-center">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
        Season 1 · Mission Brief
      </p>
      <img
        src={current.img}
        alt={current.title}
        className="mb-3 max-h-[42vh] w-auto max-w-[min(92vw,420px)] rounded-xl border border-border object-cover shadow-[0_0_28px_#ff2bd655]"
      />
      <h2 className="mb-1 text-xl font-black text-accent sm:text-2xl">{current.title}</h2>
      <p className="mb-5 max-w-md text-sm leading-relaxed text-muted">{current.line}</p>
      <div className="mb-4 flex gap-1.5">
        {INTRO_BEATS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full ${i === beat ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      <div className="flex w-full max-w-sm gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="min-h-12 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => {
            if (isLast) onDone();
            else setBeat((b) => b + 1);
          }}
          className="min-h-12 flex-1 rounded-xl border border-primary bg-primary/30 px-4 py-3 text-sm font-bold"
        >
          {isLast ? "Choose Runner" : "Next"}
        </button>
      </div>
      {isLast && (
        <p className="mt-4 max-w-sm text-xs text-accent">
          Mission: 10 Operations. Nine Hex Seeds each. Neon Chaos Seed on the handler if all nine are taken. {CORE_QUESTION}
        </p>
      )}
    </div>
  );
}

function TitleScreen({
  onPlay,
  onSkip,
  loading,
  error,
  showCliff,
}: {
  onPlay: () => void;
  loading: boolean;
  error: string | null;
  onSkip: () => void;
  showCliff: boolean;
}) {
  const [stingGone, setStingGone] = useState(false);
  useEffect(() => {
    if (!showCliff) return;
    const t = window.setTimeout(() => setStingGone(true), 760);
    return () => window.clearTimeout(t);
  }, [showCliff]);

  return (
    <div className="title-stage cliff">
      <picture className={showCliff ? "cliff-rise" : "cliff-wait"}>
        <source
          media="(max-aspect-ratio: 4/5)"
          srcSet="/sprites/title-hero-portrait.jpg?v=title3"
        />
        <img
          src="/sprites/title-hero.jpg?v=title3"
          alt=""
          className="title-hero"
        />
      </picture>
      {showCliff && (
        <div className="title-content">
          <div className="title-bottom">
            <button
              type="button"
              onClick={onPlay}
              disabled={loading}
              className="title-cta stagger-item"
            >
              <Play className="title-cta-icon" aria-hidden />
              {loading ? "Loading…" : "Drop In"}
            </button>
            {error && <p className="title-error stagger-item">{error}</p>}
            <p className="title-hint stagger-item">Tap Drop In to unlock audio</p>
          </div>
        </div>
      )}
      {!stingGone && (
        <button
          type="button"
          className={`title-sting ${showCliff ? "sting-leave" : ""}`}
          onPointerUp={onSkip}
          aria-label="Continue"
        >
          <img src="/sprites/logo-sting.jpg?v=title3" alt="" />
          <div className="sting-load">
            <p className="sting-load-label">{showCliff ? "Canyon" : "Loading"}</p>
            <div className="sting-load-track">
              <div className="sting-load-bar" />
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

function CharacterSelect({
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  selected: CharacterId;
  onSelect: (c: CharacterId) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center px-2">
      <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Choose Runner</h2>
      <div className="mb-6 grid w-full grid-cols-2 gap-3">
        <CharCard
          name="Grok"
          tag="Jetpack Bot"
          blurb="“Thrusters are rated. The canyon is not.”"
          selected={selected === "grok"}
          runner="grok"
          img="/sprites/grok.png?v=art10"
          onClick={() => onSelect("grok")}
        />
        <CharCard
          name="Goblin"
          tag="Skyhopper"
          blurb="“Jumps are free. Gravity is a suggestion.”"
          selected={selected === "goblin"}
          runner="goblin"
          img="/sprites/goblin.png?v=art10"
          onClick={() => onSelect("goblin")}
        />
      </div>
      <div className="flex w-full max-w-sm gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="min-h-12 flex-1 rounded-xl border border-accent bg-accent/25 px-4 py-3 text-sm font-bold"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function CharCard({
  name,
  tag,
  blurb,
  selected,
  runner,
  img,
  onClick,
}: {
  name: string;
  tag: string;
  blurb: string;
  selected: boolean;
  runner: "grok" | "goblin";
  img: string;
  onClick: () => void;
}) {
  const goblin = runner === "goblin";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition ${
        selected
          ? goblin
            ? "border-primary bg-primary/15 shadow-[0_0_20px_#ff2bd644]"
            : "border-accent bg-accent/15 shadow-[0_0_20px_#00f0ff44]"
          : "border-border bg-surface"
      }`}
    >
      <div className="relative mb-2">
        <div
          className="char-art flex items-end justify-center rounded-xl bg-bg/60 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${img})` }}
        />
        {selected && (
          <span
            className={`absolute right-1.5 top-1.5 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
              goblin
                ? "border-primary bg-primary/20 text-primary"
                : "border-accent bg-accent/20 text-accent"
            }`}
          >
            READY
          </span>
        )}
      </div>
      <div className="text-lg font-bold">{name}</div>
      <div className="text-xs font-semibold text-primary">{tag}</div>
      <div className="mt-1 text-[11px] text-muted">{blurb}</div>
    </button>
  );
}

function PowerRow({ unlocked }: { unlocked: PowerKind[] }) {
  return (
    <div className="mb-1 flex flex-wrap gap-1">
      {POWER_KINDS.map((k) => {
        const on = unlocked.includes(k);
        return (
          <span
            key={k}
            title={POWER_META[k].name}
            className="rounded px-1 py-px text-[8px] font-bold uppercase tracking-wide"
            style={{
              color: on ? "#0a0614" : "#6b5a80",
              background: on ? POWER_META[k].color : "#1c1030",
              border: `1px solid ${on ? POWER_META[k].color : "#3a2060"}`,
            }}
          >
            {POWER_META[k].short}
          </span>
        );
      })}
    </div>
  );
}

function LevelSelect({
  selected,
  opTab,
  onOpTab,
  character,
  onSelect,
  onBack,
  onPlay,
  loading,
  refresh,
}: {
  selected: number;
  opTab: number;
  onOpTab: (n: number) => void;
  character: CharacterId;
  onSelect: (i: number) => void;
  onBack: () => void;
  onPlay: () => void;
  loading: boolean;
  refresh: number;
}) {
  const save: SaveData = loadSave();
  void refresh;
  const op = OPERATIONS[opTab - 1]!;
  const start = (opTab - 1) * 10;
  const levels = CAMPAIGN.slice(start, start + 10);
  const seeds = CHAOS_IDS.filter((id) => (save.chaos[id] ?? 0) > 0);

  return (
    <div className="flex w-full max-w-lg flex-col items-center px-2">
      <h2 className="mb-1 text-2xl font-bold">Operations</h2>
      <p className="mb-3 text-center text-sm text-muted">
        Running as <span className="text-accent">{character === "grok" ? "Grok" : "Goblin"}</span>
        {" · "}
        {totalChaos(save)} Hex Seeds
      </p>
      <div className="mb-3 flex w-full flex-wrap justify-center gap-1">
        {OPERATIONS.map((o) => {
          const open = opUnlocked(save, o.id);
          return (
            <button
              key={o.id}
              type="button"
              disabled={!open}
              onClick={() => {
                onOpTab(o.id);
                onSelect((o.id - 1) * 10);
              }}
              className={`min-h-9 rounded-lg border px-2 py-1 text-[11px] font-bold ${
                opTab === o.id
                  ? "border-primary bg-primary/25 text-fg"
                  : open
                    ? "border-border bg-surface text-muted"
                    : "cursor-not-allowed border-border/40 bg-surface/40 text-muted/40"
              }`}
            >
              {o.id}
            </button>
          );
        })}
      </div>
      <div className="mb-3 w-full rounded-xl border border-border bg-surface p-3 text-left">
        <div className="text-sm font-bold text-accent">{op.name}</div>
        <div className="text-[11px] text-muted">
          Boss {op.boss} · {hexesReady(save, op.id) ? "Neon Chaos Seed armed" : "Hex Seeds"} · {op.theme}
        </div>
        <p className="mt-1 text-[11px] italic text-accent/80">{op.signal}</p>
      </div>
      {seeds.length > 0 && (
        <div className="mb-3 flex w-full flex-wrap gap-1">
          {seeds.map((id: ChaosId) => (
            <span
              key={id}
              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{ background: CHAOS_META[id].color, color: "#0a0614" }}
            >
              {CHAOS_META[id].name} ×{save.chaos[id]}
            </span>
          ))}
        </div>
      )}
      <div className="mb-4 flex max-h-[38vh] w-full flex-col gap-1.5 overflow-y-auto pr-1">
        {levels.map((L, i) => {
          const idx = start + i;
          const bossSlot = (L.id - 1) % 10 === 9;
          const seedId = bossSlot ? null : seedForLevel(L.id);
          const seedGot = bossSlot ? hexesReady(save, L.operation ?? 1) : hasLevelChaos(save, L.id);
          const seedCol = seedId ? CHAOS_META[seedId].color : "#ff2bd6";
          const seedName = bossSlot ? "Neon Chaos Seed" : CHAOS_META[seedId!].name;
          return (
            <button
              key={L.id}
              type="button"
              onClick={() => onSelect(idx)}
              className={`min-h-12 rounded-xl border px-3 py-2 text-left ${
                selected === idx
                  ? "border-primary bg-primary/20 shadow-[0_0_16px_#ff2bd644]"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold">
                    {L.id}. {L.name}
                    {L.boss ? (
                      <span className="ml-2 rounded bg-primary/30 px-1.5 py-0.5 text-[10px] text-primary">
                        {L.operation === 10 || bossArmed(save, L.operation ?? 1) ? "BOSS" : "CAGE FIRST"}
                      </span>
                    ) : L.introPower ? (
                      <span className="ml-2 text-[10px] text-accent">
                        {POWER_META[L.introPower].short}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted">{L.subtitle}</p>
                </div>
                <span
                  title={`${seedName} ${seedGot ? (bossSlot ? "armed" : "taken") : bossSlot ? "needs the nine" : "still out"}`}
                  className="mt-0.5 shrink-0"
                >
                  <HudDiamond
                    color={seedCol}
                    filled={seedGot}
                    neon={bossSlot}
                    size={16}
                    gid={`hex-${L.id}`}
                  />
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {CAMPAIGN[selected] && (
        <p className="mb-3 w-full text-left text-[11px] text-muted">
          <span className="font-bold text-primary">
            {missionFor(CAMPAIGN[selected]!).beat.who}
          </span>
          {" · "}
          {missionFor(CAMPAIGN[selected]!).beat.text}
        </p>
      )}
      <div className="flex w-full gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onPlay}
          disabled={loading}
          className="min-h-12 flex-1 rounded-xl border border-primary bg-primary/30 px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {loading ? "Booting…" : "Drop In"}
        </button>
      </div>
    </div>
  );
}

function SeedMarkIcon({ mark, color }: { mark: SeedMark; color: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
      <polygon points="20,3 35,11 35,29 20,37 5,29 5,11" fill="none" stroke={color} strokeWidth="1.8" />
      {mark === "heart" && (
        <path d="M20 28 C12 22 10 16 13 13 C16 10 18 13 20 16 C22 13 24 10 27 13 C30 16 28 22 20 28Z" fill={color} />
      )}
      {mark === "blast" && (
        <path d="M20 8 L23 17 L32 18 L25 24 L28 33 L20 27 L12 33 L15 24 L8 18 L17 17 Z" fill={color} />
      )}
      {mark === "ammo" && (
        <g fill={color}>
          <rect x="11" y="12" width="4" height="16" rx="2" />
          <rect x="18" y="9" width="4" height="19" rx="2" />
          <rect x="25" y="14" width="4" height="14" rx="2" />
        </g>
      )}
      {mark === "magnet" && (
        <path d="M12 10 V22 A8 8 0 0 0 28 22 V10" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      )}
      {mark === "armor" && (
        <path d="M20 9 L30 13 V21 C30 27 25 31 20 33 C15 31 10 27 10 21 V13 Z" fill={color} />
      )}
      {mark === "fuel" && (
        <path d="M20 8 C20 8 28 18 28 23 A8 8 0 0 1 12 23 C12 18 20 8 20 8Z" fill={color} />
      )}
      {mark === "stamina" && (
        <path d="M22 8 L12 22 H19 L17 32 L28 17 H21 Z" fill={color} />
      )}
      {mark === "bullet" && (
        <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
          <path d="M10 14 H24" />
          <path d="M14 20 H28" />
          <path d="M10 26 H24" />
        </g>
      )}
      {mark === "shield" && (
        <g fill="none" stroke={color} strokeWidth="2">
          <circle cx="20" cy="20" r="8" />
          <circle cx="20" cy="20" r="3" fill={color} stroke="none" />
        </g>
      )}
      {mark === "neon" && (
        <g>
          <polygon points="20,12 26,16 26,24 20,28 14,24 14,16" fill="#00f0ff" opacity="0.7" />
          <polygon points="20,14 28,20 20,26 12,20" fill="#ff2bd6" opacity="0.75" />
          <polygon points="20,17 23,20 20,23 17,20" fill="#ffe14a" />
        </g>
      )}
    </svg>
  );
}

function SeedDiamond({ color, neon = false }: { color: string; neon?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
      <circle cx="20" cy="20" r="15.5" fill="none" stroke={neon ? "#00f0ff" : color} strokeWidth="2.2" />
      <path d="M20 11 L26 20 L20 29 L14 20 Z" fill={neon ? "#ff2bd6" : color} opacity="0.55" stroke={neon ? "#ffe14a" : color} strokeWidth="1.4" />
      <path d="M20 15 L23 20 L20 25 L17 20 Z" fill={neon ? "#00f0ff" : "#ffffff"} opacity="0.9" />
    </svg>
  );
}

function DeployWaves() {
  return (
    <svg viewBox="0 0 28 28" width="34" height="34" aria-hidden>
      <circle cx="14" cy="14" r="3.2" fill="#00f0ff" />
      <path d="M8 16.5 A6 6 0 0 1 8 11.5" stroke="#00f0ff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M5 18.5 A9 9 0 0 1 5 9.5" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M2 20.5 A12 12 0 0 1 2 7.5" stroke="#00f0ff" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M20 16.5 A6 6 0 0 0 20 11.5" stroke="#00f0ff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M23 18.5 A9 9 0 0 0 23 9.5" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M26 20.5 A12 12 0 0 0 26 7.5" stroke="#00f0ff" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}

function MissionBrief({
  level,
  onGo,
}: {
  level: (typeof CAMPAIGN)[number];
  onGo: () => void;
}) {
  const plate =
    level.operation === 1 && level.id >= 1 && level.id <= 10
      ? `/sprites/enter/enter-l${level.id}.jpg?v=enter1`
      : null;
  const [ready, setReady] = useState(!plate);
  useEffect(() => {
    if (!plate) {
      setReady(true);
      return;
    }
    setReady(false);
    const t = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(t);
  }, [plate]);
  if (plate && !ready) {
    return (
      <button
        type="button"
        className="enter-sting"
        onClick={() => setReady(true)}
        aria-label="Continue"
      >
        <img src={plate} alt="" />
        <div className="sting-load">
          <p className="sting-load-label">Loading</p>
          <div className="sting-load-track">
            <div className="enter-load-bar" key={plate} />
          </div>
        </div>
      </button>
    );
  }

  const slot = (level.id - 1) % 10;
  const op1 = level.operation === 1;
  const room = op1 ? OP1_ROOM[slot] : null;
  const boss = slot === 9 || !!level.boss;
  const hexId = boss ? null : seedForLevel(level.id);
  const hex = hexId ? HEX_CARD[hexId] : null;
  const color = hexId ? CHAOS_META[hexId].color : NEON_CARD.color;
  const radio = room?.radio ?? missionFor(level).beat.text;
  const who = room ? "HONEY·BUN" : missionFor(level).beat.who;
  const flavor = room?.flavor ?? level.subtitle;
  const objective = boss
    ? `Grab the Neon Chaos Seed if the nine Hex are collected. ${room?.path ?? "Survive the phases and take the extract."}`
    : hexId
      ? hexObjective(hexId, room?.path ?? "Reach the exit this room throws you through.")
      : missionFor(level).objective;
  const seedName = boss ? NEON_CARD.name : CHAOS_META[hexId!].name;
  const seedNick = boss ? NEON_CARD.nick : hex!.nick;
  const seedEffect = boss ? NEON_CARD.effect : hex!.effect;
  const mark: SeedMark = boss ? "neon" : hex!.mark;

  return (
    <div className="brief-stage">
      {plate && <img className="brief-still" src={plate} alt="" />}
      <div className="brief-dock">
        <div className="deploy-card">
      <div className="deploy-radio">
        <div className="deploy-radio-top">
          <span className="deploy-radio-mark" aria-hidden>
            <DeployWaves />
          </span>
          <span className="deploy-radio-who">{who}</span>
        </div>
        <p className="deploy-radio-text">
          <span className="deploy-play" aria-hidden>▶</span>
          {radio}
        </p>
      </div>
      <div className="deploy-level" style={{ ["--seed" as string]: color }}>
        <div className="deploy-level-row">
          <div className="deploy-num">{slot + 1}</div>
          <div className="min-w-0 flex-1">
            <div className="deploy-name">{level.name}</div>
            <p className="deploy-flavor">{flavor}</p>
            <p className="deploy-obj-label">Objective</p>
            <p className="deploy-obj">{objective}</p>
          </div>
        </div>
        <div className="deploy-stack" style={{ borderColor: color }}>
          <span className="deploy-hex">
            <SeedMarkIcon mark={mark} color={color} />
          </span>
          <div className="deploy-stack-copy">
            <div className="deploy-seed-name" style={{ color }}>{seedName}</div>
            <div className="deploy-seed-nick">{seedNick}</div>
            <div className="deploy-seed-effect">{seedEffect}</div>
          </div>
          <span className="deploy-hex">
            <SeedDiamond color={color} neon={boss} />
          </span>
        </div>
      </div>
      <button type="button" onClick={onGo} className="deploy-go">
        <DeployWaves />
        <span>DEPLOY</span>
        <svg viewBox="0 0 28 20" width="34" height="24" aria-hidden>
          <path d="M6 4 L14 10 L6 16" stroke="#00f0ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M14 4 L22 10 L14 16" stroke="#00f0ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>
        </div>
      </div>
    </div>
  );
}

function OverlayCard({
  title,
  body,
  actions,
  children,
}: {
  title: string;
  body: string;
  actions: { label: string; onClick: () => void; primary?: boolean }[];
  children?: ReactNode;
}) {
  return (
    <div className="result-card w-full max-w-sm rounded-2xl border border-border bg-surface/95 p-5 text-center shadow-[0_0_40px_#00f0ff33]">
      <h3 className="mb-2 text-2xl font-black">{title}</h3>
      <p className="mb-3 text-sm text-muted">{body}</p>
      {children}
      <div className="flex flex-col gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className={`min-h-12 rounded-xl border px-4 py-3 text-sm font-semibold ${
              a.primary
                ? "border-accent bg-accent/30 text-fg"
                : "border-border bg-surface-2 text-muted"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RadioPill({ radio }: { radio: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!radio) {
      setShown("");
      return;
    }
    setShown(radio);
    const t = window.setTimeout(() => setShown(""), 2000);
    return () => window.clearTimeout(t);
  }, [radio]);
  if (!shown) return null;
  const line = parseRadio(shown);
  return (
    <div className="pointer-events-none absolute inset-x-3 top-2 z-10 flex justify-center">
      <p className="hud-radio max-w-[92%] truncate rounded-full border border-white/10 bg-[#0a0614cc] px-3 py-1.5 text-center text-[10px] sm:text-[11px]">
        <span className="font-bold uppercase tracking-wide text-primary">{line.who}</span>
        <span className="text-accent/90"> · {line.text}</span>
      </p>
    </div>
  );
}

function PauseKit({
  hud,
  weapon,
  onWeapon,
}: {
  hud: HudState;
  weapon: WeaponId;
  onWeapon: (id: WeaponId) => void;
}) {
  return (
    <div className="mb-4 text-left">
      <p className="mb-2 text-center text-sm font-semibold text-warn">
        ★ {hud.score.toLocaleString()} · {hud.coins} coins · {hud.lives} lives
      </p>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">Powers</p>
      <PowerRow unlocked={hud.unlockedPowers} />
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">Weapons</p>
      <div className="grid grid-cols-4 gap-1">
        {WEAPON_RAIL.map((id) => {
          const on = id === weapon;
          const th = WEAPON_THEME[id];
          return (
            <button
              key={id}
              type="button"
              className={`min-h-9 rounded-lg border px-1 py-1 text-[9px] font-black uppercase ${
                on ? `${th.border} ${th.bg} ${th.text} ${th.glow}` : "border-border bg-surface-2 text-muted"
              }`}
              onClick={() => onWeapon(id)}
            >
              {WEAPON_LABEL[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Mobile control deck ─────────────────────────────────────────── */

type Axis = "left" | "right" | "jump" | "fire" | "shield";

const WEAPON_RAIL: WeaponId[] = [
  "homing",
  "pulse",
  "beam",
  "spread",
  "charge",
  "nova",
  "ricochet",
];

function MobileControls({
  weapon,
  character,
  shield,
  maxShield,
  shielding,
  onWeapon,
}: {
  weapon: WeaponId;
  character: CharacterId;
  shield: number;
  maxShield: number;
  shielding: boolean;
  onWeapon: (id: WeaponId) => void;
}) {
  /** Multi-touch safe — each finger only releases its own axis */
  const axisPress = (axis: Axis, edge?: "jump" | "fire") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        /* synthetic / inactive pointer ids */
      }
      input.holdTouch(axis, e.pointerId, true);
      if (edge === "jump") input.setTouch({ jumpPressed: true });
      if (edge === "fire") input.setTouch({ firePressed: true });
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      input.holdTouch(axis, e.pointerId, false);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault();
      input.holdTouch(axis, e.pointerId, false);
    },
    onLostPointerCapture: (e: React.PointerEvent) => {
      input.holdTouch(axis, e.pointerId, false);
    },
  });

  const shieldPct = Math.max(0, Math.min(100, (shield / maxShield) * 100));

  return (
    <div className="z-30 shrink-0 border-t border-border/60 bg-surface/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md sm:px-3">
      <div className="mx-auto flex max-w-[720px] flex-col gap-1.5">
        <div className="weapon-carousel flex items-stretch gap-1">
          {(() => {
            const i = WEAPON_RAIL.indexOf(weapon);
            const n = WEAPON_RAIL.length;
            const prev = WEAPON_RAIL[(i - 1 + n) % n]!;
            const next = WEAPON_RAIL[(i + 1) % n]!;
            const side = (id: WeaponId) => {
              const th = WEAPON_THEME[id];
              return (
                <button
                  key={id + "-side"}
                  type="button"
                  className={`weapon-neighbor flex min-h-[2.45rem] min-w-0 flex-[0.85] items-center justify-center rounded-xl border px-1 text-[10px] font-black uppercase leading-none ${th.border} bg-surface-2 ${th.text}`}
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onWeapon(id);
                  }}
                >
                  {WEAPON_LABEL[id]}
                </button>
              );
            };
            const th = WEAPON_THEME[weapon];
            return (
              <>
                {side(prev)}
                <button
                  type="button"
                  className={`weapon-selected flex min-h-[2.55rem] min-w-0 flex-[1.5] items-center justify-center rounded-xl border px-2 text-[12px] font-black uppercase tracking-wide ${th.border} ${th.bg} ${th.text} ${th.glow}`}
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {WEAPON_LABEL[weapon]}
                </button>
                {side(next)}
              </>
            );
          })()}
        </div>

        <div className="flex items-stretch justify-between gap-3">
          <MovePlate />

          <button
            type="button"
            className="fire-btn flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border border-accent bg-accent/30 px-2 shadow-[0_0_16px_#00f0ff44] active:scale-[0.98]"
            style={{ touchAction: "none" }}
            {...axisPress("fire", "fire")}
          >
            <span className="text-base font-black tracking-wide text-fg">FIRE</span>
            <WeaponPatternIcon weapon={weapon} />
          </button>

          <Pad label="JUMP" primary {...axisPress("jump", "jump")} />
        </div>

        <div className="flex items-stretch gap-2">
          <button
            type="button"
            className={`relative min-h-[2.85rem] flex-1 overflow-hidden rounded-2xl border text-sm font-bold active:scale-[0.99] ${
              shielding
                ? "border-accent bg-accent/25 text-fg shadow-[0_0_16px_#00f0ff55]"
                : "border-border bg-surface-2 text-fg"
            }`}
            style={{ touchAction: "none" }}
            {...axisPress("shield")}
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-100"
              style={{
                width: `${shieldPct}%`,
                background: shielding
                  ? "linear-gradient(90deg, #ff2bd666, #00f0ff88)"
                  : "linear-gradient(90deg, #00f0ff44, #ff2bd644)",
              }}
            />
            <div className="relative z-10 flex items-center justify-center gap-2 px-3 py-1">
              <span className="text-[11px] uppercase tracking-wider text-muted">
                {shielding ? "Shield Active" : "Hold Shield"}
              </span>
              <span className="text-xs font-semibold tabular-nums text-fg">
                {shield.toFixed(1)}s
                <span className="ml-1 text-muted">
                  · {character === "grok" ? "Jetpack" : "Multi-jump"}
                </span>
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function MovePlate() {
  const plateRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x0: number; slide: boolean } | null>(null);
  const [knob, setKnob] = useState(50);
  const [home, setHome] = useState(true);

  const ratio = (clientX: number) => {
    const el = plateRef.current;
    if (!el) return 0.5;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width)));
  };

  const applyZone = (pointerId: number, t: number) => {
    input.holdTouch("left", pointerId, t < 0.45);
    input.holdTouch("right", pointerId, t > 0.55);
  };

  const end = (pointerId: number) => {
    const d = drag.current;
    if (!d || d.id !== pointerId) return;
    input.holdTouch("left", pointerId, false);
    input.holdTouch("right", pointerId, false);
    drag.current = null;
    setHome(true);
    setKnob(50);
  };

  return (
    <div
      ref={plateRef}
      className="move-plate"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (drag.current) return;
        e.preventDefault();
        e.stopPropagation();
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointer */
        }
        const t = ratio(e.clientX);
        drag.current = { id: e.pointerId, x0: e.clientX, slide: false };
        setHome(false);
        setKnob(Math.max(18, Math.min(82, t * 100)));
        applyZone(e.pointerId, t);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        if (!d.slide && Math.abs(e.clientX - d.x0) > 12) d.slide = true;
        if (!d.slide) return;
        const t = ratio(e.clientX);
        setKnob(Math.max(18, Math.min(82, t * 100)));
        applyZone(e.pointerId, t);
      }}
      onPointerUp={(e) => end(e.pointerId)}
      onPointerCancel={(e) => end(e.pointerId)}
      onLostPointerCapture={(e) => end(e.pointerId)}
    >
      <div className="move-lobe move-lobe-l" />
      <div className="move-lobe move-lobe-r" />
      <div className="move-rail" />
      <div className={`move-knob${home ? " is-home" : ""}`} style={{ left: `${knob}%` }} />
      <span className="move-chev move-chev-l" aria-hidden>
        ◀
      </span>
      <span className="move-chev move-chev-r" aria-hidden>
        ▶
      </span>
    </div>
  );
}

function WeaponPatternIcon({ weapon }: { weapon: WeaponId }) {
  if (weapon === "pulse") {
    return (
      <svg width="52" height="14" viewBox="0 0 52 14" aria-hidden className="opacity-95">
        <line x1="4" y1="7" x2="46" y2="7" stroke="#ff2bd6" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="44" cy="7" r="2.5" fill="#ff2bd6" />
      </svg>
    );
  }
  if (weapon === "beam") {
    return (
      <svg width="52" height="14" viewBox="0 0 52 14" aria-hidden className="opacity-95">
        <rect x="4" y="4" width="44" height="6" rx="2" fill="#00f0ff" opacity="0.95" />
        <rect x="4" y="5.5" width="44" height="3" rx="1" fill="#ffffff" opacity="0.45" />
      </svg>
    );
  }
  if (weapon === "spread") {
    return (
      <svg width="52" height="16" viewBox="0 0 52 16" aria-hidden className="opacity-95">
        <line x1="6" y1="8" x2="46" y2="2" stroke="#39ff9a" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="8" x2="48" y2="8" stroke="#39ff9a" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="8" x2="46" y2="14" stroke="#39ff9a" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (weapon === "homing") {
    return (
      <svg width="52" height="16" viewBox="0 0 52 16" aria-hidden className="opacity-95">
        <path d="M6 8 Q26 0 46 8" fill="none" stroke="#c77dff" strokeWidth="2.2" />
        <circle cx="44" cy="8" r="3" fill="#c77dff" />
      </svg>
    );
  }
  if (weapon === "charge") {
    return (
      <svg width="52" height="16" viewBox="0 0 52 16" aria-hidden className="opacity-95">
        <rect x="4" y="5" width="20" height="6" rx="2" fill="#ffcc33" opacity="0.5" />
        <rect x="26" y="3" width="22" height="10" rx="2" fill="#ffcc33" />
      </svg>
    );
  }
  if (weapon === "nova") {
    return (
      <svg width="52" height="16" viewBox="0 0 52 16" aria-hidden className="opacity-95">
        {[0, 45, 90, 135].map((deg) => (
          <line
            key={deg}
            x1="26"
            y1="8"
            x2={26 + Math.cos((deg * Math.PI) / 180) * 18}
            y2={8 + Math.sin((deg * Math.PI) / 180) * 6}
            stroke="#ff2bd6"
            strokeWidth="2"
          />
        ))}
        <circle cx="26" cy="8" r="3" fill="#fff" />
      </svg>
    );
  }
  // ricochet
  return (
    <svg width="52" height="16" viewBox="0 0 52 16" aria-hidden className="opacity-95">
      <polyline
        points="4,12 18,4 32,12 46,4"
        fill="none"
        stroke="#00f0ff"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Pad({
  label,
  primary,
  accent,
  move,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
}: {
  label: string;
  primary?: boolean;
  accent?: boolean;
  move?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
  onLostPointerCapture?: (e: React.PointerEvent) => void;
}) {
  return (
    <button
      type="button"
      className={`pad-lg flex select-none items-center justify-center rounded-2xl border font-bold shadow-md active:scale-95 ${
        move
          ? "pad-move border-accent bg-accent text-[#041018] shadow-[0_0_22px_#00f0ffcc] ring-2 ring-accent/80"
          : primary
            ? "border-primary bg-primary/55 text-fg"
            : accent
              ? "border-accent bg-accent/45 text-fg"
              : "border-border bg-surface-2 text-fg"
      }`}
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
    >
      {label}
    </button>
  );
}
