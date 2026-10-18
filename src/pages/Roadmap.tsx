import { Link } from "react-router";
import { Coin } from "../components/Coin";
import { Win } from "../components/Win";

interface Stage {
  n: number;
  title: string;
  status: string;
  live: boolean;
  items: { name: string; what: string }[];
}

const STAGES: Stage[] = [
  {
    n: 1,
    title: "Insert coin",
    status: "Live now",
    live: true,
    items: [
      { name: "Three games", what: "HODL Quest, Bear Escape and Moonshot. Free, no sign-up." },
      { name: "Your fighter", what: "Turn a selfie into a pixel fighter." },
      { name: "Cards", what: "Six cards per game, earned by hitting a score." },
      { name: "Skins", what: "Neon Rush, Crystal Sky and Sherwood Market." },
    ],
  },
  {
    n: 2,
    title: "Level up",
    status: "Next",
    live: false,
    items: [
      { name: "Leaderboards", what: "Daily and all-time boards for every game." },
      { name: "More levels", what: "New worlds, bosses and booster types." },
      { name: "Daily challenge", what: "One course a day, the same for everyone." },
      { name: "Profiles", what: "Show off your cards and high scores in one link." },
    ],
  },
  {
    n: 3,
    title: "Boss stage",
    status: "Later",
    live: false,
    items: [
      { name: "Play to earn", what: "Rewards for top players and community events." },
      { name: "New games", what: "More arcade classics, voted on by the community." },
      { name: "Tournaments", what: "Weekend cups with live brackets." },
      { name: "Community picks", what: "Holders help choose what we build next." },
    ],
  },
];

export function Roadmap() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <div className="flex gap-2" aria-hidden="true">
          {(["sol", "eth", "robin"] as const).map((t, i) => (
            <span key={t} className="coin-spin" style={{ animationDelay: `${-i * 0.9}s` }}>
              <Coin theme={t} size={40} />
            </span>
          ))}
        </div>
        <h1 className="desk mt-4 font-pixel text-title">Roadmap</h1>
        <p className="desk mt-3 text-lg leading-relaxed font-semibold sm:text-xl">
          Mooncade is a Solana community arcade. Come to relax, play, compete and show off your high scores. Here's what's live and what's coming.
        </p>
      </header>

      <ol className="mt-10 grid gap-6 lg:grid-cols-3">
        {STAGES.map((s) => (
          <li key={s.n} className="h-full">
            <Win title={`Stage ${s.n} · ${s.title}`} tone={s.live ? undefined : "ink"} className="h-full" bodyClass="p-4 sm:p-5">
              <p className={`meta inline-flex items-center gap-2 font-bold ${s.live ? "text-accent-deep" : "text-muted"}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${s.live ? "blink bg-accent" : "border-2 border-muted"}`} aria-hidden="true" />
                {s.status}
              </p>
              <ul className="mt-4 space-y-4">
                {s.items.map((it) => (
                  <li key={it.name} className="flex gap-3">
                    <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded border-2 border-line text-xs font-bold ${s.live ? "bg-accent text-accent-ink" : "bg-paper-deep"}`} aria-hidden="true">
                      {s.live ? "✓" : ""}
                    </span>
                    <span>
                      <span className="block font-pixel text-xl leading-tight">{it.name}</span>
                      <span className="block text-sm text-muted">{it.what}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Win>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link to="/play" className="btn" data-variant="accent" data-size="lg">
          ▶ Play now
        </Link>
        <p className="desk font-semibold">Plans can change as the community grows.</p>
      </div>
    </div>
  );
}
