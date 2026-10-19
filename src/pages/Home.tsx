import { Link } from "react-router";
import { FIGHTER_IDS, FIGHTERS } from "../art/fighters";
import { Billboard } from "../components/Billboard";
import { Cabinet } from "../components/Cabinet";
import { CardView } from "../components/CardView";
import { Coin } from "../components/Coin";
import { Head } from "../components/Head";
import { InsertCoin } from "../components/InsertCoin";
import { TokenAddress } from "../components/TokenAddress";
import { Win } from "../components/Win";
import { GAMES } from "../games/registry";
import type { CardDto } from "../cards/types";
import { formatScore, LADDERS, type Rarity } from "../shared/rules";
import type { GameId } from "../sim";
import { GEM_TOTAL } from "../sim/diamond";
import { useStore } from "../state/store";
import type { ThemeId } from "../themes/themes";

function GameCabinet({ game, featured = false }: { game: GameId; featured?: boolean }) {
  const theme = useStore((s) => s.theme);
  const fighter = useStore((s) => s.fighter);
  const best = useStore((s) => s.bests[game]);
  const info = GAMES[game];
  const screen = (
    <Link to={`/play/${game}`} className="crt block transition-transform duration-200 hover:-translate-y-1" aria-label={`Play ${info.name}`}>
      <div className={`crt-screen ${info.orientation === "portrait" ? "aspect-[9/14]" : "aspect-[16/9]"}`}>
        <Cabinet game={game} theme={theme} fighter={fighter} />
        <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[11px] font-bold tracking-[0.16em] text-white backdrop-blur-sm">
          <span className="live-dot" aria-hidden="true" />
          LIVE
        </span>
      </div>
      <span className="crt-led" aria-hidden="true" />
    </Link>
  );
  const details = (
    <div className="flex flex-col gap-3">
      <p className="font-pixel text-xl text-accent-deep">{info.tagline}</p>
      <p className="text-muted">{info.pitch}</p>
      <span className="chip pointer-events-none w-fit !min-h-8">{info.format}</span>
      {best !== undefined && <p className="meta text-muted">Your best: {formatScore(game, best)}</p>}
      <Link to={`/play/${game}`} className="btn mt-1 self-start" data-variant="accent" data-size={featured ? "lg" : undefined}>
        ▶ Play {info.name}
      </Link>
    </div>
  );
  return (
    <Win title={featured ? `${info.name} · featured` : info.name} bodyClass="p-4 sm:p-5" className="h-full">
      {featured ? (
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
          {screen}
          {details}
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="mx-auto w-full max-w-[320px]">{screen}</div>
          {details}
        </div>
      )}
    </Win>
  );
}

const LADDER: { rarity: Rarity; game: GameId; theme: ThemeId }[] = [
  { rarity: "common", game: "flap", theme: "sol" },
  { rarity: "rare", game: "run", theme: "eth" },
  { rarity: "epic", game: "diamond", theme: "robin" },
  { rarity: "legendary", game: "flap", theme: "eth" },
  { rarity: "mythic", game: "run", theme: "robin" },
  { rarity: "cosmic", game: "diamond", theme: "sol" },
];

function ladderCard(i: number, fighter: (typeof FIGHTER_IDS)[number], head: string | null, tag: string): CardDto {
  const { rarity, game, theme } = LADDER[i];
  const tier = LADDERS[game].find((t) => t.rarity === rarity)!;
  const stats: Record<string, number> =
    game === "flap"
      ? { candles: [8, 0, 0, 72][i] ?? 72, crashes: 1, level: [1, 0, 0, 7][i] ?? 7 }
      : game === "run"
        ? { metres: [0, 820, 0, 0, 2240][i] ?? 800, coins: [0, 31, 0, 0, 104][i] ?? 30, crashes: 1, level: [0, 3, 0, 0, 8][i] ?? 3 }
        : { ticks: [0, 0, 13200, 0, 0, 11000][i] ?? 11000, gems: GEM_TOTAL, deaths: 0, level: 10 };
  const score = game === "flap" ? stats.candles : game === "run" ? stats.metres + stats.coins * 10 : stats.ticks;
  return {
    id: `ladder-${i}`,
    serial: [418, 77, 12, 4, 2, 1][i],
    player: { display: tag, fighter, avatar: head },
    game,
    rarity,
    reason: tier.name,
    score,
    stats,
    theme,
    custom: null,
    created: 0,
  };
}

export function Home() {
  const fighter = useStore((s) => s.fighter);
  const head = useStore((s) => s.head);
  const tag = useStore((s) => s.tag);
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-3 pt-8 pb-20 sm:px-6 2xl:max-w-[1500px]">
      <section className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <InsertCoin />
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 lg:absolute lg:inset-x-0 lg:-top-6 lg:pr-2">
            <TokenAddress />
            <div className="pointer-events-none flex gap-3" aria-hidden="true">
              {(["sol", "eth", "robin"] as ThemeId[]).map((t, i) => (
                <span key={t} className="bob" style={{ animationDelay: `${i * 0.35}s` }}>
                  <Coin theme={t} size={52} spin />
                </span>
              ))}
            </div>
          </div>
          <p className="desk max-w-[40ch] text-xl leading-relaxed font-semibold sm:text-2xl lg:pt-10">
            Three arcade classics you already know how to play. Kick back, beat your high score, and show it off.
          </p>
          <p className="desk max-w-[40ch] text-lg leading-snug font-semibold">
            Chart bleeding red? Close the app. Ape into some pixels and chill with the fam till we're so back.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/play/diamond" className="btn" data-variant="accent" data-size="lg">
              ▶ Play now
            </Link>
            <Link to="/me" className="btn" data-size="lg">
              Make your fighter
            </Link>
          </div>
        </div>
      </section>

      <Billboard />

      <GameCabinet game="diamond" featured />
      <div className="grid gap-8 md:grid-cols-2">
        <GameCabinet game="run" />
        <GameCabinet game="flap" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Win title="Your face, in pixels" bodyClass="p-4 sm:p-6">
          <p className="max-w-[52ch] text-lg">Pick a fighter, add a selfie, and play as a pixel version of you.</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {FIGHTER_IDS.map((id) => (
              <Link key={id} to="/me" className="hover-wiggle rounded-xl border-2 border-line bg-paper-deep p-3 text-center transition-transform duration-150 hover:-translate-y-1">
                <Head player={{ avatar: null, fighter: id }} size={64} className="mx-auto" />
                <p className="mt-2 font-pixel text-xl">{FIGHTERS[id].name}</p>
                <p className="text-xs text-muted">{FIGHTERS[id].blurb}</p>
              </Link>
            ))}
          </div>
        </Win>
        <Win title="Cards you earn, not roll" bodyClass="p-4 sm:p-6">
          <p className="max-w-[52ch] text-lg">Hit a score, get the card. Six tiers in every game, from Common to Cosmic.</p>
          <div className="mt-5 grid grid-cols-3 justify-items-center gap-4 sm:grid-cols-6">
            {LADDER.map((l, i) => (
              <figure key={l.rarity} className="text-center">
                <div className="transition-transform duration-200 hover:-translate-y-2 hover:rotate-1">
                  <CardView card={ladderCard(i, fighter, head, tag)} head={head} width={104} />
                </div>
                <figcaption className="mt-2 font-pixel text-base capitalize">{l.rarity}</figcaption>
              </figure>
            ))}
          </div>
        </Win>
      </div>
    </div>
  );
}
