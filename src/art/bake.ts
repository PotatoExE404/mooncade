import { outline, parsePalette, quantize, type Pixels, type Rgb } from "../engine/pixelate";

export const K = 10;

export type Draw = (ctx: CanvasRenderingContext2D) => void;

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function downscale(src: ImageData, w: number, h: number, cutoff: number): Pixels {
  const out = new Uint8ClampedArray(w * h * 4);
  const d = src.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let yy = y * K; yy < (y + 1) * K; yy++) {
        for (let xx = x * K; xx < (x + 1) * K; xx++) {
          const i = (yy * src.width + xx) * 4;
          const wgt = d[i + 3] / 255;
          r += d[i] * wgt; g += d[i + 1] * wgt; b += d[i + 2] * wgt; a += wgt;
        }
      }
      const o = (y * w + x) * 4;
      if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
      out[o + 3] = a / (K * K) >= cutoff ? 255 : 0;
    }
  }
  return { width: w, height: h, data: out };
}

export interface BakeOptions {
  palette: string[];
  outline?: string | null;
  cutoff?: number;

  details?: (px: (x: number, y: number, color: string) => void) => void;
}

const hexRgb = (hex: string): Rgb => parsePalette([hex])[0];

export function bake(w: number, h: number, draw: Draw, o: BakeOptions): HTMLCanvasElement {
  const hi = canvas(w * K, h * K);
  const g = hi.getContext("2d", { willReadFrequently: true })!;
  g.scale(K, K);
  g.lineCap = "round";
  g.lineJoin = "round";
  draw(g);
  let p = downscale(g.getImageData(0, 0, w * K, h * K), w, h, o.cutoff ?? 0.42);
  p = quantize(p, parsePalette(o.palette), 0);
  if (o.details) {
    o.details((x, y, color) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const [r, gg, b] = hexRgb(color);
      p.data.set([r, gg, b, 255], (y * w + x) * 4);
    });
  }
  if (o.outline !== null) p = outline(p, hexRgb(o.outline ?? "#05030a"));
  const out = canvas(w, h);
  out.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.data), w, h), 0, 0);
  return out;
}

export function mirror(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = canvas(src.width, src.height);
  const g = c.getContext("2d")!;
  g.scale(-1, 1);
  g.drawImage(src, -src.width, 0);
  return c;
}

export function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

export function limb(g: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, width: number, color: string, end?: { color: string; r: number }) {
  const ex = x + Math.sin(angle) * len;
  const ey = y + Math.cos(angle) * len;
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(ex, ey);
  g.stroke();
  if (end) ellipse(g, ex, ey, end.r, end.r, end.color);
  return [ex, ey] as const;
}

export function poly(g: CanvasRenderingContext2D, pts: number[], fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fill();
}
