import type { ReactNode } from "react";
import { RARITY_COLOR } from "../cards/render";
import { HOWTO, type PickupIcon } from "../games/howto";
import { GAMES } from "../games/registry";
import { formatScore, LADDERS, type Tier } from "../shared/rules";
import type { GameId } from "../sim";
import { useStore } from "../state/store";

export function HowToPlay({ game, wide = false, className = "" }: { game: GameId; wide?: boolean; className?: string }) {
  const how = HOWTO[game];
  const info = GAMES[game];
  const best = useStore((s) => s.bests[game]);
  const cards = useStore((s) => s.cards);
  const next = LADDERS[game].find((t) => !cards.some((c) => c.game === game && c.rarity === t.rarity));

  const head = (
    <div>
      <p className="meta text-muted">How to play</p>
      <p className="mt-1.5 font-pixel text-[1.4rem] leading-[1.12]">{how.goal}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-ink px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-white uppercase">{info.format}</span>
        {best !== undefined && (
          <span className="rounded-full border-2 border-line/15 px-3 py-0.5 font-mono text-[11px] font-semibold tracking-wider uppercase">
            Best <span className="font-pixel text-sm tracking-normal">{formatScore(game, best)}</span>
          </span>
        )}
      </div>
    </div>
  );
  const steps = (
    <ol className="space-y-2">
      {how.steps.map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent font-pixel text-base text-accent-ink">{i + 1}</span>
          <span className="leading-snug">{s}</span>
        </li>
      ))}
    </ol>
  );
  const pickups = how.pickups.length > 0 && (
    <Section label="Pickups">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {how.pickups.map((p) => (
          <li key={p.name} className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-white">
              <Icon name={p.icon} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-sm font-semibold">{p.name}</span>
              <span className="htp-what block truncate text-xs text-muted">{p.what}</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
  const controls = (
    <Section label="Controls">
      <Controls game={game} />
    </Section>
  );
  const nextCard = next && <NextCard tier={next} />;

  if (wide)
    return (
      <section className={`htp grid gap-6 p-5 sm:p-6 md:grid-cols-3 ${className}`} aria-label="How to play">
        <div className="flex flex-col gap-4">
          {head}
          {nextCard}
        </div>
        <Section label="Steps">{steps}</Section>
        {controls}
      </section>
    );
  return (
    <section className={`htp flex flex-col gap-5 p-5 ${className}`} aria-label="How to play">
      {head}
      {steps}
      {pickups}
      {controls}
      {nextCard && <div className="htp-next mt-auto">{nextCard}</div>}
    </section>
  );
}

export function NextCard({ tier, className = "" }: { tier: Tier; className?: string }) {
  return (
    <div className={`next-card ${className}`} style={{ ["--tier" as string]: RARITY_COLOR[tier.rarity] }}>
      <span className="next-card-gem" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" fill="currentColor">
          <path d="M4 2h8v2h2v3h-1v2h-1v2h-1v2H9v1H7v-1H5v-2H4V9H3V7H2V4h2z" opacity=".85" />
        </svg>
      </span>
      <span className="min-w-0 leading-tight">
        <span className="flex items-baseline gap-2">
          <span className="meta text-[11px] text-muted">Next card</span>
          <span className="meta text-[11px] font-bold" style={{ color: "color-mix(in srgb, var(--tier) 55%, #2a2218)" }}>{tier.rarity}</span>
        </span>
        <span className="block font-pixel text-lg leading-tight">{tier.name}</span>
        <span className="block text-sm text-muted">{tier.how}</span>
      </span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-line/10 pt-3">
      <p className="meta mb-2 text-muted">{label}</p>
      {children}
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid h-7 min-w-7 place-items-center rounded-md border border-line/25 bg-white px-1.5 font-mono text-[11px] font-bold shadow-[0_2px_0_rgba(42,34,24,0.25)]">{children}</kbd>;
}

function Controls({ game }: { game: GameId }) {
  const rows: [ReactNode, string][] =
    game === "flap"
      ? [[<><Key>Space</Key><Key>↑</Key><Key>Tap</Key></>, "Fly up"]]
      : game === "run"
        ? [[<><Key>←</Key><Key>→</Key></>, "Lanes"], [<><Key>↑</Key><Key>↓</Key></>, "Jump · slide"], [<Key>Swipe</Key>, "On touch"]]
        : [[<><Key>←</Key><Key>→</Key></>, "Run"], [<><Key>↑</Key><Key>Space</Key></>, "Jump"], [<Key>↓</Key>, "Drop down"]];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      {[...rows, [<><Key>R</Key><Key>Esc</Key><Key>M</Key></>, "Restart · pause · mute"] as [ReactNode, string]].map(([keys, what], i) => (
        <li key={i} className={`flex items-center gap-2 text-sm ${i === rows.length ? "htp-extra" : ""}`}>
          <span className="flex gap-1">{keys}</span>
          <span className="text-muted">{what}</span>
        </li>
      ))}
    </ul>
  );
}

function Icon({ name }: { name: PickupIcon }) {
  const common = { width: 18, height: 18, viewBox: "0 0 16 16", "aria-hidden": true, shapeRendering: "crispEdges" as const, fill: "currentColor" };
  switch (name) {
    case "time":
      return (
        <svg {...common}>
          <path d="M5 1h6v2H5zM3 4h10v1h1v7h-1v1H3v-1H2V5h1zm1 2v5h8V6zm3 1h2v3H7z" fillRule="evenodd" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M3 2h10v7h-1v2h-1v1h-1v1H9v1H7v-1H6v-1H5v-1H4V9H3z" />
        </svg>
      );
    case "slow":
      return (
        <svg {...common}>
          <path d="M5 4h5v1h1v1h1v3h2v2h-2v1H4v-1H3V9H2V7h1V6h1V5h1zM4 12h2v2H4zm6 0h2v2h-2z" />
        </svg>
      );
    case "magnet":
      return (
        <svg {...common}>
          <path d="M2 2h4v7h1v1h2V9h1V2h4v8h-1v2h-1v1h-2v1H6v-1H4v-1H3v-2H2zm0 2v1h4V4zm8 0v1h4V4z" fillRule="evenodd" />
        </svg>
      );
    case "double":
      return <span className="font-pixel text-sm leading-none font-bold">×2</span>;
  }
}
