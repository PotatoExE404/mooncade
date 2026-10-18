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
    goal: "Fly through as many candles as you can before the clock runs out.",
    steps: ["Tap to fly up. Let go to fall.", "Clearing candles and levels adds time.", "Crashing costs time, so keep it clean."],
    pickups: [
      { icon: "time", name: "Time", what: "+5 seconds" },
      { icon: "shield", name: "Shield", what: "Blocks one crash" },
      { icon: "slow", name: "Slow-mo", what: "Slows things down" },
      { icon: "double", name: "Double", what: "Candles count ×2" },
    ],
  },
  run: {
    goal: "Run as far as you can before the clock runs out.",
    steps: ["Switch lanes, jump and slide past the rugs.", "Each new level adds time.", "Grab coins for points. Crashing costs time."],
    pickups: [
      { icon: "time", name: "Time", what: "+5 seconds" },
      { icon: "shield", name: "Shield", what: "Blocks one crash" },
      { icon: "magnet", name: "Magnet", what: "Pulls in coins" },
      { icon: "double", name: "Double", what: "Coins count ×2" },
    ],
  },
  diamond: {
    goal: "Reach the rocket at the end of every level as fast as you can.",
    steps: ["Run and jump to the rocket on the right.", "Stomp paper hands. Dodge the bears.", "Grab every diamond for the best cards."],
    pickups: [],
  },
};
