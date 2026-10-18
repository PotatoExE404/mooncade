import type { GameId } from "../sim";

export type PickupIcon = "time" | "shield" | "slow" | "magnet" | "double";

export interface Pickup {
  icon: PickupIcon;
  name: string;
  what: string;
}

export interface HowTo {
  goal: string;
  steps: string[];
  pickups: Pickup[];
}

export const HOWTO: Record<GameId, HowTo> = {
  flap: {
    goal: "Fly through the candles. Beat the clock.",
    steps: ["Tap to flap. Let go to drop.", "Candles and new levels add time.", "Crashes cost time."],
    pickups: [
      { icon: "time", name: "Time", what: "+5 s" },
      { icon: "shield", name: "Shield", what: "Blocks a crash" },
      { icon: "slow", name: "Slow-mo", what: "Slows the world" },
      { icon: "double", name: "Double", what: "Candles ×2" },
    ],
  },
  run: {
    goal: "Outrun the bear. Beat the clock.",
    steps: ["Switch lanes, jump and slide.", "New levels add time.", "Coins score. Crashes cost time."],
    pickups: [
      { icon: "time", name: "Time", what: "+5 s" },
      { icon: "shield", name: "Shield", what: "Blocks a crash" },
      { icon: "magnet", name: "Magnet", what: "Pulls coins in" },
      { icon: "double", name: "Double", what: "Coins ×2" },
    ],
  },
  diamond: {
    goal: "Reach the rocket. Beat the clock.",
    steps: ["Run right to the rocket.", "Stomp paper hands. Dodge bears.", "All 30 diamonds unlock the top cards."],
    pickups: [],
  },
};
