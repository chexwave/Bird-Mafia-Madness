import type { InputState } from "./types";

const GAME_CODES = new Set([
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
  "Enter",
]);

type TouchAxis = "left" | "right" | "up" | "jump" | "fire" | "shield";

export class InputManager {
  private keys = new Set<string>();
  private prev = new Set<string>();
  private touch: Partial<InputState> = {};
  /** Active pointer ids holding each axis — multi-touch safe */
  private touchPointers = new Map<TouchAxis, Set<number>>();
  private bound = false;
  private lockUntil = 0;

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

  private onKeyDown = (e: KeyboardEvent) => {
    if (GAME_CODES.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  clear = () => {
    this.keys.clear();
    this.prev = new Set();
    this.touch = {};
    this.touchPointers.clear();
  };

  lockFor(ms: number) {
    this.lockUntil = performance.now() + ms;
    this.clear();
  }

  /** Multi-touch: hold an axis with a specific pointer id */
  holdTouch(axis: TouchAxis, pointerId: number, held: boolean) {
    let set = this.touchPointers.get(axis);
    if (!set) {
      set = new Set();
      this.touchPointers.set(axis, set);
    }
    if (held) set.add(pointerId);
    else set.delete(pointerId);
    this.touch[axis] = set.size > 0;
  }

  setTouch(partial: Partial<InputState>) {
    Object.assign(this.touch, partial);
  }

  poll(): InputState {
    const locked = performance.now() < this.lockUntil;
    if (locked) {
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
        weaponPick: undefined,
        pause: false,
        shield: false,
      };
    }

    const k = this.keys;
    const t = this.touch;
    const left = k.has("ArrowLeft") || k.has("KeyA") || !!t.left;
    const right = k.has("ArrowRight") || k.has("KeyD") || !!t.right;
    const up = k.has("ArrowUp") || k.has("KeyW") || !!t.up;
    const jumpHeld =
      k.has("Space") || k.has("KeyW") || k.has("ArrowUp") || k.has("KeyK") || !!t.jump;
    const fireHeld = k.has("KeyJ") || k.has("KeyZ") || k.has("KeyX") || !!t.fire;
    const shieldHeld =
      k.has("KeyL") || k.has("ShiftLeft") || k.has("ShiftRight") || k.has("KeyC") || !!t.shield;

    const jumpPressed =
      (!this.prev.has("Space") && k.has("Space")) ||
      (!this.prev.has("KeyK") && k.has("KeyK")) ||
      !!t.jumpPressed;

    const firePressed =
      (!this.prev.has("KeyJ") && k.has("KeyJ")) ||
      (!this.prev.has("KeyZ") && k.has("KeyZ")) ||
      (!this.prev.has("KeyX") && k.has("KeyX")) ||
      !!t.firePressed;

    const weaponNext = (!this.prev.has("KeyE") && k.has("KeyE")) || !!t.weaponNext;
    const weaponPrev = (!this.prev.has("KeyQ") && k.has("KeyQ")) || !!t.weaponPrev;
    const pause =
      (!this.prev.has("Escape") && k.has("Escape")) ||
      (!this.prev.has("KeyP") && k.has("KeyP")) ||
      !!t.pause;

    this.prev = new Set(k);
    if (t.jumpPressed) t.jumpPressed = false;
    if (t.firePressed) t.firePressed = false;
    if (t.weaponNext) t.weaponNext = false;
    if (t.weaponPrev) t.weaponPrev = false;
    if (t.pause) t.pause = false;
    const weaponPick = t.weaponPick;
    if (t.weaponPick) t.weaponPick = undefined;

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
      shield: shieldHeld,
    };
  }

  setKeys(codes: string[]) {
    this.keys = new Set(codes);
  }

  getKeys() {
    return [...this.keys];
  }
}

export const input = new InputManager();
