import { useEffect, useRef, useState } from "react";
import { drawCard, RARITY_COLOR } from "../cards/render";
import type { CardDto } from "../cards/types";

export function CardView({ card, head, width = 240, className = "" }: { card: CardDto; head?: string | null; width?: number; className?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);
  const holo = card.rarity !== "common" && card.rarity !== "rare";

  useEffect(() => {
    let live = true;
    drawCard(card, { head }).then((c) => live && setUrl(c.toDataURL("image/png")));
    return () => {
      live = false;
    };
  }, [card, head]);

  return (
    <div
      ref={holder}
      className={`relative select-none ${className}`}
      style={{ width, aspectRatio: "120 / 168" }}
      onPointerMove={(e) => {
        if (!holo) return;
        const r = holder.current!.getBoundingClientRect();
        setTilt({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
      }}
      onPointerLeave={() => setTilt(null)}
    >
      {url ? (
        <img src={url} alt={`${card.rarity} ${card.game} card #${card.serial} for ${card.player.display}: ${card.reason}`} className="pixelated block h-full w-full" />
      ) : (
        <div className="h-full w-full animate-pulse rounded-lg border-2 border-line bg-paper-deep" />
      )}
      {holo && url && tilt && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-screen"
          style={{
            background: `linear-gradient(${115 + (tilt.x - 0.5) * 60}deg, transparent ${20 + tilt.y * 20}%, ${RARITY_COLOR[card.rarity]}55 ${40 + tilt.x * 20}%, #ffffff44 ${48 + tilt.x * 20}%, transparent ${70 + tilt.y * 10}%)`,
          }}
        />
      )}
    </div>
  );
}
