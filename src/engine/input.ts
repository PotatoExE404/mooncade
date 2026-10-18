import { Action } from "../sim/input";

const KEYS: Record<string, number> = {
  ArrowLeft: Action.Left, KeyA: Action.Left,
  ArrowRight: Action.Right, KeyD: Action.Right,
  ArrowUp: Action.Up, KeyW: Action.Up,
  ArrowDown: Action.Down, KeyS: Action.Down,
  Space: Action.Jump, KeyZ: Action.Jump, KeyK: Action.Jump,
  KeyX: Action.Act, KeyJ: Action.Act,
};

export type TouchScheme = "tap" | "swipe" | "pad";
export type Device = "keyboard" | "touch" | "gamepad";

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");

export interface InputSource {
  sample(): number;

  setTouch(bit: number, down: boolean): void;

  force?(bits: number | null): void;
  readonly device: Device;
  onDevice(cb: (d: Device) => void): void;
  dispose(): void;
}

export function createInput(surface: HTMLElement, scheme: TouchScheme): InputSource {
  let held = 0;
  let latched = 0;
  let touch = 0;
  let device: Device = matchMedia("(pointer: coarse)").matches ? "touch" : "keyboard";
  const listeners: ((d: Device) => void)[] = [];
  const setDevice = (d: Device) => {
    if (d === device) return;
    device = d;
    listeners.forEach((cb) => cb(d));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTyping(e.target) || e.metaKey || e.ctrlKey) return;
    const bit = KEYS[e.code];
    if (!bit) return;
    e.preventDefault();
    setDevice("keyboard");
    if (e.repeat) return;
    held |= bit;
    latched |= bit;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const bit = KEYS[e.code];
    if (bit) held &= ~bit;
  };
  const onBlur = () => {
    held = 0;
    touch = 0;
  };

  let start: { x: number; y: number; id: number; t: number; swiped: boolean } | null = null;
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-ui]")) return;
    setDevice(e.pointerType === "mouse" ? "keyboard" : "touch");
    if (scheme === "tap") {
      latched |= Action.Jump;
      return;
    }
    if (scheme === "swipe") {
      start = { x: e.clientX, y: e.clientY, id: e.pointerId, t: performance.now(), swiped: false };
      surface.setPointerCapture?.(e.pointerId);
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id || start.swiped) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 24) return;
    start.swiped = true;
    latched |= Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? Action.Left : Action.Right) : dy < 0 ? Action.Up : Action.Down;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    if (!start.swiped && performance.now() - start.t < 300) latched |= Action.Up;
    start = null;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  surface.addEventListener("pointerdown", onPointerDown);
  surface.addEventListener("pointermove", onPointerMove);
  surface.addEventListener("pointerup", onPointerUp);
  surface.addEventListener("pointercancel", onPointerUp);

  let padHeld = 0;
  let forced: number | null = null;
  return {
    force(bits) {
      forced = bits;
    },
    get device() {
      return device;
    },
    onDevice(cb) {
      listeners.push(cb);
    },
    sample() {
      if (forced !== null) return forced;
      let bits = held | latched | touch;
      latched = 0;
      const pad = navigator.getGamepads?.().find((p) => p && p.mapping === "standard");
      if (pad) {
        let p = 0;
        const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
        if (x < -0.35 || pad.buttons[14]?.pressed) p |= Action.Left;
        if (x > 0.35 || pad.buttons[15]?.pressed) p |= Action.Right;
        if (y < -0.5 || pad.buttons[12]?.pressed) p |= Action.Up;
        if (y > 0.5 || pad.buttons[13]?.pressed) p |= Action.Down;
        if (pad.buttons[0]?.pressed) p |= Action.Jump;
        if (pad.buttons[2]?.pressed) p |= Action.Act;
        if (p && p !== padHeld) setDevice("gamepad");
        padHeld = p;
        bits |= p;
      }
      return bits;
    },
    setTouch(bit, down) {
      touch = down ? touch | bit : touch & ~bit;
      if (down) latched |= bit;
      setDevice("touch");
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerUp);
    },
  };
}
