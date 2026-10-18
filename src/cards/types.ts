import type { FighterId } from "../art/fighters";
import type { Rarity } from "../shared/rules";
import type { GameId } from "../sim";
import type { ThemeId } from "../themes/themes";

export interface CardOwner {
  display: string;
  fighter: FighterId;
  avatar: string | null;
}

export interface CardCustom {
  frame?: ThemeId;
  backdrop?: "sky" | "chart" | "void";
  caption?: string;
  name?: string;
}

export interface CardDto {
  id: string;
  serial: number;
  player: CardOwner;
  game: GameId;
  rarity: Rarity;
  reason: string;
  score: number;
  stats: Record<string, number>;
  theme: ThemeId;
  custom: CardCustom | null;
  created: number;
}
