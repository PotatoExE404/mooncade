import { useEffect } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router";
import { MarqueeLights } from "./components/MarqueeLights";
import { Nav } from "./components/Nav";
import { audio } from "./engine/audio";
import { useAudioSettings } from "./engine/useAudioSettings";
import { Cards } from "./pages/Cards";
import { Home } from "./pages/Home";
import { Me } from "./pages/Me";
import { Play } from "./pages/Play";
import { Roadmap } from "./pages/Roadmap";
import { Select } from "./pages/Select";
import type { GameId } from "./sim";
import { useStore } from "./state/store";
import { THEMES } from "./themes/themes";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Music() {
  const { pathname } = useLocation();
  const { site } = useAudioSettings();
  const theme = useStore((s) => s.theme);
  const game = /^\/play\/(diamond|run|flap)\/?$/.exec(pathname)?.[1] as GameId | undefined;
  const track = game ?? (site ? "site" : null);
  useEffect(() => {
    if (!track) {
      audio.stopMusic();
      return;
    }
    const play = () => audio.startMusic(track, THEMES[theme]);
    if (!audio.ctx) audio.unlock();
    play();
    if (audio.ctx?.state === "running") return;
    const start = () => {
      audio.unlock();
      play();
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    window.addEventListener("touchend", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      window.removeEventListener("touchend", start);
    };
  }, [track, theme]);
  return null;
}

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-3 py-20 text-center">
      <div className="bulbs px-6 py-12">
        <MarqueeLights />
        <h1 className="led font-pixel text-display">GAME OVER</h1>
        <p className="led led-green blink mt-3 text-2xl">CONTINUE? 9</p>
      </div>
      <p className="desk mt-6 text-lg">That page isn't in the arcade.</p>
      <Link to="/" className="btn mt-6" data-variant="accent" data-size="lg">
        Continue
      </Link>
    </div>
  );
}

function Footer() {
  return (
    <footer className="glass border-t border-white/35 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-3 py-5 sm:px-6">
        <span className="font-pixel text-xl font-bold">MOONCADE</span>
        <span className="font-mono text-xs tracking-wider text-white/85">© 2026</span>
        <span className="ml-auto font-pixel text-lg">Community arcade</span>
      </div>
    </footer>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollTop />
      <Music />
      <Nav />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play/:game" element={<Play />} />
          <Route path="/play" element={<Select />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/me" element={<Me />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
