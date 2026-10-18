import type { Theme } from "../themes/themes";
import { bake, canvas, ellipse, limb, mirror, poly } from "./bake";
import { headCentre, type FighterSheet } from "./fighters";

const memo = new Map<string, unknown>();
function once<T>(key: string, make: () => T): T {
  if (!memo.has(key)) memo.set(key, make());
  return memo.get(key) as T;
}

export function headOf(sheet: FighterSheet): HTMLCanvasElement {
  const [hx, hy] = headCentre("idle0");
  const c = canvas(16, 16);
  c.getContext("2d")!.drawImage(sheet.right.idle0, Math.round(hx - 8), Math.round(hy - 8.5), 16, 16, 0, 0, 16, 16);
  return c;
}

export const ROCKET_W = 26;
export const ROCKET_H = 18;
export const ROCKET_TILTS = [-0.45, -0.25, 0, 0.3, 0.6, 0.95];

export function rocketFrames(theme: Theme, head: HTMLCanvasElement, headKey: string): HTMLCanvasElement[] {
  return once(`rocket:${theme.id}:${headKey}`, () =>
    ROCKET_TILTS.map((a) => {
      const sprite = bake(
        ROCKET_W,
        ROCKET_H,
        (g) => {
          g.translate(13, 10);
          g.rotate(a);

          poly(g, [-9, -2, -12, -6.5, -6, -2.5], theme.down);
          poly(g, [-9, 2.5, -12, 6.8, -6, 3], theme.down);
          ellipse(g, -1, 0.2, 9.4, 4.1, "#eef1ff");
          poly(g, [7, -3.2, 12.2, 0.2, 7, 3.6], theme.hazard);
          g.fillStyle = theme.accent;
          g.fillRect(-7.2, -0.6, 10, 1.6);
          ellipse(g, 1.8, -3.2, 3.6, 3.2, "#9fd9ff");
          g.fillStyle = "#3a4466";
          g.fillRect(-10.4, -2.2, 1.6, 4.6);
        },
        { palette: ["#eef1ff", "#b9c0dd", theme.down, theme.hazard, theme.accent, "#9fd9ff", "#3a4466"], outline: theme.outline },
      );

      const cx = 13 + Math.cos(a) * 1.8 - Math.sin(a) * -3.4;
      const cy = 10 + Math.sin(a) * 1.8 + Math.cos(a) * -3.4;
      sprite.getContext("2d")!.drawImage(head, Math.round(cx - head.width / 2), Math.round(cy - head.height / 2 - 1));
      return sprite;
    }),
  );
}

export function flameFrames(theme: Theme): HTMLCanvasElement[] {
  return once(`flame:${theme.id}`, () =>
    [0, 1, 2].map((i) =>
      bake(10, 8, (g) => {
        poly(g, [10, 1.5, 1 - i * 1.5, 4, 10, 6.5], theme.hazard);
        poly(g, [10, 2.8, 5 - i, 4, 10, 5.2], theme.gold);
      }, { palette: [theme.hazard, theme.gold], outline: null, cutoff: 0.35 }),
    ),
  );
}

export const BEAR_W = 40;
export const BEAR_H = 34;

export function bearFrames(): HTMLCanvasElement[] {
  return once("bear", () =>
    [0, 1].map((f) =>
      bake(BEAR_W, BEAR_H, (g) => {
        const lift = f ? -1.6 : 0;
        ellipse(g, 20, 21 + lift, 15, 10.5, "#6e3f22");
        ellipse(g, 20, 24 + lift, 10, 6, "#8a552e");
        ellipse(g, 20, 11 + lift, 9.5, 8.2, "#6e3f22");
        ellipse(g, 12.5, 4.5 + lift, 3, 3, "#6e3f22");
        ellipse(g, 27.5, 4.5 + lift, 3, 3, "#6e3f22");
        ellipse(g, 12.5, 4.8 + lift, 1.5, 1.5, "#c98a5c");
        ellipse(g, 27.5, 4.8 + lift, 1.5, 1.5, "#c98a5c");
        ellipse(g, 20, 15 + lift, 4.6, 3.4, "#c98a5c");
        poly(g, [16.5, 16.5 + lift, 23.5, 16.5 + lift, 20, 20.5 + lift], "#2a120a");

        limb(g, 9, 24 + lift, f ? -0.9 : -0.3, 9, 5.4, "#5a311a", { color: "#2a120a", r: 2.6 });
        limb(g, 31, 24 + lift, f ? 0.3 : 0.9, 9, 5.4, "#5a311a", { color: "#2a120a", r: 2.6 });
      }, {
        palette: ["#6e3f22", "#8a552e", "#c98a5c", "#5a311a", "#2a120a", "#ffffff", "#ff3b5c"],
        outline: "#140804",
        details: (px) => {
          px(16, 9 + (f ? -1.6 : 0), "#ff3b5c"); px(17, 9 + (f ? -1.6 : 0), "#ff3b5c");
          px(23, 9 + (f ? -1.6 : 0), "#ff3b5c"); px(24, 9 + (f ? -1.6 : 0), "#ff3b5c");
          px(18, 17 + (f ? -1.6 : 0), "#ffffff"); px(21, 17 + (f ? -1.6 : 0), "#ffffff");
        },
      }),
    ),
  );
}

export function paperFrames(): { right: HTMLCanvasElement[]; left: HTMLCanvasElement[] } {
  return once("paper", () => {
    const frames = [0, 1].map((f) =>
      bake(14, 14, (g) => {
        poly(g, [2, 3, 6, 1.4, 10.5, 2.4, 12.6, 5.6, 12, 10.6, 7, 12, 2.4, 10.8, 1.4, 6.6], "#eceae2");
        poly(g, [6, 1.4, 10.5, 2.4, 9, 5.5, 6.5, 4], "#c9c5b8");
        poly(g, [2.4, 10.8, 7, 12, 6.4, 8.6], "#c9c5b8");
        limb(g, 2, 8, f ? -1.2 : -0.6, 3, 1.4, "#eceae2", { color: "#f1d0b8", r: 1.1 });
        limb(g, 12, 8, f ? 0.6 : 1.2, 3, 1.4, "#eceae2", { color: "#f1d0b8", r: 1.1 });
        limb(g, 5, 11.6, f ? 0.4 : -0.3, 2.2, 1.4, "#3a3a46");
        limb(g, 9, 11.6, f ? -0.3 : 0.4, 2.2, 1.4, "#3a3a46");
      }, {
        palette: ["#eceae2", "#c9c5b8", "#f1d0b8", "#3a3a46", "#1b1b22"],
        outline: "#14131a",
        details: (px) => { px(8, 6, "#1b1b22"); px(10, 6, "#1b1b22"); px(9, 8, "#1b1b22"); },
      }),
    );
    const squashed = bake(14, 14, (g) => poly(g, [1, 10.5, 13, 10.5, 12, 13, 2, 13], "#eceae2"), { palette: ["#eceae2"], outline: "#14131a" });
    const right = [...frames, squashed];
    return { right, left: right.map(mirror) };
  });
}

export function gemFrames(): HTMLCanvasElement[] {
  return once("gem", () =>
    [1, 0.7, 0.35, 0.7].map((w) =>
      bake(12, 12, (g) => {
        const hw = 5 * w;
        poly(g, [6 - hw, 4, 6 - hw * 0.5, 1.5, 6 + hw * 0.5, 1.5, 6 + hw, 4, 6, 11], "#6fe9ff");
        poly(g, [6 - hw * 0.5, 1.5, 6, 1.5, 6 - hw * 0.2, 4, 6 - hw, 4], "#d9fbff");
        poly(g, [6, 4, 6 + hw, 4, 6, 11], "#2bb5d6");
      }, { palette: ["#6fe9ff", "#d9fbff", "#2bb5d6"], outline: "#06232b", cutoff: 0.3 }),
    ),
  );
}

export function coinFrames(theme: Theme): HTMLCanvasElement[] {
  return once(`coin:${theme.id}`, () =>
    [1, 0.6, 0.2, 0.6].map((w) =>
      bake(12, 12, (g) => {
        ellipse(g, 6, 6, Math.max(1, 5 * w), 5, theme.gold);
        ellipse(g, 6, 6, Math.max(0.5, 3 * w), 3, theme.goldDark);
        ellipse(g, 6 - w, 5, Math.max(0.4, 1.4 * w), 1.6, "#fff6c8");
      }, { palette: [theme.gold, theme.goldDark, "#fff6c8"], outline: theme.outline, cutoff: 0.3 }),
    ),
  );
}

export function flagFrames(theme: Theme): [HTMLCanvasElement, HTMLCanvasElement] {
  return once(`flag:${theme.id}`, () => {
    const make = (up: boolean) =>
      bake(12, 24, (g) => {
        g.fillStyle = "#c9cbd6";
        g.fillRect(2, 2, 1.4, 22);
        poly(g, up ? [3.4, 2.5, 11, 5, 3.4, 8] : [3.4, 14, 9, 16, 3.4, 18], up ? theme.accent : "#6b6f80");
      }, { palette: ["#c9cbd6", theme.accent, "#6b6f80"], outline: theme.outline });
    return [make(false), make(true)];
  });
}

export function goalSprite(theme: Theme): HTMLCanvasElement {
  return once(`goal:${theme.id}`, () =>
    bake(20, 40, (g) => {
      g.fillStyle = "#6b6f80";
      g.fillRect(1, 36, 18, 4);
      poly(g, [10, 2, 15, 12, 15, 30, 5, 30, 5, 12], "#eef1ff");
      poly(g, [10, 2, 15, 12, 5, 12], theme.hazard);
      poly(g, [5, 22, 1, 34, 5, 30], theme.down);
      poly(g, [15, 22, 19, 34, 15, 30], theme.down);
      ellipse(g, 10, 17, 2.6, 2.6, "#9fd9ff");
      g.fillStyle = theme.accent;
      g.fillRect(5, 24, 10, 2);
      poly(g, [6, 30, 14, 30, 10, 36], theme.gold);
    }, { palette: ["#6b6f80", "#eef1ff", theme.hazard, theme.down, "#9fd9ff", theme.accent, theme.gold], outline: theme.outline }),
  );
}
