import { useState } from "react";
import { Link } from "react-router";
import { RARITY_COLOR } from "../cards/render";
import type { CardDto } from "../cards/types";
import { CardStudio } from "../components/CardStudio";
import { CardView } from "../components/CardView";
import { GAME_ORDER, GAMES } from "../games/registry";
import { formatScore, LADDERS, RARITIES, type Tier } from "../shared/rules";
import type { GameId } from "../sim";
import { useStore } from "../state/store";

const TOTAL = GAME_ORDER.length * RARITIES.length;

export function Cards() {
  const cards = useStore((s) => s.cards);
  const bests = useStore((s) => s.bests);
  const [filter, setFilter] = useState<GameId | "all">("all");
  const games = filter === "all" ? GAME_ORDER : [filter];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="desk font-pixel text-title">Your cards</h1>
          <p className="desk mt-2 text-lg font-semibold">
            {cards.length} of {TOTAL} collected
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show cards for">
          {(["all", ...GAME_ORDER] as const).map((g) => (
            <button key={g} className="chip" aria-pressed={filter === g} onClick={() => setFilter(g)}>
              {g === "all" ? "All games" : GAMES[g].name}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-8 space-y-8">
        {games.map((g) => (
          <GameRow key={g} game={g} owned={cards.filter((c) => c.game === g)} best={bests[g]} />
        ))}
      </div>
    </div>
  );
}

function GameRow({ game, owned, best }: { game: GameId; owned: CardDto[]; best?: number }) {
  const info = GAMES[game];
  return (
    <section className="win" aria-labelledby={`row-${game}`}>
      <div className="win-title">
        <h2 id={`row-${game}`} className="text-base leading-none">
          {info.name}
        </h2>
        <span className="ml-auto font-mono text-xs font-normal tracking-wider">
          {owned.length}/{RARITIES.length}
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted">
            {best !== undefined ? (
              <>
                Your best <span className="font-pixel text-xl text-ink">{formatScore(game, best)}</span>
              </>
            ) : (
              "No runs yet."
            )}
          </p>
          <Link to={`/play/${game}`} className="btn" data-variant="accent">
            ▶ Play {info.name}
          </Link>
        </div>
        <ol className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {LADDERS[game].map((t) => (
            <Slot key={t.rarity} tier={t} card={owned.find((c) => c.rarity === t.rarity)} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function Slot({ tier, card }: { tier: Tier; card?: CardDto }) {
  const head = useStore((s) => s.head);
  const tag = useStore((s) => s.tag);
  const fighter = useStore((s) => s.fighter);
  const [open, setOpen] = useState(false);
  const color = RARITY_COLOR[tier.rarity];
  const mine = card && { ...card, player: { display: tag, fighter, avatar: head } };
  return (
    <li className="flex flex-col">
      {mine ? (
        <>
          <button onClick={() => setOpen(true)} className="group relative mx-auto block w-full max-w-[150px] transition-transform duration-150 hover:-translate-y-1" aria-label={`Open your ${tier.name} card`}>
            <CardView card={mine} head={head} width={150} className="!w-full" />
            <span className="meta absolute inset-x-2 bottom-2 rounded-md bg-black/75 py-1.5 text-center text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
              Customise
            </span>
          </button>
          {open && <CardStudio card={mine} onClose={() => setOpen(false)} />}
        </>
      ) : (
        <div
          className="mx-auto grid aspect-[120/168] w-full max-w-[150px] place-items-center rounded-lg border-2 border-dashed border-line/35 bg-paper-deep"
          style={{ borderTop: `6px solid ${color}` }}
          aria-hidden="true"
        >
          <span className="font-pixel text-5xl text-muted/50">?</span>
        </div>
      )}
      <div className="mx-auto mt-2 w-full max-w-[150px]">
        <p className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-line" style={{ background: color }} />
          <span className="meta font-bold">{tier.rarity}</span>
        </p>
        <p className="mt-0.5 font-pixel text-lg leading-tight">{tier.name}</p>
        <p className="text-sm leading-snug text-muted">{tier.how}</p>
      </div>
    </li>
  );
}
