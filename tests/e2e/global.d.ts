export {};
declare global {
  interface Window {
    __game?: {
      ready: boolean;
      phase: "ready" | "playing" | "over";
      ticks: number;
      state: () => unknown;
      step: (n: number) => void;
      pause: (p: boolean) => void;
      press: (bits: number) => void;
      release: (bits: number) => void;
      set: (bits: number | null) => void;
    };
  }
}
