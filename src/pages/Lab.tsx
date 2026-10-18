import { useMemo, useState } from "react";
import { fighterSheet, type FighterId } from "../art/fighters";
import { headOf } from "../art/props";
import { flapPresenter } from "../games/flap";
import { runPresenter } from "../games/run";
import { diamondPresenter } from "../games/diamond";
import { GameStage } from "../games/GameStage";
import { THEMES, type ThemeId } from "../themes/themes";
import type { Presenter } from "../games/runtime";
import type { GameId } from "../sim";

export function Lab() {
  const q = new URLSearchParams(location.search);
  const theme = THEMES[(q.get("theme") as ThemeId) ?? "sol"];
  const game = (q.get("game") as GameId) ?? "flap";
  const fighter = (q.get("fighter") as FighterId) ?? "vex";
  const presenter = useMemo(() => {
    const sheet = fighterSheet(fighter);
    return (game === "flap" ? flapPresenter(headOf(sheet), fighter) : game === "run" ? runPresenter(sheet) : diamondPresenter(sheet)) as Presenter<unknown>;
  }, [game, fighter]);
  const [score, setScore] = useState(0);
  return (
    <div style={{ height: "100dvh" }}>
      <GameStage game={game} seed={42} theme={theme} scheme={game === "flap" ? "tap" : game === "run" ? "swipe" : "pad"} presenter={presenter} paused={false} runKey={0} label={game}
        onPhase={() => {}} onScore={setScore} onOver={() => {}}>
        <div className="font-pixel text-4xl text-center pt-6 text-white">{score}</div>
      </GameStage>
    </div>
  );
}
