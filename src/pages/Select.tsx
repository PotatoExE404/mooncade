import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Cabinet } from "../components/Cabinet";
import { audio } from "../engine/audio";
import { GAME_ORDER, GAMES } from "../games/registry";
import { formatScore } from "../shared/rules";
import { useStore } from "../state/store";

export function Select() {
  const theme = useStore((s) => s.theme);
  const fighter = useStore((s) => s.fighter);
  const bests = useStore((s) => s.bests);
  const navigate = useNavigate();
  const fromCoin = (useLocation().state as { fromCoin?: boolean } | null)?.fromCoin;
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowRight" || e.code === "KeyD") setSel((i) => (i + 1) % GAME_ORDER.length);
      else if (e.code === "ArrowLeft" || e.code === "KeyA") setSel((i) => (i + GAME_ORDER.length - 1) % GAME_ORDER.length);
      else if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        navigate(`/play/${GAME_ORDER[sel]}`);
        return;
      } else return;
      audio.unlock();
      audio.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, navigate]);

  return (
    <div className={`mx-auto max-w-7xl px-3 py-8 sm:px-6 ${fromCoin ? "power-on" : ""}`}>
      <div className="billboard mx-auto mb-8 max-w-2xl px-6 py-4 text-center">
        <h1 className="led font-pixel text-4xl sm:text-5xl">SELECT YOUR GAME</h1>
      </div>
      <ul className="grid gap-6 md:grid-cols-3" role="listbox" aria-label="Games">
        {GAME_ORDER.map((g, i) => {
          const info = GAMES[g];
          const on = i === sel;
          return (
            <li key={g} role="option" aria-selected={on} onMouseEnter={() => setSel(i)} className="flex">
              <Link
                to={`/play/${g}`}
                className={`win flex w-full flex-col transition-transform duration-200 hover:-translate-y-1.5 ${on ? "-translate-y-1.5 ring-4 ring-[#ffd65a] ring-offset-2 ring-offset-transparent" : ""}`}
              >
                <div className="win-title">
                  <span className="text-base">{info.name}</span>
                  {on && <span className="ml-auto font-pixel text-sm text-white">▶ PLAYER 1</span>}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="crt">
                    <div className={`crt-screen ${info.orientation === "portrait" ? "aspect-[9/12]" : "aspect-[16/10]"}`}>
                      <Cabinet game={g} theme={theme} fighter={fighter} />
                    </div>
                  </div>
                  <p className="mt-4 font-pixel text-xl leading-tight">{info.tagline}</p>
                  <p className="meta mt-1 text-muted">{info.format}</p>
                  {bests[g] !== undefined && <p className="meta mt-1 text-muted">Your best {formatScore(g, bests[g]!)}</p>}
                  <span className="block h-4" />
                  <span className="btn mt-auto w-full" data-variant={on ? "accent" : undefined}>
                    ▶ Play
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
