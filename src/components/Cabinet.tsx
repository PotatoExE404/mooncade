import { useEffect, useRef } from "react";
import { fighterSheet, type FighterId } from "../art/fighters";
import type { InputSource } from "../engine/input";
import { diamondDemo, flapBot, runBot } from "../games/bots";
import { GAMES } from "../games/registry";
import { createRuntime, type Runtime } from "../games/runtime";
import type { GameId } from "../sim";
import type { FlapState } from "../sim/flap";
import type { RunState } from "../sim/run";
import { THEMES, type ThemeId } from "../themes/themes";

export function Cabinet({ game, theme, fighter }: { game: GameId; theme: ThemeId; fighter: FighterId }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const rtRef = useRef<Runtime | null>(null);

  useEffect(() => {
    const info = GAMES[game];
    const presenter = info.make(fighterSheet(fighter), `attract:${fighter}`, true);
    let policy: (s: unknown) => number = () => 0;
    const fresh = () => {
      policy = game === "flap" ? (flapBot() as (s: unknown) => number) : game === "run" ? (runBot() as (s: unknown) => number) : diamondDemo();
    };
    fresh();
    const input: InputSource = {
      sample: () => (rtRef.current ? policy(rtRef.current.state as FlapState & RunState) : 0),
      setTouch: () => {},
      device: "keyboard",
      onDevice: () => {},
      dispose: () => {},
    };
    const rt = createRuntime({
      canvas: cv.current!,
      game,
      seed: (Math.random() * 2 ** 31) | 0,
      theme: THEMES[theme],
      input,
      presenter,
      onOver: () => {
        window.setTimeout(() => {
          fresh();
          rt.reset((Math.random() * 2 ** 31) | 0);
        }, 1400);
      },
    });
    rtRef.current = rt;
    const io = new IntersectionObserver(([e]) => rt.setPaused(!e.isIntersecting), { threshold: 0.05 });
    io.observe(cv.current!);
    return () => {
      io.disconnect();
      rt.stop();
      rtRef.current = null;
    };
  }, [game, fighter]);

  useEffect(() => {
    rtRef.current?.setTheme(THEMES[theme]);
  }, [theme]);

  return <canvas ref={cv} className="pixelated block h-full w-full object-contain" aria-hidden="true" />;
}
