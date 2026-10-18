import { Link, NavLink } from "react-router";
import { GITHUB_URL } from "../config";
import { GAME_ORDER, GAMES } from "../games/registry";
import { useStore } from "../state/store";
import { Head } from "./Head";
import { SoundButton } from "./SoundButton";
import { ThemePicker } from "./ThemePicker";

const link = ({ isActive }: { isActive: boolean }) => `block rounded-lg px-3 py-2 font-pixel text-lg transition-colors duration-120 hover:bg-white/15 ${isActive ? "bg-white/20" : ""}`;

export function Nav() {
  const fighter = useStore((s) => s.fighter);
  const head = useStore((s) => s.head);
  const tag = useStore((s) => s.tag);
  const named = useStore((s) => s.named);
  const links = [...GAME_ORDER.map((g) => ({ to: `/play/${g}`, label: GAMES[g].name, short: GAMES[g].short })), { to: "/cards", label: "Cards", short: "Cards" }, { to: "/roadmap", label: "Roadmap", short: "Roadmap" }];
  return (
    <header className="glass sticky top-0 z-30 text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink">
        Skip to content
      </a>
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6" aria-label="Main">
        <Link
          to="/"
          aria-label="Mooncade home"
          className="hover-wiggle flex h-11 items-center gap-2 rounded-full border border-white/40 px-3 font-pixel text-xl font-bold text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] [background:linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_50%,rgba(0,0,0,0)_51%,rgba(0,0,0,0.18)_100%),var(--accent)] sm:text-2xl"
        >
          MOONCADE
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} className={link}>
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <ThemePicker />
          </div>
          <Link to="/me" className="glass-btn flex h-11 items-center gap-2 rounded-xl px-2" aria-label="Your fighter and settings">
            <Head player={{ avatar: head, fighter }} size={28} className="rounded-full" />
            <span className="hidden max-w-[8.5rem] truncate font-mono text-xs tracking-wide uppercase min-[400px]:inline lg:hidden xl:inline">{named ? tag : "Avatar"}</span>
          </Link>
          <SoundButton />
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="glass-btn grid h-11 w-11 place-items-center rounded-xl text-white" aria-label="Source code on GitHub" title="GitHub">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </nav>
      <ul className="flex border-t border-white/20 lg:hidden">
        {links.map((l) => (
          <li key={l.to} className="flex-1">
            <NavLink to={l.to} className={({ isActive }) => `block py-2.5 text-center font-pixel text-base ${isActive ? "bg-white/20" : ""}`}>
              {l.short}
            </NavLink>
          </li>
        ))}
      </ul>
    </header>
  );
}
