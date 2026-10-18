export interface Rng {
  u32(): number;

  int(min: number, max: number): number;

  chance(num: number, den: number): boolean;
  state: number;
}

export function createRng(seed: number): Rng {
  const rng: Rng = {
    state: seed >>> 0,
    u32() {
      rng.state = (rng.state + 0x6d2b79f5) >>> 0;
      let t = rng.state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (t ^ (t >>> 14)) >>> 0;
    },
    int(min, max) {
      return min + (rng.u32() % (max - min + 1));
    },
    chance(num, den) {
      return rng.u32() % den < num;
    },
  };
  return rng;
}

export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hashInts(values: readonly number[]): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < values.length; i++) {
    h ^= values[i] | 0;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
