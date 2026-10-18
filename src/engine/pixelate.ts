export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export type Rgb = [number, number, number];

export const parsePalette = (hex: string[]): Rgb[] => hex.map((h) => [1, 3, 5].map((i) => parseInt(h.replace("#", "").padEnd(6, "0").slice(i - 1, i + 1), 16)) as Rgb);

export function downscale(src: Pixels, width: number, height: number, alphaCutoff = 128): Pixels {
  const out = new Uint8ClampedArray(width * height * 4);
  const sx = src.width / width, sy = src.height / height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = Math.floor(y * sy); yy < Math.min(src.height, Math.ceil((y + 1) * sy)); yy++) {
        for (let xx = Math.floor(x * sx); xx < Math.min(src.width, Math.ceil((x + 1) * sx)); xx++) {
          const i = (yy * src.width + xx) * 4, w = src.data[i + 3] / 255;
          r += src.data[i] * w; g += src.data[i + 1] * w; b += src.data[i + 2] * w; a += w; n++;
        }
      }
      const o = (y * width + x) * 4;
      if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
      out[o + 3] = (a / Math.max(1, n)) * 255 >= alphaCutoff ? 255 : 0;
    }
  }
  return { width, height, data: out };
}

export function contrast(p: Pixels, amount = 1.2): Pixels {
  const d = p.data;
  for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = (d[i + c] - 128) * amount + 128;
  return p;
}

const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function oklab([r, g, b]: Rgb): Rgb {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function quantize(p: Pixels, palette: Rgb[], dither = 0): Pixels {
  const labs = palette.map(oklab);
  const d = p.data;
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const i = (y * p.width + x) * 4;
      if (d[i + 3] === 0) continue;
      const t = dither ? (BAYER4[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * dither : 0;
      const lab = oklab([d[i] + t, d[i + 1] + t, d[i + 2] + t]);
      let best = 0, bestD = Infinity;
      for (let k = 0; k < labs.length; k++) {
        const dl = lab[0] - labs[k][0], da = lab[1] - labs[k][1], db = lab[2] - labs[k][2];
        const dist = dl * dl + da * da + db * db;
        if (dist < bestD) { bestD = dist; best = k; }
      }
      [d[i], d[i + 1], d[i + 2]] = palette[best];
    }
  }
  return p;
}

export function removeOrphans(p: Pixels, min = 2): Pixels {
  const { width: w, height: h, data: d } = p;
  const alpha = Uint8Array.from({ length: w * h }, (_, i) => d[i * 4 + 3]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!alpha[y * w + x]) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if ((dx || dy) && X >= 0 && Y >= 0 && X < w && Y < h && alpha[Y * w + X]) n++;
      }
      if (n < min) d[(y * w + x) * 4 + 3] = 0;
    }
  }
  return p;
}

export function outline(p: Pixels, color: Rgb): Pixels {
  const { width: w, height: h, data: d } = p;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] === 255;
  const add: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) add.push(y * w + x);
  }
  for (const j of add) { d.set([color[0], color[1], color[2], 255], j * 4); }
  return p;
}

export interface PixelateOptions {
  size: number;
  palette: Rgb[];
  dither?: number;
  contrast?: number;
  outlineColor?: Rgb | null;
}

export function pixelate(src: Pixels, o: PixelateOptions): Pixels {
  const inner = o.outlineColor === null ? o.size : o.size - 2;
  let p = downscale(src, inner, inner);
  p = contrast(p, o.contrast ?? 1.2);
  p = quantize(p, o.palette, o.dither ?? 0);
  p = removeOrphans(p);
  if (o.outlineColor !== null) {
    p = pad(p, 1);
    const darkest = [...o.palette].sort((a, b) => oklab(a)[0] - oklab(b)[0])[0];
    p = outline(p, o.outlineColor ?? darkest);
  }
  return p;
}

function pad(p: Pixels, n: number): Pixels {
  const w = p.width + n * 2, h = p.height + n * 2, out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < p.height; y++) out.set(p.data.subarray(y * p.width * 4, (y + 1) * p.width * 4), ((y + n) * w + n) * 4);
  return { width: w, height: h, data: out };
}

