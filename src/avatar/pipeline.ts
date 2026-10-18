import { canvas } from "../art/bake";
import { contrast, downscale, outline, parsePalette, quantize, type Pixels, type Rgb } from "../engine/pixelate";
import { THEMES, type ThemeId } from "../themes/themes";

export const PORTRAIT = 48;
export const HEAD = 14;

export const PALETTES: Record<string, { name: string; colors: string[] | null }> = {
  photo: { name: "True to photo", colors: null },
  arcade: {
    name: "Arcade 32",
    colors: ["#be4a2f", "#d77643", "#ead4aa", "#e4a672", "#b86f50", "#733e39", "#3e2731", "#a22633", "#e43b44", "#f77622", "#feae34", "#fee761", "#63c74d", "#3e8948", "#265c42", "#193c3e", "#124e89", "#0099db", "#2ce8f5", "#ffffff", "#c0cbdc", "#8b9bb4", "#5a6988", "#3a4466", "#262b44", "#181425", "#ff0044", "#68386c", "#b55088", "#f6757a", "#e8b796", "#c28569"],
  },
  pico: { name: "PICO-8", colors: ["#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa"] },
  gameboy: { name: "Pocket", colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"] },
};

export function teamPalette(id: ThemeId): string[] {
  const t = THEMES[id];
  return [t.bg, t.surface, t.ink, t.muted, t.accent, t.up, t.upDark, t.down, t.downDark, t.gold, t.hazard, t.sun, "#f2c4a0", "#c98f6c", "#7a4a33", "#3a2418"];
}

export interface Crop { x: number; y: number; size: number }

export interface PortraitOptions {
  palette: string;
  team: ThemeId;
  colors: number;
  dither: boolean;
  contrast: number;
  cutBackground: boolean;
}

export function medianCut(p: Pixels, k: number): Rgb[] {
  const px: Rgb[] = [];
  for (let i = 0; i < p.data.length; i += 4) if (p.data[i + 3]) px.push([p.data[i], p.data[i + 1], p.data[i + 2]]);
  if (!px.length) return [[0, 0, 0]];
  let boxes: Rgb[][] = [px];
  while (boxes.length < k) {
    let bi = -1, bc = 0, br = -1;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const v of b) {
          if (v[c] < lo) lo = v[c];
          if (v[c] > hi) hi = v[c];
        }
        if (hi - lo > br) {
          br = hi - lo;
          bi = i;
          bc = c;
        }
      }
    });
    if (bi < 0 || br < 6) break;
    const b = boxes[bi].sort((x, y) => x[bc] - y[bc]);
    const mid = b.length >> 1;
    boxes = [...boxes.slice(0, bi), b.slice(0, mid), b.slice(mid), ...boxes.slice(bi + 1)];
  }
  return boxes.map((b) => {
    const s = [0, 0, 0];
    for (const v of b) {
      s[0] += v[0];
      s[1] += v[1];
      s[2] += v[2];
    }
    return [Math.round(s[0] / b.length), Math.round(s[1] / b.length), Math.round(s[2] / b.length)] as Rgb;
  });
}

export function likenessPalette(p: Pixels, k: number): Rgb[] {
  const extra = Math.max(3, Math.round(k / 4));
  const pal = medianCut(p, k - extra);
  const px: Rgb[] = [];
  for (let i = 0; i < p.data.length; i += 4) if (p.data[i + 3]) px.push([p.data[i], p.data[i + 1], p.data[i + 2]]);
  const dist = (a: Rgb, b: Rgb) => (a[0] - b[0]) ** 2 * 0.3 + (a[1] - b[1]) ** 2 * 0.59 + (a[2] - b[2]) ** 2 * 0.11;
  for (let e = 0; e < extra && px.length; e++) {
    let best = px[0], bestD = -1;
    for (const c of px) {
      let d = Infinity;
      for (const q of pal) d = Math.min(d, dist(c, q));
      if (d > bestD) {
        bestD = d;
        best = c;
      }
    }
    if (bestD < 400) break;
    pal.push(best);
  }
  return pal;
}

function mask(p: Pixels): Pixels {
  const { width: w, height: h, data: d } = p;
  const r = w / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - r, dy = y + 0.5 - h / 2;
      d[(y * w + x) * 4 + 3] = dx * dx + dy * dy <= r * r ? 255 : 0;
    }
  return p;
}

function sharpen(p: Pixels, amount = 0.6): Pixels {
  const { width: w, height: h, data: d } = p;
  const out = new Uint8ClampedArray(d);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (!d[i + 3]) continue;
      for (let c = 0; c < 3; c++) {
        let blur = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const j = ((y + dy) * w + (x + dx)) * 4;
            if (d[j + 3]) {
              blur += d[j + c];
              n++;
            }
          }
        out[i + c] = d[i + c] + amount * (d[i + c] - blur / n);
      }
    }
  return { width: w, height: h, data: out };
}

function cutBackground(p: Pixels, tolerance = 30): Pixels {
  const { width: w, height: h, data: d } = p;
  const seen = new Uint8Array(w * h);
  let br = 0, bg = 0, bb = 0, n = 0;
  for (let x = 0; x < w; x++)
    for (const y of [0, 1]) {
      const k = (y * w + x) * 4;
      if (d[k + 3]) {
        br += d[k];
        bg += d[k + 1];
        bb += d[k + 2];
        n++;
      }
    }
  if (!n) return p;
  br /= n;
  bg /= n;
  bb /= n;
  const close = (k: number) => d[k + 3] === 0 || Math.hypot(d[k] - br, d[k + 1] - bg, d[k + 2] - bb) < tolerance;
  const queue: number[] = [];
  for (let x = 0; x < w; x++) queue.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) queue.push(y * w, y * w + w - 1);
  while (queue.length) {
    const i = queue.pop()!;
    if (seen[i]) continue;
    seen[i] = 1;
    if (!close(i * 4)) continue;
    d[i * 4 + 3] = 0;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) queue.push(i - 1);
    if (x < w - 1) queue.push(i + 1);
    if (y > 0) queue.push(i - w);
    if (y < h - 1) queue.push(i + w);
  }
  return p;
}

function pad(p: Pixels, n: number): Pixels {
  const w = p.width + n * 2, h = p.height + n * 2, out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < p.height; y++) out.set(p.data.subarray(y * p.width * 4, (y + 1) * p.width * 4), ((y + n) * w + n) * 4);
  return { width: w, height: h, data: out };
}

function despeckle(p: Pixels, keepContrast = 120): Pixels {
  const { width: w, height: h, data: d } = p;
  const out = new Uint8ClampedArray(d);
  const at = (x: number, y: number) => (y * w + x) * 4;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = at(x, y);
      if (!d[i + 3]) continue;
      const ns = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].filter((j) => d[j + 3]);
      if (ns.length < 3) continue;
      const same = (j: number) => d[j] === d[i] && d[j + 1] === d[i + 1] && d[j + 2] === d[i + 2];
      if (ns.some(same)) continue;
      const counts = new Map<string, [number, number]>();
      for (const j of ns) {
        const key = `${d[j]},${d[j + 1]},${d[j + 2]}`;
        const c = counts.get(key);
        counts.set(key, c ? [c[0] + 1, j] : [1, j]);
      }
      const [n, j] = [...counts.values()].sort((a, b) => b[0] - a[0])[0];
      const lum = (k: number) => 0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2];
      if (n >= 2 && Math.abs(lum(i) - lum(j)) < keepContrast) out.set(d.subarray(j, j + 3), i);
    }
  return { width: w, height: h, data: out };
}

const OUTLINE: Rgb = [16, 10, 24];

function toCanvas(p: Pixels): HTMLCanvasElement {
  const c = canvas(p.width, p.height);
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.data), p.width, p.height), 0, 0);
  return c;
}

function readPixels(c: HTMLCanvasElement): Pixels {
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const d = g.getImageData(0, 0, c.width, c.height);
  return { width: c.width, height: c.height, data: d.data };
}

export function makePortrait(src: CanvasImageSource, crop: Crop, o: PortraitOptions): HTMLCanvasElement {
  const R = 240;
  const work = canvas(R, R);
  const g = work.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingQuality = "high";
  g.drawImage(src, crop.x, crop.y, crop.size, crop.size, 0, 0, R, R);
  const inner = PORTRAIT - 2;
  let p = mask(downscale(readPixels(work), inner, inner, 0));
  p = contrast(p, o.contrast);
  p = sharpen(p, 0.35);
  if (o.cutBackground) p = cutBackground(p);
  const fixed = o.palette === "team" ? teamPalette(o.team) : PALETTES[o.palette]?.colors;
  const palette = fixed ? parsePalette(fixed) : likenessPalette(p, o.colors);
  p = quantize(p, palette, o.dither ? 18 : 0);
  if (!o.dither) p = despeckle(p);
  return toCanvas(outline(pad(p, 1), OUTLINE));
}

export function headFromPortrait(portrait: HTMLCanvasElement): HTMLCanvasElement {
  const src = readPixels(portrait);

  const x0 = Math.round(src.width * 0.18), y0 = Math.round(src.height * 0.1);
  const iw = Math.round(src.width * 0.64), ih = iw;
  const inner: Pixels = { width: iw, height: ih, data: new Uint8ClampedArray(iw * ih * 4) };
  for (let y = 0; y < ih; y++) inner.data.set(src.data.subarray(((y + y0) * src.width + x0) * 4, ((y + y0) * src.width + x0 + iw) * 4), y * iw * 4);
  let p = mask(downscale(inner, HEAD - 2, HEAD - 2, 0));
  p = sharpen(p, 0.4);
  p = quantize(p, likenessPalette(inner, 24), 0);
  p = despeckle(p, 90);
  return toCanvas(outline(pad(p, 1), OUTLINE));
}

export async function loadPhoto(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > 25 * 1024 * 1024) throw new Error("That photo is over 25 MB.");
  const full = await createImageBitmap(file, { imageOrientation: "from-image" });
  const max = 1024;
  if (full.width <= max && full.height <= max) return full;
  const k = max / Math.max(full.width, full.height);
  return createImageBitmap(full, { resizeWidth: Math.round(full.width * k), resizeHeight: Math.round(full.height * k), resizeQuality: "high" });
}
