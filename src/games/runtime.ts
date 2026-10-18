import { createStepper } from "../engine/loop";
import { comfort, createHitStop, createParticles, createShake } from "../engine/juice";
import type { InputSource } from "../engine/input";
import { SIMS, type GameId } from "../sim";
import { MAX_TICKS } from "../sim/replay";
import type { Theme } from "../themes/themes";

export interface Fx {
  shake: ReturnType<typeof createShake>;
  hitstop: ReturnType<typeof createHitStop>;
  particles: ReturnType<typeof createParticles>;

  flash: number;
  combo: number;
  comboAt: number;
}

export interface Frame {
  alpha: number;
  time: number;
  dt: number;
  shakeX: number;
  shakeY: number;
  theme: Theme;
  phase: Phase;
}

export type Phase = "ready" | "playing" | "over";

export interface Presenter<S> {
  readonly W: number;
  readonly H: number;

  onTick(s: S, fx: Fx, tick: number): void;
  draw(g: CanvasRenderingContext2D, s: S, f: Frame, fx: Fx): void;
}

export interface RunResult {
  game: GameId;
  seed: number;
  inputs: Uint8Array;
  score: number;
  stats: Record<string, number>;
}

export interface RuntimeOptions<S> {
  canvas: HTMLCanvasElement;
  game: GameId;
  seed: number;
  theme: Theme;
  input: InputSource;
  presenter: Presenter<S>;
  onPhase?(p: Phase): void;
  onScore?(score: number, s: S): void;
  onOver?(r: RunResult): void;

  onHud?(s: S): void;

  speed?: number;
}

export function createRuntime<S>(o: RuntimeOptions<S>) {
  const def = SIMS[o.game] as unknown as { create(seed: number): S; step(s: S, i: number): void; isOver(s: S): boolean; score(s: S): number; stats(s: S): Record<string, number> };
  const g = o.canvas.getContext("2d", { alpha: false })!;
  o.canvas.width = o.presenter.W;
  o.canvas.height = o.presenter.H;
  g.imageSmoothingEnabled = false;

  let seed = o.seed;
  let state = def.create(seed);
  let inputs = new Uint8Array(4096);
  let length = 0;
  let phase: Phase = "ready";
  let lastScore = -1;
  let time = 0;
  let overSent = false;
  let hudFrame = 0;
  let manual = false;
  const fx: Fx = { shake: createShake({ maxOffset: 6, maxAngle: 0 }), hitstop: createHitStop(), particles: createParticles(600), flash: 0, combo: 0, comboAt: -99 };

  const setPhase = (p: Phase) => {
    if (p === phase) return;
    phase = p;
    o.onPhase?.(p);
  };

  const record = (bits: number) => {
    if (length === inputs.length) {
      const next = new Uint8Array(inputs.length * 2);
      next.set(inputs);
      inputs = next;
    }
    inputs[length++] = bits;
  };

  let hz = 60 * (o.speed ?? 1);
  const stepper = createStepper(
    {
      step(tick) {
        if (phase === "over") return;
        if (!manual && fx.hitstop.consume()) return;
        const bits = o.input.sample();
        record(bits);
        def.step(state, bits);
        o.presenter.onTick(state, fx, tick);
        if (phase === "ready" && (state as { started?: boolean }).started) setPhase("playing");
        const sc = def.score(state);
        if (sc !== lastScore) {
          lastScore = sc;
          o.onScore?.(sc, state);
        }
        if (def.isOver(state) || length >= MAX_TICKS) {
          setPhase("over");
          if (!overSent) {
            overSent = true;
            const result: RunResult = { game: o.game, seed, inputs: inputs.slice(0, length), score: def.score(state), stats: def.stats(state) };
            o.onOver?.(result);
          }
        }
      },
      render(alpha) {
        if (++hudFrame % 6 === 0) o.onHud?.(state);
        const sh = fx.shake.update(1 / 60);
        fx.particles.update(1 / 60);
        o.presenter.draw(g, state, { alpha, time, dt: 1 / 60, shakeX: Math.round(sh.x), shakeY: Math.round(sh.y), theme: o.theme, phase }, fx);
        if (fx.flash > 0) fx.flash--;
      },
    },
    hz,
  );

  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    const d = Math.max(0, now - last);
    last = Math.max(last, now);
    time += d / 1000;
    stepper.advance(d);
    raf = requestAnimationFrame(frame);
  };
  const onVis = () => {
    stepper.setHidden(document.hidden);
    last = performance.now();
  };
  document.addEventListener("visibilitychange", onVis);
  raf = requestAnimationFrame(frame);

  const api = {
    get phase() { return phase; },
    get state() { return state; },
    get ticks() { return length; },

    reset(nextSeed: number) {
      seed = nextSeed;
      state = def.create(seed);
      inputs = new Uint8Array(4096);
      length = 0;
      lastScore = -1;
      overSent = false;
      fx.combo = 0;
      phase = "ready";
      o.onPhase?.("ready");
      o.onScore?.(def.score(state), state);
      o.onHud?.(state);
    },
    setPaused(p: boolean) { stepper.setPaused(p); },
    setTheme(t: Theme) { o.theme = t; },

    stepN(n: number) {
      manual = true;
      stepper.stepN(n);
      manual = false;
    },
    stop() {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    },
  };
  void hz;
  void comfort;
  return api;
}

export type Runtime = ReturnType<typeof createRuntime>;
