import { canvas } from "../art/bake";
import { createRng, hashString } from "../sim/rng";
import type { Theme } from "../themes/themes";
import { comfort } from "../engine/juice";
import type { Fx } from "./runtime";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const memo = new Map<string, HTMLCanvasElement>();
const once = (key: string, make: () => HTMLCanvasElement) => {
  let c = memo.get(key);
  if (!c) memo.set(key, (c = make()));
  return c;
};

export function sky(theme: Theme, w: number, h: number): HTMLCanvasElement {
  return once(`sky:${theme.id}:${w}x${h}`, () => {
    const c = canvas(w, h);
    const g = c.getContext("2d")!;
    const bands = theme.sky;
    const bandH = h / bands.length;
    for (let y = 0; y < h; y++) {
      const f = y / bandH;
      const i = Math.min(bands.length - 1, Math.floor(f));
      const frac = f - i;
      for (let x = 0; x < w; x++) {
        const t = BAYER[(y % 4) * 4 + (x % 4)] / 16;
        const j = frac > 0.5 && t < (frac - 0.5) * 2 && i + 1 < bands.length ? i + 1 : i;
        g.fillStyle = bands[j];
        g.fillRect(x, y, 1, 1);
      }
    }
    if (theme.scenery !== "crystal") {
      const r = createRng(hashString(`stars:${theme.id}:${w}`));
      for (let k = 0; k < (w * h) / 700; k++) {
        const x = r.int(0, w - 1), y = r.int(0, Math.floor(h * 0.45));
        g.fillStyle = r.chance(1, 5) ? theme.gold : theme.star;
        g.fillRect(x, y, 1, 1);
        if (r.chance(1, 9)) {
          g.globalAlpha = 0.5;
          g.fillRect(x - 1, y, 3, 1);
          g.fillRect(x, y - 1, 1, 3);
          g.globalAlpha = 1;
        }
      }
    }
    return c;
  });
}

export function sun(theme: Theme, r: number): HTMLCanvasElement {
  return once(`sun:${theme.id}:${r}`, () => {
    const pad = Math.ceil(r * 0.6);
    const s = r * 2 + pad * 2;
    const c = canvas(s, s);
    const g = c.getContext("2d")!;
    const cx = s / 2, cy = s / 2;

    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d > r && d < r + pad && BAYER[(y % 4) * 4 + (x % 4)] / 16 < (1 - (d - r) / pad) * 0.55) {
          g.fillStyle = theme.sunGlow;
          g.fillRect(x, y, 1, 1);
        }
      }
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy > r * r) continue;
        if (theme.scenery === "synth") {
          const v = (dy + r) / (2 * r);
          if (v > 0.45) {
            const band = Math.floor((v - 0.45) * 22);
            if ((y + band) % Math.max(2, 6 - band) === 0) continue;
          }
          g.fillStyle = v < 0.55 ? theme.sun : theme.sunGlow;
        } else if (theme.scenery === "forest") {
          const crater = [[-0.3, -0.25, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.4, 0.12]].some(([ox, oy, rr]) => (dx / r - ox) ** 2 + (dy / r - oy) ** 2 < rr * rr);
          g.fillStyle = crater ? theme.goldDark : theme.sun;
        } else {
          g.fillStyle = dx * dx + dy * dy < (r * 0.8) ** 2 ? theme.sun : theme.sunGlow;
        }
        g.fillRect(x, y, 1, 1);
      }
    return c;
  });
}

type Depth = "far" | "mid";

export function scenery(theme: Theme, depth: Depth, w: number, h: number): HTMLCanvasElement {
  return once(`scenery:${theme.id}:${depth}:${w}x${h}`, () => {
    const c = canvas(w, h);
    const g = c.getContext("2d")!;
    const r = createRng(hashString(`${theme.id}:${depth}:${w}`));
    const color = depth === "far" ? theme.far : theme.mid;
    const px = (x: number, y: number, ww: number, hh: number, col: string) => {
      g.fillStyle = col;
      g.fillRect(Math.round(((x % w) + w) % w), Math.round(y), ww, hh);
      if (x + ww > w) g.fillRect(Math.round(x - w), Math.round(y), ww, hh);
    };
    if (theme.scenery === "synth") {
      if (depth === "far") {
        const peaks: number[] = [];
        let y = h * 0.5;
        for (let x = 0; x <= w; x += 2) {
          y += r.int(-3, 3);
          y = Math.max(h * 0.15, Math.min(h * 0.75, y));
          peaks.push(y);
        }
        peaks[peaks.length - 1] = peaks[0];
        for (let i = 0; i < peaks.length - 1; i++)
          for (let k = 0; k < 2; k++) {
            const yy = Math.round(peaks[i] + ((peaks[i + 1] - peaks[i]) * k) / 2);
            px(i * 2 + k, yy, 1, h - yy, color);
            px(i * 2 + k, yy, 1, 1, theme.down);
          }
      } else {
        for (let x = 10; x < w; x += r.int(38, 70)) {
          const top = h - r.int(Math.floor(h * 0.45), Math.floor(h * 0.85));
          const lean = r.int(-4, 4);
          for (let yy = top; yy < h; yy++) px(x + Math.round((lean * (h - yy)) / (h - top)), yy, 2, 1, theme.near);
          const tx = x + lean;
          for (const [dx, dy, len] of [[-1, -1, 9], [1, -1, 9], [-1, 0, 7], [1, 0, 7], [0, -1, 5]])
            for (let k = 0; k < len; k++) px(tx + dx * k, top + dy * Math.round(k * 0.5) + Math.round((k * k) / 12), 2, 1, theme.near);
        }
      }
    } else if (theme.scenery === "crystal") {
      if (depth === "far") {
        for (let i = 0; i < 6; i++) {
          const cx = r.int(0, w), cy = r.int(Math.floor(h * 0.2), Math.floor(h * 0.7)), cw = r.int(18, 34);
          for (let k = 0; k < 5; k++) {
            const bx = cx + r.int(-cw / 2, cw / 2), by = cy + r.int(-4, 2), br = r.int(5, 9);
            for (let yy = -br; yy <= br; yy++) {
              const half = Math.floor(Math.sqrt(br * br - yy * yy));
              px(bx - half, by + yy, half * 2, 1, yy < 0 ? "#ffffff" : theme.far);
            }
          }
        }
      } else {
        let y = h * 0.6;
        for (let x = 0; x < w; x++) {
          y += r.int(-2, 2) * 0.7;
          y = Math.max(h * 0.4, Math.min(h * 0.85, y));
          px(x, y, 1, h - y, color);
          if (x % 3 === 0) px(x, y, 1, 1, "#ffffff");
        }
        for (let i = 0; i < 4; i++) {
          const cx = r.int(0, w), cy = r.int(Math.floor(h * 0.1), Math.floor(h * 0.45)), s = r.int(4, 8);
          for (let yy = -s * 2; yy <= s * 2; yy++) {
            const half = Math.round(s * (1 - Math.abs(yy) / (s * 2)));
            px(cx - half, cy + yy, half, 1, theme.up);
            px(cx, cy + yy, half, 1, theme.upDark);
          }
        }
      }
    } else {
      const step = depth === "far" ? 9 : 16;
      for (let x = 0; x < w; x += step + r.int(-3, 3)) {
        const th = depth === "far" ? r.int(Math.floor(h * 0.4), Math.floor(h * 0.75)) : r.int(Math.floor(h * 0.55), Math.floor(h * 0.95));
        const top = h - th;
        const hw = Math.round(th * 0.22);
        for (let yy = top; yy < h; yy++) {
          const t = (yy - top) / th;
          const tier = (t * 4) % 1;
          const half = Math.max(1, Math.round(hw * t * (0.6 + tier * 0.5)));
          px(x - half, yy, half * 2 + 1, 1, color);
        }
        if (depth === "mid" && r.chance(1, 4)) px(x, top + 6, 1, 1, theme.gold);
      }
    }
    return c;
  });
}

export function ambient(g: CanvasRenderingContext2D, theme: Theme, time: number, w: number, h: number, count = 18) {
  g.fillStyle = theme.particle;
  for (let i = 0; i < count; i++) {
    const seed = Math.imul(i + 1, 2654435761) >>> 0;
    const fx = (seed % 1000) / 1000, fy = ((seed >>> 10) % 1000) / 1000, sp = 0.4 + ((seed >>> 20) % 100) / 100;
    let x = fx * w, y = fy * h;
    if (theme.scenery === "synth") y = h - (((fy * h + time * 18 * sp) % h) + h) % h;
    else if (theme.scenery === "crystal") y = ((fy * h + time * 10 * sp) % h + h) % h;
    else {
      x += Math.sin(time * sp + i) * 6;
      y += Math.cos(time * sp * 0.7 + i) * 4;
      if (Math.sin(time * 3 * sp + i * 1.7) < 0.2) continue;
    }
    g.globalAlpha = theme.scenery === "crystal" ? 0.8 : 0.9;
    g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  g.globalAlpha = 1;
}

export function tile(g: CanvasRenderingContext2D, layer: HTMLCanvasElement, offset: number, y: number) {
  const w = layer.width;
  let x = -(((Math.round(offset) % w) + w) % w);
  for (; x < g.canvas.width; x += w) g.drawImage(layer, x, y);
}

const colorCache = new Map<number, string>();
export const pack = (hex: string) => parseInt(hex.slice(1), 16) >>> 0;
const css = (rgb: number) => {
  let s = colorCache.get(rgb);
  if (!s) colorCache.set(rgb, (s = `#${rgb.toString(16).padStart(6, "0")}`));
  return s;
};

export function drawParticles(g: CanvasRenderingContext2D, fx: Fx, ox = 0, oy = 0) {
  const p = fx.particles;
  p.forEach((i, a) => {
    g.fillStyle = css(p.color[i]);
    const s = a > 0.5 ? 2 : 1;
    g.fillRect(Math.round(p.x[i] + ox), Math.round(p.y[i] + oy), s, s);
  });
}

const flashCanvas = canvas(64, 64);
export function drawFlash(g: CanvasRenderingContext2D, sprite: HTMLCanvasElement, x: number, y: number) {
  if (!comfort.flashes) {
    g.drawImage(sprite, x, y);
    return;
  }
  const f = flashCanvas.getContext("2d")!;
  f.clearRect(0, 0, 64, 64);
  f.globalCompositeOperation = "source-over";
  f.drawImage(sprite, 0, 0);
  f.globalCompositeOperation = "source-in";
  f.fillStyle = "#ffffff";
  f.fillRect(0, 0, 64, 64);
  g.drawImage(flashCanvas, 0, 0, sprite.width, sprite.height, x, y, sprite.width, sprite.height);
}

const MOODS: { tint: string; alpha: number; name: string }[] = [
  { tint: "#000000", alpha: 0, name: "" },
  { tint: "#ff9a3c", alpha: 0.12, name: "Golden hour" },
  { tint: "#101a5a", alpha: 0.26, name: "Midnight" },
  { tint: "#d4143c", alpha: 0.16, name: "Red alert" },
  { tint: "#1fd6a8", alpha: 0.14, name: "Aurora" },
  { tint: "#0a0b18", alpha: 0.34, name: "Storm" },
];

const moodOf = (level: number) => MOODS[level <= 1 ? 0 : 1 + ((level - 2) % (MOODS.length - 1))];
export const moodName = (level: number) => moodOf(level).name;

export function mood(g: CanvasRenderingContext2D, level: number, time: number, w: number, h: number) {
  if (level <= 1) return;
  const m = moodOf(level);
  g.globalAlpha = m.alpha;
  g.fillStyle = m.tint;
  g.fillRect(0, 0, w, h);
  if (m.name === "Aurora") {
    for (let i = 0; i < 4; i++) {
      g.globalAlpha = 0.1;
      g.fillStyle = i % 2 ? "#7c4dff" : "#2dffc4";
      const y = Math.round(h * 0.12 + i * 9 + Math.sin(time * 0.8 + i) * 6);
      g.fillRect(0, y, w, 4);
    }
  }
  if (m.name === "Storm" && comfort.flashes) {
    const cycle = time % 3.2;
    if (cycle < 0.08) {
      g.globalAlpha = 0.22;
      g.fillStyle = "#e8ecff";
      g.fillRect(0, 0, w, h);
    }
  }
  g.globalAlpha = 1;
}

export type PickupKind = "time" | "shield" | "slow" | "double" | "magnet";

export const PICKUP_COLOR: Record<PickupKind, string> = {
  time: "#22c55e",
  shield: "#3b82f6",
  slow: "#a855f7",
  double: "#f59e0b",
  magnet: "#ef4444",
};

export const PICKUP_LABEL: Record<PickupKind, string> = {
  time: "+5s",
  shield: "SHIELD",
  slow: "SLOW-MO",
  double: "x2",
  magnet: "MAGNET",
};

const GLYPHS: Record<PickupKind, string[]> = {
  time: [".xxxxx.", "x..x..x", "x..x..x", "x..xx.x", "x.....x", "x.....x", ".xxxxx."],
  shield: ["xxxxxxx", "xxxxxxx", "xxxxxxx", "xxxxxxx", ".xxxxx.", "..xxx..", "...x..."],
  slow: ["xxxxxxx", ".x...x.", "..x.x..", "...x...", "..x.x..", ".x.x.x.", "xxxxxxx"],
  double: [".......", "x.x.xx.", ".x....x", "x.x..x.", "....x..", "....xxx", "......."],
  magnet: ["xx...xx", "xx...xx", "xx...xx", "xx...xx", "xx...xx", ".xx.xx.", "..xxx.."],
};

export function pickupIcon(kind: PickupKind): HTMLCanvasElement {
  return once(`pickup:${kind}`, () => {
    const c = canvas(13, 13);
    const g = c.getContext("2d")!;
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++) {
        const d = Math.hypot(x - 6, y - 6);
        if (d <= 5.4 || d > 6.4) continue;
        g.fillStyle = "#1a1410";
        g.fillRect(x, y, 1, 1);
      }

    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++) {
        const d = Math.hypot(x - 6, y - 6);
        if (d > 5.4) continue;
        g.fillStyle = PICKUP_COLOR[kind];
        g.fillRect(x, y, 1, 1);
        if (y <= 2 && d < 4.6) {
          g.globalAlpha = 0.35;
          g.fillStyle = "#ffffff";
          g.fillRect(x, y, 1, 1);
          g.globalAlpha = 1;
        }
      }
    const glyph = GLYPHS[kind];
    g.fillStyle = "#ffffff";
    glyph.forEach((row, y) => [...row].forEach((ch, x) => ch === "x" && g.fillRect(3 + x, 3 + y, 1, 1)));
    return c;
  });
}

export function drawPickup(g: CanvasRenderingContext2D, kind: PickupKind, x: number, y: number, time: number, scale = 1) {
  const icon = pickupIcon(kind);
  const bob = Math.round(Math.sin(time * 5 + x * 0.1) * 1.5);
  const s = 13 * scale;
  const ring = (time * 1.6) % 1;
  g.globalAlpha = 0.5 * (1 - ring);
  g.strokeStyle = PICKUP_COLOR[kind];
  g.lineWidth = 1;
  g.beginPath();
  g.arc(Math.round(x), Math.round(y + bob), s / 2 + 1 + ring * 5 * scale, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
  g.drawImage(icon, Math.round(x - s / 2), Math.round(y - s / 2 + bob), s, s);
}

export interface Floater {
  text: string;
  x: number;
  y: number;
  color: string;
  born: number;
}

export function drawFloaters(g: CanvasRenderingContext2D, list: Floater[], time: number) {
  g.font = "8px 'Pixelify Sans', monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    const age = time - f.born;
    if (age > 1 || age < 0) {
      list.splice(i, 1);
      continue;
    }
    const y = Math.round(f.y - age * 22);
    g.globalAlpha = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
    g.fillStyle = "#1a1410";
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.fillText(f.text, Math.round(f.x) + dx, y + dy);
    g.fillStyle = f.color;
    g.fillText(f.text, Math.round(f.x), y);
  }
  g.globalAlpha = 1;
}

export function drawBoosts(g: CanvasRenderingContext2D, boosts: { kind: PickupKind; left: number; total: number }[], x: number, y: number) {
  let cx = x;
  for (const b of boosts) {
    g.drawImage(pickupIcon(b.kind), cx, y);
    if (b.total > 0) {
      g.fillStyle = "#1a1410";
      g.fillRect(cx, y + 14, 13, 3);
      g.fillStyle = PICKUP_COLOR[b.kind];
      g.fillRect(cx + 1, y + 15, Math.max(1, Math.round((11 * b.left) / b.total)), 1);
    }
    cx += 16;
  }
}

export function drawShield(g: CanvasRenderingContext2D, x: number, y: number, r: number, time: number) {
  g.globalAlpha = 0.35 + Math.sin(time * 8) * 0.12;
  g.fillStyle = PICKUP_COLOR.shield;
  g.beginPath();
  g.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 0.9;
  g.strokeStyle = "#bfdbfe";
  g.lineWidth = 1;
  g.stroke();
  g.globalAlpha = 1;
}

export const secondsText = (ticks: number) => `+${Math.round(ticks / 6) / 10}s`;
