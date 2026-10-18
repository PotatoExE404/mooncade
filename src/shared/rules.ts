import type { GameId } from "../sim";

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic" | "cosmic";
export const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary", "mythic", "cosmic"];
export const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4, cosmic: 5 };

export const GAME_NAMES: Record<GameId, string> = { flap: "Moonshot", run: "Bear Escape", diamond: "HODL Quest" };

export const MEDALS = { gold: 180 * 60, silver: 230 * 60, bronze: 310 * 60 } as const;
export type Medal = keyof typeof MEDALS;
export function medalFor(ticks: number): Medal | null {
  if (ticks <= MEDALS.gold) return "gold";
  if (ticks <= MEDALS.silver) return "silver";
  if (ticks <= MEDALS.bronze) return "bronze";
  return null;
}

export interface Tier {
  rarity: Rarity;
  name: string;
  how: string;
  earned: (stats: Record<string, number>, score: number) => boolean;
}

const allGems = 30;
const gemRoute = 200 * 60;
const perfectRoute = 190 * 60;

export const LADDERS: Record<GameId, Tier[]> = {
  flap: [
    { rarity: "common", name: "Liftoff", how: "Score your first candle", earned: (st) => st.candles >= 1 },
    { rarity: "rare", name: "Low Orbit", how: "Score 20 in one run", earned: (st) => st.candles >= 20 },
    { rarity: "epic", name: "Moonwalk", how: "Score 40 in one run", earned: (st) => st.candles >= 40 },
    { rarity: "legendary", name: "Moonshot", how: "Score 65 in one run", earned: (st) => st.candles >= 65 },
    { rarity: "mythic", name: "Mars Mission", how: "Score 90 in one run", earned: (st) => st.candles >= 90 },
    { rarity: "cosmic", name: "To Infinity", how: "Score 100 without a single crash", earned: (st) => st.candles >= 100 && st.crashes === 0 },
  ],
  run: [
    { rarity: "common", name: "Jogger", how: "Run your first 100 m", earned: (st) => st.metres >= 100 },
    { rarity: "rare", name: "Sprinter", how: "1,000 points in one run", earned: (_st, score) => score >= 1000 },
    { rarity: "epic", name: "Rug Dodger", how: "1,800 points in one run", earned: (_st, score) => score >= 1800 },
    { rarity: "legendary", name: "Bear Breaker", how: "2,600 points in one run", earned: (_st, score) => score >= 2600 },
    { rarity: "mythic", name: "Bull Run", how: "3,200 points in one run", earned: (_st, score) => score >= 3200 },
    { rarity: "cosmic", name: "Untouchable", how: "3,600 points without a single crash", earned: (st, score) => score >= 3600 && st.crashes === 0 },
  ],
  diamond: [
    { rarity: "common", name: "Holder", how: "Finish all ten levels", earned: () => true },
    { rarity: "rare", name: "Diamond Hands", how: "Bronze: finish under 5:10", earned: (_st, t) => t <= MEDALS.bronze },
    { rarity: "epic", name: "HODL Hero", how: "Silver: finish under 3:50", earned: (_st, t) => t <= MEDALS.silver },
    { rarity: "legendary", name: "Gold Hands", how: "Gold: finish under 3:00", earned: (_st, t) => t <= MEDALS.gold },
    { rarity: "mythic", name: "Treasure Hunter", how: "All 30 diamonds, under 3:20", earned: (st, t) => t <= gemRoute && st.gems >= allGems },
    { rarity: "cosmic", name: "All-Time High", how: "All 30 diamonds, no deaths, under 3:10", earned: (st, t) => t <= perfectRoute && st.gems >= allGems && st.deaths === 0 },
  ],
};

export function tierFor(game: GameId, stats: Record<string, number>, score: number): Tier | null {
  let best: Tier | null = null;
  for (const t of LADDERS[game].slice(1)) if (t.earned(stats, score)) best = t;
  return best;
}
export const tierByRarity = (game: GameId, r: Rarity) => LADDERS[game].find((t) => t.rarity === r)!;

export function meaningful(game: GameId, stats: Record<string, number>): boolean {
  if (game === "flap") return stats.candles >= 1;
  if (game === "run") return stats.metres >= 100;
  return true;
}

export function superhuman(game: GameId, stats: Record<string, number>): boolean {
  if (game === "flap") return stats.candles > 220;
  if (game === "run") return stats.metres > 2600 || stats.coins > 420;
  return stats.ticks < 140 * 60;
}

export function formatScore(game: GameId, score: number): string {
  if (game === "diamond") {
    const t = score / 60;
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${m}:${s.toFixed(2).padStart(5, "0")}`;
  }
  return score.toLocaleString("en-US");
}

export function formatClock(ticks: number): string {
  const t = Math.max(0, ticks) / 60;
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
