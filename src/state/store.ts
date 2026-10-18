import { useSyncExternalStore } from "react";
import type { FighterId } from "../art/fighters";
import type { CardDto } from "../cards/types";
import { comfort } from "../engine/juice";
import type { GameId } from "../sim";
import { applySiteTheme, normalizeTheme, THEMES, type ThemeId } from "../themes/themes";

export interface Settings {
  shake: number;
  flashes: boolean;
  particles: number;
}

export interface State {
  tag: string;
  named: boolean;
  theme: ThemeId;
  fighter: FighterId;
  head: string | null;
  bests: Partial<Record<GameId, number>>;
  cards: CardDto[];
  settings: Settings;
}

const KEY = "mc:state:v2";
const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const WORDS = ["MOON", "HODL", "DEGEN", "WAGMI", "PUMP", "BULL", "SATS", "WHALE", "LAMBO", "GMGM", "APE", "STACK"];
export function randomTag(): string {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)];
  return `${w}${Math.floor(100 + Math.random() * 900)}`.slice(0, 12);
}

function load(): State {
  const base: State = {
    tag: randomTag(),
    named: false,
    theme: "sol",
    fighter: "vex",
    head: null,
    bests: {},
    cards: [],
    settings: { shake: reduced ? 0 : 1, flashes: !reduced, particles: 1 },
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>;
      return {
        ...base,
        ...saved,
        cards: Array.isArray(saved.cards) ? saved.cards : [],
        theme: normalizeTheme(saved.theme),
        settings: { ...base.settings, ...saved.settings },
      };
    }

    const old = JSON.parse(localStorage.getItem("mc:state:v1") ?? "null") as { fighter?: FighterId; head?: string | null; player?: { tag?: string } } | null;
    localStorage.removeItem("mc:state:v1");
    if (old) return { ...base, fighter: old.fighter ?? base.fighter, head: old.head ?? null, tag: old.player?.tag ?? base.tag, named: !!old.player?.tag };
  } catch {  }
  return base;
}

let state = load();
const listeners = new Set<() => void>();

function syncSideEffects() {
  applySiteTheme(THEMES[state.theme]);
  comfort.shake = state.settings.shake;
  comfort.flashes = state.settings.flashes;
  comfort.particles = state.settings.particles;
}
syncSideEffects();

export function getState(): State {
  return state;
}

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {  }
  syncSideEffects();
  listeners.forEach((l) => l());
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => select(state),
    () => select(state),
  );
}
