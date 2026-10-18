import { THEMES, type ThemeId } from "../themes/themes";

const GLYPHS: Record<string, string[]> = {
  S: ["0111110", "1100011", "1100000", "0111100", "0001110", "0000011", "1100011", "0111110", "0000000"],
  E: ["1111111", "1100000", "1100000", "1111110", "1100000", "1100000", "1100000", "1111111", "0000000"],
  R: ["1111110", "1100011", "1100011", "1111110", "1101100", "1100110", "1100011", "1100011", "0000000"],
};

export function Coin({ theme, size = 40, spin = false, className = "" }: { theme: ThemeId; size?: number; spin?: boolean; className?: string }) {
  const t = THEMES[theme];
  const [light, mid, dark] = t.coin;
  const glyph = GLYPHS[t.letter];
  const R = 11;
  const px: { x: number; y: number; c: string }[] = [];
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x + 0.5 - 12, y + 0.5 - 12);
      if (d > R) continue;
      let c = d > R - 1.6 ? dark : x + y < 20 ? light : mid;
      if (d < R - 3 && d > R - 4.2) c = dark;
      px.push({ x, y, c });
    }
  glyph.forEach((row, gy) =>
    [...row].forEach((on, gx) => {
      if (on === "1") px.push({ x: 9 + gx - 1, y: 7 + gy, c: dark });
    }),
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${t.name} coin`}
      className={`${spin ? "coin-spin" : ""} ${className}`}
    >
      {px.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={1} height={1} fill={p.c} />
      ))}
      <rect x={6} y={5} width={3} height={1} fill="#ffffff" opacity={0.85} />
      <rect x={5} y={6} width={1} height={2} fill="#ffffff" opacity={0.85} />
    </svg>
  );
}
