import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createInput, type InputSource, type TouchScheme } from "../engine/input";
import type { GameId } from "../sim";
import type { Theme } from "../themes/themes";
import { createRuntime, type Phase, type Presenter, type RunResult, type Runtime } from "./runtime";

declare global {
  interface Window {
    __game?: {
      ready: boolean;
      phase: Phase;
      ticks: number;
      state: () => unknown;
      step: (n: number) => void;
      pause: (p: boolean) => void;
      press: (bits: number) => void;
      release: (bits: number) => void;
      set: (bits: number | null) => void;
    };
  }
}

export interface StageProps {
  game: GameId;
  seed: number;
  theme: Theme;
  scheme: TouchScheme;
  presenter: Presenter<unknown>;
  paused: boolean;
  onPhase(p: Phase): void;
  onScore(score: number): void;
  onOver(r: RunResult): void;
  onHud?(s: unknown): void;
  onInput?(input: InputSource): void;

  runKey: number;
  children?: ReactNode;
  label: string;

  fill?: boolean;
}

export function GameStage(p: StageProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const rt = useRef<Runtime | null>(null);
  const cb = useRef(p);
  cb.current = p;
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = wrap.current!;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const fitCss = Math.min(el.clientWidth / p.presenter.W, el.clientHeight / p.presenter.H);
      const whole = Math.floor(fitCss * dpr) / dpr;
      setScale(Math.max(0.5, p.fill || !(whole >= fitCss * 0.8 && whole > 0) ? fitCss : whole));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [p.presenter.W, p.presenter.H, p.fill]);

  useEffect(() => {
    const input = createInput(wrap.current!, p.scheme);
    cb.current.onInput?.(input);
    const runtime = createRuntime({
      canvas: cv.current!,
      game: p.game,
      seed: p.seed,
      theme: p.theme,
      input,
      presenter: p.presenter,
      onPhase: (ph) => cb.current.onPhase(ph),
      onScore: (s) => cb.current.onScore(s),
      onOver: (r) => cb.current.onOver(r),
      onHud: (s) => cb.current.onHud?.(s),
    });
    rt.current = runtime;

    const debug = import.meta.env.DEV || import.meta.env.VITE_TEST_HOOK === "1";
    if (debug) {
      const pressed = { bits: 0 };
      window.__game = {
        ready: true,
        get phase() { return runtime.phase; },
        get ticks() { return runtime.ticks; },
        state: () => runtime.state,
        step: (n) => runtime.stepN(n),
        pause: (v) => runtime.setPaused(v),
        press: (bits) => { pressed.bits |= bits; input.setTouch(pressed.bits, true); },
        release: (bits) => { pressed.bits &= ~bits; input.setTouch(bits, false); },
        set: (bits) => input.force?.(bits),
      };
    }
    return () => {
      runtime.stop();
      input.dispose();
      rt.current = null;
      if (window.__game) delete window.__game;
    };
  }, [p.game, p.presenter]);

  useEffect(() => {
    if (p.runKey > 0) rt.current?.reset(p.seed);
  }, [p.runKey]);
  useEffect(() => {
    rt.current?.setTheme(p.theme);
  }, [p.theme]);
  useEffect(() => {
    rt.current?.setPaused(p.paused);
  }, [p.paused]);

  return (
    <div ref={wrap} className="game-wrap min-w-0 overflow-hidden" style={{ touchAction: "none" }} aria-label={p.label} role="application">
      <canvas
        ref={cv}
        className="game-canvas"
        style={{ width: p.presenter.W * scale, height: p.presenter.H * scale, maxWidth: "100%" }}
        aria-hidden="true"
      />
      <div className="game-overlay" style={{ width: p.presenter.W * scale, height: p.presenter.H * scale }}>
        {p.children}
      </div>
    </div>
  );
}
