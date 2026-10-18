import type { FighterSheet } from "../art/fighters";
import { headOf } from "../art/props";
import type { TouchScheme } from "../engine/input";
import type { GameId } from "../sim";
import { diamondPresenter } from "./diamond";
import { flapPresenter } from "./flap";
import { runPresenter } from "./run";
import type { Presenter } from "./runtime";

export interface GameInfo {
  id: GameId;
  name: string;
  short: string;
  tagline: string;
  pitch: string;
  scheme: TouchScheme;
  orientation: "portrait" | "landscape";
  hints: { keyboard: string; touch: string; gamepad: string };
  format: string;
  levels: string;
  daily: boolean;
  make(sheet: FighterSheet, headKey: string, quiet?: boolean): Presenter<unknown>;
}

export const GAMES: Record<GameId, GameInfo> = {
  diamond: {
    id: "diamond",
    name: "HODL Quest",
    short: "HODL",
    tagline: "Ten levels. Thirty diamonds. One stopwatch.",
    pitch: "Run, jump and stomp the paper hands across ten levels. Reach the rocket to fly to the next one. Grab all thirty diamonds and beat the clock.",
    scheme: "pad",
    orientation: "landscape",
    hints: { keyboard: "← → run · ↑ / Space jump · ↓ drop through", touch: "◀ ▶ run · ▲ jump", gamepad: "D-pad run · Ⓐ jump · ↓ drop" },
    format: "10 levels · fastest time wins",
    levels: "Reach the rocket at the end of each level. It flies you to the next one.",
    daily: false,
    make: (sheet, _headKey, quiet) => diamondPresenter(sheet, quiet) as Presenter<unknown>,
  },
  run: {
    id: "run",
    name: "Bear Escape",
    short: "BEAR",
    tagline: "Keep running. Keep the clock alive.",
    pitch: "Outrun the rug. Switch lanes, jump the tears, slide under the bars. Every level adds time to the clock, so the better you run, the longer you play.",
    scheme: "swipe",
    orientation: "portrait",
    hints: { keyboard: "← → lanes · ↑ jump · ↓ slide", touch: "Swipe ← → ↑ ↓ · tap to jump", gamepad: "D-pad lanes · Ⓐ jump · ↓ slide" },
    format: "90 s to start · levels add time",
    levels: "New level every 300 m adds time to the clock. Grab boosters: +5 s, shield, magnet, x2 coins. A crash costs 4 s.",
    daily: true,
    make: (sheet, _headKey, quiet) => runPresenter(sheet, quiet) as Presenter<unknown>,
  },
  flap: {
    id: "flap",
    name: "Moonshot",
    short: "MOON",
    tagline: "One tap. Keep the clock alive.",
    pitch: "Thread the candlestick charts. Every candle adds a little time, every level adds more, so a good run keeps going. A crash costs three seconds.",
    scheme: "tap",
    orientation: "portrait",
    hints: { keyboard: "Space / ↑ to thrust", touch: "Tap anywhere to thrust", gamepad: "Ⓐ to thrust" },
    format: "60 s to start · candles add time",
    levels: "New level every 10 candles adds more time. Grab boosters: +5 s, shield, slow-mo, x2 points. A crash costs 3 s.",
    daily: true,
    make: (sheet, headKey, quiet) => flapPresenter(headOf(sheet), headKey, quiet) as Presenter<unknown>,
  },
};

export const GAME_ORDER: GameId[] = ["diamond", "run", "flap"];
