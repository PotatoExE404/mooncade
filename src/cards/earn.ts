import { LADDERS, meaningful, RARITY_RANK, type Tier } from "../shared/rules";
import { isBetter, type GameId } from "../sim";
import { getState, setState } from "../state/store";
import type { CardDto } from "./types";

export interface RunRecord {
  best: number;
  previousBest: number | null;
  personalBest: boolean;

  card: CardDto | null;

  tier: Tier | null;
}

export function tierReached(game: GameId, stats: Record<string, number>, score: number): Tier | null {
  let best: Tier | null = null;
  for (const t of LADDERS[game]) {
    if (t.rarity === "common" ? meaningful(game, stats) : t.earned(stats, score)) best = t;
  }
  return best;
}

export function recordRun(game: GameId, score: number, stats: Record<string, number>): RunRecord {
  const s = getState();
  const prev = s.bests[game];
  const personalBest = prev === undefined || isBetter(game, score, prev);
  const best = personalBest ? score : prev;
  const tier = tierReached(game, stats, score);
  const have = tier && s.cards.some((c) => c.game === game && c.rarity === tier.rarity);
  let card: CardDto | null = null;
  if (tier && !have) {
    card = {
      id: `${game}-${tier.rarity}-${Date.now().toString(36)}`,
      serial: s.cards.length + 1,
      player: { display: s.tag, fighter: s.fighter, avatar: s.head },
      game,
      rarity: tier.rarity,
      reason: tier.name,
      score,
      stats: { ...stats },
      theme: s.theme,
      custom: null,
      created: Date.now(),
    };
  }
  setState((st) => ({
    bests: { ...st.bests, [game]: best },
    cards: card ? [...st.cards, card] : st.cards,
  }));
  return { best, previousBest: prev ?? null, personalBest, card, tier };
}

export const byRarity = (a: CardDto, b: CardDto) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || b.created - a.created;

export function customizeCard(id: string, custom: CardDto["custom"]) {
  setState((st) => ({ cards: st.cards.map((c) => (c.id === id ? { ...c, custom } : c)) }));
}
