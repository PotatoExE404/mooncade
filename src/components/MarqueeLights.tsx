import { useLayoutEffect, useRef, useState } from "react";

const GAP = 22;
const INSET = 10;

export function MarqueeLights() {
  const box = useRef<HTMLSpanElement>(null);
  const [dots, setDots] = useState<{ x: number; y: number }[]>([]);

  useLayoutEffect(() => {
    const el = box.current!.parentElement!;
    const place = () => {
      const w = el.clientWidth - INSET * 2, h = el.clientHeight - INSET * 2;
      if (w <= 0 || h <= 0) return;
      const nx = Math.max(2, Math.round(w / GAP)), ny = Math.max(2, Math.round(h / GAP));
      const out: { x: number; y: number }[] = [];
      for (let i = 0; i < nx; i++) out.push({ x: INSET + (w * i) / nx, y: INSET });
      for (let i = 0; i < ny; i++) out.push({ x: INSET + w, y: INSET + (h * i) / ny });
      for (let i = 0; i < nx; i++) out.push({ x: INSET + w - (w * i) / nx, y: INSET + h });
      for (let i = 0; i < ny; i++) out.push({ x: INSET, y: INSET + h - (h * i) / ny });
      setDots(out);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <span ref={box} className="pointer-events-none absolute inset-0" aria-hidden="true">
      {dots.map((d, i) => (
        <i key={i} className={`bulb ${i % 2 ? "bulb-b" : "bulb-a"}`} style={{ left: d.x, top: d.y }} />
      ))}
    </span>
  );
}
