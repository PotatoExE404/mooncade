import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { Link, useParams } from "react-router";
import { fighterSheet } from "../art/fighters";
import { useHead } from "../art/heads";
import { recordRun, type RunRecord } from "../cards/earn";
import { exportCard } from "../cards/render";
import { CardStudio } from "../components/CardStudio";
import { HowToPlay, NextCard } from "../components/HowToPlay";
import { CardView } from "../components/CardView";
import { Settings } from "../components/Settings";
import { Win } from "../components/Win";
import { audio } from "../engine/audio";
import type { Device, InputSource } from "../engine/input";
import { shareRun } from "../engine/share";
import { useAudioSettings } from "../engine/useAudioSettings";
import { moodName } from "../games/common";
import { GameStage } from "../games/GameStage";
import { GAME_ORDER, GAMES } from "../games/registry";
import type { Phase, RunResult } from "../games/runtime";
import { formatClock, formatScore, GAME_NAMES, LADDERS, medalFor, RARITY_RANK } from "../shared/rules";
import type { GameId } from "../sim";
import { STAGES } from "../sim/diamond";
import { Action } from "../sim/input";
import { useStore } from "../state/store";
import { THEMES } from "../themes/themes";

const newSeed = () => (Math.random() * 2 ** 31) | 0;

interface Hud {
  clock: number;
  level: number;
  levelName: string;
  urgent: boolean;
}

function hudFrom(game: GameId, s: unknown): Hud {
  const st = s as { timeLeft?: number; level?: number; stage?: number; tick?: number; started?: boolean };
  if (game === "diamond") {
    const level = (st.stage ?? 0) + 1;
    return { clock: st.tick ?? 0, level, levelName: STAGES[level - 1]?.name ?? "", urgent: false };
  }
  const level = st.level ?? 1;
  return { clock: st.timeLeft ?? 0, level, levelName: moodName(level), urgent: !!st.started && (st.timeLeft ?? 0) <= 600 };
}

export function Play() {
  const { game: param } = useParams();
  const game = (GAME_ORDER.includes(param as GameId) ? param : "diamond") as GameId;
  const info = GAMES[game];
  const themeId = useStore((s) => s.theme);
  const theme = THEMES[themeId];
  const fighter = useStore((s) => s.fighter);
  const headUrl = useStore((s) => s.head);
  const head = useHead(headUrl);
  const sound = useAudioSettings();

  const presenter = useMemo(() => info.make(fighterSheet(fighter, head), `${fighter}:${head?.key ?? "house"}`), [info, fighter, head]);

  const [seed, setSeed] = useState(newSeed);
  const [runKey, setRunKey] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [hud, setHud] = useState<Hud>(() => ({ clock: 0, level: 1, levelName: "", urgent: false }));
  const [banner, setBanner] = useState<{ level: number; name: string } | null>(null);
  const [bonus, setBonus] = useState<{ n: number; secs: number } | null>(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<{ run: RunResult; rec: RunRecord } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [device, setDevice] = useState<Device>("keyboard");
  const inputRef = useRef<InputSource | null>(null);
  const overAt = useRef(0);
  const serial = useRef(0);
  const lastLevel = useRef(1);
  const lastClock = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    serial.current++;
    setResult(null);
    setShowResults(false);
    setPhase("ready");
    setScore(0);
    setBanner(null);
    lastLevel.current = 1;
    setSeed(newSeed());
    setRunKey((k) => k + 1);
  }, [game]);

  const retry = useCallback(() => {
    if (phaseRef.current !== "over") return;
    audio.unlock();
    serial.current++;
    setShowResults(false);
    setResult(null);
    setPhase("ready");
    phaseRef.current = "ready";
    setScore(0);
    setBanner(null);
    setBonus(null);
    lastLevel.current = 1;
    setSeed(newSeed());
    setRunKey((k) => k + 1);
  }, []);

  const onOver = useCallback(
    (run: RunResult) => {
      overAt.current = performance.now();
      const mine = ++serial.current;
      const rec = recordRun(game, run.score, run.stats);
      setResult({ run, rec });
      if (rec.personalBest && rec.previousBest !== null) audio.record();
      window.setTimeout(() => serial.current === mine && setShowResults(true), game === "diamond" ? 1600 : 700);
    },
    [game],
  );

  const onHud = useCallback(
    (s: unknown) => {
      const h = hudFrom(game, s);

      if (game !== "diamond" && h.clock > lastClock.current + 50 && lastClock.current > 0) {
        const secs = Math.round((h.clock - lastClock.current) / 60);
        if (secs > 0) setBonus((b) => ({ n: (b?.n ?? 0) + 1, secs }));
      }
      lastClock.current = h.clock;
      setHud(h);
      if (h.level > lastLevel.current) {
        lastLevel.current = h.level;
        setBanner({ level: h.level, name: h.levelName });
        window.setTimeout(() => setBanner(null), 1800);
      }
    },
    [game],
  );

  const toggleMute = useCallback(() => {
    audio.unlock();
    audio.set({ muted: !audio.settings.muted });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName);
      if (typing || document.querySelector("dialog[open]")) return;
      if (phaseRef.current === "over" && (["KeyR", "Enter"].includes(e.code) || (e.code === "Space" && performance.now() - overAt.current > 450))) {
        e.preventDefault();
        retry();
        return;
      }
      if (e.code === "KeyM") toggleMute();
      if (phaseRef.current !== "over" && (e.code === "Escape" || e.code === "KeyP")) setPaused((p) => !p);
      if (e.code === "KeyR" && phaseRef.current === "playing" && !paused) {
        setPhase("over");
        phaseRef.current = "over";
        overAt.current = 0;
        retry();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [retry, paused, toggleMute]);

  const portraitScreen = usePortrait();
  const portrait = info.orientation === "portrait";
  const padBelow = game === "diamond" && device === "touch" && portraitScreen;
  const pad = (bit: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      inputRef.current?.setTouch(bit, true);
    },
    onPointerUp: () => inputRef.current?.setTouch(bit, false),
    onPointerCancel: () => inputRef.current?.setTouch(bit, false),
  });
  const padBtn = "grid select-none place-items-center rounded-2xl border-2 border-line font-pixel text-3xl shadow-[0_4px_0_var(--line)] active:translate-y-1 active:shadow-none";
  const startClock = game === "flap" ? 3600 : 5400;
  const clockText = game === "diamond" ? formatScore("diamond", phase === "ready" ? 0 : hud.clock) : formatClock(phase === "ready" ? startClock : hud.clock);

  const screen = (
    <div className="crt mx-auto" style={portrait ? { width: "fit-content" } : undefined}>
      <div className={`crt-screen ${portrait ? "stage-w" : ""}`} style={portrait ? { aspectRatio: "9 / 16" } : { aspectRatio: "16 / 9", maxHeight: "78dvh", width: "100%" }}>
        <GameStage
          game={game}
          seed={seed}
          theme={theme}
          scheme={info.scheme}
          presenter={presenter}
          paused={paused}
          runKey={runKey}
          fill
          label={`${info.name} game`}
          onPhase={(p) => {
            setPhase(p);
            if (p === "playing") audio.unlock();
            if (p === "ready") lastClock.current = 0;
          }}
          onScore={setScore}
          onOver={onOver}
          onHud={onHud}
          onInput={(inp) => {
            inputRef.current = inp;
            setDevice(inp.device);
            inp.onDevice(setDevice);
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-2.5 sm:p-3">
            <div className="relative flex flex-col gap-1">
              <span className={`rounded-md bg-black/55 px-2 py-0.5 font-pixel text-2xl leading-none tabular-nums text-white ${hud.urgent ? "blink text-[#ff6b6b]" : ""}`} data-testid="clock">
                {clockText}
              </span>
              {bonus && phase === "playing" && (
                <span key={bonus.n} className="float-up absolute top-0 left-full ml-1.5 font-pixel text-2xl leading-none text-[#7dff9a] drop-shadow-[0_2px_0_rgba(0,0,0,0.9)]" aria-live="polite">
                  +{bonus.secs}s
                </span>
              )}
              <span className="w-fit rounded-md bg-black/55 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-white uppercase">Level {hud.level}</span>
            </div>
            <div className="flex-1 text-center">
              {game !== "diamond" && (
                <span key={score} className="pop inline-block font-pixel text-5xl leading-none text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.85)]" data-testid="score">
                  {score.toLocaleString("en-US")}
                </span>
              )}
            </div>
            <div className="pointer-events-auto flex gap-1.5" data-ui>
              <button className="icon-btn !h-10 !w-10" aria-label={sound.muted ? "Sound on" : "Sound off"} aria-pressed={sound.muted} onClick={toggleMute} title="Sound (M)">
                <SpeakerIcon off={sound.muted} />
              </button>
              <button className="icon-btn !h-10 !w-10" aria-label={paused ? "Resume" : "Pause"} onClick={() => setPaused((p) => !p)} disabled={phase === "over"} title="Pause (Esc)">
                <PauseIcon />
              </button>
            </div>
          </div>

          {banner && (
            <div className="pointer-events-none absolute inset-x-0 top-[30%] grid place-items-center" aria-live="polite">
              <div className="pop rounded-xl border-2 border-line bg-paper px-5 py-2 text-center shadow-[0_4px_0_var(--line)]">
                <p className="font-pixel text-3xl leading-none">Level {banner.level}</p>
                {banner.name && <p className="meta mt-1 text-muted">{banner.name}</p>}
              </div>
            </div>
          )}

          {phase === "ready" && !paused && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[12%] grid place-items-center gap-2 px-4 text-center">
              <p className="blink font-pixel text-3xl text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.85)]">{device === "touch" ? "Tap to start" : device === "gamepad" ? "Press Ⓐ" : "Press Space"}</p>
              <p className="rounded-md bg-black/60 px-2 py-1 font-mono text-xs tracking-wider text-white uppercase">{info.format}</p>
            </div>
          )}

          {game === "diamond" && device === "touch" && !padBelow && phase !== "over" && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 [&_button]:pointer-events-auto" data-ui>
              <div className="flex gap-2">
                <button className={`${padBtn} h-16 w-16 bg-paper/75 text-ink`} aria-label="Left" {...pad(Action.Left)}>
                  ◀
                </button>
                <button className={`${padBtn} h-16 w-16 bg-paper/75 text-ink`} aria-label="Right" {...pad(Action.Right)}>
                  ▶
                </button>
              </div>
              <button className={`${padBtn} h-20 w-20 bg-accent/85 text-accent-ink`} aria-label="Jump" {...pad(Action.Jump)}>
                ▲
              </button>
            </div>
          )}

          {paused && phase !== "over" && (
            <div className="absolute inset-0 grid place-items-center bg-black/50 p-4" data-ui>
              <Win title="Paused" className="w-full max-w-xs" bodyClass="space-y-4 p-4">
                <button className="btn w-full" data-variant="accent" onClick={() => setPaused(false)} autoFocus>
                  Resume
                </button>
                <Settings compact />
              </Win>
            </div>
          )}
        </GameStage>
        {result && phase === "over" && showResults && <Results game={game} run={result.run} rec={result.rec} onRetry={retry} />}
      </div>
      <span className="crt-led" aria-hidden="true" />
    </div>
  );

  return (
    <div className="mx-auto max-w-[1640px] px-3 pt-5 pb-16 sm:px-6">
      <header className="mx-auto mb-4 flex max-w-[1180px] flex-wrap items-end gap-3">
        <div>
          <h1 className="desk font-pixel text-4xl leading-none sm:text-5xl">{info.name}</h1>
          <p className="desk mt-1 font-semibold">{info.tagline}</p>
        </div>
        <nav className="ml-auto flex flex-wrap gap-1.5" aria-label="Games">
          {GAME_ORDER.map((g) => (
            <Link key={g} to={`/play/${g}`} className="chip" aria-current={g === game ? "page" : undefined}>
              {GAMES[g].name}
            </Link>
          ))}
        </nav>
      </header>

      {portrait ? (
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-stretch lg:justify-center">
          <div className="min-w-0">{screen}</div>
          <div className="htp-slot w-full max-w-[calc(var(--stage)+2*var(--bezel)+4px)]">
            <HowToPlay game={game} className="h-full" />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[1180px] space-y-6">
          {screen}
          {padBelow && (
            <div className="select-none">
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-3">
                  <button className={`${padBtn} h-20 w-20 bg-paper text-ink`} aria-label="Left" {...pad(Action.Left)}>
                    ◀
                  </button>
                  <button className={`${padBtn} h-20 w-20 bg-paper text-ink`} aria-label="Right" {...pad(Action.Right)}>
                    ▶
                  </button>
                </div>
                <button className={`${padBtn} h-24 w-24 bg-accent text-accent-ink`} aria-label="Jump" {...pad(Action.Jump)}>
                  ▲
                </button>
              </div>
              <p className="desk meta mt-3 text-center">Turn your phone sideways for a bigger screen</p>
            </div>
          )}
          <HowToPlay game={game} wide />
        </div>
      )}
    </div>
  );
}

function usePortrait() {
  const q = "(orientation: portrait)";
  const [portrait, setPortrait] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => setPortrait(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return portrait;
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
      <rect x="3" y="2" width="3" height="12" fill="currentColor" />
      <rect x="10" y="2" width="3" height="12" fill="currentColor" />
    </svg>
  );
}

function SpeakerIcon({ off }: { off: boolean }) {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M1 5h4l5-4v14l-5-4H1z" fill="currentColor" />
      {off ? <path d="M12 5l5 6M17 5l-5 6" stroke="currentColor" strokeWidth="2" /> : <path d="M12 5c1.5 1.5 1.5 4.5 0 6M14.5 3c3 3 3 7 0 10" stroke="currentColor" strokeWidth="1.6" fill="none" />}
    </svg>
  );
}

function gap(game: GameId, score: number, best: number | null): string | null {
  if (best === null) return null;
  if (score === best) return game === "diamond" ? "Matched your best" : "Tied your best";
  if (game === "diamond") {
    const d = Math.abs(score - best) / 60;
    return score < best ? `${d.toFixed(2)} s faster than your best` : `${d.toFixed(2)} s off your best`;
  }
  const d = Math.abs(score - best);
  const unit = game === "flap" ? (d === 1 ? "candle" : "candles") : "points";
  return score > best ? `+${d.toLocaleString("en-US")} over your best` : `${d.toLocaleString("en-US")} ${unit} off your best`;
}

const MEDAL_EMOJI = { gold: "🥇 ", silver: "🥈 ", bronze: "🥉 ", none: "" } as const;

function shareTextFor(game: GameId, run: RunResult, best: boolean, url: string) {
  const s = run.stats;
  const line =
    game === "flap"
      ? `🕯 ${run.score} candles · level ${s.level}`
      : game === "run"
        ? `🐻 ${s.metres?.toLocaleString("en-US")} m · 🪙 ${s.coins} · level ${s.level}`
        : `${MEDAL_EMOJI[medalFor(run.score) ?? "none"]}⏱ ${formatScore(game, run.score)} · 💎 ${s.gems} · ☠ ${s.deaths}`;
  return [`MOONCADE · ${GAME_NAMES[game].toUpperCase()}`, line, best ? "New high score. Beat that." : "Beat that.", url].join("\n");
}

function Results({ game, run, rec, onRetry }: { game: GameId; run: RunResult; rec: RunRecord; onRetry(): void }) {
  const head = useStore((s) => s.head);
  const tag = useStore((s) => s.tag);
  const fighter = useStore((s) => s.fighter);
  const cards = useStore((s) => s.cards);
  const [shared, setShared] = useState<string | null>(null);
  const [studio, setStudio] = useState(false);
  const cardBlob = useRef<Blob | null>(null);
  const isPB = rec.personalBest && rec.previousBest !== null;
  const card = rec.card && { ...rec.card, player: { display: tag, fighter, avatar: head } };
  const next = LADDERS[game].find((t) => !cards.some((c) => c.game === game && c.rarity === t.rarity));

  useEffect(() => {
    cardBlob.current = null;
    if (card) void exportCard(card, head).then((b) => (cardBlob.current = b));
  }, [rec.card, head]);

  const share = async () => {
    const out = await shareRun(shareTextFor(game, run, rec.personalBest, `${location.origin}/play/${game}`), cardBlob.current ?? undefined, `mooncade-${game}.png`);
    setShared(out === "copied" ? "Copied. Paste it anywhere." : out === "downloaded" ? "Card saved" : out === "shared" ? "Shared" : null);
  };

  const medal = game === "diamond" ? medalFor(run.score) : null;
  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-black/55 p-3 sm:p-5" role="dialog" aria-label="Run results" data-testid="results">
      <div className="mx-auto flex min-h-full max-w-sm items-center">
        <Win title={isPB ? "★ New high score! ★" : rec.previousBest === null ? "First run!" : "Time!"} tone={isPB ? "gold" : undefined} className="w-full" bodyClass="space-y-4 p-4">
          <div>
            <p className="meta text-muted">{GAME_NAMES[game]}</p>
            <p className="font-pixel text-6xl leading-none tabular-nums" data-testid="final-score">
              {formatScore(game, run.score)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {game === "flap" && `Level ${run.stats.level} · ${run.stats.crashes} crashes`}
              {game === "run" && `${run.stats.metres?.toLocaleString("en-US")} m · ${run.stats.coins} coins · level ${run.stats.level}`}
              {game === "diamond" && `${run.stats.gems} diamonds · ${run.stats.deaths} deaths`}
            </p>
            {medal && (
              <p className="mt-1 font-pixel text-xl uppercase" style={{ color: medal === "gold" ? "#b07a00" : medal === "silver" ? "#6b7283" : "#9a5a28" }}>
                {medal} medal
              </p>
            )}
            {rec.previousBest !== null && <p className="mt-1 text-sm font-semibold">{gap(game, run.score, rec.previousBest)}</p>}
            {!isPB && <p className="meta mt-2 text-muted">Best {formatScore(game, rec.best)}</p>}
          </div>

          {card && (
            <div className="flex items-center gap-4">
              <button className="shrink-0 transition-transform duration-150 hover:-translate-y-1" aria-label="Customise your new card" onClick={() => setStudio(true)}>
                <CardView card={card} head={head} width={104} />
              </button>
              <div>
                <p className="meta text-muted">New card</p>
                <p className="font-pixel text-2xl leading-none">{card.reason}</p>
                <p className="text-sm text-muted capitalize">{card.rarity}</p>
                <button className="btn mt-2" data-size="sm" onClick={() => setStudio(true)}>
                  Customise
                </button>
              </div>
              {studio && <CardStudio card={card} onClose={() => setStudio(false)} />}
            </div>
          )}
          {next && (!card || RARITY_RANK[next.rarity] > RARITY_RANK[card.rarity]) && (
            <NextCard tier={next} />
          )}

          <div className="grid grid-cols-2 gap-2">
            <button className="btn col-span-2" data-variant="accent" data-size="lg" onClick={onRetry} autoFocus data-testid="retry">
              Play again <span className="font-mono text-xs opacity-80">R</span>
            </button>
            <button className="btn" onClick={() => void share()}>
              Share
            </button>
            <Link to="/cards" className="btn">
              Cards
            </Link>
          </div>
          {shared && (
            <p className="meta font-semibold text-accent" role="status">
              {shared}
            </p>
          )}
        </Win>
      </div>
    </div>
  );
}
