import { createDiamond, gemCount, hashDiamond, stepDiamond, type DiamondState } from "./diamond";
import { createFlap, hashFlap, stepFlap, type FlapState } from "./flap";
import { MAX_TICKS } from "./replay";
import { createRun, hashRun, M, runScore, stepRun, type RunState } from "./run";

export type GameId = "flap" | "run" | "diamond";
export const GAME_IDS: GameId[] = ["flap", "run", "diamond"];

export const SIM_VERSION: Record<GameId, number> = { flap: 4, run: 4, diamond: 4 };

export interface Outcome {
  ticks: number;
  over: boolean;
  score: number;
  stats: Record<string, number>;
  hash: string;
}

export interface SimDef<S> {
  id: GameId;
  better: "higher" | "lower";
  create(seed: number): S;
  step(s: S, input: number): void;
  isOver(s: S): boolean;
  score(s: S): number;
  stats(s: S): Record<string, number>;
  hash(s: S): string;
}

export const SIMS = {
  flap: {
    id: "flap",
    better: "higher",
    create: createFlap,
    step: stepFlap,
    isOver: (s) => s.dead,
    score: (s) => s.score,
    stats: (s) => ({ candles: s.score, cleared: s.cleared, crashes: s.crashes, level: s.level, bonus: Math.floor(s.bonusTotal / 60), seconds: Math.floor(s.tick / 60) }),
    hash: hashFlap,
  } satisfies SimDef<FlapState>,
  run: {
    id: "run",
    better: "higher",
    create: createRun,
    step: stepRun,
    isOver: (s) => s.dead,
    score: runScore,
    stats: (s) => ({ metres: Math.floor(s.z / M), coins: s.coins, crashes: s.crashes, level: s.level, bonus: Math.floor(s.bonusTotal / 60), seconds: Math.floor(s.tick / 60) }),
    hash: hashRun,
  } satisfies SimDef<RunState>,
  diamond: {
    id: "diamond",
    better: "lower",
    create: () => createDiamond(),
    step: stepDiamond,
    isOver: (s) => s.finished,
    score: (s) => s.tick,
    stats: (s) => ({ ticks: s.tick, gems: gemCount(s), deaths: s.deaths, level: s.stage + 1 }),
    hash: hashDiamond,
  } satisfies SimDef<DiamondState>,
};

export function simulate(game: GameId, seed: number, inputs: Uint8Array): Outcome {
  const def = SIMS[game] as SimDef<unknown>;
  const s = def.create(seed);
  const n = Math.min(inputs.length, MAX_TICKS);
  let overAt = -1;
  for (let i = 0; i < n; i++) {
    def.step(s, inputs[i]);
    if (def.isOver(s)) {
      overAt = i + 1;
      break;
    }
  }
  return {
    ticks: overAt > 0 ? overAt : n,
    over: overAt === n,
    score: def.score(s),
    stats: def.stats(s),
    hash: def.hash(s),
  };
}

export const isBetter = (game: GameId, a: number, b: number) => (SIMS[game].better === "higher" ? a > b : a < b);
